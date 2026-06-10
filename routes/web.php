<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
})->middleware('auth')->name('home');

Route::get('/register', [RegisterController::class, 'show'])->name('register');
Route::post('/register/otp', [RegisterController::class, 'sendOtp'])->name('register.otp');
Route::post('/register/verify', [RegisterController::class, 'verify'])->name('register.verify');

Route::get('/login', [LoginController::class, 'show'])->name('login');
Route::post('/login/otp', [LoginController::class, 'sendOtp'])->name('login.otp');
Route::post('/login/verify', [LoginController::class, 'verifyOtp'])->name('login.verify');
Route::post('/login/password', [LoginController::class, 'loginWithPassword'])->name('login.password');
Route::post('/logout', [LoginController::class, 'logout'])->name('logout');
