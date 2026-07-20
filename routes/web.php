<?php

use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MenuPageController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderHistoryController;
use App\Http\Controllers\PointsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\RewardsCatalogController;
use App\Http\Controllers\CheckinController;
use App\Http\Controllers\StoreController;
use Illuminate\Support\Facades\Route;

Route::get('/test-maps', fn() => view('test-maps'));

/* ── SEO: robots.txt + sitemap.xml động (URL tuyệt đối tự theo domain) ── */
Route::get('/robots.txt', function () {
    $lines = [
        'User-agent: *',
        'Disallow: /admin',
        'Disallow: /pos',
        'Disallow: /profile',
        'Disallow: /orders',
        'Disallow: /rewards/wallet',
        'Disallow: /points',
        'Disallow: /checkin',
        'Disallow: /logout',
        'Disallow: /test-maps',
        'Allow: /',
        '',
        'Sitemap: ' . url('/sitemap.xml'),
    ];

    return response(implode("\n", $lines), 200, ['Content-Type' => 'text/plain; charset=utf-8']);
});

Route::get('/sitemap.xml', function () {
    $urls = [
        ['loc' => url('/'),          'priority' => '1.0'],
        ['loc' => url('/tin-tuc'),   'priority' => '0.9'],
        ['loc' => url('/login'),     'priority' => '0.8'],
        ['loc' => url('/register'),  'priority' => '0.8'],
    ];

    // Bài tin đang hiển thị — mỗi bài một URL công khai
    try {
        foreach (\App\Models\NewsArticle::where('status', 'active')->orderByDesc('id')->limit(500)->get() as $n) {
            $urls[] = [
                'loc'      => route('news.show', $n->slug),
                'priority' => '0.7',
                'lastmod'  => $n->updated_at?->toDateString(),
            ];
        }
    } catch (\Throwable $e) { /* DB lỗi thì vẫn trả sitemap tĩnh */ }

    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
         . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($urls as $u) {
        $lastmod = isset($u['lastmod']) && $u['lastmod'] ? "<lastmod>{$u['lastmod']}</lastmod>" : '';
        $xml .= "  <url><loc>{$u['loc']}</loc>{$lastmod}<changefreq>weekly</changefreq><priority>{$u['priority']}</priority></url>\n";
    }
    $xml .= '</urlset>';

    return response($xml, 200, ['Content-Type' => 'application/xml; charset=utf-8']);
});

Route::get('/', [HomeController::class, 'index'])->middleware('auth')->name('home');
Route::get('/menu', [MenuPageController::class, 'index'])->middleware('auth')->name('menu');
Route::post('/orders', [OrderController::class, 'place'])->middleware('auth')->name('orders.place');
Route::get('/orders/history', [OrderHistoryController::class, 'index'])->middleware('auth')->name('orders.history');
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
    Route::post('/password', [ProfileController::class, 'changePassword'])->middleware('throttle:reset')->name('password');
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

// Tin tức công khai — Google index được, không cần đăng nhập
Route::get('/tin-tuc', [\App\Http\Controllers\NewsPageController::class, 'index'])->name('news.index');
Route::get('/tin-tuc/{slug}', [\App\Http\Controllers\NewsPageController::class, 'show'])->name('news.show');

Route::get('/register', [RegisterController::class, 'show'])->name('register');
Route::post('/register', [RegisterController::class, 'register'])->middleware('throttle:register')->name('register.submit');

Route::get('/login', [LoginController::class, 'show'])->name('login');
Route::post('/login/password', [LoginController::class, 'loginWithPassword'])->middleware('throttle:login')->name('login.password');
Route::post('/logout', [LoginController::class, 'logout'])->name('logout');

// Quên mật khẩu: mật khẩu mới được tạo và gửi về email đã đăng ký
Route::post('/forgot-password/send-new-password', [ForgotPasswordController::class, 'sendNewPassword'])->middleware('throttle:otp')->name('forgot.password');

require __DIR__.'/admin.php';
require __DIR__.'/pos.php';
