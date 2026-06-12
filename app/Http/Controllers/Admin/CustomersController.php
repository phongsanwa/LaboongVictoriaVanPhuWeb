<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerTier;
use App\Models\Store;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class CustomersController extends Controller
{
    /** CSS tier classes available in admin.css, keyed by tier level. */
    private const TIER_CLASSES = [
        1 => ['key' => 'bac', 'cls' => 'tier-bac'],
        2 => ['key' => 'vang', 'cls' => 'tier-vang'],
        3 => ['key' => 'kc', 'cls' => 'tier-kc'],
    ];

    public function index()
    {
        $now = Carbon::now();
        $admin = Auth::user();

        $tiers = CustomerTier::orderBy('level')->get();
        $tierMeta = $tiers->mapWithKeys(function ($t) {
            $cls = self::TIER_CLASSES[$t->level] ?? ['key' => 'tier' . $t->level, 'cls' => 'tier-dong'];

            return [$t->id => [
                'key' => $cls['key'],
                'label' => preg_replace('/^Hạng\s+/u', '', $t->name),
                'cls' => $cls['cls'],
                'color' => $t->color_code,
                'minPoints' => $t->min_points,
                'level' => $t->level,
            ]];
        });

        $stores = Store::orderBy('id')->get(['id', 'name']);

        $customers = Customer::with(['user', 'tier', 'store'])
            ->withCount(['transactions' => fn ($q) => $q->where('status', 'completed')])
            ->get();

        $customerIds = $customers->pluck('id');

        $transactions = \App\Models\Transaction::with('details')
            ->whereIn('customer_id', $customerIds)
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('customer_id');

        $redemptions = \App\Models\Redemption::with('reward')
            ->whereIn('customer_id', $customerIds)
            ->whereIn('status', ['used', 'approved'])
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('customer_id');

        $customerRows = $customers->map(function ($c) use ($tierMeta, $transactions, $redemptions, $now) {
            $tx = collect();

            foreach ($transactions->get($c->id, collect()) as $t) {
                $item = $t->details->first();
                $qty = $item?->quantity ?? 1;
                $tx->push([
                    'type' => 'earn',
                    'title' => $qty . ' × ' . ($item?->item_name ?? 'Giao dịch'),
                    'meta' => $this->daysAgo($t->created_at, $now) . ' · ' . ($c->store->name ?? '—'),
                    'amt' => $t->points_earned,
                    'ts' => $t->created_at,
                ]);
            }

            foreach ($redemptions->get($c->id, collect()) as $r) {
                $ts = $r->used_at ?? $r->redeemed_at ?? $r->created_at;
                $tx->push([
                    'type' => 'redeem',
                    'title' => 'Đổi ' . ($r->reward->name ?? 'phần thưởng'),
                    'meta' => $this->daysAgo($ts, $now) . ' · ' . ($c->store->name ?? '—'),
                    'amt' => -$r->points_spent,
                    'ts' => $ts,
                ]);
            }

            $tx = $tx->sortByDesc('ts')->take(10)->map(fn ($x) => [
                'type' => $x['type'], 'title' => $x['title'], 'meta' => $x['meta'], 'amt' => $x['amt'],
            ])->values();

            return [
                'id' => 'KH' . (1000 + $c->id),
                'name' => $c->user->name,
                'phone' => $c->user->phone,
                'email' => $c->user->email,
                'points' => $c->total_points,
                'store' => $c->store->name ?? '—',
                'status' => $c->user->status === 'active' ? 'on' : 'off',
                'visits' => $c->transactions_count,
                'tier' => $tierMeta[$c->tier_id]['key'] ?? 'bac',
                'joined' => $c->created_at->toDateString(),
                'spent' => (float) $c->total_spent,
                'tx' => $tx,
            ];
        })->values();

        $stats = [
            'total' => $customers->count(),
            'active' => $customers->filter(fn ($c) => $c->user->status === 'active')->count(),
            'newThisMonth' => $customers->filter(fn ($c) => $c->created_at->isSameMonth($now))->count(),
            'points' => $customers->sum('total_points'),
        ];

        return view('admin.customers', [
            'customersData' => [
                'admin' => [
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'tiers' => $tierMeta->values(),
                'stores' => $stores->pluck('name'),
                'customers' => $customerRows,
                'stats' => $stats,
            ],
        ]);
    }

    private function daysAgo(Carbon $ts, Carbon $now): string
    {
        $days = (int) floor($ts->diffInDays($now));

        return $days < 1 ? 'Hôm nay' : $days . ' ngày trước';
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
