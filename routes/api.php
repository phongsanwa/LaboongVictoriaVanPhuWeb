<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\CheckinController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\RewardsCatalogController;
use App\Http\Controllers\Api\OrderController as ApiOrderController;
use App\Http\Controllers\MapsController;
use App\Http\Controllers\OrderController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API cho Zalo Mini App (prefix /api). Xác thực bằng Bearer token (auth.api).
|--------------------------------------------------------------------------
*/

// Công khai (không cần token)
Route::post('/auth/zalo', [AuthController::class, 'zalo']);
// Xem không cần đăng nhập; có token thì kèm dữ liệu của khách (địa chỉ, điểm, điểm danh…).
Route::middleware('auth.api.optional')->group(function () {
    Route::get('/menu', [CatalogController::class, 'menu']);
    Route::get('/home', [CatalogController::class, 'home']);
});

// Cần đăng nhập (Bearer token)
Route::middleware('auth.api')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);

    // Đặt hàng dùng lại đúng logic web (tính giá/khuyến mãi/điểm ở server).
    Route::post('/orders', [OrderController::class, 'place']);
    Route::get('/orders', [ApiOrderController::class, 'index']);

    // Geocode địa chỉ → toạ độ (để tính phí ship). Dùng nhà cung cấp bản đồ đã chọn.
    Route::get('/geo/geocode', [MapsController::class, 'geocode']);
    Route::get('/geo/autocomplete', [MapsController::class, 'autocomplete']);
    Route::get('/geo/distance', [MapsController::class, 'distance']);

    // Thành viên: điểm, đổi quà, ví quà, voucher dùng cho giỏ hàng, điểm danh, hồ sơ.
    Route::get('/points', [MemberController::class, 'points']);
    Route::get('/rewards', [MemberController::class, 'rewards']);
    Route::get('/rewards/wallet', [MemberController::class, 'wallet']);
    Route::post('/rewards/redeem', [RewardsCatalogController::class, 'redeem']);
    Route::get('/cart/vouchers', [PromotionController::class, 'cartVouchers']);
    Route::post('/promotions/claim', [PromotionController::class, 'claim']);
    Route::post('/checkin', [CheckinController::class, 'store']);
    Route::put('/profile', [MemberController::class, 'updateProfile']);
});
