<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cập nhật mốc "hoạt động gần nhất" (users.last_seen_at) cho người đang đăng nhập.
 * Ghi tối đa 1 lần / phút cho mỗi user (khoá bằng cache) để không ghi DB mỗi request.
 */
class TrackLastSeen
{
    private const THROTTLE_SECONDS = 60;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $key = 'last-seen:' . $user->id;
            if (!Cache::has($key)) {
                Cache::put($key, true, self::THROTTLE_SECONDS);
                // Ghi thẳng, không đụng updated_at để tránh nhiễu dữ liệu
                $user->forceFill(['last_seen_at' => now()])->saveQuietly();
            }
        }

        return $next($request);
    }
}
