<?php

namespace App\Support;

use App\Models\AppSetting;

/**
 * Cấu hình chung cho bản đồ — dùng ở blade để quyết định có nạp Google Maps JS
 * hay không, theo lựa chọn nhà cung cấp của admin (AppSetting 'maps').
 */
class MapsConfig
{
    /** Nhà cung cấp đang chọn: auto | google | serpapi | apify. */
    public static function provider(): string
    {
        $p = AppSetting::get('maps', [])['provider'] ?? 'auto';

        return in_array($p, ['auto', 'google', 'serpapi', 'apify', 'goong'], true) ? $p : 'auto';
    }

    /**
     * Có nạp Google Maps JS không: chỉ khi chế độ 'auto'/'google' và có API key.
     * Chế độ 'serpapi'/'apify' → không nạp Google (tránh lỗi & phí Google).
     */
    public static function useGoogleJs(): bool
    {
        return in_array(self::provider(), ['auto', 'google'], true)
            && trim((string) config('services.google_maps.key', '')) !== '';
    }
}
