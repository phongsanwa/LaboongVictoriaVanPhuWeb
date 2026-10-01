<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyEntrySale extends Model
{
    protected $fillable = [
        'daily_entry_id',
        'recipe_id',
        'qty_m',
        'qty_l',
    ];

    protected $casts = [
        'qty_m' => 'integer',
        'qty_l' => 'integer',
    ];

    public function dailyEntry(): BelongsTo
    {
        return $this->belongsTo(DailyEntry::class);
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }
}
