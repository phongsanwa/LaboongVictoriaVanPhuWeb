<?php

namespace App\Support;

use App\Models\AppSetting;

/**
 * Địa chỉ web thật của cửa hàng. APP_URL trên hosting thường vẫn để
 * http://localhost nên link trong thông báo (ntfy…) bị trỏ về localhost.
 * Ưu tiên site_url admin cấu hình → APP_URL (nếu là domain thật) → domain mặc định.
 */
class Site
{
    /** Domain mặc định khi chưa cấu hình gì (hosting để APP_URL=localhost). */
    public const FALLBACK = 'https://laboongtoanhav3victoriavanphu.com';

    /** URL gốc của website, không có dấu "/" ở cuối. */
    public static function base(): string
    {
        $configured = trim((string) (AppSetting::get('general', [])['site_url'] ?? ''));
        if ($configured !== '' && self::isReal($configured)) {
            return rtrim($configured, '/');
        }

        $appUrl = trim((string) config('app.url'));
        if ($appUrl !== '' && self::isReal($appUrl)) {
            return rtrim($appUrl, '/');
        }

        return self::FALLBACK;
    }

    /** Link vào trang quản lý đơn hàng cho nhân viên. */
    public static function adminOrders(): string
    {
        return self::base() . '/admin/orders';
    }

    /** Là domain thật (không phải localhost/127.0.0.1)? */
    private static function isReal(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST) ?: $url;
        $host = strtolower($host);

        return $host !== '' && $host !== 'localhost' && $host !== '127.0.0.1' && $host !== '0.0.0.0';
    }
}
