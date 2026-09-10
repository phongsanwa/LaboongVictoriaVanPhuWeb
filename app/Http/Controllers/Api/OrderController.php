<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\OrderHistoryController;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    /**
     * GET /api/orders — lịch sử đơn hàng của khách (kèm cấu hình ngân hàng để
     * dựng lại mã VietQR cho đơn chuyển khoản chưa thanh toán).
     *
     * Đặt hàng dùng chung endpoint POST /api/orders → App\Http\Controllers\OrderController@place.
     */
    public function index(): JsonResponse
    {
        return response()->json(app(OrderHistoryController::class)->buildHistoryData());
    }
}
