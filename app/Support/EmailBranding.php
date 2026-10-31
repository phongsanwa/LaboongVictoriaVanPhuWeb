<?php

namespace App\Support;

use App\Models\AppSetting;

/**
 * Giao diện phần đầu email gửi khách ("LABOONG · Victoria Văn Phú"): ảnh nền tuỳ chọn
 * do admin tải lên ở trang Email → Giao diện email.
 */
class EmailBranding
{
    public const KEY = 'email_branding';

    /** URL ảnh hợp lệ: http(s), không chứa ký tự có thể phá thuộc tính / CSS (dấu nháy, ngoặc, khoảng trắng…). */
    public const URL_PATTERN = '~^https?://[^\s\'"()\\\\<>]+$~i';

    /** ['header_bg' => URL ảnh hoặc null, 'header_text' => có hiện chữ trên ảnh không]. */
    public static function settings(): array
    {
        $s = AppSetting::get(self::KEY, []);
        $bg = trim((string) ($s['header_bg'] ?? ''));

        return [
            'header_bg'   => preg_match(self::URL_PATTERN, $bg) ? $bg : null,
            'header_text' => (bool) ($s['header_text'] ?? true),
        ];
    }
}
