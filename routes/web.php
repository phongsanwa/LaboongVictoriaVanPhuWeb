<?php

use App\Http\Controllers\Auth\RegisterController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
})->name('home');

Route::get('/register', [RegisterController::class, 'show'])->name('register');
Route::post('/register/otp', [RegisterController::class, 'sendOtp'])->name('register.otp');
Route::post('/register/verify', [RegisterController::class, 'verify'])->name('register.verify');
