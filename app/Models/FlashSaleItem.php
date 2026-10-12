<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class FlashSaleItem extends Model
{
    protected $fillable = ['flash_sale_id', 'product_id', 'flash_price', 'quota', 'per_customer', 'sort_order'];

    protected $casts = ['flash_price' => 'integer', 'quota' => 'integer', 'per_customer' => 'integer'];

    public function flashSale(): BelongsTo
    {
        return $this->belongsTo(FlashSale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** Units sold in a session, from non-cancelled orders (cancelling frees the units). */
    public function soldIn(Carbon $session, ?int $customerId = null): int
    {
        return (int) OrderItem::where('flash_sale_item_id', $this->id)
            ->where('flash_session', $session->format('Y-m-d H:i:s'))
            ->whereHas('order', function ($q) use ($customerId) {
                $q->where('status', '!=', 'CANCELLED');
                if ($customerId) $q->where('customer_id', $customerId);
            })
            ->sum('quantity');
    }
}
