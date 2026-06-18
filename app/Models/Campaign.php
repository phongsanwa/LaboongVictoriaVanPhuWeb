<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'birthday_window_days',
        'multiplier',
        'discount_percent',
        'reward_id',
        'min_purchase',
        'max_participants',
        'current_participants',
        'opened_count',
        'status',
        'is_stackable',
        'push_sent',
        'banner_image_url',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_stackable' => 'boolean',
            'push_sent' => 'boolean',
        ];
    }

    public function tier(): BelongsTo
    {
        return $this->belongsTo(CustomerTier::class, 'tier_id');
    }

    public function reward(): BelongsTo
    {
        return $this->belongsTo(Reward::class);
    }
}
