<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComboItem extends Model
{
    protected $fillable = [
        'combo_id', 'product_id', 'quantity',
        'default_size_variant_id', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'quantity'   => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function combo(): BelongsTo
    {
        return $this->belongsTo(Combo::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function defaultSizeVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'default_size_variant_id');
    }
}
