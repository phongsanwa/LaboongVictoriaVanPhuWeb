<?php

namespace App\Http\Controllers;

use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class StoreController extends Controller
{
    private const NAME_PREFIX = 'Laboong ';

    private const MAP_POSITIONS = [
        [52, 46], [30, 28], [72, 64], [24, 72], [45, 55], [60, 35],
    ];

    public function index(Request $request)
    {
        $stores = Store::where('status', 'active')->orderBy('id')->get();

        $customer = $request->user()->customer()->first();
        $homeStoreId = $customer?->store_id;

        $reference = $homeStoreId ? $stores->firstWhere('id', $homeStoreId) : null;
        $reference ??= $stores->first();

        $now = Carbon::now();
        $todayIdx = $now->dayOfWeekIso - 1; // 0 = Thứ 2 ... 6 = Chủ nhật
        $nowMins = $now->hour * 60 + $now->minute;

        $list = $stores->values()->map(function (Store $store, int $index) use ($reference, $todayIdx, $nowMins) {
            $open = substr((string) $store->opening_time, 0, 5);
            $close = substr((string) $store->closing_time, 0, 5);
            $days = $store->operating_days ?? [];

            $isOpen = in_array($todayIdx, $days, true)
                && $nowMins >= $this->toMinutes($open)
                && $nowMins < $this->toMinutes($close);

            $km = null;
            if ($reference && $reference->latitude !== null && $store->latitude !== null) {
                $km = round($this->distanceKm(
                    (float) $reference->latitude,
                    (float) $reference->longitude,
                    (float) $store->latitude,
                    (float) $store->longitude
                ), 1);
            }

            [$x, $y] = self::MAP_POSITIONS[$index % count(self::MAP_POSITIONS)];

            return [
                'id' => $store->id,
                'name' => $store->name,
                'short' => str_starts_with($store->name, self::NAME_PREFIX)
                    ? substr($store->name, strlen(self::NAME_PREFIX))
                    : $store->name,
                'addr' => $store->address,
                'phone' => $store->phone,
                'lat' => $store->latitude !== null ? (float) $store->latitude : null,
                'lng' => $store->longitude !== null ? (float) $store->longitude : null,
                'open' => $open,
                'close' => $close,
                'operatingDays' => $days,
                'isOpenNow' => $isOpen,
                'km' => $km,
                'rating' => round(4.5 + ($store->id % 5) * 0.1, 1),
                'reviews' => 180 + ($store->id * 71) % 400,
                'x' => $x,
                'y' => $y,
            ];
        })->all();

        $selectedId = ($homeStoreId && $stores->contains('id', $homeStoreId))
            ? $homeStoreId
            : $stores->first()?->id;

        return view('store', ['storeData' => [
            'stores' => $list,
            'selectedId' => $selectedId,
            'todayIdx' => $todayIdx,
        ]]);
    }

    private function toMinutes(string $hhmm): int
    {
        [$h, $m] = array_pad(array_map('intval', explode(':', $hhmm)), 2, 0);

        return $h * 60 + $m;
    }

    private function distanceKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
