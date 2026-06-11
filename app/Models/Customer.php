<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = [
        'user_id',
        'store_id',
        'date_of_birth',
        'gender',
        'address',
        'city',
        'tier_id',
        'total_points',
        'lifetime_points',
        'total_spent',
        'referral_code',
        'referred_by_id',
        'last_purchase_at',
        'is_newsletter',
        'is_push_enabled',
        'favorite_items',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'last_purchase_at' => 'datetime',
            'is_newsletter' => 'boolean',
            'is_push_enabled' => 'boolean',
            'favorite_items' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tier(): BelongsTo
    {
        return $this->belongsTo(CustomerTier::class, 'tier_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class);
    }
}
