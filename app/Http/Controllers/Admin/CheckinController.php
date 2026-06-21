<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\CheckinController as BaseCheckin;
use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\DailyCheckin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class CheckinController extends Controller {
    public function index(): \Illuminate\View\View {
        $admin = Auth::user();
        $days = BaseCheckin::checkinConfig();

        $todayCount = DailyCheckin::where('checkin_date', Carbon::today()->toDateString())->count();
        $totalCount = DailyCheckin::count();
        $streak7 = DailyCheckin::where('streak', '>=', 7)->count();

        return view('admin.checkin', [
            'admin' => ['name' => $admin->name, 'email' => $admin->email],
            'checkinData' => [
                'days' => $days,
                'stats' => [
                    'today' => $todayCount,
                    'total' => $totalCount,
                    'streak7' => $streak7,
                ],
            ],
        ]);
    }

    public function update(Request $request): JsonResponse {
        $request->validate(['days' => 'required|array|size:7', 'days.*.pts' => 'required|integer|min:1|max:500']);
        $days = collect($request->input('days'))->map(function ($d, $i) {
            return ['d' => 'Ngày ' . ($i + 1), 'pts' => (int) $d['pts'], 'bonus' => $i === 6 ? true : null];
        })->map(function ($d) {
            return array_filter($d, fn($v) => $v !== null);
        })->values()->all();
        AppSetting::set('checkin_config', ['days' => $days]);
        return response()->json(['ok' => true]);
    }
}
