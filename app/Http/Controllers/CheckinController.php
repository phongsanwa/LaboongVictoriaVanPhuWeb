<?php
namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\Customer;
use App\Models\CustomerPoint;
use App\Models\DailyCheckin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class CheckinController extends Controller {
    private static function defaultDays(): array {
        return [
            ['d' => 'Ngày 1', 'pts' => 5],
            ['d' => 'Ngày 2', 'pts' => 5],
            ['d' => 'Ngày 3', 'pts' => 10],
            ['d' => 'Ngày 4', 'pts' => 10],
            ['d' => 'Ngày 5', 'pts' => 15],
            ['d' => 'Ngày 6', 'pts' => 15],
            ['d' => 'Ngày 7', 'pts' => 50, 'bonus' => true],
        ];
    }

    public static function checkinConfig(): array {
        $cfg = AppSetting::get('checkin_config', []);
        return $cfg['days'] ?? static::defaultDays();
    }

    public function store(Request $request): JsonResponse {
        $user = Auth::user();
        $customer = $user->customer()->first();
        if (!$customer) return response()->json(['message' => 'Không tìm thấy khách hàng'], 404);

        $today = Carbon::today()->toDateString();
        $alreadyChecked = DailyCheckin::where('customer_id', $customer->id)
            ->where('checkin_date', $today)->exists();
        if ($alreadyChecked) return response()->json(['message' => 'Đã điểm danh hôm nay'], 409);

        $yesterday = Carbon::yesterday()->toDateString();
        $lastCheckin = DailyCheckin::where('customer_id', $customer->id)
            ->orderByDesc('checkin_date')->first();
        $streak = ($lastCheckin && $lastCheckin->checkin_date->toDateString() === $yesterday)
            ? $lastCheckin->streak + 1 : 1;

        $days = self::checkinConfig();
        $dayIdx = ($streak - 1) % 7;
        $ptsEntry = $days[$dayIdx] ?? ['pts' => 5];
        $pts = (int) ($ptsEntry['pts'] ?? 5);

        DailyCheckin::create([
            'customer_id' => $customer->id,
            'checkin_date' => $today,
            'streak' => $streak,
            'points_awarded' => $pts,
        ]);

        CustomerPoint::create([
            'customer_id' => $customer->id,
            'points' => $pts,
            'description' => "Điểm danh hàng ngày (Ngày {$streak})",
            'point_type' => 'checkin',
        ]);
        $customer->increment('total_points', $pts);

        return response()->json([
            'ok' => true,
            'streak' => $streak,
            'points_awarded' => $pts,
            'total_points' => $customer->total_points,
        ]);
    }
}
