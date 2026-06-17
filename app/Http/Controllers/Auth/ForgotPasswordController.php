<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\OtpToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class ForgotPasswordController extends Controller
{
    private const TTL = 180;

    public function sendOtp(Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), [
            'phone' => ['required', 'regex:/^0(3|5|7|8|9)\d{8}$/'],
        ], ['phone.regex' => 'Số điện thoại không đúng định dạng']);

        if ($v->fails()) {
            return response()->json(['message' => $v->errors()->first()], 422);
        }

        $phone = $request->input('phone');

        if (!User::where('phone', $phone)->exists()) {
            return response()->json(['message' => 'Số điện thoại này chưa có tài khoản.', 'not_registered' => true], 422);
        }

        OtpToken::where('phone', $phone)
            ->where('purpose', 'password_reset')
            ->where('is_used', false)
            ->update(['is_used' => true, 'used_at' => now()]);

        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        OtpToken::create([
            'phone'      => $phone,
            'otp_code'   => $otp,
            'purpose'    => 'password_reset',
            'is_used'    => false,
            'expires_at' => now()->addSeconds(self::TTL),
        ]);

        return response()->json([
            'message'   => 'Mã OTP đã được gửi',
            'debug_otp' => $otp,
            'ttl'       => self::TTL,
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), [
            'phone'                 => ['required', 'regex:/^0(3|5|7|8|9)\d{8}$/'],
            'otp_code'              => ['required', 'string', 'size:6'],
            'password'              => ['required', 'string', 'min:6', 'confirmed'],
            'password_confirmation' => ['required'],
        ], [
            'phone.regex'           => 'Số điện thoại không đúng định dạng',
            'otp_code.size'         => 'Mã OTP phải đúng 6 chữ số',
            'password.min'          => 'Mật khẩu tối thiểu 6 ký tự',
            'password.confirmed'    => 'Xác nhận mật khẩu không khớp',
        ]);

        if ($v->fails()) {
            return response()->json(['message' => $v->errors()->first()], 422);
        }

        $phone = $request->input('phone');

        $token = OtpToken::where('phone', $phone)
            ->where('purpose', 'password_reset')
            ->where('otp_code', $request->input('otp_code'))
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$token) {
            return response()->json(['message' => 'Mã OTP không hợp lệ hoặc đã hết hạn.'], 422);
        }

        $token->update(['is_used' => true, 'used_at' => now()]);

        User::where('phone', $phone)
            ->first()
            ->forceFill(['password' => Hash::make($request->input('password'))])
            ->save();

        return response()->json(['message' => 'Đặt lại mật khẩu thành công']);
    }
}
