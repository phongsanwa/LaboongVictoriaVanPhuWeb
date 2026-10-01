<?php

use App\Http\Controllers\Admin\CampaignsController;
use App\Http\Controllers\Admin\CombosController;
use App\Http\Controllers\Admin\DailyEntriesController;
use App\Http\Controllers\Admin\RecipesController;
use App\Http\Controllers\Admin\CustomersController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EmailController;
use App\Http\Controllers\Admin\OrdersController;
use App\Http\Controllers\Admin\PointsController;
use App\Http\Controllers\Admin\RewardsController;
use App\Http\Controllers\Admin\RolesController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\IngredientsController;
use App\Http\Controllers\Admin\StoresController;
use App\Http\Controllers\Admin\OverviewController;
use App\Http\Controllers\Admin\ReportsController;
use Illuminate\Support\Facades\Route;

/*
 * Khu admin: admin toàn quyền; tài khoản quản lý (staff cashier/manager,
 * status active) vào theo ma trận phân quyền trên trang /admin/roles.
 * 'admin.perm'       = chỉ cần là admin / staff active
 * 'admin.perm:key'   = thêm điều kiện vai trò có quyền `key`
 */
Route::middleware(['auth', 'admin.perm'])->prefix('admin')->name('admin.')->group(function () {
    // Tổng quan — mọi tài khoản quản lý đều xem được
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/customers', [CustomersController::class, 'index'])->name('customers.index');
    Route::put('/customers/{customer}', [CustomersController::class, 'update'])->name('customers.update');
    Route::post('/customers/{customer}/toggle', [CustomersController::class, 'toggle'])->name('customers.toggle');
    Route::get('/points', [PointsController::class, 'index'])->name('points.index');
    Route::post('/points/adjust', [PointsController::class, 'adjust'])->name('points.adjust');
    Route::get('/rewards', [RewardsController::class, 'index'])->name('rewards.index');
    Route::post('/rewards', [RewardsController::class, 'store'])->name('rewards.store');
    Route::put('/rewards/{reward}', [RewardsController::class, 'update'])->name('rewards.update');
    Route::post('/rewards/{reward}/toggle', [RewardsController::class, 'toggle'])->name('rewards.toggle');
    Route::post('/rewards/{reward}/duplicate', [RewardsController::class, 'duplicate'])->name('rewards.duplicate');
    Route::delete('/rewards/{reward}', [RewardsController::class, 'destroy'])->name('rewards.destroy');
    Route::get('/campaigns', [CampaignsController::class, 'index'])->name('campaigns.index');
    Route::post('/campaigns', [CampaignsController::class, 'store'])->name('campaigns.store');
    Route::put('/campaigns/{campaign}', [CampaignsController::class, 'update'])->name('campaigns.update');
    Route::post('/campaigns/{campaign}/toggle', [CampaignsController::class, 'toggle'])->name('campaigns.toggle');
    Route::post('/campaigns/{campaign}/push', [CampaignsController::class, 'push'])->name('campaigns.push');
    Route::get('/roles', [RolesController::class, 'index'])->name('roles.index');
    Route::post('/roles', [RolesController::class, 'update'])->name('roles.update');
    Route::post('/roles/assign', [RolesController::class, 'assign'])->name('roles.assign');
    Route::delete('/roles/staff/{staff}', [RolesController::class, 'removeStaff'])->name('roles.staff.remove');
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::post('/settings', [SettingsController::class, 'update'])->name('settings.update');
    Route::post('/settings/logo', [SettingsController::class, 'uploadLogo'])->name('settings.logo.upload');
    Route::delete('/settings/logo', [SettingsController::class, 'deleteLogo'])->name('settings.logo.delete');
    Route::post('/settings/favicon', [SettingsController::class, 'uploadFavicon'])->name('settings.favicon.upload');
    Route::delete('/settings/favicon', [SettingsController::class, 'deleteFavicon'])->name('settings.favicon.delete');
    Route::get('/combos', [CombosController::class, 'index'])->name('combos.index');
    Route::post('/combos', [CombosController::class, 'store'])->name('combos.store');
    Route::put('/combos/{combo}', [CombosController::class, 'update'])->name('combos.update');
    Route::post('/combos/{combo}/toggle', [CombosController::class, 'toggle'])->name('combos.toggle');
    Route::delete('/combos/{combo}', [CombosController::class, 'destroy'])->name('combos.destroy');
    Route::get('/ingredients', [IngredientsController::class, 'index'])->name('ingredients.index');
    Route::post('/ingredients', [IngredientsController::class, 'store'])->name('ingredients.store');
    Route::put('/ingredients/{ingredient}', [IngredientsController::class, 'update'])->name('ingredients.update');
    Route::delete('/ingredients/{ingredient}', [IngredientsController::class, 'destroy'])->name('ingredients.destroy');
    Route::post('/ingredients/{ingredient}/overrides/{store}', [IngredientsController::class, 'storeOverride'])->name('ingredients.overrides.store');
    Route::delete('/ingredients/{ingredient}/overrides/{store}', [IngredientsController::class, 'destroyOverride'])->name('ingredients.overrides.destroy');
    Route::get('/stores', [StoresController::class, 'index'])->name('stores.index');
    Route::post('/stores', [StoresController::class, 'store'])->name('stores.store');
    Route::put('/stores/{store}', [StoresController::class, 'update'])->name('stores.update');
    Route::post('/stores/{store}/toggle', [StoresController::class, 'toggle'])->name('stores.toggle');
    Route::delete('/stores/{store}', [StoresController::class, 'destroy'])->name('stores.destroy');
    Route::post('/stores/{store}/photos', [StoresController::class, 'uploadPhoto'])->name('stores.photos.upload');
    Route::delete('/stores/{store}/photos', [StoresController::class, 'deletePhoto'])->name('stores.photos.delete');
    Route::get('/stores/{store}/costs', [StoresController::class, 'getCosts'])->name('stores.costs.get');
    Route::post('/stores/{store}/costs', [StoresController::class, 'saveCosts'])->name('stores.costs.save');
    Route::get('/recipes', [RecipesController::class, 'index'])->name('recipes.index');
    Route::post('/recipes', [RecipesController::class, 'store'])->name('recipes.store');
    Route::put('/recipes/{recipe}', [RecipesController::class, 'update'])->name('recipes.update');
    Route::delete('/recipes/{recipe}', [RecipesController::class, 'destroy'])->name('recipes.destroy');
    Route::post('/recipes/{recipe}/snapshot', [RecipesController::class, 'saveSnapshot'])->name('recipes.snapshot');
    Route::get('/daily-entries', [DailyEntriesController::class, 'index'])->name('daily-entries.index');
    Route::post('/daily-entries/{store}/{date}', [DailyEntriesController::class, 'save'])->name('daily-entries.save');
    Route::get('/overview', [OverviewController::class, 'index'])->name('overview.index');
    Route::get('/reports', [ReportsController::class, 'index'])->name('reports.index');
});
