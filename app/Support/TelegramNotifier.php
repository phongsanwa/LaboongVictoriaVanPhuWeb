<?php

namespace App\Support;

use App\Models\AppSetting;
use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Gửi thông báo qua Telegram Bot. Cấu hình lưu trong AppSetting('telegram'):
 * ['enabled' => bool, 'bot_token' => string, 'chat_id' => string].
 */
class TelegramNotifier
{
    public static function config(): array
    {
        $t = AppSetting::get('telegram', []);
        return [
            'enabled'   => (bool) ($t['enabled'] ?? false),
            'bot_token' => trim((string) ($t['bot_token'] ?? '')),
            'chat_id'   => trim((string) ($t['chat_id'] ?? '')),
        ];
    }

    public static function enabled(): bool
    {
        $c = self::config();
        return $c['enabled'] && $c['bot_token'] !== '' && $c['chat_id'] !== '';
    }

    /** Gửi 1 tin nhắn (HTML) tới chat đã cấu hình, hoặc tới token/chat_id truyền vào (dùng cho gửi thử). */
    public static function send(string $text, ?string $token = null, ?string $chatId = null): bool
    {
        $c = self::config();
        $token  = $token  !== null ? trim($token)  : $c['bot_token'];
        $chatId = $chatId !== null ? trim($chatId) : $c['chat_id'];

        if ($token === '' || $chatId === '') return false;

        try {
            $res = Http::timeout(12)->asForm()->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id'                  => $chatId,
                'text'                     => $text,
                'parse_mode'               => 'HTML',
                'disable_web_page_preview' => true,
            ]);

            if (!$res->successful()) {
                Log::warning('Telegram sendMessage failed', ['status' => $res->status(), 'body' => $res->body()]);
            }

            return $res->successful();
        } catch (\Throwable $e) {
            Log::error('Telegram send exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /** Soạn nội dung 1 đơn hàng thành text HTML cho Telegram. */
    public static function formatOrder(Order $o): string
    {
        $e = fn ($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
        $fmt = fn ($n) => number_format((int) $n, 0, ',', '.');

        $ordNo = 'LB-' . str_pad((string) $o->id, 4, '0', STR_PAD_LEFT);
        $user  = $o->customer?->user;
        $name  = $user?->name ?? 'Khách hàng';
        $phone = $o->delivery_phone ?: ($user?->phone ?? '—');
        $created = $o->created_at?->setTimezone('Asia/Ho_Chi_Minh')->format('H:i d/m/Y');
        $method = ((int) $o->shipping_fee) > 0 ? 'Giao hàng' : 'Nhận tại quầy';

        $lines = [];
        $lines[] = "🧋 <b>ĐƠN HÀNG MỚI</b> — {$e($ordNo)}";
        $lines[] = "🕒 {$e($created)}";
        if ($o->store?->name) $lines[] = "🏪 " . $e($o->store->name);
        $lines[] = "";
        $lines[] = "👤 <b>{$e($name)}</b> · {$e($phone)}";
        $lines[] = "🛵 {$e($method)}";
        if ($o->delivery_address) $lines[] = "📍 " . $e($o->delivery_address);
        $lines[] = "";
        $lines[] = "<b>Món đặt:</b>";

        foreach ($o->items as $item) {
            $parts = [];
            if ($item->size_name)             $parts[] = "Size {$item->size_name}";
            if ($item->sugar_level !== null)  $parts[] = "Đường {$item->sugar_level}%";
            if ($item->ice_level !== null)    $parts[] = "Đá {$item->ice_level}%";
            foreach ($item->toppings as $t) {
                $q = max(1, (int) ($t->quantity ?? 1));
                $parts[] = $q > 1 ? "{$t->topping_name} x{$q}" : $t->topping_name;
            }
            $pname = $item->product?->name ?? ('Sản phẩm #' . $item->product_id);
            $line = "• {$item->quantity}x {$e($pname)} — " . $fmt($item->unit_price * $item->quantity) . 'đ';
            if ($parts) $line .= "\n   <i>" . $e(implode(' · ', $parts)) . "</i>";
            $lines[] = $line;
        }

        if ($o->note) {
            $lines[] = "";
            $lines[] = "📝 <i>" . $e($o->note) . "</i>";
        }

        $lines[] = "";
        if ((int) $o->discount_amount > 0) $lines[] = "Giảm giá: -" . $fmt($o->discount_amount) . 'đ';
        if ((int) $o->shipping_fee > 0)    $lines[] = "Phí ship: " . $fmt($o->shipping_fee) . 'đ';
        $lines[] = "💰 <b>Tổng tiền: " . $fmt($o->total_amount) . "đ</b>";

        return implode("\n", $lines);
    }
}
