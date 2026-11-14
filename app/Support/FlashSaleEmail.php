<?php

namespace App\Support;

use App\Models\FlashSale;
use Illuminate\Support\Carbon;

/**
 * Mẫu email giới thiệu các món đang Flash Sale — nhiều kiểu để admin chọn trong trang Email.
 * Nội dung là HTML dạng bảng + style inline (đọc tốt trên Gmail/Outlook/điện thoại) và chỉ dùng
 * thẻ/thuộc tính mà HtmlSanitizer cho phép. Được lồng vào khung emails/bulk.blade.php khi gửi.
 * {name}, {points}… vẫn được thay theo từng khách như email thường.
 */
class FlashSaleEmail
{
    public const DESIGNS = [
        'blaze'   => ['name' => 'Rực lửa',      'desc' => 'Banner đỏ cam nổi bật, lưới 2 cột ảnh món — hợp với đợt giảm sâu, cần gấp.'],
        'elegant' => ['name' => 'Thanh lịch',   'desc' => 'Nền trắng, điểm xanh Laboong, danh sách gọn gàng — sang và dễ đọc.'],
        'hero'    => ['name' => 'Món nổi bật',  'desc' => 'Một món giảm nhiều nhất làm ảnh lớn, các món còn lại xếp bên dưới.'],
        'table'   => ['name' => 'Bảng giá',     'desc' => 'Bảng so sánh giá gốc – giá flash – % giảm, ngắn gọn cho khách xem nhanh.'],
        'letter'  => ['name' => 'Thư thân mật', 'desc' => 'Viết như lá thư gửi khách quen, ít hình — thân thiện và ít bị vào thư rác.'],
    ];

    /** Mẫu email nhắc phiên flash sale sắp diễn ra. */
    public const REMINDERS = [
        'countdown' => ['name' => 'Đếm ngược', 'desc' => 'Giờ bắt đầu cỡ lớn trên nền tối, kèm vài món nổi bật — gây tò mò, nhắc đúng giờ.'],
        'calendar'  => ['name' => 'Lịch hẹn',  'desc' => 'Tờ lịch ghi ngày giờ + nút "Thêm vào Google Calendar" để khách tự đặt nhắc trên điện thoại.'],
        'brief'     => ['name' => 'Nhắc ngắn', 'desc' => 'Vài dòng ngắn như tin nhắn — hợp để hẹn gửi sát giờ (1 giờ hoặc 30 phút trước).'],
    ];
    private const WEEKDAYS_LONG = [1 => 'Thứ Hai', 2 => 'Thứ Ba', 3 => 'Thứ Tư', 4 => 'Thứ Năm', 5 => 'Thứ Sáu', 6 => 'Thứ Bảy', 7 => 'Chủ nhật'];

    private const RED = '#E4402F';
    private const GREEN = '#0F623F';
    private const WEEKDAYS = [1 => 'Thứ 2', 2 => 'Thứ 3', 3 => 'Thứ 4', 4 => 'Thứ 5', 5 => 'Thứ 6', 6 => 'Thứ 7', 7 => 'Chủ nhật'];

    /** Tất cả mẫu cho một đợt flash sale: [key, name, desc, subject, body] (rỗng nếu đợt chưa có món). */
    public static function all(FlashSale $sale): array
    {
        $d = self::data($sale);
        if (!$d['items']) return [];
        $out = [];
        foreach (self::DESIGNS as $key => $meta) {
            $method = 'design' . ucfirst($key);
            [$subject, $body] = self::$method($d);
            $out[] = ['key' => $key] + $meta + ['subject' => $subject, 'body' => $body];
        }

        return $out;
    }

    /** Lịch diễn ra dạng chữ: "Hằng ngày · 14:00 – 16:00", "Ngày 31/10/2026 · 14:00 – 16:00"… */
    public static function scheduleText(FlashSale $sale): string
    {
        $time = substr($sale->start_time, 0, 5) . ' – ' . substr($sale->end_time, 0, 5);
        if ($sale->repeat === 'once') {
            return 'Ngày ' . $sale->start_date->format('d/m/Y') . ' · ' . $time;
        }
        $days = collect($sale->weekdays ?? [])->map(fn ($d) => (int) $d)->sort()->values();
        $dayText = $days->count() === 7 ? 'Hằng ngày'
            : ($days->all() === [1, 2, 3, 4, 5] ? 'Thứ 2 – Thứ 6'
            : ($days->all() === [6, 7] ? 'Cuối tuần' : $days->map(fn ($d) => self::WEEKDAYS[$d] ?? '')->implode(', ')));
        $range = $sale->end_date ? ' (đến ' . $sale->end_date->format('d/m') . ')' : '';

        return $dayText . ' · ' . $time . $range;
    }

    /* ─── Dữ liệu chung ─── */

    private static function data(FlashSale $sale): array
    {
        $sale->loadMissing('items.product');
        $base = Site::base();
        $items = $sale->items
            ->filter(fn ($it) => $it->product)
            ->map(function ($it) use ($base) {
                $p = $it->product;
                $price = (int) $p->base_price;
                $flash = (int) $it->flash_price;
                $img = $p->image_url ? (preg_match('~^https?://~i', $p->image_url) ? $p->image_url : $base . '/' . ltrim($p->image_url, '/')) : null;
                preg_match('/#[0-9a-f]{6}/i', (string) $p->color, $m);

                return [
                    'name'  => $p->name,
                    'img'   => $img,
                    'color' => $m[0] ?? '#6B4A2B',
                    'price' => $price,
                    'flash' => $flash,
                    'save'  => max(0, $price - $flash),
                    'pct'   => $price > 0 ? (int) round((1 - $flash / $price) * 100) : 0,
                    'quota' => $it->quota,
                ];
            })
            ->values()
            ->all();

        $top = collect($items)->sortByDesc('pct')->first();

        return [
            'name'     => $sale->name,
            'schedule' => self::scheduleText($sale),
            'time'     => substr($sale->start_time, 0, 5) . ' – ' . substr($sale->end_time, 0, 5),
            'items'    => $items,
            'top'      => $top,
            'maxPct'   => (int) collect($items)->max('pct'),
            'minFlash' => (int) collect($items)->min('flash'),
            'url'      => $base . '/',
            'icon'     => $base . '/images/flash-sale.png',
        ];
    }

    private static function e(?string $s): string
    {
        return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
    }

    private static function money(int $n): string
    {
        return number_format($n, 0, ',', '.') . 'đ';
    }

    /** Ảnh món; món chưa có ảnh thì ô màu của món + ly trà sữa. */
    private static function img(array $it, int $height, string $radius = '12px'): string
    {
        if ($it['img']) {
            return '<img src="' . self::e($it['img']) . '" alt="' . self::e($it['name']) . '" width="100%" height="' . $height . '" style="display:block;width:100%;height:' . $height . 'px;object-fit:cover;border-radius:' . $radius . ';border:0;" />';
        }

        return '<div style="height:' . $height . 'px;line-height:' . $height . 'px;text-align:center;font-size:' . (int) ($height * 0.38) . 'px;background-color:' . $it['color'] . ';border-radius:' . $radius . ';">🧋</div>';
    }

    private static function thumb(array $it, int $size): string
    {
        if ($it['img']) {
            return '<img src="' . self::e($it['img']) . '" alt="' . self::e($it['name']) . '" width="' . $size . '" height="' . $size . '" style="display:block;width:' . $size . 'px;height:' . $size . 'px;object-fit:cover;border-radius:12px;border:0;" />';
        }

        return '<div style="width:' . $size . 'px;height:' . $size . 'px;line-height:' . $size . 'px;text-align:center;font-size:' . (int) ($size * 0.45) . 'px;background-color:' . $it['color'] . ';border-radius:12px;">🧋</div>';
    }

    private static function button(string $url, string $label, string $bg, string $color = '#ffffff', string $border = ''): string
    {
        $border = $border ?: $bg;

        return '<table style="width:100%;border-collapse:collapse;margin:22px 0 4px;"><tr><td style="text-align:center;">'
            . '<a href="' . self::e($url) . '" target="_blank" style="display:inline-block;background-color:' . $bg . ';color:' . $color . ';border:2px solid ' . $border . ';text-decoration:none;font-size:16px;font-weight:700;padding:13px 30px;border-radius:999px;">' . $label . '</a>'
            . '</td></tr></table>';
    }

    /* ─── 1. Rực lửa ─── */

    private static function designBlaze(array $d): array
    {
        $cells = '';
        $rows = array_chunk($d['items'], 2);
        foreach ($rows as $pair) {
            $cells .= '<tr>';
            foreach ($pair as $it) {
                $cells .= '<td style="width:50%;padding:6px;vertical-align:top;">'
                    . '<table style="width:100%;border-collapse:separate;background-color:#ffffff;border-radius:14px;border:1px solid #FFD2C2;"><tr><td style="padding:8px;">'
                    . self::img($it, 130)
                    . '<div style="margin-top:8px;font-size:14.5px;font-weight:700;color:#1C2620;line-height:1.3;">' . self::e($it['name']) . '</div>'
                    . '<div style="margin-top:4px;"><span style="font-size:18px;font-weight:800;color:' . self::RED . ';">' . self::money($it['flash']) . '</span> '
                    . '<span style="font-size:12.5px;color:#9AA19C;text-decoration:line-through;">' . self::money($it['price']) . '</span></div>'
                    . '<div style="margin-top:6px;"><span style="display:inline-block;background-color:' . self::RED . ';color:#ffffff;font-size:12px;font-weight:800;padding:2px 9px;border-radius:999px;">-' . $it['pct'] . '%</span>'
                    . ($it['quota'] ? ' <span style="font-size:12px;color:#8A4A3A;font-weight:600;">Chỉ ' . (int) $it['quota'] . ' suất</span>' : '') . '</div>'
                    . '</td></tr></table></td>';
            }
            if (count($pair) === 1) $cells .= '<td style="width:50%;padding:6px;"></td>';
            $cells .= '</tr>';
        }

        $body = '<table style="width:100%;border-collapse:separate;background-color:#FFF1E6;border-radius:16px;">'
            . '<tr><td style="padding:22px 16px 18px;text-align:center;background-color:' . self::RED . ';background-image:linear-gradient(120deg,#E4402F,#FF7A3D);border-radius:16px 16px 0 0;">'
            . '<img src="' . self::e($d['icon']) . '" alt="" width="44" height="44" style="display:inline-block;width:44px;height:44px;vertical-align:middle;border:0;" />'
            . ' <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:1px;vertical-align:middle;">FLASH SALE</span>'
            . '<div style="color:#FFE7DD;font-size:14px;margin-top:6px;">' . self::e($d['name']) . ' · ' . self::e($d['schedule']) . '</div>'
            . '<div style="display:inline-block;margin-top:12px;background-color:#ffffff;color:' . self::RED . ';font-weight:800;font-size:16px;padding:6px 18px;border-radius:999px;">Giảm đến ' . $d['maxPct'] . '%</div>'
            . '</td></tr>'
            . '<tr><td style="padding:18px 16px 4px;font-size:15px;color:#3A2A22;line-height:1.6;">Chào <strong>{name}</strong> ơi! Giờ vàng đã điểm — các món dưới đây đang giảm giá cực sâu, số suất có hạn nên nhanh tay kẻo lỡ nhé 🔥</td></tr>'
            . '<tr><td style="padding:6px 10px 14px;"><table style="width:100%;border-collapse:collapse;">' . $cells . '</table></td></tr>'
            . '</table>'
            . self::button($d['url'], 'Đặt ngay kẻo hết suất →', self::RED)
            . '<p style="text-align:center;font-size:12.5px;color:#8A978D;margin:6px 0 0;">Giá flash chỉ áp dụng khi đặt trên website trong khung giờ ' . self::e($d['time']) . '.</p>';

        return ['🔥 {name} ơi, Flash Sale giảm đến ' . $d['maxPct'] . '% — chỉ ' . $d['time'] . '!', $body];
    }

    /* ─── 2. Thanh lịch ─── */

    private static function designElegant(array $d): array
    {
        $rows = '';
        foreach ($d['items'] as $i => $it) {
            $rows .= '<tr>'
                . '<td style="width:76px;padding:14px 0;border-top:' . ($i ? '1px solid #EEE7D8' : '0') . ';vertical-align:middle;">' . self::thumb($it, 64) . '</td>'
                . '<td style="padding:14px 10px;border-top:' . ($i ? '1px solid #EEE7D8' : '0') . ';vertical-align:middle;">'
                . '<div style="font-size:15.5px;font-weight:700;color:#1C2620;">' . self::e($it['name']) . '</div>'
                . '<div style="font-size:12.5px;color:' . self::GREEN . ';font-weight:700;margin-top:3px;">Tiết kiệm ' . self::money($it['save']) . ' (-' . $it['pct'] . '%)</div></td>'
                . '<td style="padding:14px 0;border-top:' . ($i ? '1px solid #EEE7D8' : '0') . ';text-align:right;vertical-align:middle;white-space:nowrap;">'
                . '<div style="font-size:17px;font-weight:800;color:' . self::GREEN . ';">' . self::money($it['flash']) . '</div>'
                . '<div style="font-size:12.5px;color:#9AA19C;text-decoration:line-through;">' . self::money($it['price']) . '</div></td>'
                . '</tr>';
        }

        $body = '<div style="text-align:center;font-size:12px;letter-spacing:3px;color:' . self::GREEN . ';font-weight:700;">FLASH SALE</div>'
            . '<h2 style="text-align:center;font-size:24px;line-height:1.3;color:#1C2620;margin:6px 0 4px;">' . self::e($d['name']) . '</h2>'
            . '<div style="text-align:center;font-size:14px;color:#5C6B62;">' . self::e($d['schedule']) . '</div>'
            . '<div style="width:56px;height:3px;background-color:' . self::GREEN . ';margin:16px auto;border-radius:3px;"></div>'
            . '<p style="font-size:15px;color:#28352d;line-height:1.65;margin:0 0 8px;">Chào {name},</p>'
            . '<p style="font-size:15px;color:#28352d;line-height:1.65;margin:0 0 6px;">Laboong dành tặng bạn mức giá đặc biệt cho những món được yêu thích nhất, chỉ trong khung giờ ' . self::e($d['time']) . ':</p>'
            . '<table style="width:100%;border-collapse:collapse;margin-top:6px;">' . $rows . '</table>'
            . self::button($d['url'], 'Đặt món ngay', '#ffffff', self::GREEN, self::GREEN)
            . '<p style="text-align:center;font-size:12.5px;color:#8A978D;margin:8px 0 0;">Số suất mỗi món có hạn · Mỗi đơn vẫn được tích điểm như thường.</p>';

        return ['Flash Sale "' . $d['name'] . '": món ngon giá hời đang chờ {name}', $body];
    }

    /* ─── 3. Món nổi bật ─── */

    private static function designHero(array $d): array
    {
        $top = $d['top'];
        $others = array_values(array_filter($d['items'], fn ($it) => $it !== $top));
        $list = '';
        foreach ($others as $it) {
            $list .= '<tr>'
                . '<td style="width:56px;padding:8px 0;vertical-align:middle;">' . self::thumb($it, 48) . '</td>'
                . '<td style="padding:8px 10px;font-size:14.5px;font-weight:700;color:#1C2620;vertical-align:middle;">' . self::e($it['name']) . '</td>'
                . '<td style="padding:8px 0;text-align:right;vertical-align:middle;white-space:nowrap;"><span style="font-size:15.5px;font-weight:800;color:' . self::RED . ';">' . self::money($it['flash']) . '</span>'
                . ' <span style="font-size:12px;color:#9AA19C;text-decoration:line-through;">' . self::money($it['price']) . '</span></td>'
                . '</tr>';
        }

        $body = '<p style="font-size:15px;color:#28352d;line-height:1.6;margin:0 0 14px;">Chào {name}! Món hot nhất đợt <strong>' . self::e($d['name']) . '</strong> đang chờ bạn:</p>'
            . '<table style="width:100%;border-collapse:separate;border-radius:18px;background-color:#1C2620;"><tr><td style="padding:0;">'
            . self::img($top, 240, '18px 18px 0 0')
            . '</td></tr><tr><td style="padding:18px 20px 20px;text-align:center;">'
            . '<div style="display:inline-block;background-color:' . self::RED . ';color:#ffffff;font-size:13px;font-weight:800;padding:4px 12px;border-radius:999px;">GIẢM ' . $top['pct'] . '%</div>'
            . '<div style="font-size:24px;font-weight:800;color:#ffffff;margin-top:10px;line-height:1.25;">' . self::e($top['name']) . '</div>'
            . '<div style="margin-top:8px;"><span style="font-size:32px;font-weight:800;color:#FFC23D;">' . self::money($top['flash']) . '</span>'
            . ' <span style="font-size:16px;color:#A9B3AD;text-decoration:line-through;">' . self::money($top['price']) . '</span></div>'
            . '<div style="font-size:13.5px;color:#D8E3DC;margin-top:6px;">' . self::e($d['schedule']) . ($top['quota'] ? ' · chỉ ' . (int) $top['quota'] . ' suất' : '') . '</div>'
            . '</td></tr></table>'
            . ($list ? '<div style="font-size:15px;font-weight:700;color:#1C2620;margin:20px 0 4px;">Còn nữa trong Flash Sale</div><table style="width:100%;border-collapse:collapse;">' . $list . '</table>' : '')
            . self::button($d['url'], 'Đặt ' . self::e($top['name']) . ' ngay', self::RED);

        return ['🧋 ' . $top['name'] . ' chỉ còn ' . self::money($top['flash']) . ' — Flash Sale ' . $d['time'], $body];
    }

    /* ─── 4. Bảng giá ─── */

    private static function designTable(array $d): array
    {
        $th = 'padding:10px 8px;font-size:12.5px;color:#ffffff;font-weight:700;text-align:';
        $rows = '';
        foreach ($d['items'] as $i => $it) {
            $bg = $i % 2 ? '#FAF7F0' : '#ffffff';
            $td = 'padding:11px 8px;font-size:14px;background-color:' . $bg . ';border-bottom:1px solid #EEE7D8;';
            $rows .= '<tr>'
                . '<td style="' . $td . 'font-weight:700;color:#1C2620;">' . self::e($it['name']) . '</td>'
                . '<td style="' . $td . 'text-align:right;color:#9AA19C;text-decoration:line-through;white-space:nowrap;">' . self::money($it['price']) . '</td>'
                . '<td style="' . $td . 'text-align:right;color:' . self::RED . ';font-weight:800;white-space:nowrap;">' . self::money($it['flash']) . '</td>'
                . '<td style="' . $td . 'text-align:center;"><span style="background-color:#FDECEA;color:' . self::RED . ';font-weight:800;font-size:12px;padding:2px 7px;border-radius:999px;">-' . $it['pct'] . '%</span></td>'
                . '</tr>';
        }

        $body = '<p style="font-size:15px;color:#28352d;line-height:1.6;margin:0 0 12px;">Chào {name}, đây là bảng giá Flash Sale <strong>' . self::e($d['name']) . '</strong>:</p>'
            . '<table style="width:100%;border-collapse:separate;border-spacing:0;background-color:#F2EFE6;border-radius:12px;margin-bottom:14px;"><tr>'
            . '<td style="padding:12px 14px;font-size:14px;color:#1C2620;"><strong>⏰ ' . self::e($d['schedule']) . '</strong><br /><span style="color:#5C6B62;font-size:13px;">Giảm đến ' . $d['maxPct'] . '% · chỉ từ ' . self::money($d['minFlash']) . '</span></td>'
            . '</tr></table>'
            . '<table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;">'
            . '<tr style="background-color:' . self::GREEN . ';"><td style="' . $th . 'left;background-color:' . self::GREEN . ';">Món</td><td style="' . $th . 'right;background-color:' . self::GREEN . ';">Giá gốc</td><td style="' . $th . 'right;background-color:' . self::GREEN . ';">Flash</td><td style="' . $th . 'center;background-color:' . self::GREEN . ';">Giảm</td></tr>'
            . $rows . '</table>'
            . self::button($d['url'], 'Xem & đặt món', self::GREEN)
            . '<p style="text-align:center;font-size:12.5px;color:#8A978D;margin:6px 0 0;">Giá áp dụng khi đặt trên website trong khung giờ flash sale, số suất có hạn.</p>';

        return ['Bảng giá Flash Sale ' . $d['time'] . ' — giảm đến ' . $d['maxPct'] . '%', $body];
    }

    /* ─── 5. Thư thân mật ─── */

    private static function designLetter(array $d): array
    {
        $items = '';
        foreach ($d['items'] as $it) {
            $items .= '<li style="margin:0 0 8px;"><strong>' . self::e($it['name']) . '</strong> — chỉ <strong style="color:' . self::RED . ';">' . self::money($it['flash']) . '</strong> <span style="color:#9AA19C;text-decoration:line-through;">' . self::money($it['price']) . '</span></li>';
        }

        $body = '<p style="font-size:15.5px;color:#28352d;line-height:1.75;margin:0 0 12px;">Chào {name} thân mến,</p>'
            . '<p style="font-size:15.5px;color:#28352d;line-height:1.75;margin:0 0 12px;">Cảm ơn bạn đã luôn ghé Laboong! Để chiêu đãi những người bạn thân thiết, quán mở đợt <strong>' . self::e($d['name']) . '</strong> vào <strong>' . self::e($d['schedule']) . '</strong> với giá mềm hơn hẳn ngày thường:</p>'
            . '<ul style="font-size:15.5px;color:#28352d;line-height:1.6;padding-left:22px;margin:0 0 14px;">' . $items . '</ul>'
            . '<p style="font-size:15.5px;color:#28352d;line-height:1.75;margin:0 0 12px;">Mỗi món chỉ có số suất nhất định, bạn nhớ đặt sớm trên website để giữ phần nhé. Đơn flash sale vẫn được tích điểm như bình thường — hiện bạn đang có <strong>{points} điểm</strong> đó!</p>'
            . '<p style="font-size:15.5px;color:#28352d;line-height:1.75;margin:0;">Hẹn gặp bạn ở quán,<br /><strong>Laboong Victoria Văn Phú</strong> 🧋</p>'
            . self::button($d['url'], 'Đặt món flash sale', self::GREEN);

        return ['{name} ơi, Laboong có quà giờ vàng cho bạn nè 🧋', $body];
    }

    /* ═══ Email nhắc flash sale sắp diễn ra ═══ */

    /**
     * Mẫu nhắc cho phiên kế tiếp của đợt: ['session', 'send_options', 'reminders'] hoặc null
     * (đợt không còn phiên nào / chưa có món).
     */
    public static function reminders(FlashSale $sale, ?Carbon $now = null): ?array
    {
        $now ??= ShopTime::now();
        $session = $sale->nextUpcomingSession($now);
        $d = self::data($sale);
        if (!$session || !$d['items']) return null;

        $start = $session['start'];
        $end = $session['end'];
        $weekday = self::WEEKDAYS_LONG[$start->dayOfWeekIso];
        $d += [
            'startTime' => $start->format('H:i'),
            'endTime'   => $end->format('H:i'),
            'weekday'   => $weekday,
            'dayText'   => $weekday . ', ' . $start->format('d/m'),
            'dayNum'    => $start->format('d'),
            'month'     => 'THÁNG ' . $start->month,
            'calendar'  => self::calendarUrl($d, $start, $end),
        ];

        $out = [];
        foreach (self::REMINDERS as $key => $meta) {
            $method = 'remind' . ucfirst($key);
            [$subject, $body] = self::$method($d);
            $out[] = ['key' => 'remind_' . $key] + $meta + ['subject' => $subject, 'body' => $body];
        }

        return [
            'session'      => ['start' => $start->format('Y-m-d\TH:i'), 'text' => "{$d['startTime']} – {$d['endTime']}, {$d['dayText']}/{$start->format('Y')}"],
            'send_options' => self::sendOptions($start, $now),
            'reminders'    => $out,
        ];
    }

    /** Gợi ý thời điểm hẹn gửi (giờ Việt Nam, dạng ô datetime-local). */
    private static function sendOptions(Carbon $start, Carbon $now): array
    {
        $opts = [['label' => 'Gửi ngay', 'value' => null]];
        $candidates = [
            ['Tối hôm trước', $start->copy()->subDay()->setTime(20, 0)],
            ['Sáng ngày diễn ra', $start->copy()->setTime(8, 0)],
            ['3 giờ trước khi bắt đầu', $start->copy()->subHours(3)],
            ['1 giờ trước khi bắt đầu', $start->copy()->subHour()],
            ['30 phút trước khi bắt đầu', $start->copy()->subMinutes(30)],
        ];
        foreach ($candidates as [$label, $at]) {
            if ($at->gt($now->copy()->addMinutes(5)) && $at->lt($start)) {
                $opts[] = ['label' => $label . ' (' . $at->format('H:i d/m') . ')', 'value' => $at->format('Y-m-d\TH:i')];
            }
        }

        return $opts;
    }

    /** Link "Thêm vào Google Calendar" cho phiên flash sale. */
    private static function calendarUrl(array $d, Carbon $start, Carbon $end): string
    {
        $fmt = fn (Carbon $t) => $t->copy()->utc()->format('Ymd\THis\Z');

        return 'https://calendar.google.com/calendar/render?' . http_build_query([
            'action'   => 'TEMPLATE',
            'text'     => 'Flash Sale Laboong · ' . $d['name'],
            'dates'    => $fmt($start) . '/' . $fmt($end),
            'details'  => 'Giảm đến ' . $d['maxPct'] . '% các món trà sữa Laboong. Đặt món tại ' . $d['url'],
            'location' => $d['url'],
        ], '', '&', PHP_QUERY_RFC3986);
    }

    /** Mỗi món một hàng (ảnh nhỏ + tên + giá flash + % giảm), tối đa 4 món, món dư ghi "… và N món khác". */
    private static function miniGrid(array $items, int $max = 4): string
    {
        $show = array_slice($items, 0, $max);
        $rows = '';
        foreach ($show as $i => $it) {
            $line = $i > 0 ? 'border-top:1px solid #EEE7D8;' : '';
            $rows .= '<tr>'
                . '<td style="width:72px;padding:10px 12px 10px 0;vertical-align:middle;' . $line . '">' . self::thumb($it, 72) . '</td>'
                . '<td style="padding:10px 0;vertical-align:middle;' . $line . '">'
                . '<div style="font-size:15px;font-weight:700;color:#1C2620;line-height:1.35;">' . self::e($it['name']) . '</div>'
                . '<div style="margin-top:4px;"><span style="font-size:17px;font-weight:800;color:' . self::RED . ';">' . self::money($it['flash']) . '</span> '
                . '<span style="font-size:12.5px;color:#9AA19C;text-decoration:line-through;">' . self::money($it['price']) . '</span></div>'
                . '</td>'
                . '<td style="width:56px;padding:10px 0 10px 8px;vertical-align:middle;text-align:right;' . $line . '">'
                . '<span style="display:inline-block;background-color:' . self::RED . ';color:#ffffff;font-size:12.5px;font-weight:800;padding:3px 9px;border-radius:999px;">-' . $it['pct'] . '%</span>'
                . '</td>'
                . '</tr>';
        }
        $more = count($items) - count($show);

        return '<table style="width:100%;border-collapse:collapse;">' . $rows . '</table>'
            . ($more > 0 ? '<p style="text-align:center;font-size:13.5px;color:#5C6B62;margin:6px 0 0;">… và ' . $more . ' món khác cũng giảm giá</p>' : '');
    }

    /* ─── Nhắc 1. Đếm ngược ─── */

    private static function remindCountdown(array $d): array
    {
        $body = '<table style="width:100%;border-collapse:separate;background-color:#1C2620;border-radius:18px;"><tr><td style="padding:26px 18px 24px;text-align:center;">'
            . '<span style="display:inline-block;background-color:' . self::RED . ';color:#ffffff;font-size:13px;font-weight:800;letter-spacing:1px;padding:5px 14px;border-radius:999px;">⏰ SẮP DIỄN RA</span>'
            . '<div style="font-size:60px;line-height:1.1;font-weight:800;color:#ffffff;letter-spacing:2px;margin-top:12px;">' . $d['startTime'] . '</div>'
            . '<div style="font-size:18px;font-weight:700;color:#FFC23D;margin-top:2px;">' . self::e($d['dayText']) . '</div>'
            . '<div style="font-size:14px;color:#D8E3DC;margin-top:10px;">Flash Sale “' . self::e($d['name']) . '” · ' . $d['startTime'] . ' – ' . $d['endTime'] . ' · giảm đến ' . $d['maxPct'] . '%</div>'
            . '</td></tr></table>'
            . '<p style="font-size:15px;color:#28352d;line-height:1.65;margin:18px 0 8px;">Chào <strong>{name}</strong>! Đặt báo thức nhé ⏰ — đúng <strong>' . $d['startTime'] . ' ' . self::e($d['dayText']) . '</strong> Laboong mở Flash Sale, các món dưới đây giảm cực sâu và số suất có hạn:</p>'
            . self::miniGrid($d['items'])
            . self::button($d['calendar'], '📅 Thêm vào lịch để được nhắc', self::RED)
            . '<p style="text-align:center;font-size:13px;color:#8A978D;margin:8px 0 0;">Giá flash chỉ áp dụng khi đặt trên website trong khung giờ ' . $d['startTime'] . ' – ' . $d['endTime'] . '.</p>';

        return ['⏰ {name} ơi, ' . $d['startTime'] . ' ' . $d['weekday'] . ' ' . substr($d['dayText'], -5) . ' có Flash Sale giảm đến ' . $d['maxPct'] . '%!', $body];
    }

    /* ─── Nhắc 2. Lịch hẹn ─── */

    private static function remindCalendar(array $d): array
    {
        $rows = '';
        foreach ($d['items'] as $i => $it) {
            $rows .= '<tr>'
                . '<td style="padding:10px 0;border-top:' . ($i ? '1px solid #EEE7D8' : '0') . ';font-size:15px;font-weight:700;color:#1C2620;">' . self::e($it['name']) . '</td>'
                . '<td style="padding:10px 0;border-top:' . ($i ? '1px solid #EEE7D8' : '0') . ';text-align:right;white-space:nowrap;"><span style="font-size:15.5px;font-weight:800;color:' . self::RED . ';">' . self::money($it['flash']) . '</span> '
                . '<span style="font-size:12.5px;color:#9AA19C;text-decoration:line-through;">' . self::money($it['price']) . '</span></td>'
                . '</tr>';
        }

        $body = '<table style="width:100%;border-collapse:collapse;"><tr>'
            . '<td style="width:118px;vertical-align:top;">'
            . '<table style="width:118px;border-collapse:separate;border:1px solid #EEE7D8;border-radius:14px;background-color:#ffffff;">'
            . '<tr><td style="background-color:' . self::RED . ';color:#ffffff;text-align:center;font-size:12.5px;font-weight:800;letter-spacing:1px;padding:7px 0;border-radius:13px 13px 0 0;">' . $d['month'] . '</td></tr>'
            . '<tr><td style="text-align:center;font-size:46px;line-height:1.1;font-weight:800;color:#1C2620;padding:8px 0 0;">' . $d['dayNum'] . '</td></tr>'
            . '<tr><td style="text-align:center;font-size:13px;color:#5C6B62;font-weight:700;padding:0 0 10px;">' . $d['weekday'] . '</td></tr>'
            . '</table></td>'
            . '<td style="padding-left:16px;vertical-align:top;">'
            . '<div style="font-size:12px;letter-spacing:2px;color:' . self::GREEN . ';font-weight:800;">FLASH SALE</div>'
            . '<div style="font-size:22px;font-weight:800;color:#1C2620;line-height:1.25;margin-top:2px;">' . self::e($d['name']) . '</div>'
            . '<div style="font-size:16px;font-weight:700;color:#28352d;margin-top:6px;">🕑 ' . $d['startTime'] . ' – ' . $d['endTime'] . '</div>'
            . '<div style="font-size:13.5px;color:#5C6B62;margin-top:4px;">Giảm đến ' . $d['maxPct'] . '% · chỉ từ ' . self::money($d['minFlash']) . '</div>'
            . '</td></tr></table>'
            . '<p style="font-size:15px;color:#28352d;line-height:1.65;margin:18px 0 0;">Chào {name}, Laboong hẹn bạn lúc <strong>' . $d['startTime'] . ' ' . self::e($d['dayText']) . '</strong>. Bấm nút dưới đây để thêm vào lịch trên điện thoại — tới giờ sẽ có thông báo nhắc bạn:</p>'
            . self::button($d['calendar'], 'Thêm vào Google Calendar', self::GREEN)
            . '<div style="font-size:15px;font-weight:700;color:#1C2620;margin:18px 0 4px;">Các món sẽ giảm giá</div>'
            . '<table style="width:100%;border-collapse:collapse;">' . $rows . '</table>'
            . self::button($d['url'], 'Xem trước trên website', '#ffffff', self::GREEN, self::GREEN);

        return ['📅 Hẹn {name} ' . $d['startTime'] . ' ' . $d['weekday'] . ' ' . substr($d['dayText'], -5) . ' — Flash Sale Laboong giảm đến ' . $d['maxPct'] . '%', $body];
    }

    /* ─── Nhắc 3. Nhắc ngắn ─── */

    private static function remindBrief(array $d): array
    {
        $list = implode(', ', array_map(fn ($it) => self::e($it['name']) . ' chỉ <strong style="color:' . self::RED . ';">' . self::money($it['flash']) . '</strong>', $d['items']));

        $body = '<p style="font-size:15.5px;color:#28352d;line-height:1.75;margin:0 0 12px;">Chào {name},</p>'
            . '<p style="font-size:15.5px;color:#28352d;line-height:1.75;margin:0 0 12px;">Nhắc nhẹ nè: Flash Sale <strong>' . self::e($d['name']) . '</strong> bắt đầu lúc <strong>' . $d['startTime'] . ' ' . self::e($d['dayText']) . '</strong> và kết thúc lúc ' . $d['endTime'] . '.</p>'
            . '<p style="font-size:15.5px;color:#28352d;line-height:1.75;margin:0 0 12px;">Món đang chờ bạn: ' . $list . '.</p>'
            . '<p style="font-size:15.5px;color:#28352d;line-height:1.75;margin:0 0 12px;">Số suất có hạn, bạn đặt trên website ngay khi mở bán để giữ phần nhé!</p>'
            . '<p style="font-size:15.5px;color:#28352d;line-height:1.75;margin:0;">Laboong Victoria Văn Phú 🧋</p>'
            . self::button($d['url'], 'Mở website lúc ' . $d['startTime'], self::GREEN);

        return ['{name} ơi, Flash Sale bắt đầu lúc ' . $d['startTime'] . ' ' . $d['weekday'] . ' nhé 🧋', $body];
    }
}
