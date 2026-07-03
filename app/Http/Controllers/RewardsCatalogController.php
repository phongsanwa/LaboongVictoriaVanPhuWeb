<?php

namespace App\Http\Controllers;

use App\Models\Redemption;
use App\Models\Reward;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RewardsCatalogController extends Controller
{
    private const CATEGORIES = ['voucher', 'drink', 'gift', 'topping', 'upsize', 'upgrade'];

    public function index()
    {
        $user = Auth::user();
        $customer = $user->customer()->first();

        $today = Carbon::now()->toDateString();

        $rewards = Reward::where('status', 'active')
            ->where('valid_from', '<=', $today)
            ->where('valid_until', '>=', $today)
            ->orderBy('display_order')
            ->get();

        return view('rewards-catalog', ['rewardsData' => [
            'balance' => $customer?->total_points ?? 0,
            'gifts' => $rewards->map(fn (Reward $r) => $this->formatReward($r))->values()->all(),
        ]]);
    }

    public function wallet()
    {
        $customer = Auth::user()->customer()->first();
        abort_unless($customer, 403);

        $redemptions = Redemption::with(['reward', 'voucher'])
            ->where('customer_id', $customer->id)
            ->orderByDesc('redeemed_at')
            ->get();

        return view('wallet', ['walletData' => [
            'balance' => $customer->total_points,
            'vouchers' => $redemptions->map(fn (Redemption $r) => $this->formatVoucher($r))->values()->all(),
        ]]);
    }

    public function redeem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reward_id' => ['required', 'integer', 'exists:rewards,id'],
        ]);

        $customer = Auth::user()->customer()->first();
        abort_unless($customer, 403);

        $reward = Reward::findOrFail($validated['reward_id']);

        if ($customer->total_points < $reward->points_required) {
            return response()->json(['message' => 'Bạn chưa đủ điểm để đổi phần quà này'], 422);
        }

        if ($reward->quantity_available !== null && $reward->quantity_available !== -1 && $reward->quantity_available < 1) {
            return response()->json(['message' => 'Phần quà này đã hết'], 422);
        }

        DB::transaction(function () use ($customer, $reward) {
            $customer->decrement('total_points', $reward->points_required);

            if ($reward->quantity_available !== null && $reward->quantity_available !== -1) {
                $reward->decrement('quantity_available');
            }

            $code = 'RDMP' . now()->format('Ymd') . strtoupper(Str::random(6));

            $redemption = Redemption::create([
                'redemption_code' => $code,
                'customer_id' => $customer->id,
                'reward_id' => $reward->id,
                'points_spent' => $reward->points_required,
                'quantity' => 1,
                'status' => 'approved',
                'redeemed_at' => now(),
                'expires_at' => now()->addMonths(3)->toDateString(),
            ]);

            DB::table('customer_points')->insert([
                'customer_id' => $customer->id,
                'transaction_id' => null,
                'point_type' => 'redemption',
                'points' => -$reward->points_required,
                'description' => 'Đổi quà: ' . $reward->name,
                'reference_id' => $code,
                'expires_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($reward->reward_type === 'discount_voucher') {
                Voucher::create([
                    'voucher_code'  => 'VOC' . now()->format('Ymd') . strtoupper(Str::random(6)),
                    'customer_id'   => $customer->id,
                    'redemption_id' => $redemption->id,
                    'applies_to'    => 'ORDER',
                    'discount_type' => 'fixed',
                    'discount_value'=> $reward->value ?? 0,
                    'min_purchase'  => $reward->min_purchase,
                    'max_discount'  => null,
                    'valid_from'    => now()->toDateString(),
                    'valid_until'   => now()->addMonths(3)->toDateString(),
                    'usage_count'   => 0,
                    'status'        => 'active',
                ]);
            } elseif ($reward->reward_type === 'free_item' && $reward->product_id && in_array($reward->category, ['drink', 'gift'])) {
                $product   = \App\Models\Product::find($reward->product_id);
                $qty       = max(1, (int) ($reward->free_item_quantity ?? 1));
                $unitPrice = $product ? (int) $product->base_price : 0;
                Voucher::create([
                    'voucher_code'          => 'FRE' . now()->format('Ymd') . strtoupper(Str::random(6)),
                    'customer_id'           => $customer->id,
                    'redemption_id'         => $redemption->id,
                    'applies_to'            => 'ORDER',
                    'discount_type'         => 'free_item',
                    'discount_value'        => $unitPrice * $qty,
                    'free_item_product_id'  => $reward->product_id,
                    'free_item_quantity'    => $qty,
                    'min_purchase'          => null,
                    'max_discount'          => null,
                    'valid_from'            => now()->toDateString(),
                    'valid_until'           => now()->addMonths(3)->toDateString(),
                    'usage_count'           => 0,
                    'status'                => 'active',
                ]);
            } elseif ($reward->category === 'gift') {
                // Quà vật phẩm (gấu bông, kẹp tóc…): không trừ tiền đơn — chỉ gắn kèm
                // đơn hàng để quán chuẩn bị quà, nên discount_value = 0
                $qty = max(1, (int) ($reward->free_item_quantity ?? 1));
                Voucher::create([
                    'voucher_code'          => 'GIF' . now()->format('Ymd') . strtoupper(Str::random(6)),
                    'customer_id'           => $customer->id,
                    'redemption_id'         => $redemption->id,
                    'applies_to'            => 'ORDER',
                    'discount_type'         => 'gift_item',
                    'discount_value'        => 0,
                    'free_item_product_id'  => null,
                    'free_item_quantity'    => $qty,
                    'min_purchase'          => null,
                    'max_discount'          => null,
                    'valid_from'            => now()->toDateString(),
                    'valid_until'           => now()->addMonths(3)->toDateString(),
                    'usage_count'           => 0,
                    'status'                => 'active',
                ]);
            } elseif (in_array($reward->category, ['topping', 'upsize', 'upgrade']) && (int) ($reward->value ?? 0) > 0) {
                $qty       = max(1, (int) ($reward->free_item_quantity ?? 1));
                $unitValue = (int) $reward->value;
                Voucher::create([
                    'voucher_code'          => 'TOP' . now()->format('Ymd') . strtoupper(Str::random(6)),
                    'customer_id'           => $customer->id,
                    'redemption_id'         => $redemption->id,
                    'applies_to'            => 'ORDER',
                    'discount_type'         => 'free_item',
                    'discount_value'        => $unitValue * $qty,
                    'free_item_product_id'  => null,
                    'free_item_quantity'    => $qty,
                    'min_purchase'          => null,
                    'max_discount'          => null,
                    'valid_from'            => now()->toDateString(),
                    'valid_until'           => now()->addMonths(3)->toDateString(),
                    'usage_count'           => 0,
                    'status'                => 'active',
                ]);
            }
        });

        return response()->json([
            'message' => 'Đổi "' . $reward->name . '" thành công!',
            'balance' => $customer->fresh()->total_points,
        ]);
    }

    private function formatReward(Reward $r): array
    {
        $tags = [];
        if ($r->is_featured) {
            $tags[] = 'hot';
        }
        if ($r->quantity_available !== null && $r->quantity_available >= 0 && $r->quantity_available <= 15) {
            $tags[] = 'low';
        }
        if ($r->created_at->gt(Carbon::now()->subDays(14))) {
            $tags[] = 'new';
        }

        return [
            'id'     => $r->id,
            'name'   => $r->name,
            'cat'    => in_array($r->category, self::CATEGORIES, true) ? $r->category : 'gift',
            'points' => $r->points_required,
            'stock'  => $r->quantity_available,
            'img'    => $r->image_url,
            'grad'   => $r->gradient,
            'tags'   => $tags,
        ];
    }

    private function formatVoucher(Redemption $r): array
    {
        $voucher = $r->voucher;
        $reward = $r->reward;
        $status = $voucher->status ?? $r->status;
        $expiry = $voucher->valid_until ?? $r->expires_at;

        return [
            'id' => $r->id,
            'name' => $reward->name,
            'cat' => in_array($reward->category, self::CATEGORIES, true) ? $reward->category : 'gift',
            'code' => $voucher->voucher_code ?? $r->redemption_code,
            'fine' => $reward->description ?? '',
            'created' => $r->redeemed_at?->toDateString(),
            'expiry' => $expiry?->toDateString(),
            'status' => $status === 'used' ? 'used' : (in_array($status, ['expired', 'cancelled'], true) ? 'expired' : 'active'),
        ];
    }
}
