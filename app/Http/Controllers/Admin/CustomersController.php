<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerTier;
use App\Models\Store;
use Illuminate\Http\Request;
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
                'customerId' => $c->id,
                'name' => $c->user->name,
                'phone' => $c->user->phone,
                'email' => $c->user->email,
                'points' => $c->total_points,
                'store' => $c->store->name ?? '—',
                'store_id' => $c->store_id,
                'date_of_birth' => $c->date_of_birth?->toDateString(),
                'gender' => $c->gender,
                'status' => $c->user->status === 'active' ? 'on' : 'off',
                'online' => $c->user->isOnline(),
                'lastSeen' => $this->lastSeenLabel($c->user->last_seen_at, $now),
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
            'online' => $customers->filter(fn ($c) => $c->user->isOnline())->count(),
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
                'stores' => $stores->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->values(),
                'customers' => $customerRows,
                'stats' => $stats,
            ],
        ]);
    }

    public function update(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['nullable', 'email', 'max:255'],
            'phone'         => ['required', 'string', 'max:20'],
            'store_id'      => ['nullable', 'integer', 'exists:stores,id'],
            'date_of_birth' => ['nullable', 'date'],
            'gender'        => ['nullable', 'in:male,female,other'],
            'status'        => ['required', 'in:active,inactive'],
        ], [
            'name.required'  => 'Vui lòng nhập tên',
            'phone.required' => 'Vui lòng nhập số điện thoại',
            'email.email'    => 'Email không hợp lệ',
        ]);

        $customer->user->update([
            'name'   => $data['name'],
            'email'  => $data['email'] ?? null,
            'phone'  => $data['phone'],
            'status' => $data['status'],
        ]);

        $customer->update([
            'store_id'      => $data['store_id'] ?? $customer->store_id,
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'gender'        => $data['gender'] ?? null,
        ]);

        return response()->json(['customer' => $this->present($customer->fresh(['user', 'store', 'tier']))]);
    }

    public function toggle(Customer $customer)
    {
        $user = $customer->user;
        $user->status = $user->status === 'active' ? 'inactive' : 'active';
        $user->save();

        return response()->json(['customer' => $this->present($customer->fresh(['user', 'store', 'tier']))]);
    }

    /**
     * Xoá vĩnh viễn khách hàng cùng toàn bộ dữ liệu liên quan.
     * orders là restrictOnDelete và daily_checkins không có FK nên xoá tay;
     * phần còn lại (customer, điểm, đổi quà, voucher, địa chỉ…) cascade từ users.
     */
    public function destroy(Customer $customer)
    {
        $name = $customer->user->name ?? ('KH' . (1000 + $customer->id));

        \Illuminate\Support\Facades\DB::transaction(function () use ($customer) {
            \App\Models\Order::where('customer_id', $customer->id)->delete();
            \App\Models\DailyCheckin::where('customer_id', $customer->id)->delete();
            $customer->user()->delete(); // cascade → customers → points/redemptions/vouchers/addresses…
        });

        return response()->json(['message' => "Đã xoá khách hàng {$name}"]);
    }

    private function present(Customer $c): array
    {
        $tiers = CustomerTier::orderBy('level')->get();
        $tierMeta = $tiers->mapWithKeys(function ($t) {
            $cls = self::TIER_CLASSES[$t->level] ?? ['key' => 'tier' . $t->level, 'cls' => 'tier-dong'];

            return [$t->id => ['key' => $cls['key'], 'label' => preg_replace('/^Hạng\s+/u', '', $t->name)]];
        });

        return [
            'id'         => 'KH' . (1000 + $c->id),
            'customerId' => $c->id,
            'name'       => $c->user->name,
            'phone'      => $c->user->phone,
            'email'      => $c->user->email ?? '',
            'points'     => $c->total_points,
            'store'      => $c->store->name ?? '—',
            'store_id'   => $c->store_id,
            'status'     => $c->user->status === 'active' ? 'on' : 'off',
            'online'     => $c->user->isOnline(),
            'lastSeen'   => $this->lastSeenLabel($c->user->last_seen_at, Carbon::now()),
            'visits'     => $c->transactions_count ?? 0,
            'tier'       => $tierMeta[$c->tier_id]['key'] ?? 'bac',
            'joined'     => $c->created_at->toDateString(),
            'spent'      => (float) $c->total_spent,
            'date_of_birth' => $c->date_of_birth?->toDateString(),
            'gender'     => $c->gender,
            'tx'         => [],
        ];
    }

    private function daysAgo(Carbon $ts, Carbon $now): string
    {
        $days = (int) floor($ts->diffInDays($now));

        return $days < 1 ? 'Hôm nay' : $days . ' ngày trước';
    }

    /** Nhãn "hoạt động gần nhất" cho hiển thị online/offline. */
    private function lastSeenLabel(?Carbon $ts, Carbon $now): string
    {
        if (!$ts) return 'Chưa truy cập';

        $mins = (int) floor($ts->diffInMinutes($now));
        if ($mins < 5)    return 'Đang online';
        if ($mins < 60)   return $mins . ' phút trước';

        $hours = (int) floor($ts->diffInHours($now));
        if ($hours < 24)  return $hours . ' giờ trước';

        $days = (int) floor($ts->diffInDays($now));
        if ($days < 30)   return $days . ' ngày trước';

        return $ts->format('d/m/Y');
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
