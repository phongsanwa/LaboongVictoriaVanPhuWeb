<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    protected $fillable = [
        'name',
        'description',
        'campaign_type',
        'target_audience',
        'tier_id',
        'store_id',
        'start_date',
        'end_date',
        'bonus_points',
        'multiplier',
        'min_purchase',
        'max_participants',
        'current_participants',
        'status',
        'is_stackable',
        'banner_image_url',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_stackable' => 'boolean',
        ];
    }
}
