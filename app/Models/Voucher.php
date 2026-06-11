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
        'qr_code',
        'discount_type',
        'discount_value',
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
}
