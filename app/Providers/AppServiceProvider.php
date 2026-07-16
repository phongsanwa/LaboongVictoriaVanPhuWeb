<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiters();
    }

    /**
     * Giới hạn tần suất cho các cổng nhạy cảm (đăng nhập, gửi OTP, đặt lại mật
     * khẩu, đăng ký) để chống dò mật khẩu và spam OTP/tạo tài khoản hàng loạt.
     */
    private function configureRateLimiters(): void
    {
        $tooMany = fn (string $msg) => fn (Request $request, array $headers) =>
            response()->json(['message' => $msg], 429, $headers);

        // Đăng nhập: khoá theo số điện thoại + IP để tránh dò mật khẩu 1 tài khoản.
        RateLimiter::for('login', fn (Request $request) =>
            Limit::perMinute(5)
                ->by(Str::lower((string) $request->input('phone')) . '|' . $request->ip())
                ->response($tooMany('Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ít phút.'))
        );

        // Quên mật khẩu: chặt hơn vì mỗi lần gửi 1 email — 3 lần / 10 phút.
        RateLimiter::for('otp', fn (Request $request) =>
            Limit::perMinutes(10, 3)
                ->by(Str::lower((string) $request->input('phone')) . '|' . $request->ip())
                ->response($tooMany('Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau vài phút.'))
        );

        // Nhập OTP để đặt lại mật khẩu: chống dò mã OTP.
        RateLimiter::for('reset', fn (Request $request) =>
            Limit::perMinute(5)
                ->by(Str::lower((string) $request->input('phone')) . '|' . $request->ip())
                ->response($tooMany('Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.'))
        );

        // Đăng ký: chống tạo tài khoản hàng loạt từ một IP.
        RateLimiter::for('register', fn (Request $request) =>
            Limit::perMinutes(10, 5)
                ->by($request->ip())
                ->response($tooMany('Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau vài phút.'))
        );
    }
}
