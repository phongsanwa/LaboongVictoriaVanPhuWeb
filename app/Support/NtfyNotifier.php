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

    /** Soạn tiêu đề + nội dung đầy đủ (giống email) cho 1 đơn hàng. Trả [title, message, click]. */
    public static function formatOrder(Order $o): array
    {
        $fmt = fn ($n) => number_format((int) $n, 0, ',', '.');
        $ordNo = 'LB-' . str_pad((string) $o->id, 4, '0', STR_PAD_LEFT);
        $user  = $o->customer?->user;
        $name  = $user?->name ?? 'Khách hàng';
        $phone = $o->delivery_phone ?: ($user?->phone ?? '—');
        $created = $o->created_at?->setTimezone('Asia/Ho_Chi_Minh')->format('H:i d/m/Y');
        $method = ((int) $o->shipping_fee) > 0 ? 'Giao hàng' : 'Nhận tại quầy';

        $lines = [];
        $lines[] = "🕒 {$created}";
        $lines[] = "👤 {$name} · {$phone}";
        $lines[] = "🛵 {$method}";
        if ($o->store?->name) $lines[] = "🏪 " . $o->store->name;
        if ($o->delivery_address) $lines[] = "📍 " . $o->delivery_address;
        $lines[] = "";
        $lines[] = "MÓN ĐẶT";

        foreach ($o->items as $item) {
            $parts = [];
            if ($item->size_name)            $parts[] = "Size {$item->size_name}";
            if ($item->sugar_level !== null) $parts[] = "Đường {$item->sugar_level}%";
            if ($item->ice_level !== null)   $parts[] = "Đá {$item->ice_level}%";
            foreach ($item->toppings as $t) {
                $q = max(1, (int) ($t->quantity ?? 1));
                $parts[] = $q > 1 ? "{$t->topping_name} x{$q}" : $t->topping_name;
            }
            $pname = $item->product?->name ?? ('Sản phẩm #' . $item->product_id);
            $lines[] = "• {$item->quantity}x {$pname} — " . $fmt($item->unit_price * $item->quantity) . 'đ';
            if ($parts) $lines[] = "   " . implode(' · ', $parts);
        }

        if ($o->note) {
            $lines[] = "";
            $lines[] = "📝 Ghi chú: " . $o->note;
        }

        $lines[] = "";
        $lines[] = "Tạm tính: " . $fmt($o->subtotal) . 'đ';
        foreach ($o->discounts as $d) {
            $amt = (int) $d->discount_amount;
            $desc = $d->description ?: 'Giảm giá';
            if ($amt > 0) {
                $label = ($d->discount_category === 'SHIPPING') ? 'Giảm ship' : 'Giảm giá';
                $lines[] = "{$label}: -" . $fmt($amt) . "đ ({$desc})";
            } else {
                $lines[] = "Quà tặng: {$desc}";
            }
        }
        if ((int) $o->shipping_fee > 0) $lines[] = "Phí ship: " . $fmt($o->shipping_fee) . 'đ';
        $lines[] = "💰 TỔNG: " . $fmt($o->total_amount) . 'đ';

        return [
            'title'   => 'Bạn có đơn hàng từ Laboong · ' . $ordNo,
            'message' => implode("\n", $lines),
            'click'   => Site::adminOrders(),
        ];
    }
}
