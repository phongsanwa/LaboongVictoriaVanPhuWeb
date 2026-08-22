<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComboItem extends Model
{
    protected $fillable = [
        'combo_id',
        'item_product_id',
        'quantity',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'quantity'   => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /** Sản phẩm combo (cha). */
    public function combo(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'combo_id');
    }

    /** Món con trong combo. */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'item_product_id')->withTrashed();
    }
}
