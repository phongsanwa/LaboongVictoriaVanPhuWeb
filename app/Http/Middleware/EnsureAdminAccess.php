<?php

namespace App\Http\Middleware;

use App\Support\AdminAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 'admin.perm'          → admin hoặc staff active (cashier/manager)
 * 'admin.perm:tx_view'  → như trên + vai trò phải có quyền tx_view
 */
class EnsureAdminAccess
{
    public function handle(Request $request, Closure $next, ?string $permKey = null): Response
    {
        $user = $request->user();

        if (!AdminAccess::canEnter($user)) {
            abort(403);
        }

        if ($permKey !== null && !AdminAccess::allows($user, $permKey)) {
            abort(403, 'Tài khoản của bạn không có quyền truy cập chức năng này');
        }

        return $next($request);
    }
}
