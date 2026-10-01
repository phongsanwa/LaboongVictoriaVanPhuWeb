<?php

namespace App\Support;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Dự phòng bản đồ qua SerpApi (serpapi.com) khi Google Maps JS trên trình
 * duyệt lỗi/không tải được. Chỉ thay các chức năng DỮ LIỆU (geocode, gợi ý
 * địa chỉ, khoảng cách) — KHÔNG vẽ được bản đồ tương tác.
 *
 * Key đọc từ AppSetting('maps')['serpapi_key'], nếu trống thì lấy env
 * (config services.serpapi.key). Gọi phía server để giữ key bí mật.
 */
class SerpApiMaps
{
    private const ENDPOINT = 'https://serpapi.com/search.json';

    public static function apiKey(): string
    {
        $fromDb = trim((string) (AppSetting::get('maps', [])['serpapi_key'] ?? ''));

        return $fromDb !== '' ? $fromDb : trim((string) config('services.serpapi.key', ''));
    }

    public static function enabled(): bool
    {
        return self::apiKey() !== '';
    }

    /** Đổi địa chỉ → toạ độ. Trả ['lat'=>..,'lng'=>..] hoặc null. */
    public static function geocode(string $address): ?array
    {
        $address = trim($address);
        if ($address === '' || !self::enabled()) {
            return null;
        }

        $data = self::call([
            'engine'   => 'google_maps',
            'type'     => 'search',
            'q'        => $address . ', Việt Nam',
            'hl'       => 'vi',
            'gl'       => 'vn',
        ]);
        if ($data === null) {
            return null;
        }

        // Kết quả khớp duy nhất → place_results; nhiều kết quả → local_results[].
        $coord = $data['place_results']['gps_coordinates']
            ?? ($data['local_results'][0]['gps_coordinates'] ?? null);

        return self::normalizeCoord($coord);
    }

    /** Gợi ý địa chỉ khi gõ. Trả mảng [['text'=>..,'lat'=>..,'lng'=>..], ...]. */
    public static function autocomplete(string $query, int $limit = 5): array
    {
        $query = trim($query);
        if (mb_strlen($query) < 3 || !self::enabled()) {
            return [];
        }

        $data = self::call([
            'engine' => 'google_maps',
            'type'   => 'search',
            'q'      => $query . ', Việt Nam',
            'hl'     => 'vi',
            'gl'     => 'vn',
        ]);
        if ($data === null) {
            return [];
        }

        $out = [];

        // Nếu chỉ có 1 kết quả khớp, SerpApi trả place_results (không phải mảng).
        if (empty($data['local_results']) && !empty($data['place_results'])) {
            $pr = $data['place_results'];
            $coord = self::normalizeCoord($pr['gps_coordinates'] ?? null);
            if ($coord) {
                $out[] = [
                    'text' => self::cleanText(($pr['title'] ?? '') . ($pr['address'] ?? '' ? ' — ' . $pr['address'] : '')),
                    'lat'  => $coord['lat'],
                    'lng'  => $coord['lng'],
                ];
            }
            return $out;
        }

        foreach (($data['local_results'] ?? []) as $r) {
            $coord = self::normalizeCoord($r['gps_coordinates'] ?? null);
            if (!$coord) {
                continue;
            }
            $title = trim((string) ($r['title'] ?? ''));
            $addr  = trim((string) ($r['address'] ?? ''));
            $text  = $addr !== '' ? ($title !== '' ? "{$title} — {$addr}" : $addr) : $title;
            if ($text === '') {
                continue;
            }
            $out[] = ['text' => self::cleanText($text), 'lat' => $coord['lat'], 'lng' => $coord['lng']];
            if (count($out) >= $limit) {
                break;
            }
        }

        return $out;
    }

    /** Khoảng cách đường bộ (km) giữa 2 toạ độ. Trả float hoặc null. */
    public static function roadDistanceKm(float $oLat, float $oLng, float $dLat, float $dLng): ?float
    {
        if (!self::enabled()) {
            return null;
        }

        $data = self::call([
            'engine'       => 'google_maps_directions',
            'start_coords' => "{$oLat},{$oLng}",
            'end_coords'   => "{$dLat},{$dLng}",
            'travel_mode'  => 'driving',
            'hl'           => 'vi',
            'gl'           => 'vn',
        ]);
        if ($data === null) {
            return null;
        }

        // Lấy quãng đường của tuyến đầu tiên (mét → km).
        $meters = $data['directions'][0]['trips'][0]['distance']
            ?? ($data['directions'][0]['formatted_distance'] ?? null);

        if (is_numeric($meters)) {
            return round(((float) $meters) / 1000, 2);
        }

        return null;
    }

    /** Gọi SerpApi, trả mảng JSON hoặc null khi lỗi. */
    private static function call(array $params): ?array
    {
        try {
            $params['api_key'] = self::apiKey();
            $res = Http::timeout(12)->get(self::ENDPOINT, $params);

            if (!$res->successful()) {
                Log::warning('SerpApi request failed', ['status' => $res->status(), 'engine' => $params['engine'] ?? '']);
                return null;
            }

            $json = $res->json();
            if (!is_array($json) || isset($json['error'])) {
                Log::warning('SerpApi returned error', ['error' => $json['error'] ?? 'invalid json']);
                return null;
            }

            return $json;
        } catch (\Throwable $e) {
            Log::error('SerpApi exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private static function normalizeCoord($coord): ?array
    {
        if (!is_array($coord)) {
            return null;
        }
        $lat = $coord['latitude'] ?? ($coord['lat'] ?? null);
        $lng = $coord['longitude'] ?? ($coord['lng'] ?? null);
        if (!is_numeric($lat) || !is_numeric($lng)) {
            return null;
        }

        return ['lat' => (float) $lat, 'lng' => (float) $lng];
    }

    private static function cleanText(string $t): string
    {
        $t = preg_replace('/,?\s*Việt Nam$/iu', '', trim($t));

        return trim((string) $t);
    }
}
