<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Staff extends Model
{
    protected $fillable = [
        'user_id',
        'store_id',
        'role',
        'employee_code',
        'pin',
        'status',
        'hired_date',
    ];

    protected function casts(): array
    {
        return [
            'hired_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
