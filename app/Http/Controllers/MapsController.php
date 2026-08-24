<?php

namespace App\Http\Controllers;

use App\Support\SerpApiMaps;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint dự phòng bản đồ qua SerpApi — chỉ được client gọi khi Google Maps
 * JS trên trình duyệt lỗi. Giữ key SerpApi ở server, không lộ ra trình duyệt.
 */
class MapsController extends Controller
{
    /** GET /api/maps/geocode?q=... → {lat, lng} hoặc {lat:null,lng:null}. */
    public function geocode(Request $request): JsonResponse
    {
        $q = (string) $request->query('q', '');
        $loc = SerpApiMaps::geocode($q);

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

        $km = SerpApiMaps::roadDistanceKm(
            (float) $data['olat'], (float) $data['olng'],
            (float) $data['dlat'], (float) $data['dlng'],
        );

        return response()->json(['ok' => $km !== null, 'km' => $km]);
    }
}
