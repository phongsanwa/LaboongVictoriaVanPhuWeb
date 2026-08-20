<?php

use App\Http\Controllers\Admin\CampaignsController;
use App\Http\Controllers\Admin\CheckinController;
use App\Http\Controllers\Admin\ShippingController;
use App\Http\Controllers\Admin\CustomersController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EmailController;
use App\Http\Controllers\Admin\OrdersController;
use App\Http\Controllers\Admin\PointsController;
use App\Http\Controllers\Admin\RewardsController;
use App\Http\Controllers\Admin\RolesController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\StoresController;
use App\Http\Controllers\Admin\MenuController;
use App\Http\Controllers\Admin\NewsController;
use App\Http\Controllers\Admin\PromotionsController;
use App\Http\Controllers\Admin\ReportsController;
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
    Route::get('/badges', [DashboardController::class, 'badges'])->name('badges');

    // Khách hàng
    Route::get('/customers', [CustomersController::class, 'index'])->middleware('admin.perm:cust_list')->name('customers.index');
    Route::put('/customers/{customer}', [CustomersController::class, 'update'])->middleware('admin.perm:cust_edit')->name('customers.update');
    Route::post('/customers/{customer}/toggle', [CustomersController::class, 'toggle'])->middleware('admin.perm:cust_edit')->name('customers.toggle');
    Route::delete('/customers/{customer}', [CustomersController::class, 'destroy'])->middleware('admin.perm:cust_edit')->name('customers.destroy');

    // Đơn hàng
    Route::get('/orders', [OrdersController::class, 'index'])->middleware('admin.perm:order_view')->name('orders.index');
    Route::get('/orders/refresh', [OrdersController::class, 'refresh'])->middleware('admin.perm:order_view')->name('orders.refresh');
    Route::post('/orders/{order}/advance', [OrdersController::class, 'advance'])->middleware('admin.perm:order_advance')->name('orders.advance');
    Route::post('/orders/{order}/cancel', [OrdersController::class, 'cancel'])->middleware('admin.perm:order_cancel')->name('orders.cancel');

    // Điểm & giao dịch
    Route::get('/points', [PointsController::class, 'index'])->middleware('admin.perm:tx_view')->name('points.index');
    Route::post('/points/adjust', [PointsController::class, 'adjust'])->middleware('admin.perm:adjust')->name('points.adjust');

    // Đổi quà
    Route::get('/rewards', [RewardsController::class, 'index'])->middleware('admin.perm:gift_edit')->name('rewards.index');
    Route::post('/rewards', [RewardsController::class, 'store'])->middleware('admin.perm:gift_edit')->name('rewards.store');
    Route::put('/rewards/{reward}', [RewardsController::class, 'update'])->middleware('admin.perm:gift_edit')->name('rewards.update');
    Route::post('/rewards/{reward}/toggle', [RewardsController::class, 'toggle'])->middleware('admin.perm:gift_edit')->name('rewards.toggle');
    Route::post('/rewards/{reward}/duplicate', [RewardsController::class, 'duplicate'])->middleware('admin.perm:gift_edit')->name('rewards.duplicate');
    Route::delete('/rewards/{reward}', [RewardsController::class, 'destroy'])->middleware('admin.perm:gift_del')->name('rewards.destroy');
    Route::post('/rewards/upload-image', [RewardsController::class, 'uploadImage'])->middleware('admin.perm:gift_edit')->name('rewards.upload-image');

    // Chiến dịch & marketing
    Route::get('/campaigns', [CampaignsController::class, 'index'])->middleware('admin.perm:camp_view')->name('campaigns.index');
    Route::post('/campaigns', [CampaignsController::class, 'store'])->middleware('admin.perm:camp_edit')->name('campaigns.store');
    Route::put('/campaigns/{campaign}', [CampaignsController::class, 'update'])->middleware('admin.perm:camp_edit')->name('campaigns.update');
    Route::post('/campaigns/{campaign}/toggle', [CampaignsController::class, 'toggle'])->middleware('admin.perm:camp_edit')->name('campaigns.toggle');
    Route::post('/campaigns/{campaign}/push', [CampaignsController::class, 'push'])->middleware('admin.perm:push')->name('campaigns.push');

    // Báo cáo — thống kê khách hàng
    Route::middleware('admin.perm:report')->group(function () {
        Route::get('/reports/customers', [ReportsController::class, 'customers'])->name('reports.customers');
        Route::get('/reports/customers/data', [ReportsController::class, 'customersData'])->name('reports.customers.data');
    });

    // Email marketing — gửi email cho khách + quản lý mẫu email
    Route::middleware('admin.perm:email_send')->group(function () {
        Route::get('/emails', [EmailController::class, 'index'])->name('emails.index');
        Route::post('/emails/templates', [EmailController::class, 'storeTemplate'])->name('emails.templates.store');
        Route::put('/emails/templates/{template}', [EmailController::class, 'updateTemplate'])->name('emails.templates.update');
        Route::delete('/emails/templates/{template}', [EmailController::class, 'destroyTemplate'])->name('emails.templates.destroy');
        Route::post('/emails/blasts', [EmailController::class, 'createBlast'])->name('emails.blasts.store');
        Route::post('/emails/blasts/{blast}/send', [EmailController::class, 'sendChunk'])->name('emails.blasts.send');
        Route::get('/emails/blasts/{blast}/status', [EmailController::class, 'blastStatus'])->name('emails.blasts.status');
        Route::delete('/emails/blasts/{blast}', [EmailController::class, 'destroyBlast'])->name('emails.blasts.destroy');
        Route::post('/emails/test', [EmailController::class, 'test'])->name('emails.test');
        Route::post('/emails/upload', [EmailController::class, 'uploadImage'])->name('emails.upload');
    });

    // Phân quyền
    Route::get('/roles', [RolesController::class, 'index'])->middleware('admin.perm:staff')->name('roles.index');
    Route::post('/roles', [RolesController::class, 'update'])->middleware('admin.perm:staff')->name('roles.update');
    Route::post('/roles/assign', [RolesController::class, 'assign'])->middleware('admin.perm:staff')->name('roles.assign');
    Route::delete('/roles/staff/{staff}', [RolesController::class, 'removeStaff'])->middleware('admin.perm:staff')->name('roles.staff.remove');
    Route::post('/roles/staff/{staff}/store', [RolesController::class, 'setStore'])->middleware('admin.perm:staff')->name('roles.staff.store');

    // Quản lý SEO
    Route::get('/seo', [\App\Http\Controllers\Admin\SeoController::class, 'index'])->middleware('admin.perm:seo_edit')->name('seo.index');
    Route::post('/seo', [\App\Http\Controllers\Admin\SeoController::class, 'update'])->middleware('admin.perm:seo_edit')->name('seo.update');
    Route::post('/seo/upload', [\App\Http\Controllers\Admin\SeoController::class, 'upload'])->middleware('admin.perm:seo_edit')->name('seo.upload');

    // Cài đặt hệ thống
    Route::get('/settings', [SettingsController::class, 'index'])->middleware('admin.perm:settings')->name('settings.index');
    Route::post('/settings', [SettingsController::class, 'update'])->middleware('admin.perm:settings')->name('settings.update');
    Route::post('/settings/logo', [SettingsController::class, 'uploadLogo'])->middleware('admin.perm:settings')->name('settings.logo.upload');
    Route::delete('/settings/logo', [SettingsController::class, 'deleteLogo'])->middleware('admin.perm:settings')->name('settings.logo.delete');
    Route::post('/settings/favicon', [SettingsController::class, 'uploadFavicon'])->middleware('admin.perm:settings')->name('settings.favicon.upload');
    Route::delete('/settings/favicon', [SettingsController::class, 'deleteFavicon'])->middleware('admin.perm:settings')->name('settings.favicon.delete');
    Route::post('/settings/app_icon', [SettingsController::class, 'uploadAppIcon'])->middleware('admin.perm:settings')->name('settings.app_icon.upload');
    Route::delete('/settings/app_icon', [SettingsController::class, 'deleteAppIcon'])->middleware('admin.perm:settings')->name('settings.app_icon.delete');
    Route::post('/settings/telegram/test', [SettingsController::class, 'testTelegram'])->middleware('admin.perm:settings')->name('settings.telegram.test');
    Route::post('/settings/ntfy/test', [SettingsController::class, 'testNtfy'])->middleware('admin.perm:settings')->name('settings.ntfy.test');

    // Cửa hàng
    Route::get('/stores', [StoresController::class, 'index'])->middleware('admin.perm:store_edit')->name('stores.index');
    Route::post('/stores', [StoresController::class, 'store'])->middleware('admin.perm:store_edit')->name('stores.store');
    Route::put('/stores/{store}', [StoresController::class, 'update'])->middleware('admin.perm:store_edit')->name('stores.update');
    Route::post('/stores/{store}/toggle', [StoresController::class, 'toggle'])->middleware('admin.perm:store_edit')->name('stores.toggle');
    Route::delete('/stores/{store}', [StoresController::class, 'destroy'])->middleware('admin.perm:store_edit')->name('stores.destroy');
    Route::post('/stores/{store}/photos', [StoresController::class, 'uploadPhoto'])->middleware('admin.perm:store_edit')->name('stores.photos.upload');
    Route::delete('/stores/{store}/photos', [StoresController::class, 'deletePhoto'])->middleware('admin.perm:store_edit')->name('stores.photos.delete');

    // Khuyến mãi
    Route::get('/promotions', [PromotionsController::class, 'index'])->middleware('admin.perm:promo_edit')->name('promotions.index');
    Route::post('/promotions', [PromotionsController::class, 'store'])->middleware('admin.perm:promo_edit')->name('promotions.store');
    Route::post('/promotions/{promotion}', [PromotionsController::class, 'update'])->middleware('admin.perm:promo_edit')->name('promotions.update');
    Route::delete('/promotions/{promotion}', [PromotionsController::class, 'destroy'])->middleware('admin.perm:promo_edit')->name('promotions.destroy');
    Route::post('/promotions/{promotion}/toggle', [PromotionsController::class, 'toggle'])->middleware('admin.perm:promo_edit')->name('promotions.toggle');

    // Phí ship
    Route::get('/shipping', [ShippingController::class, 'index'])->middleware('admin.perm:ship_edit')->name('shipping.index');
    Route::post('/shipping', [ShippingController::class, 'store'])->middleware('admin.perm:ship_edit')->name('shipping.store');
    Route::put('/shipping/{shipping}', [ShippingController::class, 'update'])->middleware('admin.perm:ship_edit')->name('shipping.update');
    Route::delete('/shipping/{shipping}', [ShippingController::class, 'destroy'])->middleware('admin.perm:ship_edit')->name('shipping.destroy');
    Route::post('/shipping/reorder', [ShippingController::class, 'reorder'])->middleware('admin.perm:ship_edit')->name('shipping.reorder');
    Route::post('/shipping/promos', [ShippingController::class, 'storePromo'])->middleware('admin.perm:ship_edit')->name('shipping.promos.store');
    Route::put('/shipping/promos/{promo}', [ShippingController::class, 'updatePromo'])->middleware('admin.perm:ship_edit')->name('shipping.promos.update');
    Route::delete('/shipping/promos/{promo}', [ShippingController::class, 'destroyPromo'])->middleware('admin.perm:ship_edit')->name('shipping.promos.destroy');
    Route::post('/shipping/promos/{promo}/toggle', [ShippingController::class, 'togglePromo'])->middleware('admin.perm:ship_edit')->name('shipping.promos.toggle');

    // Variant / tuỳ chọn món
    Route::middleware('admin.perm:variant_edit')->group(function () {
        Route::get('/variants', [VariantsController::class, 'index'])->name('variants.index');
        Route::post('/variants/groups', [VariantsController::class, 'storeGroup'])->name('variants.groups.store');
        Route::post('/variants/groups/reorder', [VariantsController::class, 'reorderGroups'])->name('variants.groups.reorder');
        Route::post('/variants/groups/{group}', [VariantsController::class, 'updateGroup'])->name('variants.groups.update');
        Route::delete('/variants/groups/{group}', [VariantsController::class, 'destroyGroup'])->name('variants.groups.destroy');
        Route::post('/variants/options', [VariantsController::class, 'storeOption'])->name('variants.options.store');
        Route::put('/variants/options', [VariantsController::class, 'updateOption'])->name('variants.options.update');
        Route::delete('/variants/options', [VariantsController::class, 'destroyOption'])->name('variants.options.destroy');
        Route::post('/variants/options/toggle', [VariantsController::class, 'toggleOption'])->name('variants.options.toggle');
        Route::post('/variants/options/toggle-all', [VariantsController::class, 'toggleAllOptions'])->name('variants.options.toggle-all');
        Route::post('/variants/groups/{group}/set-default', [VariantsController::class, 'setDefault'])->name('variants.groups.setDefault');
    });

    // Thực đơn
    Route::middleware('admin.perm:menu_edit')->group(function () {
        Route::get('/menu', [MenuController::class, 'index'])->name('menu.index');
        Route::post('/menu/products', [MenuController::class, 'storeProduct'])->name('menu.products.store');
        // Đặt TRƯỚC route {product} để 'reorder' không bị hiểu là id sản phẩm.
        Route::post('/menu/products/reorder', [MenuController::class, 'reorderProducts'])->name('menu.products.reorder');
        Route::post('/menu/products/{product}', [MenuController::class, 'updateProduct'])->name('menu.products.update');
        Route::delete('/menu/products/{product}', [MenuController::class, 'destroyProduct'])->name('menu.products.destroy');
        Route::post('/menu/products/{product}/toggle', [MenuController::class, 'toggleProduct'])->name('menu.products.toggle');
        Route::post('/menu/products/{product}/variants', [MenuController::class, 'updateVariants'])->name('menu.products.variants');
        Route::post('/menu/categories', [MenuController::class, 'storeCategory'])->name('menu.categories.store');
        Route::post('/menu/categories/{category}', [MenuController::class, 'updateCategory'])->name('menu.categories.update');
        Route::delete('/menu/categories/{category}', [MenuController::class, 'destroyCategory'])->name('menu.categories.destroy');
    });

    // Điểm danh
    Route::get('/checkin', [CheckinController::class, 'index'])->middleware('admin.perm:checkin_edit')->name('checkin.index');
    Route::post('/checkin', [CheckinController::class, 'update'])->middleware('admin.perm:checkin_edit')->name('checkin.update');

    // Tin tức (hiển thị ngoài trang chủ)
    Route::middleware('admin.perm:news_edit')->group(function () {
        Route::get('/news', [NewsController::class, 'index'])->name('news.index');
        Route::post('/news', [NewsController::class, 'store'])->name('news.store');
        Route::post('/news/upload', [NewsController::class, 'upload'])->name('news.upload');
        Route::post('/news/{news}', [NewsController::class, 'update'])->name('news.update');
        Route::post('/news/{news}/toggle', [NewsController::class, 'toggle'])->name('news.toggle');
        Route::delete('/news/{news}', [NewsController::class, 'destroy'])->name('news.destroy');
    });

    // Banner trang chủ
    Route::middleware('admin.perm:banner_edit')->group(function () {
        Route::get('/banners', [\App\Http\Controllers\Admin\BannersController::class, 'index'])->name('banners.index');
        Route::post('/banners', [\App\Http\Controllers\Admin\BannersController::class, 'store'])->name('banners.store');
        Route::post('/banners/upload', [\App\Http\Controllers\Admin\BannersController::class, 'upload'])->name('banners.upload');
        Route::post('/banners/reorder', [\App\Http\Controllers\Admin\BannersController::class, 'reorder'])->name('banners.reorder');
        Route::post('/banners/{banner}', [\App\Http\Controllers\Admin\BannersController::class, 'update'])->name('banners.update');
        Route::post('/banners/{banner}/toggle', [\App\Http\Controllers\Admin\BannersController::class, 'toggle'])->name('banners.toggle');
        Route::delete('/banners/{banner}', [\App\Http\Controllers\Admin\BannersController::class, 'destroy'])->name('banners.destroy');
    });
});
