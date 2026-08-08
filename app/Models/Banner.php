<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Banner extends Model
{
    protected $fillable = [
        'title',
        'image_desktop',
        'image_mobile',
        'link_url',
        'sort_order',
        'status',
    ];
}
