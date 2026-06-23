<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Promotion;
use App\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Support\Str;

class PromotionClaimService
{
    public function claim(Customer $customer, string $code): array
    {
        $promo = Promotion::where('code', strtoupper(trim($code)))
            ->where('is_active', true)
            ->first();

        if (!$promo) return ['ok' => false, 'message' => 'Mã không hợp lệ hoặc không tồn tại'];

        $today = Carbon::today();
        if ($promo->valid_from && $today->lt($promo->valid_from)) {
            return ['ok' => false, 'message' => 'Mã chưa có hiệu lực'];
        }
        if ($promo->valid_until && $today->gt($promo->valid_until)) {
            return ['ok' => false, 'message' => 'Mã đã hết hạn'];
        }
        if ($promo->usage_limit_total !== null && $promo->claimed_count >= $promo->usage_limit_total) {
            return ['ok' => false, 'message' => 'Mã đã hết lượt sử dụng'];
        }

        // Check per-customer limit
        if ($promo->usage_limit_per_customer !== null) {
            $used = Voucher::where('customer_id', $customer->id)
                ->where('source_type', 'PROMOTION_CLAIM')
                ->where('source_id', $promo->id)
                ->count();
            if ($used >= $promo->usage_limit_per_customer) {
                return ['ok' => false, 'message' => 'Bạn đã dùng mã này rồi'];
            }
        }

        // Map promotion type to voucher discount_type
        $discountType = $promo->type === 'percent' ? 'percentage' : 'fixed';

        $validFrom  = $promo->valid_from ?? $today;
        $validUntil = $promo->valid_until ?? $today->copy()->addDays(30);

        $voucher = Voucher::create([
            'voucher_code'   => 'PROMO-' . strtoupper(Str::random(8)),
            'customer_id'    => $customer->id,
            'redemption_id'  => null,
            'source_type'    => 'PROMOTION_CLAIM',
            'source_id'      => $promo->id,
            'applies_to'     => $promo->applies_to ?? 'ORDER',
            'discount_type'  => $discountType,
            'discount_value' => $promo->value,
            'min_purchase'   => $promo->min_purchase,
            'max_discount'   => $promo->max_discount,
            'valid_from'     => $validFrom,
            'valid_until'    => $validUntil,
            'status'         => 'active',
        ]);

        $promo->increment('claimed_count');

        return ['ok' => true, 'voucher' => $this->presentVoucher($voucher, $promo)];
    }

    public function presentVoucher(Voucher $v, ?Promotion $promo = null): array
    {
        return [
            'id'             => $v->id,
            'code'           => $v->voucher_code,
            'applies_to'     => $v->applies_to,
            'discount_type'  => $v->discount_type,
            'discount_value' => (float) $v->discount_value,
            'min_purchase'   => $v->min_purchase ? (float) $v->min_purchase : null,
            'max_discount'   => $v->max_discount ? (float) $v->max_discount : null,
            'name'           => $promo?->name ?? 'Khuyến mãi',
            'valid_until'    => $v->valid_until?->format('d/m/Y'),
        ];
    }
}
