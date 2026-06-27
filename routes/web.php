<?php

use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MenuPageController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PointsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\RewardsCatalogController;
use App\Http\Controllers\CheckinController;
use App\Http\Controllers\StoreController;
use Illuminate\Support\Facades\Route;

Route::get('/test-maps', fn() => view('test-maps'));

Route::get('/', [HomeController::class, 'index'])->middleware('auth')->name('home');
Route::get('/menu', [MenuPageController::class, 'index'])->middleware('auth')->name('menu');
Route::post('/orders', [OrderController::class, 'place'])->middleware('auth')->name('orders.place');
Route::get('/points', [PointsController::class, 'index'])->middleware('auth')->name('points');
Route::get('/store', [StoreController::class, 'index'])->middleware('auth')->name('store');

Route::middleware('auth')->prefix('rewards')->name('rewards.')->group(function () {
    Route::get('/', [RewardsCatalogController::class, 'index'])->name('catalog');
    Route::get('/wallet', [RewardsCatalogController::class, 'wallet'])->name('wallet');
    Route::post('/redeem', [RewardsCatalogController::class, 'redeem'])->name('redeem');
});

Route::middleware('auth')->prefix('profile')->name('profile.')->group(function () {
    Route::get('/', [ProfileController::class, 'show'])->name('show');
    Route::put('/', [ProfileController::class, 'update'])->name('update');
    Route::post('/avatar', [ProfileController::class, 'uploadAvatar'])->name('avatar');
    Route::post('/addresses', [ProfileController::class, 'storeAddress'])->name('addresses.store');
    Route::put('/addresses/{address}', [ProfileController::class, 'updateAddress'])->name('addresses.update');
    Route::delete('/addresses/{address}', [ProfileController::class, 'destroyAddress'])->name('addresses.destroy');
    Route::post('/addresses/{address}/default', [ProfileController::class, 'setDefaultAddress'])->name('addresses.default');
});

Route::post('/checkin', [CheckinController::class, 'store'])->middleware('auth')->name('checkin.store');

Route::middleware('auth')->group(function () {
    Route::post('/promotions/claim', [PromotionController::class, 'claim'])->name('promotions.claim');
    Route::get('/cart/vouchers', [PromotionController::class, 'cartVouchers'])->name('cart.vouchers');
});

Route::get('/register', [RegisterController::class, 'show'])->name('register');
Route::post('/register', [RegisterController::class, 'register'])->name('register.submit');

Route::get('/login', [LoginController::class, 'show'])->name('login');
Route::post('/login/password', [LoginController::class, 'loginWithPassword'])->name('login.password');
Route::post('/logout', [LoginController::class, 'logout'])->name('logout');

Route::post('/forgot-password/send-otp', [ForgotPasswordController::class, 'sendOtp'])->name('forgot.otp');
Route::post('/forgot-password/reset', [ForgotPasswordController::class, 'reset'])->name('forgot.reset');

require __DIR__.'/admin.php';
require __DIR__.'/pos.php';
