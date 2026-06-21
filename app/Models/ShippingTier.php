<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingTier extends Model
{
    protected $fillable = [
        'label',
        'min_km',
        'max_km',
        'fee',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'min_km'    => 'decimal:2',
            'max_km'    => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }
}
