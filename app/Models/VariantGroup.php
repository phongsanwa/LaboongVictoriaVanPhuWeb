<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VariantGroup extends Model
{
    protected $fillable = ['key', 'label', 'ic', 'type', 'required', 'default_option', 'sort_order'];

    protected function casts(): array
    {
        return ['required' => 'boolean'];
    }
}
