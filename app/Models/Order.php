<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'customer_id',
        'store_id',
        'voucher_id',
        'status',
        'subtotal',
        'points_used',
        'discount_amount',
        'shipping_fee',
        'total_amount',
        'points_earned',
        'points_awarded_at',
        'note',
        'delivery_address',
        'delivery_phone',
        'delivery_lat',
        'delivery_lng',
        'confirmed_at',
        'completed_at',
        'cancelled_at',
        'cancel_reason',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
            'points_awarded_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function voucher(): BelongsTo
    {
        return $this->belongsTo(Voucher::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function discounts(): HasMany
    {
        return $this->hasMany(OrderDiscount::class);
    }

    /** Điểm thưởng: chỉ tính trên tiền hàng (đã trừ phí ship), 1 điểm / 10.000đ. */
    public function calculatePointsEarned(): int
    {
        return (int) floor(max(0, $this->total_amount - $this->shipping_fee) / 10000);
    }
}
