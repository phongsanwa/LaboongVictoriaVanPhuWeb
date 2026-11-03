<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosOrderItem extends Model
{
    protected $fillable = ['pos_order_id', 'product_id', 'name', 'quantity', 'unit_price', 'line_total', 'size_name', 'options', 'note'];

    protected $casts = ['options' => 'array'];
}
