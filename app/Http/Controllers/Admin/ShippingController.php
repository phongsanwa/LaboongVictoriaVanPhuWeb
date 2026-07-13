<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ShippingPromotion;
use App\Models\ShippingTier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ShippingController extends Controller
{
    public function index()
    {
        $tiers  = ShippingTier::orderBy('sort_order')->orderBy('min_km')->get();
        $promos = ShippingPromotion::orderBy('sort_order')->orderBy('min_order_amount')->get();

        return view('admin.shipping', [
            'shippingData' => [
                'tiers'  => $tiers->map(fn ($t) => $this->presentTier($t))->values(),
                'promos' => $promos->map(fn ($p) => $this->presentPromo($p))->values(),
                'urls'   => [
                    'store'        => route('admin.shipping.store'),
                    'update'       => route('admin.shipping.update', ':id'),
                    'destroy'      => route('admin.shipping.destroy', ':id'),
                    'reorder'      => route('admin.shipping.reorder'),
                    'promoStore'   => route('admin.shipping.promos.store'),
                    'promoUpdate'  => route('admin.shipping.promos.update', ':id'),
                    'promoDestroy' => route('admin.shipping.promos.destroy', ':id'),
                    'promoToggle'  => route('admin.shipping.promos.toggle', ':id'),
                ],
            ],
        ]);
    }

    /* ── Shipping Tiers ─────────────────────────────────────────────── */

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label'     => ['required', 'string', 'max:100'],
            'min_km'    => ['required', 'numeric', 'min:0'],
            'max_km'    => ['nullable', 'numeric'],
            'fee'       => ['required', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $tier = ShippingTier::create([
            ...$data,
            'sort_order' => (ShippingTier::max('sort_order') ?? 0) + 1,
            'is_active'  => $data['is_active'] ?? true,
        ]);

        return response()->json(['tier' => $this->presentTier($tier)], 201);
    }

    public function update(Request $request, ShippingTier $shipping): JsonResponse
    {
        $data = $request->validate([
            'label'     => ['required', 'string', 'max:100'],
            'min_km'    => ['required', 'numeric', 'min:0'],
            'max_km'    => ['nullable', 'numeric'],
            'fee'       => ['required', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $shipping->update($data);

        return response()->json(['tier' => $this->presentTier($shipping->fresh())]);
    }

    public function destroy(ShippingTier $shipping): JsonResponse
    {
        $shipping->delete();
        return response()->json(['ok' => true]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $ids = $request->validate(['ids' => ['required', 'array']])['ids'];

        foreach ($ids as $i => $id) {
            ShippingTier::where('id', $id)->update(['sort_order' => $i]);
        }

        return response()->json(['ok' => true]);
    }

    /* ── Shipping Promotions ────────────────────────────────────────── */

    public function storePromo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:100'],
            // Bỏ trống = 0 = áp dụng cho mọi giá trị hoá đơn
            'min_order_amount' => ['nullable', 'integer', 'min:0'],
            'max_km'           => ['nullable', 'numeric', 'min:0'],
            'discount_type'    => ['required', Rule::in(['free', 'percent', 'amount'])],
            'discount_value'   => ['nullable', 'integer', 'min:0'],
        ]);

        $promo = ShippingPromotion::create([
            'name'             => $data['name'],
            'min_order_amount' => $data['min_order_amount'] ?? 0,
            'max_km'           => $data['max_km'] ?? null,
            'discount_type'    => $data['discount_type'],
            'discount_value'   => ($data['discount_type'] === 'free') ? 0 : ($data['discount_value'] ?? 0),
            'is_active'        => true,
            'sort_order'       => (ShippingPromotion::max('sort_order') ?? 0) + 1,
        ]);

        return response()->json(['promo' => $this->presentPromo($promo)], 201);
    }

    public function updatePromo(Request $request, ShippingPromotion $promo): JsonResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:100'],
            // Bỏ trống = 0 = áp dụng cho mọi giá trị hoá đơn
            'min_order_amount' => ['nullable', 'integer', 'min:0'],
            'max_km'           => ['nullable', 'numeric', 'min:0'],
            'discount_type'    => ['required', Rule::in(['free', 'percent', 'amount'])],
            'discount_value'   => ['nullable', 'integer', 'min:0'],
        ]);

        $promo->update([
            'name'             => $data['name'],
            'min_order_amount' => $data['min_order_amount'] ?? 0,
            'max_km'           => $data['max_km'] ?? null,
            'discount_type'    => $data['discount_type'],
            'discount_value'   => ($data['discount_type'] === 'free') ? 0 : ($data['discount_value'] ?? 0),
        ]);

        return response()->json(['promo' => $this->presentPromo($promo->fresh())]);
    }

    public function destroyPromo(ShippingPromotion $promo): JsonResponse
    {
        $promo->delete();
        return response()->json(['ok' => true]);
    }

    public function togglePromo(ShippingPromotion $promo): JsonResponse
    {
        $promo->update(['is_active' => !$promo->is_active]);
        return response()->json(['promo' => $this->presentPromo($promo->fresh())]);
    }

    /* ── Presenters ─────────────────────────────────────────────────── */

    private function presentTier(ShippingTier $t): array
    {
        return [
            'id'         => $t->id,
            'label'      => $t->label,
            'min_km'     => (float) $t->min_km,
            'max_km'     => $t->max_km !== null ? (float) $t->max_km : null,
            'fee'        => (int) $t->fee,
            'sort_order' => (int) $t->sort_order,
            'is_active'  => (bool) $t->is_active,
        ];
    }

    private function presentPromo(ShippingPromotion $p): array
    {
        return [
            'id'               => $p->id,
            'name'             => $p->name,
            'min_order_amount' => (int) $p->min_order_amount,
            'max_km'           => $p->max_km !== null ? (float) $p->max_km : null,
            'discount_type'    => $p->discount_type,
            'discount_value'   => (int) $p->discount_value,
            'is_active'        => (bool) $p->is_active,
            'sort_order'       => (int) $p->sort_order,
            'badge'            => $p->badgeLabel(),
        ];
    }
}
