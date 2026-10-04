<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecipeCostHistory extends Model
{
    protected $table = 'recipe_cost_history';

    protected $fillable = [
        'recipe_id',
        'cogs_l',
        'recorded_on',
    ];

    protected $casts = [
        'cogs_l'      => 'float',
        'recorded_on' => 'date',
    ];

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }
}
