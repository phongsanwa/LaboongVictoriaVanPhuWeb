<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerTier;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
     * Validate the form and create the account directly (no OTP step).
     */
    public function register(Request $request): JsonResponse
    {
        $validator = $this->validateForm($request);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $phone = $request->input('phone');
        $welcomeBonus = 50;

        $user = DB::transaction(function () use ($request, $phone, $welcomeBonus) {
            $user = User::create([
                'name' => $request->input('name'),
                'phone' => $phone,
                'email' => $request->input('email'),
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

    private function validateForm(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'phone' => ['required', 'regex:/^0(3|5|7|8|9)\d{8}$/', Rule::unique('users', 'phone')],
            'name' => ['required', 'string', 'min:2'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'email' => ['required', 'email', Rule::unique('users', 'email')],
            'dob' => ['nullable', 'date', 'before:today'],
        ], [
            'phone.regex' => 'Số điện thoại không hợp lệ',
            'phone.unique' => 'Số điện thoại này đã được đăng ký',
            'name.min' => 'Vui lòng nhập họ tên',
            'password.required' => 'Vui lòng nhập mật khẩu',
            'password.min' => 'Mật khẩu phải có ít nhất 6 ký tự',
            'password.confirmed' => 'Mật khẩu xác nhận không khớp',
            'email.required' => 'Vui lòng nhập email',
            'email.email' => 'Email không hợp lệ',
            'email.unique' => 'Email này đã được đăng ký',
            'dob.date' => 'Ngày sinh không hợp lệ',
            'dob.before' => 'Ngày sinh không hợp lệ',
        ]);
    }
}
