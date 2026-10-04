<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Combo extends Model
{
    protected $fillable = [
        'name', 'description', 'image_url',
        'combo_price', 'original_price',
        'max_per_day', 'available_from', 'available_until',
        'valid_from', 'valid_until',
        'status', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'combo_price'   => 'integer',
            'original_price'=> 'integer',
            'max_per_day'   => 'integer',
            'sort_order'    => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Combo $combo) {
            if ($combo->slug) return;
            $base = Str::limit(Str::slug($combo->name) ?: 'combo', 90, '');
            $slug = $base;
            for ($i = 2; static::where('slug', $slug)->exists(); $i++) {
                $slug = "{$base}-{$i}";
            }
            $combo->slug = $slug;
        });
    }

    public function items(): HasMany
    {
        return $this->hasMany(ComboItem::class)->orderBy('sort_order');
    }

    public function recalcOriginalPrice(): void
    {
        $total = $this->items()->with('product')->get()->sum(function ($item) {
            return ($item->product->base_price ?? 0) * $item->quantity;
        });
        $this->update(['original_price' => $total]);
    }

    public function savingPercent(): int
    {
        if (!$this->original_price) return 0;
        return (int) round((1 - $this->combo_price / $this->original_price) * 100);
    }

    public function isAvailableNow(): bool
    {
        if ($this->status !== 'active') return false;
        $now = now();
        if ($this->valid_from && $now->lt($this->valid_from)) return false;
        if ($this->valid_until && $now->gt($this->valid_until)) return false;
        $time = $now->format('H:i:s');
        if ($this->available_from && $time < $this->available_from) return false;
        if ($this->available_until && $time > $this->available_until) return false;
        return true;
    }
}
