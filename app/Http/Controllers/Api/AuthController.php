<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiToken;
use App\Models\AppSetting;
use App\Models\Customer;
use App\Models\CustomerTier;
use App\Models\User;
use App\Support\ZaloClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * POST /api/auth/zalo
     * Body: { access_token, phone_token?, name? }
     * Trả: { token, user, is_new }
     */
    public function zalo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'access_token' => ['required', 'string'],
            'phone_token'  => ['nullable', 'string'],
            'name'         => ['nullable', 'string', 'max:100'],
        ]);

        if (!ZaloClient::configured()) {
            return response()->json(['message' => 'Máy chủ chưa cấu hình Zalo (thiếu app secret).'], 503);
        }

        $profile = ZaloClient::verifyAccessToken($data['access_token']);
        if (!$profile) {
            return response()->json(['message' => 'Access token Zalo không hợp lệ hoặc đã hết hạn.'], 401);
        }

        $zaloId = $profile['id'];
        $isNew  = false;

        // 1) Đã từng đăng nhập bằng Zalo → nhận diện ngay.
        $user = User::where('zalo_id', $zaloId)->first();

        if (!$user) {
            // 2) Cần số điện thoại để tạo / liên kết tài khoản.
            $phone = !empty($data['phone_token'])
                ? ZaloClient::getPhone($data['access_token'], $data['phone_token'])
                : null;

            if (!$phone) {
                return response()->json([
                    'message'    => 'Cần cấp quyền số điện thoại để tiếp tục.',
                    'need_phone' => true,
                ], 422);
            }

            $user = User::where('phone', $phone)->first();

            if ($user) {
                // Liên kết tài khoản sẵn có với Zalo.
                $user->forceFill([
                    'zalo_id'    => $zaloId,
                    'avatar_url' => $user->avatar_url ?: ($profile['avatar'] ?? null),
                ])->save();
            } else {
                // Tạo tài khoản mới (kèm quà chào mừng như đăng ký web).
                $user  = $this->createZaloCustomer($zaloId, $phone, $data['name'] ?? $profile['name'], $profile['avatar'] ?? null);
                $isNew = true;
            }
        }

        if ($user->status !== 'active') {
            return response()->json(['message' => 'Tài khoản đã bị khoá.'], 403);
        }

        $token = ApiToken::issue($user, 'zalo-mini-app');

        return response()->json([
            'token'  => $token,
            'is_new' => $isNew,
            'user'   => $this->userPayload($user),
        ]);
    }

    /** POST /api/auth/logout — thu hồi token hiện tại. */
    public function logout(Request $request): JsonResponse
    {
        $plain = $request->bearerToken();
        if ($plain) {
            ApiToken::where('token', ApiToken::hash($plain))->delete();
        }

        return response()->json(['message' => 'Đã đăng xuất']);
    }

    /** GET /api/me — thông tin tài khoản + điểm + hạng. */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userPayload($request->user())]);
    }

    /* ─── Helpers ─── */

    private function createZaloCustomer(string $zaloId, string $phone, ?string $name, ?string $avatar): User
    {
        $welcome = max(0, (int) (AppSetting::get('points', [])['welcome'] ?? 50));

        return DB::transaction(function () use ($zaloId, $phone, $name, $avatar, $welcome) {
            $user = User::create([
                'name'              => $name ?: 'Khách Zalo',
                'phone'             => $phone,
                // Email bắt buộc & unique trong schema → dùng email tạm cho tài khoản Zalo.
                'email'             => 'zalo_' . $zaloId . '@zalo.local',
                'phone_verified_at' => now(),
                'password'          => Hash::make(Str::random(32)),
                'user_type'         => 'customer',
                'status'            => 'active',
                'avatar_url'        => $avatar,
                'zalo_id'           => $zaloId,
            ]);

            $tier = CustomerTier::orderBy('level')->first();

            $customer = Customer::create([
                'user_id'          => $user->id,
                'tier_id'          => $tier?->id,
                'total_points'     => $welcome,
                'lifetime_points'  => $welcome,
                'referral_code'    => 'LBVP-' . strtoupper(Str::random(6)),
                'is_newsletter'    => true,
                'is_push_enabled'  => true,
            ]);

            if ($welcome > 0) {
                DB::table('customer_points')->insert([
                    'customer_id'    => $customer->id,
                    'transaction_id' => null,
                    'point_type'     => 'bonus',
                    'points'         => $welcome,
                    'description'    => 'Quà chào mừng thành viên mới (Zalo)',
                    'reference_id'   => null,
                    'expires_at'     => null,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            return $user;
        });
    }

    private function userPayload(User $user): array
    {
        $c = $user->customer()->with('tier')->first();

        return [
            'id'            => $user->id,
            'name'          => $user->name,
            'phone'         => $user->phone,
            'email'         => str_ends_with((string) $user->email, '@zalo.local') ? null : $user->email,
            'avatar_url'    => $user->avatar_url,
            'points'        => $c ? (float) $c->total_points : 0,
            'lifetime_points' => $c ? (float) $c->lifetime_points : 0,
            'tier'          => $c?->tier ? ['id' => $c->tier->id, 'name' => $c->tier->name] : null,
            'referral_code' => $c?->referral_code,
            'total_orders'  => $c ? (int) $c->total_orders : 0,
            'total_spent'   => $c ? (int) $c->total_spent : 0,
        ];
    }
}
