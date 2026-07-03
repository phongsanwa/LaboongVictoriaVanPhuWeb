<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

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

        return view('admin.orders', [
            'ordersData' => [
                'admin'  => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'orders' => $this->buildOrders(),
                'urls'   => [
                    'advance' => route('admin.orders.advance', ['order' => '__ID__']),
                    'cancel'  => route('admin.orders.cancel',  ['order' => '__ID__']),
                    'refresh' => route('admin.orders.refresh'),
                ],
            ],
        ]);
    }

    /** POST /admin/orders/{order}/advance */
    public function advance(Order $order): JsonResponse
    {
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

        return response()->json([
            'order'   => $this->presentOrder($order->fresh(['customer.user', 'items.product', 'items.toppings', 'discounts', 'store'])),
            'message' => 'Đã cập nhật trạng thái',
        ]);
    }

    /** POST /admin/orders/{order}/cancel */
    public function cancel(Order $order): JsonResponse
    {
        if (in_array($order->status, ['COMPLETED', 'CANCELLED'])) {
            return response()->json(['message' => 'Không thể huỷ đơn này'], 422);
        }

        $order->update(['status' => 'CANCELLED', 'cancelled_at' => now()]);

        return response()->json([
            'order'   => $this->presentOrder($order->fresh(['customer.user', 'items.product', 'items.toppings', 'discounts', 'store'])),
            'message' => 'Đã huỷ đơn hàng',
        ]);
    }

    /** GET /admin/orders/refresh */
    public function refresh(): JsonResponse
    {
        return response()->json(['orders' => $this->buildOrders()]);
    }

    private function buildOrders(): array
    {
        $orders = Order::with(['customer.user', 'items.product', 'items.toppings', 'discounts', 'store'])
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
            'phone'     => $user?->phone ?? '',
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
