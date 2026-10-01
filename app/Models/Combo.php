<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Combo extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'image_url',
        'combo_price',
        'original_price',
        'max_per_day',
        'available_from',
        'available_until',
        'valid_from',
        'valid_until',
        'status',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'valid_from'   => 'date',
            'valid_until'  => 'date',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(ComboItem::class)->orderBy('sort_order');
    }

    /** Tính lại original_price từ tổng base_price của các sản phẩm con */
    public function recalcOriginalPrice(): void
    {
        $this->original_price = $this->items()
            ->with('product')
            ->get()
            ->sum(fn ($ci) => ($ci->product->base_price ?? 0) * $ci->quantity);
        $this->save();
    }

    /** Phần trăm tiết kiệm */
    public function savingPercent(): int
    {
        if ($this->original_price <= 0) return 0;
        return (int) round((1 - $this->combo_price / $this->original_price) * 100);
    }

    /** Kiểm tra combo có đang trong khung giờ bán không */
    public function isAvailableNow(): bool
    {
        if ($this->status !== 'active') return false;
        $now = now();
        if ($this->valid_from && $now->lt($this->valid_from->startOfDay())) return false;
        if ($this->valid_until && $now->gt($this->valid_until->endOfDay())) return false;
        if ($this->available_from && $this->available_until) {
            $t = $now->format('H:i:s');
            if ($t < $this->available_from || $t > $this->available_until) return false;
        }
        return true;
    }
}
