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

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last  = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
