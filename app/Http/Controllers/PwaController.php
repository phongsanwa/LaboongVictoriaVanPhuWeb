<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\Response;

class PwaController extends Controller
{
    /**
     * Web app manifest động: icon màn hình chính lấy theo logo trong Admin
     * (Cài đặt chung → Logo). Chưa có logo thì dùng bộ icon Laboong mặc định.
     */
    public function manifest(): Response
    {
        $general = AppSetting::get('general', []);
        $logo  = $general['logo_url'] ?? null;
        $brand = $general['brand'] ?? 'Laboong';

        $manifest = [
            'name'             => $brand . ' Victoria Văn Phú',
            'short_name'       => $brand,
            'description'      => 'Tích điểm, đổi quà và đặt trà sữa ' . $brand . ' Victoria Văn Phú',
            'lang'             => 'vi',
            'start_url'        => '/',
            'scope'            => '/',
            'display'          => 'standalone',
            'orientation'      => 'portrait',
            'background_color' => '#0F623F',
            'theme_color'      => '#0F623F',
            'icons'            => $this->icons($logo),
            'shortcuts'        => [
                ['name' => 'Đặt món',         'short_name' => 'Đặt món',  'url' => '/menu'],
                ['name' => 'Đổi quà',         'short_name' => 'Đổi quà',  'url' => '/rewards'],
                ['name' => 'Voucher của tôi', 'short_name' => 'Voucher',  'url' => '/rewards/wallet'],
                ['name' => 'Theo dõi đơn hàng', 'short_name' => 'Đơn hàng', 'url' => '/orders/history'],
            ],
        ];

        return response(json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES))
            ->header('Content-Type', 'application/manifest+json; charset=utf-8')
            // Không cache lâu để khi đổi logo là icon cập nhật theo
            ->header('Cache-Control', 'no-cache, must-revalidate');
    }

    /** Danh sách icon: theo logo admin nếu có, ngược lại dùng bộ mặc định. */
    private function icons(?string $logo): array
    {
        if (!$logo) {
            return [
                ['src' => asset('icons/icon-192.png'), 'sizes' => '192x192', 'type' => 'image/png'],
                ['src' => asset('icons/icon-512.png'), 'sizes' => '512x512', 'type' => 'image/png'],
                ['src' => asset('icons/icon-maskable-512.png'), 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
            ];
        }

        $src  = url($logo);
        $type = $this->mime($logo);

        // Ảnh SVG co giãn mọi kích thước; ảnh raster khai báo các cỡ chuẩn (trình duyệt tự scale).
        if ($type === 'image/svg+xml') {
            return [
                ['src' => $src, 'sizes' => 'any', 'type' => $type],
                ['src' => $src, 'sizes' => 'any', 'type' => $type, 'purpose' => 'maskable'],
            ];
        }

        return [
            ['src' => $src, 'sizes' => '192x192', 'type' => $type],
            ['src' => $src, 'sizes' => '512x512', 'type' => $type],
            ['src' => $src, 'sizes' => '512x512', 'type' => $type, 'purpose' => 'maskable'],
        ];
    }

    private function mime(string $path): string
    {
        return match (strtolower(pathinfo(parse_url($path, PHP_URL_PATH) ?? $path, PATHINFO_EXTENSION))) {
            'svg'  => 'image/svg+xml',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            default => 'image/png',
        };
    }
}
