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
    ];

    protected $casts = [
        'entry_date' => 'date',
        'is_saved'   => 'boolean',
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
}
