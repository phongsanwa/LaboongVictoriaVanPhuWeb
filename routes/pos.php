<?php

use App\Http\Controllers\PosController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'staff'])->prefix('pos')->name('pos.')->group(function () {
    Route::get('/points', [PosController::class, 'index'])->name('points');
    // Lên đơn tại quầy: tại chỗ, mang về, ShopeeFood, GrabFood, Xanh SM (in hoá đơn + tem).
    Route::get('/sell', [\App\Http\Controllers\PosSellController::class, 'index'])->name('sell');
    Route::get('/sell/orders', [\App\Http\Controllers\PosSellController::class, 'orders'])->name('sell.orders');
    Route::post('/sell/orders', [\App\Http\Controllers\PosSellController::class, 'store'])->name('sell.store');
    Route::post('/sell/orders/{posOrder}/cancel', [\App\Http\Controllers\PosSellController::class, 'cancel'])->name('sell.cancel');
    Route::get('/recipes', [\App\Http\Controllers\PosRecipesController::class, 'index'])->name('recipes');
    Route::get('/attendance', [\App\Http\Controllers\PosAttendanceController::class, 'index'])->name('attendance');
    Route::post('/attendance/{worker}/in', [\App\Http\Controllers\PosAttendanceController::class, 'clockIn'])->name('attendance.in');
    Route::post('/attendance/{worker}/out', [\App\Http\Controllers\PosAttendanceController::class, 'clockOut'])->name('attendance.out');
    Route::post('/points/lookup', [PosController::class, 'lookup'])->name('points.lookup');
    Route::post('/points/charge', [PosController::class, 'charge'])->name('points.charge');
    Route::post('/redeem/lookup', [PosController::class, 'lookupRedemption'])->name('redeem.lookup');
    Route::post('/redeem/confirm', [PosController::class, 'confirmRedemption'])->name('redeem.confirm');
});
