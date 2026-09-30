<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreMonthlyCost extends Model
{
    protected $fillable = ['store_id', 'year_month', 'costs'];

    protected function casts(): array
    {
        return ['costs' => 'array'];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
