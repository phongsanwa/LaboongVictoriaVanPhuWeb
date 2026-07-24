<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerPoint;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OrdersController extends Controller
{
    private const STATUS_MAP = [
        'PENDING'   => 'new',
        'CONFIRMED' => 'new',
        'PREPARING' => 'making',
        'READY'     => 'ready',
        'COMPLETED' => 'done',
        'CANCELLED' => 'cancel',
    ];

    private const ADVANCE_MAP = [
        'new'    => 'PREPARING',
        'making' => 'READY',
        'ready'  => 'COMPLETED',
    ];

    public function index()
    {
        $admin = Auth::user();

        $lockedIds = $this->lockedStoreIds();          // null = admin (mọi cửa hàng)
        $requested = request()->integer('store_id') ?: null;

        // Admin: lọc tự do theo dropdown. Nhân viên: chỉ trong các cửa hàng phụ trách.
        if ($lockedIds === null) {
            $scopeIds  = $requested ? [$requested] : null;
            $storeList = \App\Models\Store::orderBy('id')->get(['id', 'name']);
        } else {
            // Nhân viên có thể lọc riêng 1 trong các cửa hàng của mình
            $scopeIds  = ($requested && in_array($requested, $lockedIds, true)) ? [$requested] : $lockedIds;
            $storeList = \App\Models\Store::whereIn('id', $lockedIds)->orderBy('id')->get(['id', 'name']);
        }

        $activeFilter = ($scopeIds !== null && count($scopeIds) === 1) ? $scopeIds[0] : null;

        return view('admin.orders', [
            'ordersData' => [
                'admin'  => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'orders' => $this->buildOrders($scopeIds),
                // storeLocked = nhân viên (không được xem toàn hệ thống).
                // stores = danh sách cửa hàng được phép lọc (của admin = tất cả, NV = của mình)
                'storeLocked' => $lockedIds !== null,
                'storeFilter' => $activeFilter,
                'storeName'   => $activeFilter ? \App\Models\Store::find($activeFilter)?->name
                    : ($lockedIds !== null && count($lockedIds) > 1 ? 'Cửa hàng của tôi' : null),
                'stores'      => $storeList->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->all(),
                'urls'   => [
                    'advance' => route('admin.orders.advance', ['order' => '__ID__']),
                    'cancel'  => route('admin.orders.cancel',  ['order' => '__ID__']),
                    'refresh' => route('admin.orders.refresh'),
                ],
            ],
        ]);
    }

    /**
     * Danh sách id cửa hàng nhân viên được phép xem (null = admin, xem tất cả).
     * Mảng rỗng nghĩa là nhân viên chưa gán cửa hàng nào → không thấy đơn nào.
     */
    private function lockedStoreIds(): ?array
    {
        $user = Auth::user();
        if (!$user || $user->user_type === 'admin') return null;

        return $user->staff?->storeIds() ?? [];
    }

    /** POST /admin/orders/{order}/advance */
    public function advance(Order $order): JsonResponse
    {
        if (($locked = $this->lockedStoreIds()) !== null && !in_array($order->store_id, $locked, true)) {
            return response()->json(['message' => 'Đơn này thuộc cửa hàng khác'], 403);
        }

        $jsStatus = self::STATUS_MAP[$order->status] ?? null;
        $nextDb   = self::ADVANCE_MAP[$jsStatus] ?? null;

        if (!$nextDb) {
            return response()->json(['message' => 'Không thể chuyển trạng thái'], 422);
        }

        $extra = $nextDb === 'COMPLETED' ? ['completed_at' => now()] : [];
        // "Xác nhận" đơn: mốc bắt đầu tính thời gian pha chế / đếm ngược cho khách
        if ($nextDb === 'PREPARING' && !$order->confirmed_at) {
            $extra['confirmed_at'] = now();
        }
        $order->update(array_merge(['status' => $nextDb], $extra));

        // Đơn hoàn tất (giao thành công) → cập nhật thống kê KH + cộng điểm. Chỉ 1 lần.
        $pointsAwarded = 0;
        if ($nextDb === 'COMPLETED' && !$order->points_awarded_at) {
            $pointsAwarded = $this->finalizeCompletion($order->fresh());
        }

        return response()->json([
            'order'          => $this->presentOrder($order->fresh(['customer.user', 'items.product', 'items.toppings', 'discounts', 'store'])),
            'points_awarded' => $pointsAwarded,
            'message'        => $pointsAwarded > 0
                ? "Đã hoàn tất đơn — cộng +{$pointsAwarded} điểm cho khách"
                : 'Đã cập nhật trạng thái',
        ]);
    }

    /** POST /admin/orders/{order}/cancel */
    public function cancel(Order $order): JsonResponse
    {
        if (($locked = $this->lockedStoreIds()) !== null && !in_array($order->store_id, $locked, true)) {
            return response()->json(['message' => 'Đơn này thuộc cửa hàng khác'], 403);
        }

        if (in_array($order->status, ['COMPLETED', 'CANCELLED'])) {
            return response()->json(['message' => 'Không thể huỷ đơn này'], 422);
        }

        $order->update(['status' => 'CANCELLED', 'cancelled_at' => now()]);

        return response()->json([
            'order'   => $this->presentOrder($order->fresh(['customer.user', 'items.product', 'items.toppings', 'discounts', 'store'])),
            'message' => 'Đã huỷ đơn hàng',
        ]);
    }

    /**
     * Hoàn tất đơn: cập nhật thống kê khách (total_orders/total_spent) và cộng điểm.
     * An toàn với race: khoá bản ghi + kiểm tra lại points_awarded_at trong transaction
     * để không cộng 2 lần. Trả về số điểm đã cộng (0 nếu đơn không có điểm).
     */
    private function finalizeCompletion(Order $order): int
    {
        return DB::transaction(function () use ($order) {
            $fresh = Order::whereKey($order->id)->lockForUpdate()->first();
            if (!$fresh || $fresh->points_awarded_at) {
                return 0;
            }

            $customer = $fresh->customer()->first();
            if (!$customer) {
                // Vẫn đánh dấu đã xử lý để lần sau không lặp lại.
                $fresh->update(['points_awarded_at' => now()]);
                return 0;
            }

            // Thống kê KH cộng lúc hoàn tất (không cộng lúc đặt) — đơn huỷ không tính.
            $customer->increment('total_orders');
            $customer->increment('total_spent', (int) $fresh->total_amount);

            $points = (int) $fresh->points_earned;
            if ($points > 0) {
                $customer->increment('total_points',    $points);
                $customer->increment('lifetime_points', $points);

                CustomerPoint::create([
                    'customer_id'  => $customer->id,
                    'point_type'   => 'purchase',
                    'points'       => $points,
                    'description'  => "Tích điểm đơn hàng #{$fresh->id} (hoàn tất)",
                    'reference_id' => $fresh->id,
                ]);
            }

            $fresh->update(['points_awarded_at' => now()]);

            return $points;
        });
    }

    /** GET /admin/orders/refresh */
    public function refresh(): JsonResponse
    {
        $lockedIds = $this->lockedStoreIds();
        $requested = request()->integer('store_id') ?: null;

        if ($lockedIds === null) {
            $scopeIds = $requested ? [$requested] : null;
        } else {
            $scopeIds = ($requested && in_array($requested, $lockedIds, true)) ? [$requested] : $lockedIds;
        }

        return response()->json(['orders' => $this->buildOrders($scopeIds)]);
    }

    private function buildOrders(?array $storeIds = null): array
    {
        $orders = Order::with(['customer.user', 'items.product', 'items.toppings', 'discounts', 'store'])
            ->when($storeIds !== null, fn ($q) => $q->whereIn('store_id', $storeIds ?: [0]))
            ->where(function ($q) {
                $q->whereIn('status', ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'])
                  ->orWhere('created_at', '>=', now()->startOfDay());
            })
            ->orderByRaw("CASE status
                WHEN 'PENDING'   THEN 1
                WHEN 'CONFIRMED' THEN 1
                WHEN 'PREPARING' THEN 2
                WHEN 'READY'     THEN 3
                WHEN 'COMPLETED' THEN 4
                WHEN 'CANCELLED' THEN 5
                ELSE 6 END")
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return $orders->map(fn ($o) => $this->presentOrder($o))->values()->toArray();
    }

    private function presentOrder(Order $o): array
    {
        $user  = $o->customer?->user;
        $items = $o->items->map(function ($item) {
            $parts = [];
            if ($item->size_name) $parts[] = "Size {$item->size_name}";
            if ($item->sugar_level && $item->sugar_level !== '100') $parts[] = "Đường {$item->sugar_level}%";
            if ($item->ice_level   && $item->ice_level   !== '100') $parts[] = "Đá {$item->ice_level}%";
            foreach ($item->toppings as $t) $parts[] = $t->topping_name;

            return [
                'name' => $item->product?->name ?? "Sản phẩm #{$item->product_id}",
                'opt'  => implode(' · ', $parts),
                'unit' => (int) $item->unit_price,
                'qty'  => $item->quantity,
            ];
        })->values()->toArray();

        $isShip = !empty($o->delivery_address) || (int) $o->shipping_fee > 0;

        // Từng mã giảm giá khách đã áp dụng (đơn + phí ship)
        $discountLines = $o->discounts->map(fn ($d) => [
            'label'  => $d->description ?: ($d->discount_category === 'SHIPPING' ? 'Giảm phí ship' : 'Giảm giá'),
            'amount' => (int) $d->discount_amount,
            'ship'   => $d->discount_category === 'SHIPPING',
        ])->values()->toArray();

        return [
            'id'        => 'LB-' . str_pad($o->id, 4, '0', STR_PAD_LEFT),
            'dbId'      => $o->id,
            'status'    => self::STATUS_MAP[$o->status] ?? 'new',
            'cust'      => $user?->name ?? 'Khách hàng',
            // SĐT nhận hàng của đơn (khách sửa trong giỏ) — mặc định SĐT tài khoản
            'phone'     => $o->delivery_phone ?: ($user?->phone ?? ''),
            'accountPhone' => $user?->phone ?? '',
            'type'      => $isShip ? 'ship' : 'pickup',
            'addr'      => $o->delivery_address,
            'store'     => $o->store?->name,
            'items'     => $items,
            'discount'  => (int) $o->discount_amount,
            'discounts' => $discountLines,
            'ship'      => (int) $o->shipping_fee,
            'sub'       => (int) $o->subtotal,
            'total'     => (int) $o->total_amount,
            'note'      => $o->note ?? '',
            'pay'       => 'Thanh toán tại quán',
            'createdAt' => $o->created_at->toISOString(),
        ];
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        return strtoupper(($parts[0][0] ?? '') . ($parts[count($parts) - 1][0] ?? ''));
    }
}
