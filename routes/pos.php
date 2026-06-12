<?php

use App\Http\Controllers\PosController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'staff'])->prefix('pos')->name('pos.')->group(function () {
    Route::get('/points', [PosController::class, 'index'])->name('points');
    Route::post('/points/lookup', [PosController::class, 'lookup'])->name('points.lookup');
    Route::post('/points/charge', [PosController::class, 'charge'])->name('points.charge');
});
