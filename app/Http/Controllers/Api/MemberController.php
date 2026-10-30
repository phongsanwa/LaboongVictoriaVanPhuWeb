<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PointsController;
use App\Http\Controllers\RewardsCatalogController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Thành viên trên Mini App: điểm, quà, ví quà, hồ sơ — dùng lại đúng logic của web. */
class MemberController extends Controller
{
    /** GET /api/points */
    public function points(): JsonResponse
    {
        return response()->json(app(PointsController::class)->buildPointsData());
    }

    /** GET /api/rewards */
    public function rewards(): JsonResponse
    {
        return response()->json(app(RewardsCatalogController::class)->buildCatalogData());
    }

    /** GET /api/rewards/wallet */
    public function wallet(): JsonResponse
    {
        return response()->json(app(RewardsCatalogController::class)->buildWalletData());
    }

    /**
     * PUT /api/profile — { name, dob?, email? }.
     * Tài khoản tạo từ Zalo có email tạm, nên email không bắt buộc ở Mini App.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->merge(['dob' => $request->input('dob') ?: null, 'email' => $request->input('email') ?: null]);

        $data = $request->validate([
            'name'  => ['required', 'string', 'min:2', 'max:100'],
            'dob'   => ['nullable', 'date', 'before:today'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
        ], [
            'name.min'     => 'Vui lòng nhập họ tên',
            'email.email'  => 'Email không hợp lệ',
            'email.unique' => 'Email này đã được sử dụng',
            'dob.before'   => 'Ngày sinh không hợp lệ',
        ]);

        $user->update(['name' => trim($data['name'])] + ($data['email'] ? ['email' => $data['email']] : []));
        $user->customer()->first()?->update(['date_of_birth' => $data['dob']]);

        return response()->json(['message' => 'Đã lưu thông tin', 'user' => AuthController::payloadFor($user->fresh())]);
    }
}
