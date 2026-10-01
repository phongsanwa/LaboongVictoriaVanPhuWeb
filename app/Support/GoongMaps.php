<?php

namespace App\Support;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Bản đồ qua Goong (goong.io) — dịch vụ Việt Nam, API REST giống Google Maps.
 * Làm được geocode, gợi ý địa chỉ và khoảng cách. Nhanh & rẻ, dữ liệu địa chỉ
 * Việt Nam tốt.
 *
 * Key REST đọc từ AppSetting('maps')['goong_key'], fallback config services.goong.key.
 */
class GoongMaps
{
    private const BASE = 'https://rsapi.goong.io';

    public static function key(): string
    {
        $fromDb = trim((string) (AppSetting::get('maps', [])['goong_key'] ?? ''));

        return $fromDb !== '' ? $fromDb : trim((string) config('services.goong.key', ''));
    }

    public static function enabled(): bool
    {
        return self::key() !== '';
    }

    /** Đổi địa chỉ → toạ độ. Trả ['lat'=>..,'lng'=>..] hoặc null. */
    public static function geocode(string $address): ?array
    {
        $address = trim($address);
        if ($address === '' || !self::enabled()) {
            return null;
        }

        $json = self::get('/geocode', ['address' => $address]);
        $loc  = $json['results'][0]['geometry']['location'] ?? null;

        return self::normalizeLoc($loc);
    }

    /** Gợi ý địa chỉ. Trả [['text'=>..,'lat'=>..,'lng'=>..], ...]. */
    public static function autocomplete(string $query, int $limit = 5): array
    {
        $query = trim($query);
        if (mb_strlen($query) < 3 || !self::enabled()) {
            return [];
        }

        $json  = self::get('/Place/AutoComplete', ['input' => $query, 'more_compound' => 'true']);
        $preds = array_slice($json['predictions'] ?? [], 0, $limit);
        if (empty($preds)) {
            return [];
        }

        // Goong autocomplete không kèm toạ độ → lấy toạ độ qua Place/Detail (song song).
        $key = self::key();
        try {
            $responses = Http::pool(fn ($pool) => array_map(
                fn ($p) => $pool->as((string) ($p['place_id'] ?? ''))
                    ->timeout(10)
                    ->get(self::BASE . '/Place/Detail', ['api_key' => $key, 'place_id' => $p['place_id'] ?? '']),
                $preds
            ));
        } catch (\Throwable $e) {
            Log::warning('Goong detail pool failed', ['error' => $e->getMessage()]);
            $responses = [];
        }

        $out = [];
        foreach ($preds as $p) {
            $pid  = (string) ($p['place_id'] ?? '');
            $resp = $responses[$pid] ?? null;
            $loc  = null;
            if ($resp && method_exists($resp, 'ok') && $resp->ok()) {
                $loc = self::normalizeLoc($resp->json('result.geometry.location'));
            }
            if (!$loc) {
                continue;
            }
            $text = trim((string) ($p['description'] ?? ''));
            $text = preg_replace('/,?\s*Việt Nam$/iu', '', $text);
            if ($text === '') {
                continue;
            }
            $out[] = ['text' => trim((string) $text), 'lat' => $loc['lat'], 'lng' => $loc['lng']];
        }

        return $out;
    }

    /** Khoảng cách đường bộ (km) giữa 2 toạ độ. Trả float hoặc null. */
    public static function roadDistanceKm(float $oLat, float $oLng, float $dLat, float $dLng): ?float
    {
        if (!self::enabled()) {
            return null;
        }

        $json = self::get('/DistanceMatrix', [
            'origins'      => "{$oLat},{$oLng}",
            'destinations' => "{$dLat},{$dLng}",
            'vehicle'      => 'car',
        ]);

        $meters = $json['rows'][0]['elements'][0]['distance']['value'] ?? null;

        return is_numeric($meters) ? round(((float) $meters) / 1000, 2) : null;
    }

    /* ─── Helpers ─── */

    private static function get(string $path, array $params): array
    {
        try {
            $params['api_key'] = self::key();
            $res = Http::timeout(12)->get(self::BASE . $path, $params);

            if (!$res->successful()) {
                Log::warning('Goong request failed', ['status' => $res->status(), 'path' => $path]);
                return [];
            }

            $json = $res->json();

            return is_array($json) ? $json : [];
        } catch (\Throwable $e) {
            Log::error('Goong exception', ['path' => $path, 'error' => $e->getMessage()]);
            return [];
        }
    }

    private static function normalizeLoc($loc): ?array
    {
        if (!is_array($loc)) {
            return null;
        }
        $lat = $loc['lat'] ?? null;
        $lng = $loc['lng'] ?? null;
        if (!is_numeric($lat) || !is_numeric($lng)) {
            return null;
        }

        return ['lat' => (float) $lat, 'lng' => (float) $lng];
    }
}
