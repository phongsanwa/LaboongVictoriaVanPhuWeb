<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyEntryChannel extends Model
{
    public const CHANNELS = [
        'tai_cho' => 'Tại quầy',
        'mang_ve' => 'Mang về',
        'grab'    => 'GrabFood',
        'shopee'  => 'ShopeeFood',
        'xanhsm'  => 'Xanh SM',
        'web'     => 'Website',
        'khac'    => 'Khác',
    ];

    protected $fillable = ['daily_entry_id', 'channel', 'net_revenue', 'orders'];

    protected $casts = ['net_revenue' => 'float', 'orders' => 'integer'];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(DailyEntry::class, 'daily_entry_id');
    }
}
