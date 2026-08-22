<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'category_id',
        'is_combo',
        'name',
        'slug',
        'description',
        'base_price',
        'prep_minutes',
        'color',
        'tags',
        'image_url',
        'is_available',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_available' => 'boolean',
            'is_combo'     => 'boolean',
            'tags'         => 'array',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function sizes(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->where('variant_type', 'SIZE')->orderBy('sort_order');
    }

    public function toppings(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->where('variant_type', 'TOPPING')->orderBy('sort_order');
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** Các món con thuộc combo này (chỉ dùng khi is_combo = true). */
    public function comboItems(): HasMany
    {
        return $this->hasMany(ComboItem::class, 'combo_id')->orderBy('sort_order');
    }
}
