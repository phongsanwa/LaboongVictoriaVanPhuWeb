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

    /** Banner Laboong mặc định (logo + chữ LA BOONG + hoa văn trên nền xanh ô liu). */
    public const DEFAULT_IMAGE = 'images/email-header.png';

    /** Màu nền / màu chữ kem lấy theo bộ nhận diện của banner mặc định. */
    public const OLIVE = '#6D7836';
    public const CREAM = '#F4D4AF';

    /**
     * URL tuyệt đối của banner mặc định. Dùng domain thật (Site::base) vì email hẹn giờ được
     * gửi từ lịch chạy nền, lúc đó APP_URL trên hosting có thể vẫn là localhost.
     */
    public static function defaultImageUrl(): string
    {
        $file = public_path(self::DEFAULT_IMAGE);
        $v = is_file($file) ? filemtime($file) : 1;

        return Site::base() . '/' . self::DEFAULT_IMAGE . '?v=' . $v;
    }

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
