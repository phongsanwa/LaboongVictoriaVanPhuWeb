<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'product_id',
        'quantity',
        'unit_price',
        'item_total',
        'discount_amount',
        'sugar_level',
        'ice_level',
        'size_name',
        'size_extra_price',
        'note',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        // withTrashed: món đã xoá mềm vẫn hiện đúng tên trong lịch sử đơn.
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function toppings(): HasMany
    {
        return $this->hasMany(OrderItemTopping::class);
    }
}
