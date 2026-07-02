<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\VariantGroup;
use Illuminate\Support\Facades\Auth;

class OrderHistoryController extends Controller
{
    private const STATUS_MAP = [
        'PENDING'   => 'new',
        'CONFIRMED' => 'new',
        'PREPARING' => 'making',
        'READY'     => 'ready',
        'COMPLETED' => 'done',
        'CANCELLED' => 'cancel',
    ];

    public function index()
    {
        $customer = Auth::user()->customer()->first();

        $orders = [];
        if ($customer) {
            $groups = VariantGroup::all();
            $sizeKey  = $groups->firstWhere('type', 'size')?->key;
            $addonKey = $groups->firstWhere('type', 'addon')?->key;
            $sugarKey = $groups->first(fn ($g) => $g->type === 'level'
                && (str_contains(strtolower($g->key), 'sugar') || str_contains(strtolower($g->key), 'duong')))?->key;
            $iceKey   = $groups->first(fn ($g) => $g->type === 'level'
                && (str_contains(strtolower($g->key), 'ice') || str_contains(strtolower($g->key), 'da')))?->key;

            $orders = Order::with(['items.product', 'items.toppings', 'discounts', 'store'])
                ->where('customer_id', $customer->id)
                ->orderByDesc('created_at')
                ->limit(50)
                ->get()
                ->map(fn (Order $o) => $this->presentOrder($o, $sizeKey, $addonKey, $sugarKey, $iceKey))
                ->values()
                ->toArray();
        }

        return view('order-history', ['historyData' => ['orders' => $orders]]);
    }

    private function presentOrder(Order $o, ?string $sizeKey, ?string $addonKey, ?string $sugarKey, ?string $iceKey): array
    {
        $items = $o->items->map(function ($item) use ($sizeKey, $addonKey, $sugarKey, $iceKey) {
            $parts = [];
            if ($item->size_name) {
                // Tên option đã có sẵn chữ "Size" (VD: "Size L") — tránh lặp
                $parts[] = stripos($item->size_name, 'size') === false
                    ? "Size {$item->size_name}"
                    : $item->size_name;
            }
            if ($item->sugar_level !== null && $item->sugar_level !== '100') $parts[] = "Đường {$item->sugar_level}%";
            if ($item->ice_level   !== null && $item->ice_level   !== '100') $parts[] = "Đá {$item->ice_level}%";
            $toppingNames = $item->toppings->pluck('topping_name')->all();
            foreach ($toppingNames as $t) $parts[] = $t;

            // Selections để "Đặt lại" dựng lại giỏ hàng trên trang thực đơn
            $selections = [];
            if ($sizeKey && $item->size_name)          $selections[$sizeKey]  = $item->size_name;
            if ($addonKey && count($toppingNames))     $selections[$addonKey] = $toppingNames;
            if ($sugarKey && $item->sugar_level !== null) $selections[$sugarKey] = $item->sugar_level . '%';
            if ($iceKey && $item->ice_level !== null)     $selections[$iceKey]   = $item->ice_level . '%';

            return [
                'id'         => 'p' . $item->product_id,
                'name'       => $item->product?->name ?? "Sản phẩm #{$item->product_id}",
                'opt'        => implode(' · ', $parts),
                'unit'       => (int) $item->unit_price,
                'qty'        => (int) $item->quantity,
                'selections' => $selections ?: null,
            ];
        })->values()->toArray();

        $discountLines = $o->discounts->map(fn ($d) => [
            'label'  => $d->description ?: ($d->discount_category === 'SHIPPING' ? 'Giảm phí ship' : 'Giảm giá'),
            'amount' => (int) $d->discount_amount,
            'ship'   => $d->discount_category === 'SHIPPING',
        ])->values()->toArray();

        $isShip = !empty($o->delivery_address) || (int) $o->shipping_fee > 0;

        // Dự kiến hoàn thành kiểu ShopeeFood: 5' chuẩn bị + 2'/ly (tối đa 30'),
        // đơn giao thêm 15' di chuyển. Frontend đếm ngược theo mốc này.
        $cups    = (int) $o->items->sum('quantity');
        $prepMin = min(30, 5 + 2 * $cups) + ($isShip ? 15 : 0);

        return [
            'code'      => 'LB-' . str_pad($o->id, 4, '0', STR_PAD_LEFT),
            'etaAt'     => $o->created_at->clone()->addMinutes($prepMin)->toIso8601String(),
            'daysAgo'   => (int) $o->created_at->startOfDay()->diffInDays(now()->startOfDay()),
            'time'      => $o->created_at->setTimezone('Asia/Ho_Chi_Minh')->format('H:i d/m/Y'),
            'status'    => self::STATUS_MAP[$o->status] ?? 'done',
            'store'     => $o->store?->name ?? 'Laboong',
            'storeAddr' => $o->store?->address ?? '',
            'type'      => $isShip ? 'ship' : 'pickup',
            'addr'      => $o->delivery_address,
            'items'     => $items,
            'sub'       => (int) $o->subtotal,
            'discount'  => (int) $o->discount_amount,
            'discounts' => $discountLines,
            'ship'      => (int) $o->shipping_fee,
            'total'     => (int) $o->total_amount,
            'points'    => (int) $o->points_earned,
        ];
    }
}
