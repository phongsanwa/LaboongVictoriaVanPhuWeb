<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\CustomerPoint;
use App\Models\Reward;
use App\Models\Store;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class HomeController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $customer = $user->customer()->with(['tier', 'store'])->first();

        if (!$customer) {
            return view('welcome', ['homeData' => [
                'member' => ['name' => $user->name, 'id' => '—', 'tier' => '—'],
                'points' => 0,
                'goal' => 0,
                'reward' => '',
                'promos' => [],
                'transactions' => [],
                'store' => null,
                'pointsThisWeek' => 0,
            ]]);
        }

        $member = [
            'name' => $user->name,
            'id' => $customer->referral_code ?? ('LBVP-' . str_pad((string) $customer->id, 5, '0', STR_PAD_LEFT)),
            'tier' => $customer->tier->name ?? '',
        ];

        $nextReward = Reward::where('status', 'active')
            ->where('points_required', '>', $customer->total_points)
            ->orderBy('points_required')
            ->first();

        if (!$nextReward) {
            $nextReward = Reward::where('status', 'active')->orderByDesc('points_required')->first();
        }

        $pointsThisWeek = (int) CustomerPoint::where('customer_id', $customer->id)
            ->where('points', '>', 0)
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->sum('points');

        $recentPoints = CustomerPoint::where('customer_id', $customer->id)
            ->orderByDesc('created_at')
            ->limit(3)
            ->get();

        $transactions = $recentPoints->map(function (CustomerPoint $cp) {
            $isEarn = $cp->points >= 0;

            return [
                'type' => $isEarn ? 'earn' : 'redeem',
                'icon' => $isEarn ? 'cup' : 'gift',
                'title' => $cp->description,
                'meta' => $this->formatTxDate($cp->created_at),
                'amt' => $cp->points,
            ];
        })->values()->all();

        $now = Carbon::now()->toDateString();
        $campaigns = Campaign::where('status', 'active')
            ->where('start_date', '<=', $now)
            ->where('end_date', '>=', $now)
            ->orderBy('id')
            ->get();

        $promos = $campaigns->map(function (Campaign $c) {
            return [
                'tag' => $this->campaignTag($c->campaign_type),
                'icon' => $this->campaignIcon($c->campaign_type),
                'bg' => $this->campaignBg($c->campaign_type),
                'title' => $c->name,
                'sub' => $c->description,
            ];
        })->values()->all();

        $store = $customer->store ?: Store::where('status', 'active')->first();

        return view('welcome', ['homeData' => [
            'member' => $member,
            'points' => $customer->total_points,
            'goal' => $nextReward->points_required ?? 0,
            'reward' => $nextReward->name ?? '',
            'promos' => $promos,
            'transactions' => $transactions,
            'store' => $store,
            'pointsThisWeek' => $pointsThisWeek,
        ]]);
    }

    private function formatTxDate(Carbon $date): string
    {
        $time = $date->format('H:i');

        if ($date->isToday()) {
            return "Hôm nay · {$time}";
        }

        if ($date->isYesterday()) {
            return "Hôm qua · {$time}";
        }

        return $date->format('d/m') . " · {$time}";
    }

    private function campaignTag(string $type): string
    {
        return match ($type) {
            'double_points' => 'Tích điểm x2',
            'bonus_points' => 'Thưởng điểm',
            'discount_promotion' => 'Ưu đãi',
            'free_item' => 'Hot',
            default => 'Khuyến mãi',
        };
    }

    private function campaignIcon(string $type): string
    {
        return match ($type) {
            'double_points' => 'spark',
            'bonus_points' => 'star',
            'discount_promotion' => 'spark',
            'free_item' => 'cup',
            default => 'gift',
        };
    }

    private function campaignBg(string $type): string
    {
        return match ($type) {
            'double_points' => 'linear-gradient(135deg,#6B4FA0,#9B7FD4)',
            'bonus_points' => 'linear-gradient(135deg,#FFB13D,#FF7A3D)',
            'discount_promotion' => 'linear-gradient(135deg,#FF8A5B,#FF6FA5)',
            'free_item' => 'linear-gradient(135deg,#0F623F,#1AA86A)',
            default => 'linear-gradient(135deg,#0F623F,#1AA86A)',
        };
    }
}
