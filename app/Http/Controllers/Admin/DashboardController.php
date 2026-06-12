<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Customer;
use App\Models\CustomerPoint;
use App\Models\CustomerTier;
use App\Models\Store;
use App\Models\Transaction;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $now = Carbon::now();
        $admin = Auth::user();

        // monthStarts[0] = 11 months ago ... monthStarts[11] = current month
        $monthStarts = [];
        for ($i = 11; $i >= 0; $i--) {
            $monthStarts[] = $now->copy()->subMonthsNoOverflow($i)->startOfMonth();
        }
        $thisMonthKey = $monthStarts[11]->format('Y-m');
        $lastMonthKey = $monthStarts[10]->format('Y-m');

        /* ---------------- revenue (12 months) ---------------- */
        $transactions = Transaction::where('status', 'completed')
            ->where('created_at', '>=', $monthStarts[0])
            ->get(['total_amount', 'store_id', 'created_at']);

        $revenueByMonth = [];
        foreach ($transactions as $t) {
            $key = $t->created_at->format('Y-m');
            $revenueByMonth[$key] = ($revenueByMonth[$key] ?? 0) + (float) $t->total_amount;
        }

        $months = [];
        $revenue = [];
        foreach ($monthStarts as $start) {
            $key = $start->format('Y-m');
            $months[] = 'T' . $start->month;
            $revenue[] = round(($revenueByMonth[$key] ?? 0) / 1_000_000, 1);
        }

        $revenueThisMonth = $revenueByMonth[$thisMonthKey] ?? 0;
        $revenueLastMonth = $revenueByMonth[$lastMonthKey] ?? 0;
        $revenueChangePct = $this->pctChange($revenueThisMonth, $revenueLastMonth);
        $revenueSparkline = $this->dailySeries($transactions, $now, 7, fn ($t) => (float) $t->total_amount);

        /* ---------------- new customers ---------------- */
        $allCustomers = Customer::get(['id', 'tier_id', 'created_at']);

        $customersByMonth = $allCustomers->groupBy(fn ($c) => $c->created_at->format('Y-m'));
        $newCustomersThisMonth = $customersByMonth->get($thisMonthKey, collect())->count();
        $newCustomersLastMonth = $customersByMonth->get($lastMonthKey, collect())->count();
        $newCustomersChangePct = $this->pctChange($newCustomersThisMonth, $newCustomersLastMonth);
        $newCustomersSparkline = $this->dailySeries($allCustomers, $now, 7, fn () => 1);

        /* ---------------- points issued / redeemed (6 months) ---------------- */
        $points = CustomerPoint::where('created_at', '>=', $monthStarts[6])->get(['points', 'created_at']);

        $issuedByMonth = [];
        $redeemedByMonth = [];
        foreach ($points as $p) {
            $key = $p->created_at->format('Y-m');
            if ($p->points > 0) {
                $issuedByMonth[$key] = ($issuedByMonth[$key] ?? 0) + $p->points;
            } else {
                $redeemedByMonth[$key] = ($redeemedByMonth[$key] ?? 0) + abs($p->points);
            }
        }

        $pointsSeries = [];
        for ($i = 6; $i <= 11; $i++) {
            $key = $monthStarts[$i]->format('Y-m');
            $pointsSeries[] = [
                'm' => 'T' . $monthStarts[$i]->month,
                'a' => (int) ($issuedByMonth[$key] ?? 0),
                'b' => (int) ($redeemedByMonth[$key] ?? 0),
            ];
        }

        $pointsIssuedThisMonth = $issuedByMonth[$thisMonthKey] ?? 0;
        $pointsIssuedLastMonth = $issuedByMonth[$lastMonthKey] ?? 0;
        $pointsRedeemedThisMonth = $redeemedByMonth[$thisMonthKey] ?? 0;
        $pointsRedeemedLastMonth = $redeemedByMonth[$lastMonthKey] ?? 0;

        $pointsIssuedChangePct = $this->pctChange($pointsIssuedThisMonth, $pointsIssuedLastMonth);

        $redemptionRateThisMonth = $pointsIssuedThisMonth > 0 ? round($pointsRedeemedThisMonth / $pointsIssuedThisMonth * 100, 1) : 0.0;
        $redemptionRateLastMonth = $pointsIssuedLastMonth > 0 ? round($pointsRedeemedLastMonth / $pointsIssuedLastMonth * 100, 1) : 0.0;
        $redemptionRateChangePct = $this->pctChange($redemptionRateThisMonth, $redemptionRateLastMonth);

        $pointsIssuedSparkline = array_column($pointsSeries, 'a');
        $redemptionRateSparkline = array_map(
            fn ($p) => $p['a'] > 0 ? round($p['b'] / $p['a'] * 100) : 0,
            $pointsSeries
        );

        /* ---------------- tier distribution ---------------- */
        $tierRows = CustomerTier::orderBy('level')->get(['id', 'name', 'color_code']);
        $tierGroups = $allCustomers->groupBy('tier_id');
        $tiers = $tierRows->map(fn ($t) => [
            'label' => preg_replace('/^Hạng\s+/u', '', $t->name),
            'value' => $tierGroups->get($t->id, collect())->count(),
            'color' => $t->color_code,
        ])->values()->all();
        $tierTotal = $allCustomers->count();

        /* ---------------- top stores (this month) ---------------- */
        $revenueByStore = [];
        foreach ($transactions as $t) {
            if ($t->created_at->format('Y-m') === $thisMonthKey) {
                $revenueByStore[$t->store_id] = ($revenueByStore[$t->store_id] ?? 0) + (float) $t->total_amount;
            }
        }
        $storeValues = Store::orderBy('id')->get(['id', 'name'])->map(fn ($s) => [
            'name' => $s->name,
            'total' => $revenueByStore[$s->id] ?? 0,
        ])->sortByDesc('total')->values();
        $storeMax = round(($storeValues->max('total') ?: 1) / 1_000_000, 1) ?: 1;
        $stores = $storeValues->map(fn ($s) => [
            'name' => $s['name'],
            'v' => round($s['total'] / 1_000_000, 1),
            'max' => $storeMax,
        ])->all();

        /* ---------------- top rewards redeemed (this month) ---------------- */
        $rewardRows = DB::table('redemptions')
            ->join('rewards', 'redemptions.reward_id', '=', 'rewards.id')
            ->where('redemptions.created_at', '>=', $monthStarts[11])
            ->selectRaw('rewards.name as name, rewards.category as category, COUNT(*) as cnt')
            ->groupBy('rewards.id', 'rewards.name', 'rewards.category')
            ->orderByDesc('cnt')
            ->limit(4)
            ->get();

        $rewards = $rewardRows->map(function ($r) {
            $meta = $this->rewardCategoryMeta($r->category);

            return [
                'name' => $r->name,
                'cat' => $meta['label'],
                'count' => (int) $r->cnt,
                'grad' => $meta['grad'],
                'ic' => $meta['ic'],
            ];
        })->values()->all();

        /* ---------------- activity feed ---------------- */
        $feed = $this->buildFeed($now);

        return view('admin.dashboard', ['dashboardData' => [
            'admin' => [
                'name' => $admin->name,
                'email' => $admin->email,
                'initials' => $this->initials($admin->name),
            ],
            'months' => $months,
            'revenue' => $revenue,
            'revenueTotal' => round(array_sum($revenue), 1),
            'kpis' => [
                'revenue' => [
                    'value' => round($revenueThisMonth / 1_000_000, 1),
                    'changePct' => $revenueChangePct,
                    'sparkline' => $revenueSparkline,
                ],
                'newCustomers' => [
                    'value' => $newCustomersThisMonth,
                    'changePct' => $newCustomersChangePct,
                    'sparkline' => $newCustomersSparkline,
                ],
                'pointsIssued' => [
                    'value' => (int) $pointsIssuedThisMonth,
                    'changePct' => $pointsIssuedChangePct,
                    'sparkline' => $pointsIssuedSparkline,
                ],
                'redemptionRate' => [
                    'value' => $redemptionRateThisMonth,
                    'changePct' => $redemptionRateChangePct,
                    'sparkline' => $redemptionRateSparkline,
                ],
            ],
            'points' => $pointsSeries,
            'tiers' => $tiers,
            'tierTotal' => $tierTotal,
            'stores' => $stores,
            'rewards' => $rewards,
            'feed' => $feed,
        ]]);
    }

    /**
     * Build the "recent activity" feed by merging the latest transactions,
     * redemptions, new customers and campaigns into a single timeline.
     */
    private function buildFeed(Carbon $now): array
    {
        $items = collect();

        $recentTx = DB::table('transactions')
            ->join('customers', 'transactions.customer_id', '=', 'customers.id')
            ->join('users', 'customers.user_id', '=', 'users.id')
            ->leftJoin('transaction_details', 'transaction_details.transaction_id', '=', 'transactions.id')
            ->where('transactions.status', 'completed')
            ->orderByDesc('transactions.created_at')
            ->limit(5)
            ->get(['transactions.created_at', 'transactions.points_earned', 'users.name as customer_name', 'transaction_details.item_name']);

        foreach ($recentTx as $t) {
            $items->push([
                'ts' => Carbon::parse($t->created_at),
                'ic' => 'cup',
                'c' => 'var(--brand)',
                'bg' => 'var(--brand-soft)',
                'segments' => [
                    ['text' => 'Khách ', 'b' => false],
                    ['text' => $t->customer_name, 'b' => true],
                    ['text' => ' mua ', 'b' => false],
                    ['text' => $t->item_name ?? 'sản phẩm', 'b' => true],
                    ['text' => ' (+' . $this->formatNumber($t->points_earned) . ' điểm)', 'b' => false],
                ],
            ]);
        }

        $recentRedemptions = DB::table('redemptions')
            ->join('customers', 'redemptions.customer_id', '=', 'customers.id')
            ->join('users', 'customers.user_id', '=', 'users.id')
            ->join('rewards', 'redemptions.reward_id', '=', 'rewards.id')
            ->orderByDesc('redemptions.created_at')
            ->limit(5)
            ->get(['redemptions.created_at', 'redemptions.points_spent', 'users.name as customer_name', 'rewards.name as reward_name']);

        foreach ($recentRedemptions as $r) {
            $items->push([
                'ts' => Carbon::parse($r->created_at),
                'ic' => 'gift',
                'c' => '#E0518A',
                'bg' => 'color-mix(in srgb,#FF6FA5 14%, var(--panel))',
                'segments' => [
                    ['text' => 'Khách ', 'b' => false],
                    ['text' => $r->customer_name, 'b' => true],
                    ['text' => ' đổi ', 'b' => false],
                    ['text' => $r->reward_name, 'b' => true],
                    ['text' => ' (' . $this->formatNumber($r->points_spent) . ' điểm)', 'b' => false],
                ],
            ]);
        }

        $recentCustomers = DB::table('customers')
            ->join('users', 'customers.user_id', '=', 'users.id')
            ->orderByDesc('customers.created_at')
            ->limit(5)
            ->get(['customers.created_at', 'users.name as customer_name']);

        foreach ($recentCustomers as $c) {
            $items->push([
                'ts' => Carbon::parse($c->created_at),
                'ic' => 'users',
                'c' => 'var(--diamond)',
                'bg' => 'var(--diamond-bg)',
                'segments' => [
                    ['text' => $c->customer_name, 'b' => true],
                    ['text' => ' vừa đăng ký thành viên mới', 'b' => false],
                ],
            ]);
        }

        $recentCampaigns = Campaign::orderByDesc('created_at')->limit(5)->get(['name', 'current_participants', 'created_at']);

        foreach ($recentCampaigns as $c) {
            $items->push([
                'ts' => $c->created_at,
                'ic' => 'rocket',
                'c' => 'var(--brand)',
                'bg' => 'var(--brand-soft)',
                'segments' => [
                    ['text' => 'Chiến dịch ', 'b' => false],
                    ['text' => $c->name, 'b' => true],
                    ['text' => ' đang có ', 'b' => false],
                    ['text' => $this->formatNumber($c->current_participants) . ' lượt tham gia', 'b' => true],
                ],
            ]);
        }

        return $items->sortByDesc('ts')->take(5)->map(fn ($f) => [
            'ic' => $f['ic'],
            'c' => $f['c'],
            'bg' => $f['bg'],
            'segments' => $f['segments'],
            't' => $this->timeAgo($f['ts'], $now),
        ])->values()->all();
    }

    private function pctChange(float $current, float $previous): float
    {
        if ($previous == 0.0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round(($current - $previous) / $previous * 100, 1);
    }

    /**
     * Sum values per calendar day for the trailing $days days (oldest first).
     */
    private function dailySeries(Collection $items, Carbon $now, int $days, callable $valueFn): array
    {
        $buckets = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $buckets[$now->copy()->subDays($i)->toDateString()] = 0;
        }

        foreach ($items as $item) {
            $key = $item->created_at->toDateString();
            if (array_key_exists($key, $buckets)) {
                $buckets[$key] += $valueFn($item);
            }
        }

        return array_values($buckets);
    }

    private function rewardCategoryMeta(?string $category): array
    {
        return match ($category) {
            'drink' => ['label' => 'Đồ uống', 'ic' => 'cup', 'grad' => 'linear-gradient(135deg,#0F623F,#1AA86A)'],
            'voucher' => ['label' => 'Voucher', 'ic' => 'ticket', 'grad' => 'linear-gradient(135deg,#FF8A5B,#FF6FA5)'],
            'upgrade' => ['label' => 'Nâng cấp', 'ic' => 'sparkle2', 'grad' => 'linear-gradient(135deg,#A9743F,#C99A6A)'],
            'gift' => ['label' => 'Quà tặng', 'ic' => 'gift', 'grad' => 'linear-gradient(135deg,#C99A2E,#E0B84A)'],
            'tier_benefit' => ['label' => 'Hạng thành viên', 'ic' => 'shield', 'grad' => 'linear-gradient(135deg,#6B4FA0,#9D7FD4)'],
            default => ['label' => 'Khác', 'ic' => 'gift', 'grad' => 'linear-gradient(135deg,#1E8FA8,#4FC3D9)'],
        };
    }

    private function timeAgo(Carbon $ts, Carbon $now): string
    {
        $minutes = $ts->diffInMinutes($now);
        if ($minutes < 1) {
            return 'Vừa xong';
        }
        if ($minutes < 60) {
            return $minutes . ' phút trước';
        }

        $hours = $ts->diffInHours($now);
        if ($hours < 24) {
            return $hours . ' giờ trước';
        }
        if ($ts->isYesterday()) {
            return 'Hôm qua';
        }

        return $ts->diffInDays($now) . ' ngày trước';
    }

    private function formatNumber($n): string
    {
        return number_format((float) $n, 0, ',', '.');
    }

    private function initials(string $name): string
    {
        $parts = array_values(array_filter(preg_split('/\s+/', trim($name))));

        if (count($parts) === 0) {
            return '?';
        }
        if (count($parts) === 1) {
            return mb_strtoupper(mb_substr($parts[0], 0, 2));
        }

        return mb_strtoupper(mb_substr($parts[0], 0, 1) . mb_substr(end($parts), 0, 1));
    }
}
