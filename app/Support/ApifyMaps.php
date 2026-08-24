<?php

namespace App\Support;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Bản đồ qua Apify (apify.com). Dùng 2 actor:
 *  - place_actor (compass~crawler-google-places): tìm địa điểm → toạ độ + địa chỉ
 *    (phục vụ geocode & gợi ý địa chỉ).
 *  - directions_actor (zen-studio~google-maps-directions-api): tính khoảng cách
 *    đường bộ giữa 2 điểm.
 *
 * Lưu ý: actor chạy theo "run" nên CHẬM (vài giây trở lên) và tính phí theo lượt
 * chạy. Không vẽ được bản đồ tương tác.
 *
 * Cấu hình đọc từ AppSetting('maps') (apify_token / apify_place_actor /
 * apify_directions_actor), fallback về config services.apify.*.
 */
class ApifyMaps
{
    public static function token(): string
    {
        $fromDb = trim((string) (AppSetting::get('maps', [])['apify_token'] ?? ''));

        return $fromDb !== '' ? $fromDb : trim((string) config('services.apify.token', ''));
    }

    public static function placeActor(): string
    {
        $fromDb = trim((string) (AppSetting::get('maps', [])['apify_place_actor'] ?? ''));
        $actor  = $fromDb !== '' ? $fromDb : trim((string) config('services.apify.place_actor', ''));

        return self::normalizeActor($actor ?: 'compass~crawler-google-places');
    }

    public static function directionsActor(): string
    {
        $fromDb = trim((string) (AppSetting::get('maps', [])['apify_directions_actor'] ?? ''));
        $actor  = $fromDb !== '' ? $fromDb : trim((string) config('services.apify.directions_actor', ''));

        return self::normalizeActor($actor ?: 'zen-studio~google-maps-directions-api');
    }

    public static function enabled(): bool
    {
        return self::token() !== '';
    }

    /** Đổi địa chỉ → toạ độ. Trả ['lat'=>..,'lng'=>..] hoặc null. */
    public static function geocode(string $address): ?array
    {
        $address = trim($address);
        if ($address === '' || !self::enabled()) {
            return null;
        }

        foreach (self::runPlaceSearch($address, 1) as $it) {
            $coord = self::normalizeCoord($it);
            if ($coord) {
                return $coord;
            }
        }

        return null;
    }

    /** Gợi ý địa chỉ. Trả [['text'=>..,'lat'=>..,'lng'=>..], ...]. */
    public static function autocomplete(string $query, int $limit = 5): array
    {
        $query = trim($query);
        if (mb_strlen($query) < 3 || !self::enabled()) {
            return [];
        }

        $out = [];
        foreach (self::runPlaceSearch($query, $limit) as $it) {
            $coord = self::normalizeCoord($it);
            if (!$coord) {
                continue;
            }
            $title = trim((string) ($it['title'] ?? ($it['name'] ?? '')));
            $addr  = trim((string) ($it['address'] ?? ''));
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

    /** Khoảng cách đường bộ (km) giữa 2 toạ độ. Trả float hoặc null (→ Haversine). */
    public static function roadDistanceKm(float $oLat, float $oLng, float $dLat, float $dLng): ?float
    {
        if (!self::enabled()) {
            return null;
        }

        // Input phổ biến cho actor "directions". Nếu actor của bạn dùng tên
        // trường khác, gửi mình mẫu input để chỉnh lại chỗ này.
        $items = self::runActor(self::directionsActor(), [
            'origin'      => "{$oLat},{$oLng}",
            'destination' => "{$dLat},{$dLng}",
            'mode'        => 'driving',
        ]);

        foreach ($items as $it) {
            $meters = self::extractMeters($it);
            if ($meters !== null) {
                return round($meters / 1000, 2);
            }
        }

        return null;
    }

    /* ─── Helpers ─── */

    /** Chạy actor tìm địa điểm (compass~crawler-google-places). */
    private static function runPlaceSearch(string $query, int $max): array
    {
        return self::runActor(self::placeActor(), [
            'searchStringsArray'        => [$query . ', Việt Nam'],
            'maxCrawledPlacesPerSearch' => $max,
            'language'                  => 'vi',
            'countryCode'               => 'vn',
        ]);
    }

    /** Chạy actor đồng bộ, trả dataset items (mảng) hoặc [] khi lỗi. */
    private static function runActor(string $actor, array $input): array
    {
        $url = 'https://api.apify.com/v2/acts/' . rawurlencode($actor) . '/run-sync-get-dataset-items';

        try {
            $res = Http::timeout(90)
                ->withToken(self::token())
                ->post($url . '?format=json', $input);

            if (!$res->successful()) {
                Log::warning('Apify run failed', ['status' => $res->status(), 'actor' => $actor]);
                return [];
            }

            $json = $res->json();

            return is_array($json) ? $json : [];
        } catch (\Throwable $e) {
            Log::error('Apify exception', ['actor' => $actor, 'error' => $e->getMessage()]);
            return [];
        }
    }

    /** Rút toạ độ từ 1 item (schema khác nhau giữa các actor). */
    private static function normalizeCoord($it): ?array
    {
        if (!is_array($it)) {
            return null;
        }
        $lat = $it['location']['lat']
            ?? ($it['location']['latitude']
            ?? ($it['latitude']
            ?? ($it['lat']
            ?? ($it['coordinates']['lat'] ?? ($it['gps_coordinates']['latitude'] ?? null)))));
        $lng = $it['location']['lng']
            ?? ($it['location']['longitude']
            ?? ($it['longitude']
            ?? ($it['lng']
            ?? ($it['coordinates']['lng'] ?? ($it['gps_coordinates']['longitude'] ?? null)))));

        if (!is_numeric($lat) || !is_numeric($lng)) {
            return null;
        }

        return ['lat' => (float) $lat, 'lng' => (float) $lng];
    }

    /** Rút khoảng cách (mét) từ 1 item directions (nhiều dạng schema). */
    private static function extractMeters($it): ?float
    {
        if (!is_array($it)) {
            return null;
        }

        // Dạng giống Google Directions API: routes[0].legs[0].distance.value (mét)
        $v = $it['routes'][0]['legs'][0]['distance']['value']
            ?? ($it['legs'][0]['distance']['value']
            ?? ($it['distance']['value']
            ?? ($it['distanceMeters']
            ?? ($it['distance_meters']
            ?? (is_numeric($it['distance'] ?? null) ? $it['distance'] : null)))));

        if (is_numeric($v)) {
            return (float) $v;
        }

        // Dạng chữ: "5.2 km" / "800 m"
        $text = $it['routes'][0]['legs'][0]['distance']['text']
            ?? ($it['distance']['text']
            ?? ($it['formatted_distance']
            ?? (is_string($it['distance'] ?? null) ? $it['distance'] : null)));

        return $text ? self::parseDistanceText((string) $text) : null;
    }

    /** "5,2 km" / "800 m" → mét. */
    private static function parseDistanceText(string $text): ?float
    {
        $t = strtolower(str_replace(',', '.', trim($text)));
        if (!preg_match('/([\d.]+)\s*(km|m)\b/', $t, $m)) {
            return null;
        }
        $num = (float) $m[1];

        return $m[2] === 'km' ? $num * 1000 : $num;
    }

    /** Cho phép nhập slug dạng "owner/name" → chuẩn API "owner~name". */
    private static function normalizeActor(string $actor): string
    {
        return str_replace('/', '~', trim($actor));
    }

    private static function cleanText(string $t): string
    {
        $t = preg_replace('/,?\s*Việt Nam$/iu', '', trim($t));

        return trim((string) $t);
    }
}
