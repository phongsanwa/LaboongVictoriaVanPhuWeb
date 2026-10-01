<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Support\ApifyMaps;
use App\Support\GoongMaps;
use App\Support\SerpApiMaps;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint bản đồ phía server — client gọi khi Google Maps JS lỗi hoặc khi
 * admin chọn nhà cung cấp phía server (SerpApi / Apify / Goong). Giữ key/token
 * ở server, không lộ ra trình duyệt.
 *
 * Nhà cung cấp chọn theo AppSetting('maps')['provider']:
 *  - goong  → Goong
 *  - apify  → Apify
 *  - còn lại (auto/serpapi/google) → SerpApi (auto = dự phòng cho Google)
 */
class MapsController extends Controller
{
    /** GET /api/maps/geocode?q=... → {lat, lng}. */
    public function geocode(Request $request): JsonResponse
    {
        $q = (string) $request->query('q', '');
        $svc = $this->service();
        $loc = $svc::geocode($q);

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
        $svc = $this->service();

        return response()->json([
            'ok'      => $svc::enabled(),
            'results' => $svc::autocomplete($q),
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

        $svc = $this->service();
        $km  = $svc::roadDistanceKm(
            (float) $data['olat'], (float) $data['olng'],
            (float) $data['dlat'], (float) $data['dlng'],
        );

        return response()->json(['ok' => $km !== null, 'km' => $km]);
    }

    /** Lớp service tương ứng nhà cung cấp đang chọn (đều có geocode/autocomplete/roadDistanceKm/enabled). */
    private function service(): string
    {
        return match (AppSetting::get('maps', [])['provider'] ?? 'auto') {
            'goong' => GoongMaps::class,
            'apify' => ApifyMaps::class,
            default => SerpApiMaps::class,
        };
    }
}
