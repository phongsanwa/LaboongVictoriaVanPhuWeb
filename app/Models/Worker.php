<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Worker extends Model
{
    public const TYPES = ['probation' => 'Thử việc', 'official' => 'Chính thức'];

    protected $fillable = ['store_id', 'name', 'phone', 'type', 'official_from', 'rate_adjust', 'active'];

    protected $casts = ['official_from' => 'date', 'active' => 'boolean', 'rate_adjust' => 'integer'];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(DailyEntryShift::class);
    }

    /** Official on that day: marked official, or past the scheduled promotion date. */
    public function isOfficialOn(Carbon $day): bool
    {
        return $this->type === 'official' || ($this->official_from && $day->gte($this->official_from));
    }

    /** Full months as an official employee on that day (0 without an official date). */
    public function officialMonthsOn(Carbon $day): int
    {
        if (!$this->official_from || $day->lt($this->official_from)) return 0;
        return (int) $this->official_from->diffInMonths($day);
    }

    /**
     * Hourly rate for a day: probation rate, or official rate plus one raise per completed
     * period (e.g. +1.000đ every 6 months since the official date), plus any manual adjustment.
     */
    public function rateOn(Carbon $day, Store $store): int
    {
        if (!$this->isOfficialOn($day)) return max(0, (int) $store->wage_probation + $this->rate_adjust);
        $every = max(1, (int) $store->raise_every_months);
        $steps = intdiv($this->officialMonthsOn($day), $every);
        return max(0, (int) $store->wage_official + $steps * (int) $store->raise_amount + $this->rate_adjust);
    }
}
