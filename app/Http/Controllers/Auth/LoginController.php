<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class LoginController extends Controller
{
    public function show()
    {
        return view('login');
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

        return response()->json(['message' => 'Đăng nhập thành công', 'redirect' => $this->redirectPathFor($user)]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }

    private function redirectPathFor(User $user): string
    {
        if ($user->user_type === 'admin') {
            return route('admin.dashboard');
        }

        if ($user->user_type === 'staff') {
            // Quản lý vào thẳng trang admin; thu ngân vào POS như cũ
            if ($user->staff?->role === 'manager' && $user->staff?->status === 'active') {
                return route('admin.dashboard');
            }

            return route('pos.points');
        }

        return route('home');
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
