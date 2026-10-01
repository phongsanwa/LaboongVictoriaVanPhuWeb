<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingPromotion extends Model
{
    protected $fillable = [
        'name',
        'min_order_amount',
        'max_km',
        'discount_type',
        'discount_value',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'min_order_amount' => 'integer',
            'max_km'           => 'decimal:2',
            'discount_value'   => 'integer',
            'is_active'        => 'boolean',
        ];
    }

    /** Tính phí ship sau khi áp khuyến mãi này. */
    public function calcEffectiveFee(int $baseFee): int
    {
        return match ($this->discount_type) {
            'free'    => 0,
            'percent' => max(0, $baseFee - (int) floor($baseFee * $this->discount_value / 100)),
            'amount'  => max(0, $baseFee - $this->discount_value),
            default   => $baseFee,
        };
    }

    public function badgeLabel(): string
    {
        return match ($this->discount_type) {
            'free'    => 'Miễn phí',
            'percent' => "-{$this->discount_value}%",
            'amount'  => '-' . number_format($this->discount_value, 0, ',', '.') . 'đ',
            default   => '',
        };
    }
}
