<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Token API đơn giản cho Zalo Mini App (không dùng Sanctum).
 * DB chỉ lưu sha256 của token; token thật chỉ trả về 1 lần khi cấp.
 */
class ApiToken extends Model
{
    protected $fillable = ['user_id', 'name', 'token', 'last_used_at'];

    protected function casts(): array
    {
        return ['last_used_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function hash(string $plain): string
    {
        return hash('sha256', $plain);
    }

    /** Cấp token mới cho user. Trả về token thật (chỉ hiện 1 lần). */
    public static function issue(User $user, string $name = 'zalo-mini-app'): string
    {
        $plain = Str::random(64);
        self::create([
            'user_id' => $user->id,
            'name'    => $name,
            'token'   => self::hash($plain),
        ]);

        return $plain;
    }
}
