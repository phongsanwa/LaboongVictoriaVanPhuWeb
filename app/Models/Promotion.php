<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Promotion extends Model
{
    protected $fillable = [
        'kind', 'name', 'code', 'type', 'value', 'scope', 'is_active', 'sort_order',
        'min_purchase', 'max_discount', 'valid_from', 'valid_until',
        'usage_limit_total', 'usage_limit_per_customer', 'applies_to', 'claimed_count',
    ];

    protected function casts(): array
    {
        return [
            'is_active'   => 'boolean',
            'value'       => 'integer',
            'valid_from'  => 'date',
            'valid_until' => 'date',
        ];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'promotion_products');
    }

    public function calcSalePrice(int $price): int
    {
        if ($this->type === 'percent') {
            return max(0, $price - (int) floor($price * $this->value / 100));
        }
        // Đồng giá: bán ra đúng mức giá cố định (không vượt quá giá gốc).
        if ($this->type === 'fixed') {
            return max(0, min($price, (int) $this->value));
        }
        return max(0, $price - $this->value);
    }

    public function badgeLabel(): string
    {
        if ($this->type === 'percent') {
            return "-{$this->value}%";
        }
        if ($this->type === 'fixed') {
            return 'Đồng giá';
        }
        return '-' . number_format($this->value, 0, ',', '.') . 'đ';
    }
}
