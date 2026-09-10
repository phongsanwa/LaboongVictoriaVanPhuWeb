<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Xác thực API bằng Bearer token (bảng api_tokens). Đặt user vào guard mặc định
 * để các controller sẵn có dùng Auth::user() như bình thường.
 */
class ApiAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $plain = $request->bearerToken();
        if (!$plain) {
            return response()->json(['message' => 'Chưa đăng nhập'], 401);
        }

        $token = ApiToken::with('user')->where('token', ApiToken::hash($plain))->first();
        if (!$token || !$token->user) {
            return response()->json(['message' => 'Phiên đăng nhập không hợp lệ'], 401);
        }

        $user = $token->user;
        if ($user->status !== 'active') {
            return response()->json(['message' => 'Tài khoản đã bị khoá'], 403);
        }

        // Cập nhật mốc dùng gần nhất + online (không chặn request nếu lỗi)
        try {
            $token->forceFill(['last_used_at' => now()])->saveQuietly();
            $user->forceFill(['last_seen_at' => now()])->saveQuietly();
        } catch (\Throwable $e) { /* ignore */ }

        auth()->setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
