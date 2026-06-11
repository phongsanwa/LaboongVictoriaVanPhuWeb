<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerTier;
use App\Models\OtpToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RegisterController extends Controller
{
    public function show()
    {
        return view('register');
    }

    /**
     * Step 1: validate the form and send an OTP to the given phone number.
     */
    public function sendOtp(Request $request): JsonResponse
    {
        $validator = $this->validateForm($request, checkUnique: true);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $phone = $request->input('phone');
        $otpCode = (string) random_int(100000, 999999);

        OtpToken::where('phone', $phone)->where('purpose', 'registration')->where('is_used', false)->delete();

        OtpToken::create([
            'phone' => $phone,
            'otp_code' => $otpCode,
            'purpose' => 'registration',
            'is_used' => false,
            'expires_at' => now()->addMinutes(3),
            'created_at' => now(),
        ]);

        Log::info("Laboong registration OTP for {$phone}: {$otpCode}");

        return response()->json([
            'message' => 'Đã gửi mã xác thực tới số điện thoại của bạn.',
            // Exposed only in debug/demo so the flow can be tested without an SMS gateway.
            'debug_otp' => config('app.debug') ? $otpCode : null,
        ]);
    }

    /**
     * Step 2: verify the OTP and create the account.
     */
    public function verify(Request $request): JsonResponse
    {
        $validator = $this->validateForm($request);
        $validator->addRules(['otp_code' => ['required', 'digits:6']]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $phone = $request->input('phone');

        $token = OtpToken::where('phone', $phone)
            ->where('purpose', 'registration')
            ->where('is_used', false)
            ->latest('id')
            ->first();

        if (!$token || $token->expires_at->isPast()) {
            return response()->json(['message' => 'Mã đã hết hạn'], 422);
        }

        if ($token->otp_code !== $request->input('otp_code')) {
            return response()->json(['message' => 'Mã không đúng. Vui lòng kiểm tra lại.'], 422);
        }

        if (User::where('phone', $phone)->exists()) {
            return response()->json(['message' => 'Số điện thoại này đã được đăng ký'], 422);
        }

        $token->update(['is_used' => true, 'used_at' => now()]);

        $welcomeBonus = 50;

        $user = DB::transaction(function () use ($request, $phone, $welcomeBonus) {
            $user = User::create([
                'name' => $request->input('name'),
                'phone' => $phone,
                'email' => $request->input('email') ?: $phone . '@laboong.local',
                'phone_verified_at' => now(),
                'password' => Hash::make($request->input('password')),
                'user_type' => 'customer',
                'status' => 'active',
            ]);

            $tier = CustomerTier::orderBy('level')->first();

            $customer = Customer::create([
                'user_id' => $user->id,
                'date_of_birth' => $request->input('dob') ?: null,
                'tier_id' => $tier?->id,
                'total_points' => $welcomeBonus,
                'lifetime_points' => $welcomeBonus,
                'referral_code' => 'LBVP-' . strtoupper(Str::random(6)),
                'is_newsletter' => true,
                'is_push_enabled' => true,
            ]);

            DB::table('customer_points')->insert([
                'customer_id' => $customer->id,
                'transaction_id' => null,
                'point_type' => 'bonus',
                'points' => $welcomeBonus,
                'description' => 'Quà chào mừng thành viên mới',
                'reference_id' => null,
                'expires_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $user;
        });

        Auth::login($user);

        return response()->json([
            'message' => 'Đăng ký thành công',
            'redirect' => route('home'),
        ]);
    }

    private function validateForm(Request $request, bool $checkUnique = false): \Illuminate\Validation\Validator
    {
        $phoneRules = ['required', 'regex:/^0(3|5|7|8|9)\d{8}$/'];

        if ($checkUnique) {
            $phoneRules[] = Rule::unique('users', 'phone');
        }

        return Validator::make($request->all(), [
            'phone' => $phoneRules,
            'name' => ['required', 'string', 'min:2'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'email' => ['nullable', 'email'],
            'dob' => ['nullable', 'date'],
        ], [
            'phone.regex' => 'Số điện thoại không hợp lệ',
            'phone.unique' => 'Số điện thoại này đã được đăng ký',
            'name.min' => 'Vui lòng nhập họ tên',
            'password.required' => 'Vui lòng nhập mật khẩu',
            'password.min' => 'Mật khẩu phải có ít nhất 6 ký tự',
            'password.confirmed' => 'Mật khẩu xác nhận không khớp',
        ]);
    }
}
