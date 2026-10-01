<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Voucher extends Model
{
    protected $fillable = [
        'voucher_code',
        'customer_id',
        'redemption_id',
        'source_type',
        'source_id',
        'applies_to',
        'qr_code',
        'discount_type',
        'discount_value',
        'free_item_product_id',
        'free_item_quantity',
        'free_item_scope',
        'free_item_size',
        'buy_quantity',
        'min_purchase',
        'max_discount',
        'valid_from',
        'valid_until',
        'usage_count',
        'status',
        'used_at',
        'used_by_staff_id',
        'transaction_id',
    ];

    protected function casts(): array
    {
        return [
            'valid_from' => 'date',
            'valid_until' => 'date',
            'used_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function redemption(): BelongsTo
    {
        return $this->belongsTo(Redemption::class);
    }

    public function freeItemProduct(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Product::class, 'free_item_product_id');
    }
}
