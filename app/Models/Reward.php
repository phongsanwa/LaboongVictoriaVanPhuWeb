<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reward extends Model
{
    protected $fillable = [
        'name',
        'description',
        'reward_type',
        'points_required',
        'value',
        'quantity_available',
        'quantity_total',
        'per_customer_limit',
        'image_url',
        'gradient',
        'valid_from',
        'valid_until',
        'min_purchase',
        'product_id',
        'free_item_quantity',
        'category',
        'status',
        'display_order',
        'is_featured',
    ];

    protected function casts(): array
    {
        return [
            'valid_from'  => 'date',
            'valid_until' => 'date',
            'is_featured' => 'boolean',
            'value'       => 'float',
        ];
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(Redemption::class);
    }

    public function product(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Models\Product::class);
    }
}
