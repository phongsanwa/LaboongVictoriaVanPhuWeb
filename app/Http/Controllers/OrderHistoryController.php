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
            // Hiển thị kèm số lượng ("Trân châu x2"); và dựng lại mảng có lặp id để "Đặt lại" khôi phục đúng số lượng.
            $toppingExpanded = [];
            foreach ($item->toppings as $t) {
                $q = max(1, (int) ($t->quantity ?? 1));
                $parts[] = $q > 1 ? "{$t->topping_name} x{$q}" : $t->topping_name;
                for ($k = 0; $k < $q; $k++) $toppingExpanded[] = $t->topping_name;
            }

            // Selections để "Đặt lại" dựng lại giỏ hàng trên trang thực đơn
            $selections = [];
            if ($sizeKey && $item->size_name)          $selections[$sizeKey]  = $item->size_name;
            if ($addonKey && count($toppingExpanded))  $selections[$addonKey] = $toppingExpanded;
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

        // Thời gian pha chế và giao hàng TÁCH RIÊNG, cấu hình được:
        // - Cài đặt chung: phút chuẩn bị/đơn, phút/ly mặc định, phút giao hàng
        // - Mỗi món có thể cài thời gian pha riêng (products.prep_minutes)
        // Đồng hồ chạy từ lúc admin bấm "Xác nhận" (confirmed_at).
        $timing = \App\Models\AppSetting::get('timing', \App\Http\Controllers\Admin\SettingsController::TIMING_DEFAULTS);
        $prepMin = (int) $timing['prep_base'];
        foreach ($o->items as $item) {
            $perCup   = $item->product?->prep_minutes ?? (int) $timing['prep_per_cup'];
            $prepMin += $perCup * (int) $item->quantity;
        }
        $prepMin = min(90, $prepMin);
        $shipMin = $isShip ? (int) $timing['ship_minutes'] : 0;

        return [
            'code'      => 'LB-' . str_pad($o->id, 4, '0', STR_PAD_LEFT),
            'prepEtaAt' => $o->confirmed_at?->clone()->addMinutes($prepMin)->toIso8601String(),
            'etaAt'     => $o->confirmed_at?->clone()->addMinutes($prepMin + $shipMin)->toIso8601String(),
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
