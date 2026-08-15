<?php

namespace App\Support;

use App\Models\AppSetting;
use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Gửi thông báo đẩy qua ntfy.sh. Cấu hình lưu trong AppSetting('ntfy'):
 * ['enabled' => bool, 'topic' => string, 'server' => string].
 * Dùng priority tối đa (5) để chuông kêu to / hiện đè lên màn hình.
 */
class NtfyNotifier
{
    public static function config(): array
    {
        $n = AppSetting::get('ntfy', []);
        $server = trim((string) ($n['server'] ?? '')) ?: 'https://ntfy.sh';

        return [
            'enabled' => (bool) ($n['enabled'] ?? false),
            'topic'   => trim((string) ($n['topic'] ?? '')),
            'server'  => rtrim($server, '/'),
        ];
    }

    public static function enabled(): bool
    {
        $c = self::config();
        return $c['enabled'] && $c['topic'] !== '';
    }

    /** Gửi 1 thông báo (UTF-8 qua JSON publish). Có thể truyền topic/server để gửi thử. */
    public static function send(string $title, string $message, ?string $click = null, ?string $topic = null, ?string $server = null): bool
    {
        $c = self::config();
        $topic  = $topic !== null ? trim($topic) : $c['topic'];
        $server = $server !== null ? (rtrim(trim($server), '/') ?: 'https://ntfy.sh') : $c['server'];

        if ($topic === '') return false;

        try {
            $payload = [
                'topic'    => $topic,
                'title'    => $title,
                'message'  => $message,
                'priority' => 5,               // max: chuông to, hiện đè, bỏ qua chế độ im lặng
                'tags'     => ['bell', 'shopping_cart'],
            ];
            if ($click) $payload['click'] = $click;

            $res = Http::timeout(12)->post($server, $payload);

            if (!$res->successful()) {
                Log::warning('ntfy publish failed', ['status' => $res->status(), 'body' => $res->body()]);
            }

            return $res->successful();
        } catch (\Throwable $e) {
            Log::error('ntfy send exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /** Soạn tiêu đề + nội dung ngắn gọn cho 1 đơn hàng. Trả [title, message, click]. */
    public static function formatOrder(Order $o): array
    {
        $fmt = fn ($n) => number_format((int) $n, 0, ',', '.');
        $ordNo = 'LB-' . str_pad((string) $o->id, 4, '0', STR_PAD_LEFT);
        $user  = $o->customer?->user;
        $name  = $user?->name ?? 'Khách hàng';
        $phone = $o->delivery_phone ?: ($user?->phone ?? '');
        $method = ((int) $o->shipping_fee) > 0 ? 'Giao hàng' : 'Nhận tại quầy';

        $itemCount = 0;
        foreach ($o->items as $it) $itemCount += (int) $it->quantity;

        $lines = [];
        $lines[] = "{$name}" . ($phone ? " · {$phone}" : '');
        $lines[] = "{$itemCount} món · {$method}";
        if ($o->store?->name) $lines[] = $o->store->name;
        $lines[] = "Tổng: " . $fmt($o->total_amount) . 'đ';

        return [
            'title'   => 'Bạn có đơn hàng từ Laboong · ' . $ordNo,
            'message' => implode("\n", $lines),
            'click'   => rtrim((string) config('app.url'), '/') . '/admin/orders',
        ];
    }
}
