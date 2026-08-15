<?php

namespace App\Http\Controllers;

use App\Jobs\SendOrderNotification;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderDiscount;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\ShippingPromotion;
use App\Models\Store;
use App\Models\StoreVariantOff;
use App\Models\VariantGroup;
use App\Models\Voucher;
use App\Services\DiscountCalculationService;
use App\Services\PromotionClaimService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    private const PER_POINT = 10000;

    public function place(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lines'               => ['required', 'array', 'min:1'],
            'lines.*.id'          => ['required', 'string'],
            'lines.*.qty'         => ['required', 'integer', 'min:1', 'max:99'],
            'lines.*.selections'  => ['nullable', 'array'],
            'note'                => ['nullable', 'string', 'max:500'],
            'coupon_code'         => ['nullable', 'string', 'max:50'],
            'discount'            => ['nullable', 'numeric', 'min:0'],
            'store_id'            => ['nullable', 'integer'],
            'shipping_fee'        => ['nullable', 'integer', 'min:0'],
            'voucher_id'          => ['nullable', 'integer'],
            'shipping_voucher_id' => ['nullable', 'integer'],
            'order_promo_id'      => ['nullable', 'integer'],
            'ship_promo_id'       => ['nullable', 'integer'],
            'delivery_address'    => ['nullable', 'string', 'max:500'],
            'delivery_phone'      => ['nullable', 'string', 'regex:/^0\d{9}$/'],
        ], [
            'delivery_phone.regex' => 'Số điện thoại nhận hàng phải gồm 10 số, bắt đầu bằng 0',
        ]);

        $user     = Auth::user();
        $customer = $user->customer()->with('store')->first();

        if (!$customer) {
            return response()->json(['message' => 'Khách hàng chưa được đăng ký'], 422);
        }

        // Use store chosen by customer, falling back to customer's assigned store or any active store
        $storeId = isset($data['store_id']) ? (int) $data['store_id'] : null;
        if ($storeId) {
            $store = Store::where('id', $storeId)->where('status', 'active')->first();
        }
        if (empty($store)) {
            $store = ($customer->store?->status === 'active')
                ? $customer->store
                : Store::where('status', 'active')->first();
        }

        if (!$store) {
            return response()->json(['message' => 'Không tìm thấy cửa hàng'], 422);
        }

        $variantGroups = VariantGroup::all()->keyBy('key');

        // Option đang HẾT RIÊNG tại cửa hàng này → chặn đặt để tồn kho tách theo quán.
        $storeOffSet = array_flip(StoreVariantOff::offKeysFor($store->id));
        $blockedNames = [];

        // Khuyến mãi gạch giá (kind=price) — phải trừ vào giá món giống trang thực đơn,
        // nếu không đơn lưu giá gốc và điểm tích bị tính trên giá chưa giảm
        $pricePromos = Promotion::where('is_active', true)
            ->where('kind', 'price')
            ->orderBy('sort_order')
            ->with('products:id')
            ->get();

        $specificPricePromoMap = [];
        foreach ($pricePromos as $promo) {
            if ($promo->scope === 'specific') {
                foreach ($promo->products as $prod) {
                    if (!isset($specificPricePromoMap[$prod->id])) {
                        $specificPricePromoMap[$prod->id] = $promo;
                    }
                }
            }
        }
        $allScopePricePromo = $pricePromos->firstWhere('scope', 'all');

        $itemData = [];
        foreach ($data['lines'] as $line) {
            $productId = $this->parseProductId($line['id']);
            if (!$productId) continue;

            $product = Product::find($productId);
            if (!$product || !$product->is_available) continue;

            $selections = $line['selections'] ?? [];
            $qty        = (int) $line['qty'];

            [$sizeExtra, $sizeName, $addonTops, $sugarLevel, $iceLevel]
                = $this->resolveSelections($productId, $selections, $variantGroups, $storeOffSet, $blockedNames);

            $pricePromo    = $specificPricePromoMap[$productId] ?? $allScopePricePromo;
            $effectiveBase = $pricePromo
                ? $pricePromo->calcSalePrice((int) $product->base_price)
                : (float) $product->base_price;

            $addonTotal = array_sum(array_map(fn ($t) => (float) $t['extra'] * (int) ($t['quantity'] ?? 1), $addonTops));
            // Kiểu ShopeeFood: đơn lưu GIÁ GỐC; phần gạch giá tách thành dòng
            // "Khuyến mãi gạch giá" riêng. sale_* chỉ dùng để tính khuyến mãi.
            $origUnit   = round((float) $product->base_price + $sizeExtra + $addonTotal, 2);
            $saleUnit   = round($effectiveBase + $sizeExtra + $addonTotal, 2);

            $itemData[] = [
                'product_id'       => $productId,
                'quantity'         => $qty,
                'unit_price'       => $origUnit,
                'item_total'       => round($origUnit * $qty, 2),
                'sale_unit'        => $saleUnit,
                'sale_total'       => round($saleUnit * $qty, 2),
                'sugar_level'      => $sugarLevel,
                'ice_level'        => $iceLevel,
                'size_name'        => $sizeName,
                'size_extra_price' => $sizeExtra,
                'toppings'         => $addonTops,
            ];
        }

        if (!empty($blockedNames)) {
            $list = implode(', ', array_unique($blockedNames));
            return response()->json([
                'message' => "Tại {$store->name}, các lựa chọn sau đang hết: {$list}. Vui lòng chọn lại.",
            ], 422);
        }

        if (empty($itemData)) {
            return response()->json(['message' => 'Không có sản phẩm hợp lệ trong đơn hàng'], 422);
        }

        $subtotal     = round(array_sum(array_column($itemData, 'item_total')), 2); // giá gốc (hiển thị Tạm tính)
        $saleSubtotal = round(array_sum(array_column($itemData, 'sale_total')), 2); // giá đã gạch (tính khuyến mãi)
        $badgeDiscAmt = round($subtotal - $saleSubtotal, 2); // dòng "Khuyến mãi gạch giá"

        // --- Resolve vouchers ---
        $orderVoucher    = null;
        $shippingVoucher = null;

        if (!empty($data['voucher_id'])) {
            $v = Voucher::with('freeItemProduct')
                ->where('id', $data['voucher_id'])
                ->where('customer_id', $customer->id)
                ->where('status', 'active')
                ->where('applies_to', 'ORDER')
                ->first();
            if ($v) $orderVoucher = $v;
        }

        if (!empty($data['shipping_voucher_id'])) {
            $v = Voucher::where('id', $data['shipping_voucher_id'])
                ->where('customer_id', $customer->id)
                ->where('status', 'active')
                ->where('applies_to', 'SHIPPING')
                ->first();
            if ($v) $shippingVoucher = $v;
        }

        // Fallback: old coupon_code flow (direct promo code without pre-claim)
        if (!$orderVoucher && !empty($data['coupon_code'])) {
            $couponCode = strtoupper(trim($data['coupon_code']));
            $promotion  = Promotion::where('code', $couponCode)
                ->where('is_active', true)
                ->where('applies_to', 'ORDER')
                ->first();
            if ($promotion) {
                $claimService = app(PromotionClaimService::class);
                $result = $claimService->claim($customer, $couponCode);
                if ($result['ok']) {
                    $voucherId = $result['voucher']['id'] ?? null;
                    if ($voucherId) {
                        $orderVoucher = Voucher::find($voucherId);
                    }
                }
            }
        }

        // --- Resolve public promotions (combinable with vouchers) ---
        $orderPromo = null;
        if (!empty($data['order_promo_id'])) {
            $p = Promotion::where('id', $data['order_promo_id'])
                ->where('is_active', true)
                ->where('kind', 'voucher')
                ->first();
            if ($p
                && ($p->valid_until === null || $p->valid_until->isFuture())
                && $saleSubtotal >= (float) ($p->min_purchase ?? 0)) {
                $orderPromo = $p;
            }
        }

        $shipPromo = null;
        if (!empty($data['ship_promo_id'])) {
            $sp = ShippingPromotion::where('id', $data['ship_promo_id'])
                ->where('is_active', true)
                ->first();
            if ($sp && $saleSubtotal >= (float) $sp->min_order_amount) {
                $shipPromo = $sp;
            }
        }

        // --- Calculate discounts ---
        $discSvc      = app(DiscountCalculationService::class);
        $shippingFee  = (int) ($data['shipping_fee'] ?? 0);

        $voucherDiscAmt = 0;
        if ($orderVoucher) {
            if ($orderVoucher->discount_type === 'buy_get') {
                $voucherDiscAmt = $this->calcBuyGetDiscount($orderVoucher, $itemData);
            } elseif ($orderVoucher->discount_type === 'free_item' && $orderVoucher->free_item_scope === 'any') {
                // Miễn phí món BẤT KỲ (có thể giới hạn size): trừ giá món rẻ nhất
                // đủ điều kiện trong giỏ (không tính tiền topping của món đó)
                $voucherDiscAmt = min($this->calcFreeAnyDiscount($orderVoucher, $itemData), $saleSubtotal);
            } elseif ($orderVoucher->discount_type === 'free_item' && !$orderVoucher->free_item_product_id) {
                // Voucher Freetopping: chỉ áp khi món trong đơn CÓ topping,
                // và không giảm quá tổng tiền topping thực tế
                $topTotal = 0;
                foreach ($itemData as $it) {
                    foreach ($it['toppings'] as $t) {
                        $topTotal += (float) $t['extra'] * (int) ($t['quantity'] ?? 1) * (int) $it['quantity'];
                    }
                }
                $voucherDiscAmt = $topTotal > 0
                    ? min((float) $orderVoucher->discount_value, $topTotal, $saleSubtotal)
                    : 0;
            } else {
                $voucherDiscAmt = $discSvc->calcVoucherDiscount($orderVoucher, $saleSubtotal);
            }
        }
        $orderPromoDiscAmt = $orderPromo   ? $this->calcPromotionDiscount($orderPromo, $saleSubtotal)    : 0;
        $orderDiscAmt      = min($saleSubtotal, $voucherDiscAmt + $orderPromoDiscAmt);

        $shipVoucherDiscAmt = $shippingVoucher ? $discSvc->calcVoucherDiscount($shippingVoucher, $shippingFee) : 0;
        $shipPromoDiscAmt   = $shipPromo       ? $this->calcShipPromoDiscount($shipPromo, $shippingFee)        : 0;
        $shipDiscAmt        = min($shippingFee, $shipVoucherDiscAmt + $shipPromoDiscAmt);

        $discountAmt  = $badgeDiscAmt + $orderDiscAmt + $shipDiscAmt;
        $totalAmount  = max(0.0, round($saleSubtotal - $orderDiscAmt + $shippingFee - $shipDiscAmt, 2));
        // Điểm thưởng chỉ tính trên tiền HÀNG (sau giảm giá), KHÔNG tính phí ship.
        $pointsBase   = max(0.0, round($saleSubtotal - $orderDiscAmt, 2));
        $pointsEarned = (int) floor($pointsBase / self::PER_POINT);

        $orderId = null;

        DB::transaction(function () use (
            $customer, $store, $data, $itemData,
            $subtotal, $discountAmt, $shippingFee, $totalAmount, $pointsEarned,
            $orderVoucher, $shippingVoucher, $orderPromo, $shipPromo, $badgeDiscAmt,
            $voucherDiscAmt, $orderPromoDiscAmt, $shipVoucherDiscAmt, $shipPromoDiscAmt,
            &$orderId
        ) {
            $order = Order::create([
                'customer_id'     => $customer->id,
                'store_id'        => $store->id,
                'status'          => 'PENDING',
                'subtotal'        => $subtotal,
                'discount_amount' => $discountAmt,
                'shipping_fee'    => $shippingFee,
                'total_amount'    => $totalAmount,
                'points_earned'   => $pointsEarned,
                'note'            => $data['note'] ?? null,
                'delivery_address' => $data['delivery_address'] ?? null,
                // Chỉ lưu SĐT nhận hàng cho đơn giao; đơn tại quầy để trống
                'delivery_phone'   => !empty($data['delivery_address']) ? ($data['delivery_phone'] ?? null) : null,
            ]);

            foreach ($itemData as $item) {
                $toppings = $item['toppings'];
                unset($item['toppings'], $item['sale_unit'], $item['sale_total']);
                $orderItem = $order->items()->create($item);

                foreach ($toppings as $top) {
                    $orderItem->toppings()->create([
                        'variant_id'     => $top['variant_id'],
                        'topping_name'   => $top['name'],
                        'quantity'       => (int) ($top['quantity'] ?? 1),
                        'price_at_order' => $top['extra'],
                    ]);
                }
            }

            // Dòng "Khuyến mãi gạch giá" — chênh lệch giá gốc và giá đang giảm
            if ($badgeDiscAmt > 0) {
                OrderDiscount::create([
                    'order_id'          => $order->id,
                    'discount_category' => 'PROMOTION_VOUCHER',
                    'voucher_id'        => null,
                    'discount_amount'   => $badgeDiscAmt,
                    'description'       => 'Khuyến mãi gạch giá',
                ]);
            }

            // Save OrderDiscount records + mark vouchers used.
            // Quà vật phẩm (gift_item) không trừ tiền nhưng vẫn phải ghi vào đơn
            // để hiển thị cho quán chuẩn bị và in trên hoá đơn.
            if ($orderVoucher && ($voucherDiscAmt > 0 || $orderVoucher->discount_type === 'gift_item')) {
                $giftName = $orderVoucher->discount_type === 'gift_item'
                    ? ($orderVoucher->redemption?->reward?->name ?? 'quà đổi điểm')
                    : null;
                $giftQty  = max(1, (int) ($orderVoucher->free_item_quantity ?? 1));

                OrderDiscount::create([
                    'order_id'          => $order->id,
                    'discount_category' => $orderVoucher->source_type === 'PROMOTION_CLAIM' ? 'PROMOTION_VOUCHER' : 'GIFT_VOUCHER',
                    'voucher_id'        => $orderVoucher->id,
                    'discount_amount'   => $voucherDiscAmt,
                    'description'       => match($orderVoucher->discount_type) {
                        'gift_item'  => 'Quà tặng: ' . ($giftQty > 1 ? "{$giftQty}× " : '') . $giftName,
                        'buy_get'    => 'Mua ' . max(1, (int) ($orderVoucher->buy_quantity ?? 2))
                                        . ' tặng ' . max(1, (int) ($orderVoucher->free_item_quantity ?? 1)),
                        'free_item'  => $orderVoucher->free_item_product_id
                            ? "Miễn phí: " . ($orderVoucher->freeItemProduct?->name ?? 'sản phẩm')
                            : ($orderVoucher->free_item_scope === 'any'
                                ? 'Miễn phí ' . ($giftQty > 1 ? "{$giftQty} " : '') . 'món'
                                    . ($orderVoucher->free_item_size ? " {$orderVoucher->free_item_size}" : '') . ' bất kỳ'
                                : "Miễn phí topping"),
                        'percentage' => "Giảm {$orderVoucher->discount_value}%",
                        default      => "Giảm " . number_format($orderVoucher->discount_value, 0, ',', '.') . "đ",
                    },
                ]);
                $orderVoucher->update(['status' => 'used', 'used_at' => now()]);
            }

            if ($orderPromo && $orderPromoDiscAmt > 0) {
                OrderDiscount::create([
                    'order_id'          => $order->id,
                    'discount_category' => 'PROMOTION_VOUCHER',
                    'voucher_id'        => null,
                    'discount_amount'   => $orderPromoDiscAmt,
                    'description'       => $orderPromo->name . ' (' . $orderPromo->badgeLabel() . ')',
                ]);
            }

            if ($shippingVoucher && $shipVoucherDiscAmt > 0) {
                OrderDiscount::create([
                    'order_id'          => $order->id,
                    'discount_category' => 'SHIPPING',
                    'voucher_id'        => $shippingVoucher->id,
                    'discount_amount'   => $shipVoucherDiscAmt,
                    'description'       => "Giảm phí ship",
                ]);
                $shippingVoucher->update(['status' => 'used', 'used_at' => now()]);
            }

            if ($shipPromo && $shipPromoDiscAmt > 0) {
                OrderDiscount::create([
                    'order_id'          => $order->id,
                    'discount_category' => 'SHIPPING',
                    'voucher_id'        => null,
                    'discount_amount'   => $shipPromoDiscAmt,
                    'description'       => $shipPromo->name,
                ]);
            }

            // Điểm, total_orders và total_spent CHƯA cộng lúc này — chỉ cộng khi đơn
            // hoàn tất (giao thành công) để đơn bị huỷ không thổi phồng thống kê KH.
            // points_earned lưu số điểm SẼ nhận; việc cộng thật + cập nhật thống kê
            // do admin duyệt đơn sang COMPLETED thực hiện (Admin\OrdersController::advance).

            $orderId = $order->id;
        });

        $this->notifyStaff($orderId);

        return response()->json([
            'order_id'        => $orderId,
            'points_earned'   => $pointsEarned,   // số điểm sẽ nhận khi đơn hoàn tất
            'points_pending'  => true,
            'message'         => $pointsEarned > 0
                ? "Đặt hàng thành công! Bạn sẽ nhận +{$pointsEarned} điểm khi đơn hoàn tất."
                : 'Đặt hàng thành công!',
        ], 201);
    }

    private function notifyStaff(int $orderId): void
    {
        try {
            // Chạy NGAY SAU khi trả phản hồi cho khách, trong cùng tiến trình web
            // (không đẩy vào hàng đợi) → luôn dùng code mới nhất, không cần restart
            // queue worker sau mỗi lần deploy. Khách không phải chờ thêm.
            SendOrderNotification::dispatchAfterResponse($orderId);
        } catch (\Throwable $e) {
            Log::error('Failed to dispatch SendOrderNotification', ['order_id' => $orderId, 'error' => $e->getMessage()]);
        }
    }

    private function parseProductId(string $id): ?int
    {
        if (!preg_match('/^p(\d+)$/', $id, $m)) return null;
        return (int) $m[1];
    }

    private function resolveSelections(int $productId, array $selections, $variantGroups, array $offSet = [], array &$blocked = []): array
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
                if (isset($offSet["{$groupKey}|{$value}"])) {
                    $blocked[] = $value;
                }
                $variant    = ProductVariant::where('product_id', $productId)
                    ->where('variant_type', $groupKey)
                    ->where('name', $value)
                    ->first();
                $sizeExtra  = $variant ? (float) $variant->extra_price : 0.0;
                $sizeName   = $value;

            } elseif ($group->type === 'addon' && is_array($value)) {
                // Khách chọn số lượng mỗi topping: mảng có thể lặp id (2 trân châu = [pearl, pearl]).
                // Gộp theo tên để lưu 1 dòng/topping kèm số lượng (bảng có unique order_item_id+variant_id).
                $counts = array_count_values(array_map('strval', $value));
                foreach ($counts as $toppingName => $count) {
                    if (isset($offSet["{$groupKey}|{$toppingName}"])) {
                        $blocked[] = $toppingName;
                        continue;
                    }
                    $variant = ProductVariant::where('product_id', $productId)
                        ->where('variant_type', $groupKey)
                        ->where('name', $toppingName)
                        ->first();
                    if ($variant) {
                        $addonTops[] = [
                            'name'       => $toppingName,
                            'quantity'   => max(1, (int) $count),
                            'extra'      => (float) $variant->extra_price,
                            'variant_id' => $variant->id,
                        ];
                    }
                }

            } elseif ($group->type === 'level' && is_string($value) && $value !== '') {
                if (isset($offSet["{$groupKey}|{$value}"])) {
                    $blocked[] = $value;
                }
                // Lượng chọn = đúng số % khách chọn (không ép về mốc cứng), giới hạn 0–100.
                $pct = (string) max(0, min(100, (int) filter_var($value, FILTER_SANITIZE_NUMBER_INT)));
                // Nhận diện Đường/Đá theo NHÃN nhóm (bỏ dấu tiếng Việt) — bền hơn là dựa vào key.
                $hint = $this->noAccent(($group->label ?? '') . ' ' . $groupKey);
                if (str_contains($hint, 'duong') || str_contains($hint, 'sugar') || str_contains($hint, 'ngot')) {
                    $sugarLevel = $pct;
                } elseif (str_contains($hint, 'da') || str_contains($hint, 'ice') || str_contains($hint, 'lanh')) {
                    $iceLevel = $pct;
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

    /** Bỏ dấu tiếng Việt + viết thường, để nhận diện "đường"/"đá" từ nhãn nhóm. */
    private function noAccent(string $s): string
    {
        $s = mb_strtolower($s, 'UTF-8');
        $s = preg_replace([
            '/[àáạảãâầấậẩẫăằắặẳẵ]/u',
            '/[èéẹẻẽêềếệểễ]/u',
            '/[ìíịỉĩ]/u',
            '/[òóọỏõôồốộổỗơờớợởỡ]/u',
            '/[ùúụủũưừứựửữ]/u',
            '/[ỳýỵỷỹ]/u',
            '/đ/u',
        ], ['a', 'e', 'i', 'o', 'u', 'y', 'd'], $s);

        return $s;
    }

    private function calcPromotionDiscount(Promotion $promo, float $subtotal): float
    {
        if ($promo->type === 'amount') {
            return min((float) $promo->value, $subtotal);
        } elseif ($promo->type === 'percent') {
            $discount = floor($subtotal * (float) $promo->value / 100);
            if ($promo->max_discount) {
                $discount = min($discount, (float) $promo->max_discount);
            }
            return (float) min($discount, $subtotal);
        }
        return 0;
    }

    /**
     * Mua X tặng Y: giỏ đủ X+Y món thì được trừ tiền Y món có đơn giá thấp nhất.
     * Tính lại từ item đã xác thực phía server — không tin số client gửi.
     */
    private function calcBuyGetDiscount(Voucher $v, array $itemData): float
    {
        if ($v->valid_until && now()->startOfDay()->gt($v->valid_until)) return 0;

        $buy  = max(1, (int) ($v->buy_quantity ?? 2));
        $free = max(1, (int) ($v->free_item_quantity ?? 1));

        $units = [];
        foreach ($itemData as $it) {
            // Dùng giá đã gạch (khách thực trả) — khớp với cách giỏ hàng tính
            for ($i = 0; $i < $it['quantity']; $i++) {
                $units[] = (float) ($it['sale_unit'] ?? $it['unit_price']);
            }
        }
        if (count($units) < $buy + $free) return 0;

        sort($units);

        return round(array_sum(array_slice($units, 0, $free)), 2);
    }

    /**
     * Miễn phí món BẤT KỲ (voucher free_item scope=any, có thể giới hạn size):
     * trừ giá của N món rẻ nhất đủ điều kiện. Giá món = giá đã gạch + phụ thu size,
     * KHÔNG gồm tiền topping (khách vẫn trả topping). Món không chọn size được
     * coi là size mặc định (phụ thu 0đ).
     */
    private function calcFreeAnyDiscount(Voucher $v, array $itemData): float
    {
        if ($v->valid_until && now()->startOfDay()->gt($v->valid_until)) return 0;

        $free        = max(1, (int) ($v->free_item_quantity ?? 1));
        $wantSize    = $v->free_item_size; // null = mọi size
        // Món không chọn size (thêm nhanh) tính là size mặc định; nếu nhóm SIZE
        // không khai báo mặc định thì dùng size không phụ thu (giá đúng bằng giá gốc)
        $defaultSize = VariantGroup::where('type', 'size')->first()?->default_option
            ?: ProductVariant::where('variant_type', 'SIZE')->where('extra_price', 0)->value('name');

        $units = [];
        foreach ($itemData as $it) {
            if ($wantSize !== null) {
                $itemSize = $it['size_name'] ?? $defaultSize;
                if ($itemSize !== $wantSize) continue;
            }
            $toppingPerUnit = array_sum(array_column($it['toppings'], 'extra'));
            $unit = max(0.0, (float) ($it['sale_unit'] ?? $it['unit_price']) - $toppingPerUnit);
            for ($i = 0; $i < $it['quantity']; $i++) {
                $units[] = $unit;
            }
        }
        if (empty($units)) return 0;

        sort($units);

        return round(array_sum(array_slice($units, 0, $free)), 2);
    }

    private function calcShipPromoDiscount(ShippingPromotion $promo, int $shippingFee): float
    {
        if ($shippingFee <= 0) return 0;

        return match ($promo->discount_type) {
            'free'    => (float) $shippingFee,
            'percent' => (float) min(floor($shippingFee * (float) $promo->discount_value / 100), $shippingFee),
            default   => (float) min((float) $promo->discount_value, $shippingFee),
        };
    }
}
