<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Đơn lên tại quầy qua màn hình thu ngân web (tách khỏi đơn đặt online). */
class PosOrder extends Model
{
    public const CHANNELS = [
        'tai_cho' => 'Tại chỗ',
        'mang_ve' => 'Mang về',
        'shopee'  => 'ShopeeFood',
        'grab'    => 'GrabFood',
        'xanhsm'  => 'Xanh SM',
    ];

    /** Kênh app giao hàng: bắt buộc nhập mã đơn, thanh toán qua app. */
    public const APP_CHANNELS = ['shopee', 'grab', 'xanhsm'];

    protected $fillable = [
        'store_id', 'business_date', 'queue_no', 'channel', 'external_code', 'status',
        'subtotal', 'total', 'payment_method', 'note', 'created_by', 'cancelled_at', 'cancel_reason',
    ];

    protected $casts = [
        'business_date' => 'date',
        'cancelled_at'  => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PosOrderItem::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
