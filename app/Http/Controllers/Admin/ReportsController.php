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
        $testIds = $this->testIds();

        // Loại tài khoản thử: Customer theo id, Order theo customer_id.
        $custFilter = function ($q) use ($storeId, $testIds) {
            if ($storeId) $q->where('store_id', $storeId);
            if ($testIds) $q->whereNotIn('id', $testIds);
            return $q;
        };
        $orderFilter = function ($q) use ($storeId, $testIds) {
            if ($storeId) $q->where('store_id', $storeId);
            if ($testIds) $q->whereNotIn('customer_id', $testIds);
            return $q;
        };

        // ─── Chỉ số khách hàng (snapshot hiện tại) ───
        $total     = $custFilter(Customer::query())->count();
        $buyers    = $custFilter(Customer::query())->where('total_orders', '>=', 1)->count();
        $returning = $custFilter(Customer::query())->where('total_orders', '>=', 2)->count();
        $newC      = $custFilter(Customer::query())->whereBetween('created_at', [$from, $to])->count();
        $active    = $custFilter(Customer::query())
            ->where('last_purchase_at', '>=', now()->subDays(self::ACTIVE_DAYS))->count();
        $inactive  = $custFilter(Customer::query())
            ->whereNotNull('last_purchase_at')
            ->where('last_purchase_at', '<', now()->subDays($inactiveDays))->count();
        $returnRate = $buyers > 0 ? round($returning / $buyers * 100, 1) : 0.0;

        // ─── Doanh thu / AOV (đơn HOÀN TẤT trong khoảng) ───
        $rangeOrders = $orderFilter(Order::where('status', 'COMPLETED'))
            ->whereBetween('created_at', [$from, $to]);
        $revenue     = (int) (clone $rangeOrders)->sum('total_amount');
        $ordersCount = (int) (clone $rangeOrders)->count();
        $aov         = $ordersCount > 0 ? (int) round($revenue / $ordersCount) : 0;

        // Doanh thu trung bình / khách (theo tổng chi tiêu trọn đời của KH có mua)
        $lifetimeRevenue = (int) $custFilter(Customer::query())->sum('total_spent');
        $revenuePerCustomer = $buyers > 0 ? (int) round($lifetimeRevenue / $buyers) : 0;

        // ─── Chart: khách mới theo 12 tháng gần nhất ───
        $newByMonth = [];
        for ($i = 11; $i >= 0; $i--) {
            $m = now()->startOfMonth()->subMonths($i);
            $count = $custFilter(Customer::query())
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
        $rows = $custFilter(Customer::with(['user:id,name,phone', 'store:id,name']))
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
        $testIds = $this->testIds();
        $dates = Customer::query()
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($testIds, fn ($q) => $q->whereNotIn('id', $testIds))
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
        $testIds = $this->testIds();
        $orders = Order::where('status', 'COMPLETED')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($testIds, fn ($q) => $q->whereNotIn('customer_id', $testIds))
            ->whereBetween('created_at', [$from, $to])
            ->orderBy('created_at')
            ->get(['customer_id', 'created_at', 'total_amount'])
            ->groupBy('customer_id');

        $buyers = $firstOnly = $repeat2 = $loyal3 = 0;
        $dist = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0]; // 5 = "5 lần trở lên"
        $gapDays = []; // thời gian TB giữa 2 lần mua của từng khách
        $perCustomer = []; // customer_id => [orders, spent, last]

        foreach ($orders as $customerId => $rows) {
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

            $perCustomer[$customerId] = [
                'orders' => $n,
                'spent'  => (int) $rows->sum('total_amount'),
                'last'   => $rows->last()->created_at,
            ];
        }

        $returnRate = $buyers > 0 ? round($repeat2 / $buyers * 100, 1) : 0.0;
        $avgGap = count($gapDays) > 0 ? round(array_sum($gapDays) / count($gapDays), 1) : null;

        // Danh sách khách kèm số lần mua để bấm vào phễu là xem được.
        $names = Customer::with('user:id,name,phone')
            ->whereIn('id', array_keys($perCustomer))->get()->keyBy('id');
        $customers = [];
        foreach ($perCustomer as $cid => $info) {
            $customers[] = [
                'name'   => $names->get($cid)?->user?->name ?? ('KH #' . $cid),
                'phone'  => $names->get($cid)?->user?->phone ?? '',
                'orders' => $info['orders'],
                'spent'  => $info['spent'],
                'last'   => $info['last']?->setTimezone('Asia/Ho_Chi_Minh')->format('d/m/Y') ?? '—',
            ];
        }
        // Sắp theo số lần mua giảm dần rồi tới chi tiêu.
        usort($customers, fn ($a, $b) => ($b['orders'] <=> $a['orders']) ?: ($b['spent'] <=> $a['spent']));

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
            'customers' => $customers,
        ]);
    }

    /* ─────────── Top khách chi tiêu ─────────── */

    public function topSpenders()
    {
        $admin = Auth::user();

        return view('admin.reports.top-spenders', [
            'reportData' => [
                'admin' => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'stores' => Store::orderBy('id')->get(['id', 'name'])
                    ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->all(),
                'defaults' => [
                    'from'  => now()->subYear()->toDateString(),
                    'to'    => now()->toDateString(),
                    'top_n' => 20,
                ],
                'urls' => [
                    'data' => route('admin.reports.top-spenders.data'),
                ],
            ],
        ]);
    }

    public function topSpendersData(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from'     => ['nullable', 'date'],
            'to'       => ['nullable', 'date'],
            'top_n'    => ['nullable', 'integer', 'min:5', 'max:100'],
            'store_id' => ['nullable', 'integer'],
        ]);

        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : now()->subYear()->startOfDay();
        $to   = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : now()->endOfDay();
        $topN = (int) ($data['top_n'] ?? 20);
        $storeId = $data['store_id'] ?? null;

        // Doanh thu theo khách từ đơn HOÀN TẤT trong khoảng.
        $testIds = $this->testIds();
        $agg = Order::where('status', 'COMPLETED')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($testIds, fn ($q) => $q->whereNotIn('customer_id', $testIds))
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('customer_id, COUNT(*) as orders, SUM(total_amount) as revenue, MAX(created_at) as last_at')
            ->groupBy('customer_id')
            ->orderByDesc('revenue')
            ->get();

        $custIds = $agg->pluck('customer_id')->all();
        $customers = Customer::with(['user:id,name,phone', 'store:id,name'])
            ->whereIn('id', $custIds)->get()->keyBy('id');

        $ranked = $agg->map(function ($r) use ($customers) {
            $c = $customers->get($r->customer_id);
            $orders  = (int) $r->orders;
            $revenue = (int) $r->revenue;

            return [
                'name'    => $c?->user?->name ?? ('KH #' . $r->customer_id),
                'phone'   => $c?->user?->phone ?? '',
                'store'   => $c?->store?->name ?? '—',
                'orders'  => $orders,
                'revenue' => $revenue,
                'aov'     => $orders > 0 ? (int) round($revenue / $orders) : 0,
                'last'    => $r->last_at ? Carbon::parse($r->last_at)->setTimezone('Asia/Ho_Chi_Minh')->format('d/m/Y') : '—',
            ];
        })->values();

        $totalRevenue    = (int) $ranked->sum('revenue');
        $payingCustomers = $ranked->count();
        $avgPerCustomer  = $payingCustomers > 0 ? (int) round($totalRevenue / $payingCustomers) : 0;
        $top10Revenue    = (int) $ranked->take(10)->sum('revenue');
        $top10Share      = $totalRevenue > 0 ? round($top10Revenue / $totalRevenue * 100, 1) : 0.0;
        $topCustomer     = $ranked->first();

        return response()->json([
            'kpis' => [
                'totalRevenue'    => $totalRevenue,
                'payingCustomers' => $payingCustomers,
                'avgPerCustomer'  => $avgPerCustomer,
                'top10Share'      => $top10Share,
                'topName'         => $topCustomer['name'] ?? '—',
                'topRevenue'      => $topCustomer['revenue'] ?? 0,
            ],
            // Top N cho biểu đồ (từ cao xuống thấp)
            'top'   => $ranked->take($topN)->values(),
            // Toàn bộ cho bảng
            'all'   => $ranked,
        ]);
    }

    /* ─────────── Phân tích RFM ─────────── */

    /** Bảng nhãn nhóm RFM theo (R,F) điểm 1..5 + màu. */
    private const RFM_GRID = [
        5 => [1 => 'new', 2 => 'potential', 3 => 'potential', 4 => 'loyal', 5 => 'champions'],
        4 => [1 => 'promising', 2 => 'potential', 3 => 'loyal', 4 => 'loyal', 5 => 'champions'],
        3 => [1 => 'about_sleep', 2 => 'attention', 3 => 'attention', 4 => 'loyal', 5 => 'loyal'],
        2 => [1 => 'hibernating', 2 => 'at_risk', 3 => 'at_risk', 4 => 'cant_lose', 5 => 'cant_lose'],
        1 => [1 => 'lost', 2 => 'hibernating', 3 => 'at_risk', 4 => 'cant_lose', 5 => 'cant_lose'],
    ];

    private const RFM_META = [
        'champions'   => ['label' => 'Nhà vô địch',            'color' => '#0F623F'],
        'loyal'       => ['label' => 'Trung thành',            'color' => '#1AA86A'],
        'potential'   => ['label' => 'Tiềm năng trung thành',  'color' => '#1E8FA8'],
        'new'         => ['label' => 'Khách mới',              'color' => '#4FC3D9'],
        'promising'   => ['label' => 'Có triển vọng',          'color' => '#7BC96F'],
        'attention'   => ['label' => 'Cần chú ý',              'color' => '#C99A2E'],
        'about_sleep' => ['label' => 'Sắp rời bỏ',             'color' => '#E0A458'],
        'at_risk'     => ['label' => 'Nguy cơ rời bỏ',         'color' => '#E07A5F'],
        'cant_lose'   => ['label' => 'Không thể để mất',       'color' => '#D4584B'],
        'hibernating' => ['label' => 'Ngủ đông',               'color' => '#9B8AA0'],
        'lost'        => ['label' => 'Đã mất',                 'color' => '#8A9199'],
    ];

    public function rfm()
    {
        $admin = Auth::user();

        return view('admin.reports.rfm', [
            'reportData' => [
                'admin' => ['name' => $admin->name, 'email' => $admin->email, 'initials' => $this->initials($admin->name)],
                'stores' => Store::orderBy('id')->get(['id', 'name'])->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->all(),
                'urls' => ['data' => route('admin.reports.rfm.data')],
            ],
        ]);
    }

    public function rfmData(Request $request): JsonResponse
    {
        $data = $request->validate(['store_id' => ['nullable', 'integer']]);
        $storeId = $data['store_id'] ?? null;

        $testIds = $this->testIds();
        $agg = Order::where('status', 'COMPLETED')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($testIds, fn ($q) => $q->whereNotIn('customer_id', $testIds))
            ->selectRaw('customer_id, COUNT(*) as freq, SUM(total_amount) as monetary, MAX(created_at) as last_at')
            ->groupBy('customer_id')
            ->get();

        if ($agg->isEmpty()) {
            return response()->json(['kpis' => ['total' => 0], 'segments' => [], 'grid' => [], 'customers' => []]);
        }

        $now = now();
        $recency = []; $frequency = []; $monetary = [];
        foreach ($agg as $r) {
            $recency[$r->customer_id]   = Carbon::parse($r->last_at)->diffInDays($now);
            $frequency[$r->customer_id] = (int) $r->freq;
            $monetary[$r->customer_id]  = (int) $r->monetary;
        }

        $rScore = $this->quintile($recency, false);   // recency thấp = tốt
        $fScore = $this->quintile($frequency, true);
        $mScore = $this->quintile($monetary, true);

        $custIds = array_keys($recency);
        $customers = Customer::with('user:id,name,phone')->whereIn('id', $custIds)->get()->keyBy('id');

        $rows = [];
        $segCount = []; $segMonetary = [];
        $grid = []; // grid[r][f] = count
        foreach ($custIds as $id) {
            $r = $rScore[$id]; $f = $fScore[$id]; $m = $mScore[$id];
            $seg = self::RFM_GRID[$r][$f] ?? 'attention';

            $segCount[$seg] = ($segCount[$seg] ?? 0) + 1;
            $segMonetary[$seg] = ($segMonetary[$seg] ?? 0) + $monetary[$id];
            $grid[$r][$f] = ($grid[$r][$f] ?? 0) + 1;

            $rows[] = [
                'name'    => $customers->get($id)?->user?->name ?? ('KH #' . $id),
                'phone'   => $customers->get($id)?->user?->phone ?? '',
                'recency' => $recency[$id],
                'freq'    => $frequency[$id],
                'monetary'=> $monetary[$id],
                'r' => $r, 'f' => $f, 'm' => $m,
                'seg'     => self::RFM_META[$seg]['label'],
            ];
        }

        // Sắp nhóm theo số lượng giảm dần
        $segments = [];
        foreach ($segCount as $key => $cnt) {
            $segments[] = [
                'key'      => $key,
                'label'    => self::RFM_META[$key]['label'],
                'color'    => self::RFM_META[$key]['color'],
                'count'    => $cnt,
                'monetary' => $segMonetary[$key] ?? 0,
            ];
        }
        usort($segments, fn ($a, $b) => $b['count'] <=> $a['count']);

        // Lưới heatmap R×F (đủ 5×5)
        $heat = [];
        for ($r = 5; $r >= 1; $r--) {
            $rowData = [];
            for ($f = 1; $f <= 5; $f++) {
                $rowData[] = ['x' => 'F' . $f, 'y' => $grid[$r][$f] ?? 0];
            }
            $heat[] = ['name' => 'R' . $r, 'data' => $rowData];
        }

        $total = count($custIds);
        $champ = $segCount['champions'] ?? 0;
        $risk  = ($segCount['at_risk'] ?? 0) + ($segCount['cant_lose'] ?? 0);
        $lost  = ($segCount['lost'] ?? 0) + ($segCount['hibernating'] ?? 0);

        return response()->json([
            'kpis' => [
                'total'     => $total,
                'champions' => $champ,
                'atRisk'    => $risk,
                'lost'      => $lost,
            ],
            'segments'  => $segments,
            'grid'      => $heat,
            'customers' => $rows,
        ]);
    }

    /** Chấm điểm ngũ phân vị 1..5. $higherBetter=false đảo cho recency. */
    private function quintile(array $vals, bool $higherBetter): array
    {
        $n = count($vals);
        if ($n === 0) return [];
        asort($vals); // theo giá trị tăng dần, giữ key
        $scores = [];
        $i = 0;
        foreach ($vals as $key => $_) {
            $q = (int) min(5, floor((($i + 0.5) / $n) * 5) + 1);
            $scores[$key] = $higherBetter ? $q : (6 - $q);
            $i++;
        }
        return $scores;
    }

    /* ─────────── Cohort retention theo tháng ─────────── */

    public function cohort()
    {
        $admin = Auth::user();

        return view('admin.reports.cohort', [
            'reportData' => [
                'admin' => ['name' => $admin->name, 'email' => $admin->email, 'initials' => $this->initials($admin->name)],
                'stores' => Store::orderBy('id')->get(['id', 'name'])->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->all(),
                'urls' => ['data' => route('admin.reports.cohort.data')],
            ],
        ]);
    }

    public function cohortData(Request $request): JsonResponse
    {
        $data = $request->validate([
            'store_id' => ['nullable', 'integer'],
            'months'   => ['nullable', 'integer', 'min:3', 'max:24'],
        ]);
        $storeId = $data['store_id'] ?? null;
        $months  = (int) ($data['months'] ?? 12);

        $earliest = now()->copy()->subMonths($months - 1)->startOfMonth();

        // Đơn hoàn tất từ tháng cohort sớm nhất tới nay.
        $testIds = $this->testIds();
        $orders = Order::where('status', 'COMPLETED')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($testIds, fn ($q) => $q->whereNotIn('customer_id', $testIds))
            ->where('created_at', '>=', $earliest)
            ->orderBy('created_at')
            ->get(['customer_id', 'created_at']);

        // Tháng mua ĐẦU của mỗi khách (trong phạm vi xét) = cohort.
        $firstMonth = [];       // customer_id => 'Y-m'
        $activity = [];         // 'Y-m' cohort => [monthIndex => set(customer_id)]
        $cohortSet = [];        // 'Y-m' => set(customer_id)

        foreach ($orders as $o) {
            $cid = $o->customer_id;
            $ym  = $o->created_at->format('Y-m');
            if (!isset($firstMonth[$cid])) {
                $firstMonth[$cid] = $ym;
                $cohortSet[$ym][$cid] = true;
            }
            $cohort = $firstMonth[$cid];
            $idx = $this->monthDiff($cohort, $ym);
            $activity[$cohort][$idx][$cid] = true;
        }

        // Dựng ma trận cohort theo thứ tự tháng.
        $cohortMonths = [];
        for ($i = 0; $i < $months; $i++) {
            $cohortMonths[] = now()->copy()->subMonths($months - 1 - $i)->format('Y-m');
        }

        $cohorts = [];
        $curveSum = array_fill(0, $months, 0.0);
        $curveCnt = array_fill(0, $months, 0);

        foreach ($cohortMonths as $ym) {
            $size = isset($cohortSet[$ym]) ? count($cohortSet[$ym]) : 0;
            if ($size === 0) {
                $cohorts[] = ['month' => $this->ymLabel($ym), 'size' => 0, 'values' => []];
                continue;
            }
            $maxIdx = $this->monthDiff($ym, now()->format('Y-m'));
            $values = [];
            for ($k = 0; $k <= $maxIdx && $k < $months; $k++) {
                $act = isset($activity[$ym][$k]) ? count($activity[$ym][$k]) : 0;
                $pct = round($act / $size * 100, 1);
                $values[] = $pct;
                $curveSum[$k] += $pct;
                $curveCnt[$k]++;
            }
            $cohorts[] = ['month' => $this->ymLabel($ym), 'size' => $size, 'values' => $values];
        }

        $avgCurve = [];
        for ($k = 0; $k < $months; $k++) {
            if ($curveCnt[$k] > 0) $avgCurve[] = round($curveSum[$k] / $curveCnt[$k], 1);
        }

        return response()->json([
            'cohorts'  => $cohorts,
            'avgCurve' => $avgCurve,
            'months'   => $months,
        ]);
    }

    private function monthDiff(string $fromYm, string $toYm): int
    {
        [$fy, $fm] = array_map('intval', explode('-', $fromYm));
        [$ty, $tm] = array_map('intval', explode('-', $toYm));
        return ($ty - $fy) * 12 + ($tm - $fm);
    }

    private function ymLabel(string $ym): string
    {
        [$y, $m] = explode('-', $ym);
        return $m . '/' . $y;
    }

    /* ─────────── Báo cáo đơn hàng ─────────── */

    private const ORDER_STATUS_LABEL = [
        'PENDING'   => 'Chờ xác nhận',
        'CONFIRMED' => 'Đã xác nhận',
        'PREPARING' => 'Đang pha chế',
        'READY'     => 'Sẵn sàng',
        'COMPLETED' => 'Hoàn tất',
        'CANCELLED' => 'Đã huỷ',
    ];

    private const ORDER_STATUS_COLOR = [
        'PENDING'   => '#C99A2E',
        'CONFIRMED' => '#4FC3D9',
        'PREPARING' => '#1E8FA8',
        'READY'     => '#7BC96F',
        'COMPLETED' => '#0F623F',
        'CANCELLED' => '#D4584B',
    ];

    public function orders()
    {
        $admin = Auth::user();

        return view('admin.reports.orders', [
            'reportData' => [
                'admin' => ['name' => $admin->name, 'email' => $admin->email, 'initials' => $this->initials($admin->name)],
                'stores' => Store::orderBy('id')->get(['id', 'name'])->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->all(),
                'defaults' => [
                    'from'        => now()->subDays(29)->toDateString(),
                    'to'          => now()->toDateString(),
                    'granularity' => 'day',
                ],
                'urls' => ['data' => route('admin.reports.orders.data')],
            ],
        ]);
    }

    public function ordersData(Request $request): JsonResponse
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
        $testIds = $this->testIds();

        // Tất cả đơn trong khoảng (mọi trạng thái) — tính 1 lần rồi tổng hợp PHP.
        $orders = Order::when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($testIds, fn ($q) => $q->whereNotIn('customer_id', $testIds))
            ->whereBetween('created_at', [$from, $to])
            ->get(['created_at', 'status', 'total_amount', 'delivery_address', 'shipping_fee']);

        $total     = $orders->count();
        $completed = $orders->where('status', 'COMPLETED');
        $completedN = $completed->count();
        $cancelledN = $orders->where('status', 'CANCELLED')->count();
        $revenue   = (int) $completed->sum('total_amount');
        $aov       = $completedN > 0 ? (int) round($revenue / $completedN) : 0;
        $cancelRate = $total > 0 ? round($cancelledN / $total * 100, 1) : 0.0;

        $shipN = $orders->filter(fn ($o) => !empty($o->delivery_address) || (int) $o->shipping_fee > 0)->count();
        $pickupN = $total - $shipN;

        // Cơ cấu trạng thái
        $statusData = [];
        foreach (self::ORDER_STATUS_LABEL as $key => $label) {
            $c = $orders->where('status', $key)->count();
            if ($c > 0) $statusData[] = ['label' => $label, 'value' => $c, 'color' => self::ORDER_STATUS_COLOR[$key]];
        }

        // Đơn theo khung giờ (0–23h)
        $byHour = array_fill(0, 24, 0);
        foreach ($orders as $o) {
            $h = $o->created_at->copy()->setTimezone('Asia/Ho_Chi_Minh')->hour;
            $byHour[$h]++;
        }

        // Xu hướng theo ngày/tuần/tháng
        $buckets = $this->makeBuckets($from, $to, $gran);
        $trend = [];
        foreach ($buckets as $b) {
            $in = $orders->filter(fn ($o) => $o->created_at->gte($b['from']) && $o->created_at->lte($b['to']));
            $trend[] = [
                'label'   => $b['label'],
                'orders'  => $in->count(),
                'revenue' => (int) $in->where('status', 'COMPLETED')->sum('total_amount'),
            ];
        }

        // Bảng theo ngày
        $daily = [];
        foreach ($orders->groupBy(fn ($o) => $o->created_at->copy()->setTimezone('Asia/Ho_Chi_Minh')->format('Y-m-d')) as $date => $rows) {
            $comp = $rows->where('status', 'COMPLETED');
            $daily[] = [
                'date'      => Carbon::parse($date)->format('d/m/Y'),
                'orders'    => $rows->count(),
                'completed' => $comp->count(),
                'cancelled' => $rows->where('status', 'CANCELLED')->count(),
                'revenue'   => (int) $comp->sum('total_amount'),
            ];
        }
        usort($daily, fn ($a, $b) => strcmp($b['date'], $a['date']));

        return response()->json([
            'kpis' => [
                'total'      => $total,
                'revenue'    => $revenue,
                'aov'        => $aov,
                'completed'  => $completedN,
                'cancelled'  => $cancelledN,
                'cancelRate' => $cancelRate,
                'ship'       => $shipN,
                'pickup'     => $pickupN,
            ],
            'trend'      => $trend,
            'status'     => $statusData,
            'byHour'     => $byHour,
            'fulfillment'=> [
                ['label' => 'Giao hàng', 'value' => $shipN],
                ['label' => 'Tại quầy',  'value' => $pickupN],
            ],
            'daily'      => $daily,
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

    /** ID các tài khoản thử nghiệm — loại khỏi mọi báo cáo. */
    private function testIds(): array
    {
        return Customer::where('is_test', true)->pluck('id')->all();
    }
}
