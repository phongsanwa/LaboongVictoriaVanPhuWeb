<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DailyEntry extends Model
{
    protected $fillable = [
        'store_id',
        'entry_date',
        'is_saved',
        'gross_revenue',
        'discount_total',
        'commission_total',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'is_saved'   => 'boolean',
        'gross_revenue'    => 'float',
        'discount_total'   => 'float',
        'commission_total' => 'float',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(DailyEntrySale::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(DailyEntryExpense::class);
    }

    public function channels(): HasMany
    {
        return $this->hasMany(DailyEntryChannel::class);
    }

    /** Money actually received: channel totals when entered, else cups × list price. */
    public function revenue(float $listPriceRevenue): float
    {
        return $this->channels->isNotEmpty() ? (float) $this->channels->sum('net_revenue') : $listPriceRevenue;
    }

    /** Brand fee owed to the franchisor for the day (store's % of revenue). */
    public function royalty(float $revenue): float
    {
        return $revenue * (float) ($this->store?->royalty_pct ?? 3) / 100;
    }
}
