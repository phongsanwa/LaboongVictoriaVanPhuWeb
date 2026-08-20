<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class ReportsController extends Controller
{
    /** Số ngày coi là "đang hoạt động" (có mua gần đây). */
    private const ACTIVE_DAYS = 30;

    public function customers()
    {
        $admin = Auth::user();

        return view('admin.reports.customers', [
            'reportData' => [
                'admin' => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'stores' => Store::orderBy('id')->get(['id', 'name'])
                    ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->all(),
                'defaults' => [
                    'from'          => now()->startOfMonth()->toDateString(),
                    'to'            => now()->toDateString(),
                    'inactive_days' => 30,
                ],
                'urls' => [
                    'data' => route('admin.reports.customers.data'),
                ],
            ],
        ]);
    }

    /** JSON dữ liệu báo cáo theo bộ lọc (khoảng ngày, số ngày không mua, cửa hàng). */
    public function customersData(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from'          => ['nullable', 'date'],
            'to'            => ['nullable', 'date'],
            'inactive_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'store_id'      => ['nullable', 'integer'],
        ]);

        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : now()->startOfMonth();
        $to   = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : now()->endOfDay();
        $inactiveDays = (int) ($data['inactive_days'] ?? 30);
        $storeId = $data['store_id'] ?? null;

        $storeFilter = fn ($q) => $storeId ? $q->where('store_id', $storeId) : $q;

        // ─── Chỉ số khách hàng (snapshot hiện tại) ───
        $total     = $storeFilter(Customer::query())->count();
        $buyers    = $storeFilter(Customer::query())->where('total_orders', '>=', 1)->count();
        $returning = $storeFilter(Customer::query())->where('total_orders', '>=', 2)->count();
        $newC      = $storeFilter(Customer::query())->whereBetween('created_at', [$from, $to])->count();
        $active    = $storeFilter(Customer::query())
            ->where('last_purchase_at', '>=', now()->subDays(self::ACTIVE_DAYS))->count();
        $inactive  = $storeFilter(Customer::query())
            ->whereNotNull('last_purchase_at')
            ->where('last_purchase_at', '<', now()->subDays($inactiveDays))->count();
        $returnRate = $buyers > 0 ? round($returning / $buyers * 100, 1) : 0.0;

        // ─── Doanh thu / AOV (đơn HOÀN TẤT trong khoảng) ───
        $rangeOrders = $storeFilter(Order::where('status', 'COMPLETED'))
            ->whereBetween('created_at', [$from, $to]);
        $revenue     = (int) (clone $rangeOrders)->sum('total_amount');
        $ordersCount = (int) (clone $rangeOrders)->count();
        $aov         = $ordersCount > 0 ? (int) round($revenue / $ordersCount) : 0;

        // Doanh thu trung bình / khách (theo tổng chi tiêu trọn đời của KH có mua)
        $lifetimeRevenue = (int) $storeFilter(Customer::query())->sum('total_spent');
        $revenuePerCustomer = $buyers > 0 ? (int) round($lifetimeRevenue / $buyers) : 0;

        // ─── Chart: khách mới theo 12 tháng gần nhất ───
        $newByMonth = [];
        for ($i = 11; $i >= 0; $i--) {
            $m = now()->startOfMonth()->subMonths($i);
            $count = $storeFilter(Customer::query())
                ->whereBetween('created_at', [$m->copy()->startOfMonth(), $m->copy()->endOfMonth()])
                ->count();
            $newByMonth[] = ['label' => $m->format('m/Y'), 'value' => $count];
        }

        // ─── Chart: cơ cấu khách ───
        $structure = [
            'returning' => $returning,
            'oneTime'   => max(0, $buyers - $returning),
            'never'     => max(0, $total - $buyers),
        ];

        // ─── Bảng khách hàng (DataTables) ───
        $rows = $storeFilter(Customer::with(['user:id,name,phone', 'store:id,name']))
            ->orderByDesc('total_spent')
            ->get()
            ->map(function (Customer $c) use ($inactiveDays) {
                $last = $c->last_purchase_at;
                $isActive = $last && $last->gte(now()->subDays(self::ACTIVE_DAYS));
                $isInactive = $last && $last->lt(now()->subDays($inactiveDays));

                return [
                    'name'    => $c->user?->name ?? '—',
                    'phone'   => $c->user?->phone ?? '',
                    'store'   => $c->store?->name ?? '—',
                    'orders'  => (int) $c->total_orders,
                    'spent'   => (int) $c->total_spent,
                    'last'    => $last?->setTimezone('Asia/Ho_Chi_Minh')->format('d/m/Y') ?? 'Chưa mua',
                    'status'  => !$last ? 'never' : ($isActive ? 'active' : ($isInactive ? 'inactive' : 'idle')),
                ];
            })->values();

        return response()->json([
            'kpis' => [
                'total'              => $total,
                'new'                => $newC,
                'returning'          => $returning,
                'active'             => $active,
                'inactive'           => $inactive,
                'returnRate'         => $returnRate,
                'aov'                => $aov,
                'revenuePerCustomer' => $revenuePerCustomer,
                'inactiveDays'       => $inactiveDays,
                'activeDays'         => self::ACTIVE_DAYS,
            ],
            'newByMonth' => $newByMonth,
            'structure'  => $structure,
            'customers'  => $rows,
        ]);
    }

    /* ─────────── Báo cáo khách hàng mới (tăng trưởng) ─────────── */

    public function newCustomers()
    {
        $admin = Auth::user();

        return view('admin.reports.new-customers', [
            'reportData' => [
                'admin' => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'stores' => Store::orderBy('id')->get(['id', 'name'])
                    ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->all(),
                'defaults' => [
                    'from'        => now()->subDays(29)->toDateString(),
                    'to'          => now()->toDateString(),
                    'granularity' => 'day',
                ],
                'urls' => [
                    'data' => route('admin.reports.new-customers.data'),
                ],
            ],
        ]);
    }

    public function newCustomersData(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from'        => ['nullable', 'date'],
            'to'          => ['nullable', 'date'],
            'granularity' => ['nullable', 'in:day,week,month'],
            'store_id'    => ['nullable', 'integer'],
        ]);

        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : now()->subDays(29)->startOfDay();
        $to   = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : now()->endOfDay();
        if ($to->lt($from)) [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];

        $gran    = $data['granularity'] ?? 'day';
        $storeId = $data['store_id'] ?? null;

        // Kỳ trước: cùng độ dài ngày, ngay liền trước kỳ này.
        $days    = $from->diffInDays($to) + 1;
        $prevTo  = $from->copy()->subDay()->endOfDay();
        $prevFrom = $from->copy()->subDays($days)->startOfDay();

        // Lấy 1 lần tất cả ngày tạo trong [prevFrom, to] rồi chia rổ trong PHP.
        $dates = Customer::query()
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereBetween('created_at', [$prevFrom, $to])
            ->pluck('created_at');

        $countIn = fn ($a, $b) => $dates->filter(fn ($d) => $d->gte($a) && $d->lte($b))->count();

        $curBuckets  = $this->makeBuckets($from, $to, $gran);
        $prevBuckets = $this->makeBuckets($prevFrom, $prevTo, $gran);

        $labels  = array_map(fn ($b) => $b['label'], $curBuckets);
        $current = array_map(fn ($b) => $countIn($b['from'], $b['to']), $curBuckets);

        // Căn kỳ trước theo VỊ TRÍ rổ (pad/cắt cho khớp độ dài kỳ này).
        $prevVals = array_map(fn ($b) => $countIn($b['from'], $b['to']), $prevBuckets);
        $previous = [];
        for ($i = 0; $i < count($labels); $i++) {
            $previous[] = $prevVals[$i] ?? 0;
        }

        $currentTotal = array_sum($current);
        $prevTotal    = $countIn($prevFrom, $prevTo);
        $changePct    = $prevTotal > 0
            ? round(($currentTotal - $prevTotal) / $prevTotal * 100, 1)
            : ($currentTotal > 0 ? 100.0 : 0.0);

        $peak = 0; $peakLabel = '—';
        foreach ($current as $i => $v) {
            if ($v > $peak) { $peak = $v; $peakLabel = $labels[$i]; }
        }
        $avg = count($current) ? round($currentTotal / count($current), 1) : 0;

        $granLabel = ['day' => 'ngày', 'week' => 'tuần', 'month' => 'tháng'][$gran];

        return response()->json([
            'labels'   => $labels,
            'current'  => $current,
            'previous' => $previous,
            'summary'  => [
                'currentTotal' => $currentTotal,
                'prevTotal'    => $prevTotal,
                'changePct'    => $changePct,
                'avg'          => $avg,
                'peak'         => $peak,
                'peakLabel'    => $peakLabel,
                'granLabel'    => $granLabel,
                'days'         => $days,
            ],
        ]);
    }

    /* ─────────── Báo cáo khách hàng quay lại ─────────── */

    public function returning()
    {
        $admin = Auth::user();

        return view('admin.reports.returning', [
            'reportData' => [
                'admin' => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'stores' => Store::orderBy('id')->get(['id', 'name'])
                    ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->all(),
                'defaults' => [
                    'from' => now()->subYear()->toDateString(),
                    'to'   => now()->toDateString(),
                ],
                'urls' => [
                    'data' => route('admin.reports.returning.data'),
                ],
            ],
        ]);
    }

    public function returningData(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from'     => ['nullable', 'date'],
            'to'       => ['nullable', 'date'],
            'store_id' => ['nullable', 'integer'],
        ]);

        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : now()->subYear()->startOfDay();
        $to   = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : now()->endOfDay();
        $storeId = $data['store_id'] ?? null;

        // Đơn HOÀN TẤT trong khoảng → nhóm theo khách để đếm số lần mua.
        $orders = Order::where('status', 'COMPLETED')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereBetween('created_at', [$from, $to])
            ->orderBy('created_at')
            ->get(['customer_id', 'created_at'])
            ->groupBy('customer_id');

        $buyers = $firstOnly = $repeat2 = $loyal3 = 0;
        $dist = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0]; // 5 = "5 lần trở lên"
        $gapDays = []; // thời gian TB giữa 2 lần mua của từng khách

        foreach ($orders as $rows) {
            $n = $rows->count();
            if ($n < 1) continue;
            $buyers++;
            if ($n === 1) $firstOnly++;
            if ($n >= 2) $repeat2++;
            if ($n >= 3) $loyal3++;

            $bucket = $n >= 5 ? 5 : $n;
            $dist[$bucket]++;

            if ($n >= 2) {
                $first = $rows->first()->created_at;
                $last  = $rows->last()->created_at;
                $gapDays[] = $first->diffInDays($last) / ($n - 1);
            }
        }

        $returnRate = $buyers > 0 ? round($repeat2 / $buyers * 100, 1) : 0.0;
        $avgGap = count($gapDays) > 0 ? round(array_sum($gapDays) / count($gapDays), 1) : null;

        return response()->json([
            'kpis' => [
                'firstOnly'  => $firstOnly,
                'repeat2'    => $repeat2,
                'loyal3'     => $loyal3,
                'buyers'     => $buyers,
                'returnRate' => $returnRate,
                'avgGap'     => $avgGap, // ngày; null nếu chưa đủ dữ liệu
            ],
            'funnel' => [
                ['label' => 'Đã mua (≥1 lần)',      'value' => $buyers],
                ['label' => 'Quay lại (≥2 lần)',    'value' => $repeat2],
                ['label' => 'Trung thành (≥3 lần)', 'value' => $loyal3],
            ],
            'distribution' => [
                ['label' => '1 lần',          'value' => $dist[1]],
                ['label' => '2 lần',          'value' => $dist[2]],
                ['label' => '3 lần',          'value' => $dist[3]],
                ['label' => '4 lần',          'value' => $dist[4]],
                ['label' => '5 lần trở lên',  'value' => $dist[5]],
            ],
        ]);
    }

    /** Chia khoảng [start,end] thành các rổ theo ngày/tuần/tháng. */
    private function makeBuckets(Carbon $start, Carbon $end, string $gran): array
    {
        $buckets = [];

        if ($gran === 'month') {
            $cur = $start->copy()->startOfMonth();
            while ($cur->lte($end)) {
                $bs = $cur->copy()->startOfMonth();
                $be = $cur->copy()->endOfMonth();
                $buckets[] = [
                    'from'  => $bs->gt($start) ? $bs : $start->copy(),
                    'to'    => $be->lt($end) ? $be : $end->copy(),
                    'label' => $cur->format('m/Y'),
                ];
                $cur->addMonth();
            }
        } elseif ($gran === 'week') {
            $cur = $start->copy()->startOfDay();
            while ($cur->lte($end)) {
                $be = $cur->copy()->addDays(6)->endOfDay();
                $buckets[] = [
                    'from'  => $cur->copy(),
                    'to'    => $be->lt($end) ? $be : $end->copy(),
                    'label' => $cur->format('d/m'),
                ];
                $cur->addDays(7);
            }
        } else { // day
            $cur = $start->copy()->startOfDay();
            while ($cur->lte($end)) {
                $buckets[] = [
                    'from'  => $cur->copy()->startOfDay(),
                    'to'    => $cur->copy()->endOfDay(),
                    'label' => $cur->format('d/m'),
                ];
                $cur->addDay();
            }
        }

        return $buckets;
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last  = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
