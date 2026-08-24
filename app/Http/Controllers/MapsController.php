<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Support\ApifyMaps;
use App\Support\SerpApiMaps;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint bản đồ phía server — client gọi khi Google Maps JS lỗi hoặc khi
 * admin chọn nhà cung cấp phía server (SerpApi / Apify). Giữ key/token ở
 * server, không lộ ra trình duyệt.
 *
 * Nhà cung cấp chọn theo AppSetting('maps')['provider']:
 *  - apify  → dùng Apify
 *  - còn lại (auto/serpapi/google) → dùng SerpApi (auto = dự phòng cho Google)
 */
class MapsController extends Controller
{
    /** GET /api/maps/geocode?q=... → {lat, lng}. */
    public function geocode(Request $request): JsonResponse
    {
        $q = (string) $request->query('q', '');
        $loc = $this->isApify() ? ApifyMaps::geocode($q) : SerpApiMaps::geocode($q);

        return response()->json([
            'ok'  => $loc !== null,
            'lat' => $loc['lat'] ?? null,
            'lng' => $loc['lng'] ?? null,
        ]);
    }

    /** GET /api/maps/autocomplete?q=... → {results:[{text,lat,lng}]}. */
    public function autocomplete(Request $request): JsonResponse
    {
        $q = (string) $request->query('q', '');

        if ($this->isApify()) {
            return response()->json([
                'ok'      => ApifyMaps::enabled(),
                'results' => ApifyMaps::autocomplete($q),
            ]);
        }

        return response()->json([
            'ok'      => SerpApiMaps::enabled(),
            'results' => SerpApiMaps::autocomplete($q),
        ]);
    }

    /** GET /api/maps/distance?olat=&olng=&dlat=&dlng= → {km|null}. */
    public function distance(Request $request): JsonResponse
    {
        $data = $request->validate([
            'olat' => ['required', 'numeric', 'between:-90,90'],
            'olng' => ['required', 'numeric', 'between:-180,180'],
            'dlat' => ['required', 'numeric', 'between:-90,90'],
            'dlng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $o = [(float) $data['olat'], (float) $data['olng']];
        $d = [(float) $data['dlat'], (float) $data['dlng']];

        $km = $this->isApify()
            ? ApifyMaps::roadDistanceKm($o[0], $o[1], $d[0], $d[1])
            : SerpApiMaps::roadDistanceKm($o[0], $o[1], $d[0], $d[1]);

        return response()->json(['ok' => $km !== null, 'km' => $km]);
    }

    private function isApify(): bool
    {
        return (AppSetting::get('maps', [])['provider'] ?? 'auto') === 'apify';
    }
}
