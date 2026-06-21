<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'photos',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'operating_days' => 'array',
            'photos'         => 'array',
            'latitude'       => 'decimal:8',
            'longitude'      => 'decimal:8',
        ];
    }

    public function staff(): HasMany
    {
        return $this->hasMany(Staff::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }
}
