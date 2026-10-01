<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Recipe extends Model
{
    protected $fillable = [
        'name',
        'input_mode',
        'wastage_pct',
        'packaging_m',
        'packaging_l',
        'price_m',
        'price_l',
        'direct_cogs_m',
        'direct_cogs_l',
        'sort_order',
    ];

    protected $casts = [
        'wastage_pct'    => 'float',
        'packaging_m'    => 'float',
        'packaging_l'    => 'float',
        'price_m'        => 'float',
        'price_l'        => 'float',
        'direct_cogs_m'  => 'float',
        'direct_cogs_l'  => 'float',
    ];

    public function ingredients(): HasMany
    {
        return $this->hasMany(RecipeIngredient::class)->orderBy('sort_order');
    }

    public function costHistory(): HasMany
    {
        return $this->hasMany(RecipeCostHistory::class)->orderBy('recorded_on');
    }
}
