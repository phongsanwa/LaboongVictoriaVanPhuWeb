<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerPoint;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\VariantGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    private const PER_POINT = 10000;

    public function place(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lines'              => ['required', 'array', 'min:1'],
            'lines.*.id'         => ['required', 'string'],
            'lines.*.qty'        => ['required', 'integer', 'min:1', 'max:99'],
            'lines.*.selections' => ['nullable', 'array'],
            'note'               => ['nullable', 'string', 'max:500'],
            'coupon_code'        => ['nullable', 'string', 'max:50'],
            'discount'           => ['nullable', 'numeric', 'min:0'],
        ]);

        $user     = Auth::user();
        $customer = $user->customer()->with('store')->first();

        if (!$customer) {
            return response()->json(['message' => 'Khách hàng chưa được đăng ký'], 422);
        }

        $store = ($customer->store?->status === 'active')
            ? $customer->store
            : Store::where('status', 'active')->first();

        if (!$store) {
            return response()->json(['message' => 'Không tìm thấy cửa hàng'], 422);
        }

        $variantGroups = VariantGroup::all()->keyBy('key');

        $itemData = [];
        foreach ($data['lines'] as $line) {
            $productId = $this->parseProductId($line['id']);
            if (!$productId) continue;

            $product = Product::find($productId);
            if (!$product || !$product->is_available) continue;

            $selections = $line['selections'] ?? [];
            $qty        = (int) $line['qty'];

            [$sizeExtra, $sizeName, $addonTops, $sugarLevel, $iceLevel]
                = $this->resolveSelections($productId, $selections, $variantGroups);

            $addonTotal = array_sum(array_column($addonTops, 'extra'));
            $unitPrice  = round((float) $product->base_price + $sizeExtra + $addonTotal, 2);
            $itemTotal  = round($unitPrice * $qty, 2);

            $itemData[] = [
                'product_id'       => $productId,
                'quantity'         => $qty,
                'unit_price'       => $unitPrice,
                'item_total'       => $itemTotal,
                'sugar_level'      => $sugarLevel,
                'ice_level'        => $iceLevel,
                'size_name'        => $sizeName,
                'size_extra_price' => $sizeExtra,
                'toppings'         => $addonTops,
            ];
        }

        if (empty($itemData)) {
            return response()->json(['message' => 'Không có sản phẩm hợp lệ trong đơn hàng'], 422);
        }

        $subtotal     = round(array_sum(array_column($itemData, 'item_total')), 2);
        $discountAmt  = 0;
        $totalAmount  = max(0.0, round($subtotal - $discountAmt, 2));
        $pointsEarned = (int) floor($totalAmount / self::PER_POINT);

        $orderId = null;

        DB::transaction(function () use (
            $customer, $store, $data, $itemData,
            $subtotal, $discountAmt, $totalAmount, $pointsEarned, &$orderId
        ) {
            $order = Order::create([
                'customer_id'     => $customer->id,
                'store_id'        => $store->id,
                'status'          => 'PENDING',
                'subtotal'        => $subtotal,
                'discount_amount' => $discountAmt,
                'total_amount'    => $totalAmount,
                'points_earned'   => $pointsEarned,
                'note'            => $data['note'] ?? null,
            ]);

            foreach ($itemData as $item) {
                $toppings = $item['toppings'];
                unset($item['toppings']);
                $orderItem = $order->items()->create($item);

                foreach ($toppings as $top) {
                    $orderItem->toppings()->create([
                        'variant_id'     => $top['variant_id'],
                        'topping_name'   => $top['name'],
                        'price_at_order' => $top['extra'],
                    ]);
                }
            }

            if ($pointsEarned > 0) {
                $customer->increment('total_points',    $pointsEarned);
                $customer->increment('lifetime_points', $pointsEarned);

                CustomerPoint::create([
                    'customer_id'  => $customer->id,
                    'point_type'   => 'purchase',
                    'points'       => $pointsEarned,
                    'description'  => "Tích điểm đơn hàng #{$order->id}",
                    'reference_id' => $order->id,
                ]);
            }

            $customer->increment('total_orders');
            $customer->increment('total_spent', $totalAmount);

            $orderId = $order->id;
        });

        return response()->json([
            'order_id'      => $orderId,
            'points_earned' => $pointsEarned,
            'message'       => 'Đặt hàng thành công',
        ], 201);
    }

    private function parseProductId(string $id): ?int
    {
        if (!preg_match('/^p(\d+)$/', $id, $m)) return null;
        return (int) $m[1];
    }

    private function resolveSelections(int $productId, array $selections, $variantGroups): array
    {
        $sizeExtra  = 0.0;
        $sizeName   = null;
        $addonTops  = [];
        $sugarLevel = '100';
        $iceLevel   = '100';

        foreach ($selections as $groupKey => $value) {
            $group = $variantGroups[$groupKey] ?? null;
            if (!$group) continue;

            if ($group->type === 'size' && is_string($value) && $value !== '') {
                $variant    = ProductVariant::where('product_id', $productId)
                    ->where('variant_type', $groupKey)
                    ->where('name', $value)
                    ->first();
                $sizeExtra  = $variant ? (float) $variant->extra_price : 0.0;
                $sizeName   = $value;

            } elseif ($group->type === 'addon' && is_array($value)) {
                foreach ($value as $toppingName) {
                    $variant = ProductVariant::where('product_id', $productId)
                        ->where('variant_type', $groupKey)
                        ->where('name', $toppingName)
                        ->first();
                    if ($variant) {
                        $addonTops[] = [
                            'name'       => $toppingName,
                            'extra'      => (float) $variant->extra_price,
                            'variant_id' => $variant->id,
                        ];
                    }
                }

            } elseif ($group->type === 'level' && is_string($value)) {
                $pct  = (int) filter_var($value, FILTER_SANITIZE_NUMBER_INT);
                $snap = $this->snapLevel($pct);
                $lk   = strtolower($groupKey);
                if (str_contains($lk, 'sugar') || str_contains($lk, 'duong')) {
                    $sugarLevel = $snap;
                } elseif (str_contains($lk, 'ice') || str_contains($lk, 'da')) {
                    $iceLevel = $snap;
                }
            }
        }

        return [$sizeExtra, $sizeName, $addonTops, $sugarLevel, $iceLevel];
    }

    private function snapLevel(int $pct): string
    {
        if ($pct <= 0)  return '0';
        if ($pct <= 35) return '25';
        if ($pct <= 60) return '50';
        if ($pct <= 85) return '75';
        return '100';
    }
}
