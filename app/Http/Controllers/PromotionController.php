<?php

namespace App\Http\Controllers;

use App\Models\Voucher;
use App\Services\PromotionClaimService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PromotionController extends Controller
{
    public function __construct(private PromotionClaimService $claimService) {}

    /** POST /promotions/claim */
    public function claim(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:30']]);
        $customer = Auth::user()->customer()->first();
        if (!$customer) return response()->json(['message' => 'Không tìm thấy khách hàng'], 422);

        $result = $this->claimService->claim($customer, $request->code);
        if (!$result['ok']) return response()->json(['message' => $result['message']], 422);
        return response()->json(['voucher' => $result['voucher']]);
    }

    /** GET /cart/vouchers */
    public function cartVouchers(): JsonResponse
    {
        $customer = Auth::user()->customer()->first();
        if (!$customer) return response()->json(['order' => [], 'shipping' => []]);

        $today = Carbon::today();
        $vouchers = Voucher::where('customer_id', $customer->id)
            ->where('status', 'active')
            ->where('valid_until', '>=', $today)
            ->orderByDesc('created_at')
            ->get();

        $order    = $vouchers->where('applies_to', 'ORDER')->values();
        $shipping = $vouchers->where('applies_to', 'SHIPPING')->values();

        $fmt = fn($v) => [
            'id'             => $v->id,
            'code'           => $v->voucher_code,
            'name'           => $this->voucherName($v),
            'applies_to'     => $v->applies_to,
            'discount_type'  => $v->discount_type,
            'discount_value' => (float) $v->discount_value,
            'min_purchase'   => $v->min_purchase ? (float) $v->min_purchase : null,
            'max_discount'   => $v->max_discount ? (float) $v->max_discount : null,
            'valid_until'    => $v->valid_until?->format('d/m/Y'),
        ];

        return response()->json([
            'order'    => $order->map($fmt)->values(),
            'shipping' => $shipping->map($fmt)->values(),
        ]);
    }

    private function voucherName(Voucher $v): string
    {
        if ($v->source_type === 'PROMOTION_CLAIM' && $v->source_id) {
            $promo = \App\Models\Promotion::find($v->source_id);
            if ($promo) return $promo->name;
        }
        if ($v->redemption_id) {
            $redemption = \App\Models\Redemption::with('reward')->find($v->redemption_id);
            if ($redemption?->reward) return $redemption->reward->name;
        }
        if ($v->discount_type === 'percentage') return "Giảm {$v->discount_value}%";
        return "Giảm " . number_format($v->discount_value, 0, ',', '.') . "đ";
    }
}
