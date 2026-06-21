<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Redemption extends Model
{
    protected $fillable = [
        'redemption_code',
        'customer_id',
        'reward_id',
        'points_spent',
        'quantity',
        'status',
        'redeemed_at',
        'used_at',
        'expires_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'redeemed_at' => 'datetime',
            'used_at' => 'datetime',
            'expires_at' => 'date',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function reward(): BelongsTo
    {
        return $this->belongsTo(Reward::class);
    }

    public function voucher(): HasOne
    {
        return $this->hasOne(Voucher::class);
    }
}
