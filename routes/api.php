<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
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
Route::get('/menu', [CatalogController::class, 'menu']);   // xem thực đơn không cần đăng nhập
Route::get('/home', [CatalogController::class, 'home']);

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
});
