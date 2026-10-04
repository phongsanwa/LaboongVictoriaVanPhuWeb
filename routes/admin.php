<?php

use App\Http\Controllers\Admin\BannersController;
use App\Http\Controllers\Admin\CampaignsController;
use App\Http\Controllers\Admin\CheckinController;
use App\Http\Controllers\Admin\CombosController;
use App\Http\Controllers\Admin\DailyEntriesController;
use App\Http\Controllers\Admin\EmailController;
use App\Http\Controllers\Admin\IngredientsController;
use App\Http\Controllers\Admin\MenuController;
use App\Http\Controllers\Admin\NewsController;
use App\Http\Controllers\Admin\OrdersController;
use App\Http\Controllers\Admin\OverviewController;
use App\Http\Controllers\Admin\PromotionsController;
use App\Http\Controllers\Admin\RecipesController;
use App\Http\Controllers\Admin\ReportsController;
use App\Http\Controllers\Admin\CustomersController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\PointsController;
use App\Http\Controllers\Admin\RewardsController;
use App\Http\Controllers\Admin\RolesController;
use App\Http\Controllers\Admin\SeoController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\ShippingController;
use App\Http\Controllers\Admin\StoresController;
use App\Http\Controllers\Admin\VariantsController;
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

    // Đơn hàng
    Route::get('/orders', [OrdersController::class, 'index'])->name('orders.index');
    Route::post('/orders/{order}/advance', [OrdersController::class, 'advance'])->name('orders.advance');
    Route::post('/orders/{order}/cancel', [OrdersController::class, 'cancel'])->name('orders.cancel');
    Route::post('/orders/{order}/payment', [OrdersController::class, 'markPayment'])->name('orders.payment');
    Route::get('/orders/refresh', [OrdersController::class, 'refresh'])->name('orders.refresh');

    // Phí ship
    Route::get('/shipping', [ShippingController::class, 'index'])->name('shipping.index');
    Route::post('/shipping', [ShippingController::class, 'store'])->name('shipping.store');
    Route::put('/shipping/{shipping}', [ShippingController::class, 'update'])->name('shipping.update');
    Route::delete('/shipping/{shipping}', [ShippingController::class, 'destroy'])->name('shipping.destroy');
    Route::post('/shipping/reorder', [ShippingController::class, 'reorder'])->name('shipping.reorder');
    Route::post('/shipping/promos', [ShippingController::class, 'storePromo'])->name('shipping.promos.store');
    Route::put('/shipping/promos/{promo}', [ShippingController::class, 'updatePromo'])->name('shipping.promos.update');
    Route::delete('/shipping/promos/{promo}', [ShippingController::class, 'destroyPromo'])->name('shipping.promos.destroy');
    Route::post('/shipping/promos/{promo}/toggle', [ShippingController::class, 'togglePromo'])->name('shipping.promos.toggle');

    // SEO
    Route::get('/seo', [SeoController::class, 'index'])->name('seo.index');
    Route::post('/seo', [SeoController::class, 'update'])->name('seo.update');
    Route::post('/seo/upload', [SeoController::class, 'upload'])->name('seo.upload');

    // Banners
    Route::get('/banners', [BannersController::class, 'index'])->name('banners.index');
    Route::post('/banners', [BannersController::class, 'store'])->name('banners.store');
    Route::put('/banners/{banner}', [BannersController::class, 'update'])->name('banners.update');
    Route::post('/banners/reorder', [BannersController::class, 'reorder'])->name('banners.reorder');
    Route::post('/banners/{banner}/toggle', [BannersController::class, 'toggle'])->name('banners.toggle');
    Route::delete('/banners/{banner}', [BannersController::class, 'destroy'])->name('banners.destroy');
    Route::post('/banners/upload', [BannersController::class, 'upload'])->name('banners.upload');

    // Tin tức
    Route::get('/news', [NewsController::class, 'index'])->name('news.index');
    Route::post('/news', [NewsController::class, 'store'])->name('news.store');
    Route::put('/news/{news}', [NewsController::class, 'update'])->name('news.update');
    Route::post('/news/{news}/toggle', [NewsController::class, 'toggle'])->name('news.toggle');
    Route::delete('/news/{news}', [NewsController::class, 'destroy'])->name('news.destroy');
    Route::post('/news/upload', [NewsController::class, 'upload'])->name('news.upload');

    // Khuyến mãi
    Route::get('/promotions', [PromotionsController::class, 'index'])->name('promotions.index');
    Route::post('/promotions', [PromotionsController::class, 'store'])->name('promotions.store');
    Route::put('/promotions/{promotion}', [PromotionsController::class, 'update'])->name('promotions.update');
    Route::delete('/promotions/{promotion}', [PromotionsController::class, 'destroy'])->name('promotions.destroy');
    Route::post('/promotions/{promotion}/toggle', [PromotionsController::class, 'toggle'])->name('promotions.toggle');

    // Menu sản phẩm
    Route::get('/menu', [MenuController::class, 'index'])->name('menu.index');
    Route::post('/menu/products', [MenuController::class, 'storeProduct'])->name('menu.products.store');
    Route::put('/menu/products/{product}', [MenuController::class, 'updateProduct'])->name('menu.products.update');
    Route::delete('/menu/products/{product}', [MenuController::class, 'destroyProduct'])->name('menu.products.destroy');
    Route::post('/menu/products/{product}/toggle', [MenuController::class, 'toggleProduct'])->name('menu.products.toggle');
    Route::post('/menu/products/reorder', [MenuController::class, 'reorderProducts'])->name('menu.products.reorder');
    Route::put('/menu/products/{product}/variants', [MenuController::class, 'updateVariants'])->name('menu.products.variants');
    Route::post('/menu/categories', [MenuController::class, 'storeCategory'])->name('menu.categories.store');
    Route::put('/menu/categories/{category}', [MenuController::class, 'updateCategory'])->name('menu.categories.update');
    Route::delete('/menu/categories/{category}', [MenuController::class, 'destroyCategory'])->name('menu.categories.destroy');

    // Variants
    Route::get('/variants', [VariantsController::class, 'index'])->name('variants.index');
    Route::post('/variants/groups', [VariantsController::class, 'storeGroup'])->name('variants.groups.store');
    Route::put('/variants/groups/{group}', [VariantsController::class, 'updateGroup'])->name('variants.groups.update');
    Route::delete('/variants/groups/{group}', [VariantsController::class, 'destroyGroup'])->name('variants.groups.destroy');
    Route::post('/variants/options', [VariantsController::class, 'storeOption'])->name('variants.options.store');
    Route::put('/variants/options', [VariantsController::class, 'updateOption'])->name('variants.options.update');
    Route::delete('/variants/options', [VariantsController::class, 'destroyOption'])->name('variants.options.destroy');
    Route::post('/variants/options/toggle', [VariantsController::class, 'toggleOption'])->name('variants.options.toggle');

    // Email / blast
    Route::get('/emails', [EmailController::class, 'index'])->name('emails.index');
    Route::post('/emails/templates', [EmailController::class, 'storeTemplate'])->name('emails.templates.store');
    Route::put('/emails/templates/{template}', [EmailController::class, 'updateTemplate'])->name('emails.templates.update');
    Route::delete('/emails/templates/{template}', [EmailController::class, 'destroyTemplate'])->name('emails.templates.destroy');
    Route::post('/emails/blasts', [EmailController::class, 'createBlast'])->name('emails.blasts.create');
    Route::post('/emails/blasts/{blast}/send-chunk', [EmailController::class, 'sendChunk'])->name('emails.blasts.send-chunk');
    Route::get('/emails/blasts/{blast}/status', [EmailController::class, 'blastStatus'])->name('emails.blasts.status');
    Route::delete('/emails/blasts/{blast}', [EmailController::class, 'destroyBlast'])->name('emails.blasts.destroy');

    // Check-in
    Route::get('/checkin', [CheckinController::class, 'index'])->name('checkin.index');
    Route::post('/checkin', [CheckinController::class, 'update'])->name('checkin.update');
});
