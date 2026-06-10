<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerTier extends Model
{
    protected $fillable = [
        'name',
        'level',
        'min_points',
        'min_transactions',
        'min_days_active',
        'point_multiplier',
        'description',
        'color_code',
        'icon_url',
    ];
}
