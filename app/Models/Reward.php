<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reward extends Model
{
    protected $fillable = [
        'name',
        'description',
        'reward_type',
        'points_required',
        'value',
        'quantity_available',
        'quantity_total',
        'image_url',
        'valid_from',
        'valid_until',
        'min_purchase',
        'category',
        'status',
        'display_order',
        'is_featured',
    ];

    protected function casts(): array
    {
        return [
            'valid_from' => 'date',
            'valid_until' => 'date',
            'is_featured' => 'boolean',
        ];
    }
}
