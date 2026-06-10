<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\OtpToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class LoginController extends Controller
{
    public function show()
    {
        return view('login');
    }

    /**
     * Send a login OTP to the given phone number.
     */
    public function sendOtp(Request $request): JsonResponse
    {
        $validator = $this->validatePhone($request);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $phone = $request->input('phone');
        $user = User::where('phone', $phone)->first();

        if (!$user) {
            return response()->json([
                'message' => 'Số điện thoại này chưa có tài khoản.',
                'not_registered' => true,
            ], 422);
        }

        $otpCode = (string) random_int(100000, 999999);

        OtpToken::where('phone', $phone)->where('purpose', 'login')->where('is_used', false)->delete();

        OtpToken::create([
            'phone' => $phone,
            'otp_code' => $otpCode,
            'purpose' => 'login',
            'is_used' => false,
            'expires_at' => now()->addMinutes(3),
            'created_at' => now(),
        ]);

        Log::info("Laboong login OTP for {$phone}: {$otpCode}");

        return response()->json([
            'message' => 'Đã gửi mã đăng nhập tới số điện thoại của bạn.',
            'debug_otp' => config('app.debug') ? $otpCode : null,
        ]);
    }

    /**
     * Verify the login OTP and log the user in.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $validator = $this->validatePhone($request);
        $validator->addRules(['otp_code' => ['required', 'digits:6']]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $phone = $request->input('phone');

        $token = OtpToken::where('phone', $phone)
            ->where('purpose', 'login')
            ->where('is_used', false)
            ->latest('id')
            ->first();

        if (!$token || $token->expires_at->isPast()) {
            return response()->json(['message' => 'Mã đã hết hạn'], 422);
        }

        if ($token->otp_code !== $request->input('otp_code')) {
            return response()->json(['message' => 'Mã không đúng. Vui lòng kiểm tra lại.'], 422);
        }

        $user = User::where('phone', $phone)->first();

        if (!$user) {
            return response()->json(['message' => 'Số điện thoại này chưa có tài khoản.', 'not_registered' => true], 422);
        }

        $token->update(['is_used' => true, 'used_at' => now()]);

        $this->login($user, $request);

        return response()->json(['message' => 'Đăng nhập thành công', 'redirect' => route('home')]);
    }

    /**
     * Log in with phone + password.
     */
    public function loginWithPassword(Request $request): JsonResponse
    {
        $validator = $this->validatePhone($request);
        $validator->addRules(['password' => ['required', 'string']]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $phone = $request->input('phone');

        if (!User::where('phone', $phone)->exists()) {
            return response()->json(['message' => 'Số điện thoại này chưa có tài khoản.', 'not_registered' => true], 422);
        }

        if (!Auth::attempt(['phone' => $phone, 'password' => $request->input('password')], $request->boolean('remember', true))) {
            return response()->json(['message' => 'Mật khẩu không đúng.'], 422);
        }

        $request->session()->regenerate();

        $user = Auth::user();
        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json(['message' => 'Đăng nhập thành công', 'redirect' => route('home')]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }

    private function login(User $user, Request $request): void
    {
        Auth::login($user);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();
    }

    private function validatePhone(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'phone' => ['required', 'regex:/^0(3|5|7|8|9)\d{8}$/'],
        ], [
            'phone.regex' => 'Số điện thoại không đúng định dạng',
        ]);
    }
}
