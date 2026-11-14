<?php

namespace App\Support;

use App\Models\AppSetting;
use App\Models\PosOrder;

/**
 * Giá bán trên app giao hàng (ShopeeFood, GrabFood, Xanh SM) khi lên đơn tại quầy.
 * Mỗi app: tăng X% so với giá tại quầy (cả giá món lẫn phụ thu size/topping), làm tròn lên;
 * món nào cần giá riêng thì đặt giá món riêng cho app đó (phụ thu vẫn tăng theo %).
 * Cài ở Admin → Giá bán app.
 */
class ChannelPricing
{
    public const KEY = 'channel_prices';
    public const ROUNDING = [0, 500, 1000];

    /** ['markup' => [ch => %], 'round' => 0|500|1000, 'overrides' => [product_id => [ch => giá]]] */
    public static function settings(): array
    {
        $s = AppSetting::get(self::KEY, []);
        $markup = [];
        foreach (PosOrder::APP_CHANNELS as $ch) {
            $markup[$ch] = max(0, min(200, (float) ($s['markup'][$ch] ?? 0)));
        }
        $overrides = [];
        foreach ((array) ($s['overrides'] ?? []) as $pid => $prices) {
            foreach ((array) $prices as $ch => $price) {
                if (in_array($ch, PosOrder::APP_CHANNELS, true) && is_numeric($price) && $price > 0) {
                    $overrides[(string) $pid][$ch] = (int) $price;
                }
            }
        }

        return [
            'markup'    => $markup,
            'round'     => in_array((int) ($s['round'] ?? 1000), self::ROUNDING, true) ? (int) ($s['round'] ?? 1000) : 1000,
            'overrides' => $overrides,
        ];
    }

    public static function isApp(string $channel): bool
    {
        return in_array($channel, PosOrder::APP_CHANNELS, true);
    }

    /** Giá món (chưa gồm phụ thu) theo kênh. */
    public static function basePrice(int $productId, int $counterPrice, string $channel, ?array $s = null): int
    {
        if (!self::isApp($channel)) return $counterPrice;
        $s ??= self::settings();
        $override = $s['overrides'][(string) $productId][$channel] ?? null;

        return $override ?: self::bump($counterPrice, $channel, $s);
    }

    /** Phụ thu size / topping theo kênh. */
    public static function extra(int $amount, string $channel, ?array $s = null): int
    {
        if (!self::isApp($channel) || $amount <= 0) return max(0, $amount);

        return self::bump($amount, $channel, $s ?? self::settings());
    }

    private static function bump(int $amount, string $channel, array $s): int
    {
        $v = $amount * (1 + ($s['markup'][$channel] ?? 0) / 100);
        $r = $s['round'];

        return (int) ($r > 0 ? ceil(round($v, 2) / $r) * $r : round($v));
    }
}
