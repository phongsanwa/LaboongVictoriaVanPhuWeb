<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    protected $fillable = ['name', 'subject', 'body', 'attach_qr'];

    protected function casts(): array
    {
        return ['attach_qr' => 'boolean'];
    }
}
