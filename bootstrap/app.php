<?php

use App\Http\Middleware\ApiAuth;
use App\Http\Middleware\EnsureAdminAccess;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserIsStaff;
use App\Http\Middleware\TrackLastSeen;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
            'admin.perm' => EnsureAdminAccess::class,
            'staff' => EnsureUserIsStaff::class,
            'auth.api' => ApiAuth::class,
        ]);

        // Theo dõi online/offline cho mọi request web đã đăng nhập
        $middleware->web(append: [TrackLastSeen::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
