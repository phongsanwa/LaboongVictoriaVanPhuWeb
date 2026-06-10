<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerPoint extends Model
{
    protected $table = 'customer_points';

    protected $fillable = [
        'customer_id',
        'transaction_id',
        'point_type',
        'points',
        'description',
        'reference_id',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'date',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
