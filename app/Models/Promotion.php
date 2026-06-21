<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Promotion extends Model
{
    protected $fillable = ['name', 'type', 'value', 'scope', 'is_active', 'sort_order'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'value'     => 'integer',
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
        return max(0, $price - $this->value);
    }

    public function badgeLabel(): string
    {
        if ($this->type === 'percent') {
            return "-{$this->value}%";
        }
        return '-' . number_format($this->value, 0, ',', '.') . 'đ';
    }
}
