<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionDetail extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'transaction_id',
        'item_name',
        'item_code',
        'quantity',
        'unit_price',
        'total_price',
        'notes',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
