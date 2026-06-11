<?php

namespace App\Http\Controllers;

use App\Models\CustomerPoint;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class PointsController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $customer = $user->customer()->with('tier')->first();

        if (!$customer) {
            return view('points-detail', ['pointsData' => [
                'member' => ['name' => $user->name, 'id' => '—', 'tier' => '—'],
                'balance' => 0,
                'earnedTotal' => 0,
                'redeemedTotal' => 0,
                'expiring' => 0,
                'expireDate' => null,
                'months' => [],
                'history' => [],
            ]]);
        }

        $member = [
            'name' => $user->name,
            'id' => $customer->referral_code ?? ('LBVP-' . str_pad((string) $customer->id, 5, '0', STR_PAD_LEFT)),
            'tier' => $customer->tier->name ?? '',
        ];

        $redeemedTotal = (int) CustomerPoint::where('customer_id', $customer->id)
            ->where('point_type', 'redemption')
            ->where('points', '<', 0)
            ->sum('points');

        $expiringWindow = Carbon::now()->addDays(30)->toDateString();

        $expiring = (int) CustomerPoint::where('customer_id', $customer->id)
            ->where('points', '>', 0)
            ->whereNotNull('expires_at')
            ->whereDate('expires_at', '>=', Carbon::now()->toDateString())
            ->whereDate('expires_at', '<=', $expiringWindow)
            ->sum('points');

        $expireDate = CustomerPoint::where('customer_id', $customer->id)
            ->where('points', '>', 0)
            ->whereNotNull('expires_at')
            ->whereDate('expires_at', '>=', Carbon::now()->toDateString())
            ->whereDate('expires_at', '<=', $expiringWindow)
            ->orderBy('expires_at')
            ->value('expires_at');

        $points = CustomerPoint::where('customer_id', $customer->id)
            ->with('transaction.store')
            ->orderByDesc('created_at')
            ->get();

        $months = [];
        $history = [];

        foreach ($points as $cp) {
            $created = Carbon::parse($cp->created_at);
            $monthKey = $created->format('Y-m');

            if (!isset($months[$monthKey])) {
                $months[$monthKey] = $created->format('m/Y');
            }

            $history[$monthKey][] = [
                'type' => $this->entryType($cp),
                'title' => $cp->description,
                'store' => $this->entryStore($cp),
                'day' => $created->format('d/m'),
                'time' => $created->format('H:i'),
                'amt' => $cp->points,
            ];
        }

        $monthList = collect($months)
            ->map(fn ($label, $key) => ['key' => $key, 'label' => 'Th' . $label])
            ->values()
            ->all();

        return view('points-detail', ['pointsData' => [
            'member' => $member,
            'balance' => $customer->total_points,
            'earnedTotal' => $customer->lifetime_points,
            'redeemedTotal' => abs($redeemedTotal),
            'expiring' => $expiring,
            'expireDate' => $expireDate ? Carbon::parse($expireDate)->format('d/m/Y') : null,
            'months' => $monthList,
            'history' => $history,
        ]]);
    }

    private function entryType(CustomerPoint $cp): string
    {
        if ($cp->point_type === 'redemption') {
            return 'redeem';
        }

        if ($cp->points < 0) {
            return 'expire';
        }

        return in_array($cp->point_type, ['bonus', 'admin'], true) ? 'adjust' : 'earn';
    }

    private function entryStore(CustomerPoint $cp): string
    {
        if ($cp->transaction?->store) {
            return $cp->transaction->store->name;
        }

        return match ($cp->point_type) {
            'redemption' => 'Đổi quà',
            'bonus', 'admin' => 'Hệ thống',
            default => '—',
        };
    }
}
