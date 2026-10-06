<?php

namespace App\Models;

use App\Support\ShopTime;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class FlashSale extends Model
{
    protected $fillable = ['name', 'repeat', 'start_date', 'end_date', 'weekdays', 'start_time', 'end_time', 'upcoming_hours', 'is_active'];

    protected $casts = ['start_date' => 'date', 'end_date' => 'date', 'weekdays' => 'array', 'is_active' => 'boolean'];

    public function items(): HasMany
    {
        return $this->hasMany(FlashSaleItem::class)->orderBy('sort_order');
    }

    /**
     * The session that is live now, or the next one starting within upcoming_hours.
     * Times are Vietnam time; returns ['status' => live|upcoming, 'start' => Carbon, 'end' => Carbon] or null.
     */
    public function sessionAt(?Carbon $now = null): ?array
    {
        if (!$this->is_active) return null;
        $now ??= ShopTime::now();

        // Today's and tomorrow's candidate occurrences (covers sessions past midnight and next-morning upcoming).
        foreach ([$now->copy()->subDay(), $now->copy(), $now->copy()->addDay()] as $day) {
            if (!$this->runsOn($day)) continue;
            $start = Carbon::parse($day->toDateString() . ' ' . $this->start_time, ShopTime::TZ);
            $end = Carbon::parse($day->toDateString() . ' ' . $this->end_time, ShopTime::TZ);
            if ($end->lte($start)) $end->addDay();

            if ($now->gte($start) && $now->lt($end)) return ['status' => 'live', 'start' => $start, 'end' => $end];
            if ($now->lt($start) && $now->diffInMinutes($start) <= $this->upcoming_hours * 60) {
                return ['status' => 'upcoming', 'start' => $start, 'end' => $end];
            }
        }
        return null;
    }

    private function runsOn(Carbon $day): bool
    {
        $date = $day->toDateString();
        if ($this->repeat === 'once') return $date === $this->start_date->toDateString();
        if ($date < $this->start_date->toDateString()) return false;
        if ($this->end_date && $date > $this->end_date->toDateString()) return false;
        return in_array($day->dayOfWeekIso, $this->weekdays ?? [], true);
    }

    /** Active sale whose session is live or upcoming now (live wins, then soonest). */
    public static function current(): ?array
    {
        $best = null;
        foreach (static::with('items.product')->where('is_active', true)->get() as $sale) {
            $session = $sale->sessionAt();
            if (!$session) continue;
            if (!$best || ($session['status'] === 'live' && $best['status'] !== 'live')
                || ($session['status'] === $best['status'] && $session['start']->lt($best['start']))) {
                $best = $session + ['sale' => $sale];
            }
        }
        return $best;
    }

    /** product_id => FlashSaleItem for the live session, plus the session start. */
    public static function liveItems(): array
    {
        $cur = static::current();
        if (!$cur || $cur['status'] !== 'live') return [[], null];
        return [$cur['sale']->items->keyBy('product_id')->all(), $cur['start']];
    }
}
