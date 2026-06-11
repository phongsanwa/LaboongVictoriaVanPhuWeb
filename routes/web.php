<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\PointsController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->middleware('auth')->name('home');
Route::get('/points', [PointsController::class, 'index'])->middleware('auth')->name('points');

Route::middleware('auth')->prefix('profile')->name('profile.')->group(function () {
    Route::get('/', [ProfileController::class, 'show'])->name('show');
    Route::put('/', [ProfileController::class, 'update'])->name('update');
    Route::post('/addresses', [ProfileController::class, 'storeAddress'])->name('addresses.store');
    Route::put('/addresses/{address}', [ProfileController::class, 'updateAddress'])->name('addresses.update');
    Route::delete('/addresses/{address}', [ProfileController::class, 'destroyAddress'])->name('addresses.destroy');
    Route::post('/addresses/{address}/default', [ProfileController::class, 'setDefaultAddress'])->name('addresses.default');
});

Route::get('/register', [RegisterController::class, 'show'])->name('register');
Route::post('/register/otp', [RegisterController::class, 'sendOtp'])->name('register.otp');
Route::post('/register/verify', [RegisterController::class, 'verify'])->name('register.verify');

Route::get('/login', [LoginController::class, 'show'])->name('login');
Route::post('/login/otp', [LoginController::class, 'sendOtp'])->name('login.otp');
Route::post('/login/verify', [LoginController::class, 'verifyOtp'])->name('login.verify');
Route::post('/login/password', [LoginController::class, 'loginWithPassword'])->name('login.password');
Route::post('/logout', [LoginController::class, 'logout'])->name('logout');
