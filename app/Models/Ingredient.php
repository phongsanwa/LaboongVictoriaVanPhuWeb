<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ingredient extends Model
{
    protected $fillable = [
        'name',
        'buy_unit',
        'buy_price',
        'conversion',
        'use_unit',
        'sort_order',
    ];

    protected $casts = [
        'buy_price'  => 'decimal:2',
        'conversion' => 'decimal:3',
    ];

    public function getUsePriceAttribute(): float
    {
        $conversion = (float) $this->conversion;

        return $conversion > 0 ? (float) $this->buy_price / $conversion : 0.0;
    }

    public function overrides(): HasMany
    {
        return $this->hasMany(IngredientStoreOverride::class);
    }

    public function recipeIngredients(): HasMany
    {
        return $this->hasMany(RecipeIngredient::class);
    }
}
