<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Như ApiAuth nhưng không bắt buộc: có Bearer token hợp lệ thì gắn user (để trả kèm
 * dữ liệu riêng của khách), không có / sai token thì vẫn cho xem như khách vãng lai.
 */
class ApiAuthOptional
{
    public function handle(Request $request, Closure $next): Response
    {
        $plain = $request->bearerToken();
        if ($plain) {
            $token = ApiToken::with('user')->where('token', ApiToken::hash($plain))->first();
            $user = $token?->user;
            if ($user && $user->status === 'active') {
                auth()->setUser($user);
                $request->setUserResolver(fn () => $user);
            }
        }

        return $next($request);
    }
}
