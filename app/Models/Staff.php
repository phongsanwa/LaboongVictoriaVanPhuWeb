<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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

    /** Cửa hàng chính (primary) — POS và các chỗ dùng 1 cửa hàng vẫn đọc cột này. */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** Nhiều cửa hàng nhân viên phụ trách. */
    public function stores(): BelongsToMany
    {
        return $this->belongsToMany(Store::class, 'staff_store')->withTimestamps();
    }

    /** Danh sách id cửa hàng phụ trách (từ bảng nối, fallback cột store_id). */
    public function storeIds(): array
    {
        $ids = $this->relationLoaded('stores')
            ? $this->stores->pluck('id')->all()
            : $this->stores()->pluck('stores.id')->all();

        if (empty($ids) && $this->store_id) {
            $ids = [$this->store_id];
        }

        return array_values(array_unique(array_map('intval', $ids)));
    }
}
