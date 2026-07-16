<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\NewPassword;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class ForgotPasswordController extends Controller
{
    /**
     * Quên mật khẩu: tạo mật khẩu mới và GỬI VỀ EMAIL đã đăng ký của khách.
     * Chỉ đổi mật khẩu trong DB sau khi email gửi thành công — nếu gửi lỗi,
     * mật khẩu cũ vẫn dùng được, khách không bị khoá ngoài tài khoản.
     */
    public function sendNewPassword(Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), [
            'phone' => ['required', 'regex:/^0(3|5|7|8|9)\d{8}$/'],
        ], ['phone.regex' => 'Số điện thoại không đúng định dạng']);

        if ($v->fails()) {
            return response()->json(['message' => $v->errors()->first()], 422);
        }

        $user = User::where('phone', $request->input('phone'))->first();

        if (!$user) {
            return response()->json(['message' => 'Số điện thoại này chưa có tài khoản.', 'not_registered' => true], 422);
        }

        if (!$user->email) {
            return response()->json([
                'message' => 'Tài khoản chưa đăng ký email. Vui lòng liên hệ cửa hàng để được hỗ trợ đặt lại mật khẩu.',
            ], 422);
        }

        $newPassword = $this->generatePassword();

        try {
            Mail::to($user->email)->send(new NewPassword($user, $newPassword));
        } catch (\Throwable $e) {
            Log::error('Failed to send new password email', ['user_id' => $user->id, 'error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Không gửi được email lúc này, vui lòng thử lại sau ít phút.',
            ], 500);
        }

        // Email đã đi — giờ mới chốt mật khẩu mới
        $user->forceFill(['password' => Hash::make($newPassword)])->save();

        return response()->json([
            'message' => 'Mật khẩu mới đã được gửi về email của bạn',
            'email'   => $this->maskEmail($user->email),
        ]);
    }

    /** Mật khẩu 8 ký tự dễ đọc — bỏ các ký tự dễ nhầm (0/O, 1/l/I). */
    private function generatePassword(): string
    {
        $alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
        $out = '';
        for ($i = 0; $i < 8; $i++) {
            $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        return $out;
    }

    /** Che bớt email khi hiển thị: nguyenvana@gmail.com → ng•••a@gmail.com */
    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);
        $shown = mb_substr($local, 0, 2);
        $tail  = mb_strlen($local) > 3 ? mb_substr($local, -1) : '';

        return $shown . '•••' . $tail . '@' . $domain;
    }
}
