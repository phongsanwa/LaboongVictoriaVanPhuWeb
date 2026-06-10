<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Store extends Model
{
    protected $fillable = [
        'name',
        'address',
        'city',
        'phone',
        'email',
        'latitude',
        'longitude',
        'opening_time',
        'closing_time',
        'operating_days',
        'qr_code_url',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'operating_days' => 'array',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
        ];
    }
}
