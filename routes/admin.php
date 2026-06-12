<?php

use App\Http\Controllers\Admin\CustomersController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\PointsController;
use App\Http\Controllers\Admin\RewardsController;
use App\Http\Controllers\Admin\RolesController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/customers', [CustomersController::class, 'index'])->name('customers.index');
    Route::get('/points', [PointsController::class, 'index'])->name('points.index');
    Route::post('/points/adjust', [PointsController::class, 'adjust'])->name('points.adjust');
    Route::get('/rewards', [RewardsController::class, 'index'])->name('rewards.index');
    Route::post('/rewards', [RewardsController::class, 'store'])->name('rewards.store');
    Route::put('/rewards/{reward}', [RewardsController::class, 'update'])->name('rewards.update');
    Route::post('/rewards/{reward}/toggle', [RewardsController::class, 'toggle'])->name('rewards.toggle');
    Route::post('/rewards/{reward}/duplicate', [RewardsController::class, 'duplicate'])->name('rewards.duplicate');
    Route::delete('/rewards/{reward}', [RewardsController::class, 'destroy'])->name('rewards.destroy');
    Route::get('/roles', [RolesController::class, 'index'])->name('roles.index');
    Route::post('/roles', [RolesController::class, 'update'])->name('roles.update');
});
