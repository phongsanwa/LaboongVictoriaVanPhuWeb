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

    /** Số ngày tối đa nhìn trước để tìm phiên kế tiếp (đếm ngược "Sắp diễn ra"). */
    private const LOOKAHEAD_DAYS = 14;

    /**
     * The session that is live now, or the next upcoming one.
     * upcoming_hours = 0: show the countdown whenever the sale is on (next session within 14 days);
     * > 0: only within that many hours before it starts.
     * Times are Vietnam time; returns ['status' => live|upcoming, 'start' => Carbon, 'end' => Carbon] or null.
     */
    public function sessionAt(?Carbon $now = null): ?array
    {
        if (!$this->is_active) return null;
        $now ??= ShopTime::now();

        // Yesterday first (sessions running past midnight), then the coming days in order.
        for ($i = -1; $i <= self::LOOKAHEAD_DAYS; $i++) {
            $day = $now->copy()->addDays($i);
            if (!$this->runsOn($day)) continue;
            $start = Carbon::parse($day->toDateString() . ' ' . $this->start_time, ShopTime::TZ);
            $end = Carbon::parse($day->toDateString() . ' ' . $this->end_time, ShopTime::TZ);
            if ($end->lte($start)) $end->addDay();

            if ($now->gte($start) && $now->lt($end)) return ['status' => 'live', 'start' => $start, 'end' => $end];
            if ($now->lt($start)) {
                $window = (int) $this->upcoming_hours;
                return $window === 0 || $now->diffInMinutes($start) <= $window * 60
                    ? ['status' => 'upcoming', 'start' => $start, 'end' => $end]
                    : null;
            }
        }
        return null;
    }

    /**
     * Phiên kế tiếp CHƯA bắt đầu (không xét đang bật/tắt hay khung hiện "Sắp diễn ra") —
     * dùng cho email nhắc flash sale. ['start' => Carbon, 'end' => Carbon] hoặc null.
     */
    public function nextUpcomingSession(?Carbon $now = null): ?array
    {
        $now ??= ShopTime::now();
        for ($i = 0; $i <= 60; $i++) {
            $day = $now->copy()->addDays($i);
            if (!$this->runsOn($day)) continue;
            $start = Carbon::parse($day->toDateString() . ' ' . $this->start_time, ShopTime::TZ);
            if ($start->lte($now)) continue;
            $end = Carbon::parse($day->toDateString() . ' ' . $this->end_time, ShopTime::TZ);
            if ($end->lte($start)) $end->addDay();

            return ['start' => $start, 'end' => $end];
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
