<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderDiscount;
use App\Models\Voucher;
use Carbon\Carbon;

class DiscountCalculationService
{
    public function calcVoucherDiscount(Voucher $v, float $subtotal): float
    {
        if ($v->status !== 'active') return 0;
        if ($v->valid_until && Carbon::today()->gt($v->valid_until)) return 0;
        if ($v->min_purchase && $subtotal < (float) $v->min_purchase) return 0;

        // free_item: discount = product price stored at redemption; frontend validates product is in cart
        if ($v->discount_type === 'free_item') {
            return min((float) $v->discount_value, $subtotal);
        }

        if ($v->discount_type === 'percentage') {
            $d = floor($subtotal * (float) $v->discount_value / 100);
            if ($v->max_discount) $d = min($d, (float) $v->max_discount);
            return (float) $d;
        }
        return min((float) $v->discount_value, $subtotal);
    }

    public function applyToOrder(Order $order, ?Voucher $orderVoucher, ?Voucher $shippingVoucher): array
    {
        $discounts = [];
        $orderDisc = 0;
        $shipDisc  = 0;

        if ($orderVoucher) {
            $amt = $this->calcVoucherDiscount($orderVoucher, (float) $order->subtotal);
            if ($amt > 0) {
                $cat = $orderVoucher->source_type === 'PROMOTION_CLAIM' ? 'PROMOTION_VOUCHER' : 'GIFT_VOUCHER';
                $discounts[] = new OrderDiscount([
                    'order_id'          => $order->id,
                    'discount_category' => $cat,
                    'voucher_id'        => $orderVoucher->id,
                    'discount_amount'   => $amt,
                    'description'       => $this->voucherLabel($orderVoucher),
                ]);
                $orderDisc = $amt;
            }
        }

        if ($shippingVoucher) {
            $amt = $this->calcVoucherDiscount($shippingVoucher, (float) $order->shipping_fee);
            if ($amt > 0) {
                $discounts[] = new OrderDiscount([
                    'order_id'          => $order->id,
                    'discount_category' => 'SHIPPING',
                    'voucher_id'        => $shippingVoucher->id,
                    'discount_amount'   => $amt,
                    'description'       => 'Giảm phí ship: ' . $this->voucherLabel($shippingVoucher),
                ]);
                $shipDisc = $amt;
            }
        }

        return [
            'discounts'      => $discounts,
            'order_discount' => $orderDisc,
            'ship_discount'  => $shipDisc,
            'total_discount' => $orderDisc + $shipDisc,
        ];
    }

    private function voucherLabel(Voucher $v): string
    {
        if ($v->discount_type === 'percentage') {
            return "Giảm {$v->discount_value}%" . ($v->max_discount ? " (tối đa " . number_format($v->max_discount, 0, ',', '.') . "đ)" : "");
        }
        return "Giảm " . number_format($v->discount_value, 0, ',', '.') . "đ";
    }
}
