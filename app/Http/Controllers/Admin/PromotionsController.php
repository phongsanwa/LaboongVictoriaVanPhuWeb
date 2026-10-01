<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Promotion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class PromotionsController extends Controller
{
    public function index()
    {
        $admin = Auth::user();

        return view('admin.promotions', [
            'promotionsData' => [
                'admin' => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'promotions' => $this->buildPromotions(),
                'products'   => $this->buildProducts(),
                'urls'       => [
                    'store'   => route('admin.promotions.store'),
                    'update'  => route('admin.promotions.update', ['promotion' => '__ID__']),
                    'destroy' => route('admin.promotions.destroy', ['promotion' => '__ID__']),
                    'toggle'  => route('admin.promotions.toggle', ['promotion' => '__ID__']),
                ],
            ],
        ]);
    }

    /** POST /admin/promotions */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind'                    => ['required', Rule::in(['price', 'voucher'])],
            'name'                    => ['required', 'string', 'max:100'],
            'code'                    => ['nullable', 'string', 'max:30', 'alpha_dash', 'unique:promotions,code'],
            'type'                    => ['required', Rule::in(['percent', 'amount', 'fixed'])],
            'value'                   => ['required', 'integer', 'min:1'],
            'scope'                   => ['required', Rule::in(['all', 'specific'])],
            'product_ids'             => ['nullable', 'array'],
            'product_ids.*'           => ['integer', Rule::exists('products', 'id')],
            'min_purchase'            => ['nullable', 'numeric', 'min:0'],
            'max_discount'            => ['nullable', 'numeric', 'min:0'],
            'valid_from'              => ['nullable', 'date'],
            'valid_until'             => ['nullable', 'date', 'after_or_equal:valid_from'],
            'usage_limit_total'       => ['nullable', 'integer', 'min:1'],
            'usage_limit_per_customer'=> ['nullable', 'integer', 'min:1'],
        ], [
            'value.min'       => 'Giá trị giảm phải lớn hơn 0',
            'code.unique'     => 'Mã này đã được dùng cho khuyến mãi khác',
            'code.alpha_dash' => 'Mã chỉ được chứa chữ cái, số và dấu gạch ngang',
        ]);

        if ($data['type'] === 'percent' && $data['value'] > 100) {
            return response()->json(['message' => 'Phần trăm giảm không được vượt quá 100%'], 422);
        }

        // Đồng giá chỉ dùng cho khuyến mãi gạch giá (không áp dụng cho voucher).
        if ($data['type'] === 'fixed' && $data['kind'] !== 'price') {
            return response()->json(['message' => 'Đồng giá chỉ áp dụng cho khuyến mãi gạch giá'], 422);
        }

        $order = Promotion::max('sort_order') + 1;
        $code  = isset($data['code']) && $data['code'] !== ''
            ? strtoupper(trim($data['code']))
            : null;

        $promo = Promotion::create([
            'kind'                     => $data['kind'],
            'name'                     => $data['name'],
            'code'                     => $code,
            'type'                     => $data['type'],
            'value'                    => $data['value'],
            'scope'                    => $data['scope'],
            'is_active'                => true,
            'sort_order'               => $order,
            'min_purchase'             => $data['min_purchase'] ?? null,
            'max_discount'             => $data['max_discount'] ?? null,
            'valid_from'               => $data['valid_from'] ?? null,
            'valid_until'              => $data['valid_until'] ?? null,
            'usage_limit_total'        => $data['usage_limit_total'] ?? null,
            'usage_limit_per_customer' => $data['usage_limit_per_customer'] ?? 1,
            'applies_to'               => 'ORDER',
        ]);

        if ($data['scope'] === 'specific') {
            $promo->products()->sync($data['product_ids'] ?? []);
        }

        return response()->json(['promotion' => $this->presentPromotion($promo->load('products'))], 201);
    }

    /** POST /admin/promotions/{promotion} */
    public function update(Request $request, Promotion $promotion): JsonResponse
    {
        $data = $request->validate([
            'kind'                    => ['required', Rule::in(['price', 'voucher'])],
            'name'                    => ['required', 'string', 'max:100'],
            'code'                    => ['nullable', 'string', 'max:30', 'alpha_dash', Rule::unique('promotions', 'code')->ignore($promotion->id)],
            'type'                    => ['required', Rule::in(['percent', 'amount', 'fixed'])],
            'value'                   => ['required', 'integer', 'min:1'],
            'scope'                   => ['required', Rule::in(['all', 'specific'])],
            'product_ids'             => ['nullable', 'array'],
            'product_ids.*'           => ['integer', Rule::exists('products', 'id')],
            'min_purchase'            => ['nullable', 'numeric', 'min:0'],
            'max_discount'            => ['nullable', 'numeric', 'min:0'],
            'valid_from'              => ['nullable', 'date'],
            'valid_until'             => ['nullable', 'date', 'after_or_equal:valid_from'],
            'usage_limit_total'       => ['nullable', 'integer', 'min:1'],
            'usage_limit_per_customer'=> ['nullable', 'integer', 'min:1'],
        ], [
            'value.min'       => 'Giá trị giảm phải lớn hơn 0',
            'code.unique'     => 'Mã này đã được dùng cho khuyến mãi khác',
            'code.alpha_dash' => 'Mã chỉ được chứa chữ cái, số và dấu gạch ngang',
        ]);

        if ($data['type'] === 'percent' && $data['value'] > 100) {
            return response()->json(['message' => 'Phần trăm giảm không được vượt quá 100%'], 422);
        }

        // Đồng giá chỉ dùng cho khuyến mãi gạch giá (không áp dụng cho voucher).
        if ($data['type'] === 'fixed' && $data['kind'] !== 'price') {
            return response()->json(['message' => 'Đồng giá chỉ áp dụng cho khuyến mãi gạch giá'], 422);
        }

        $code = isset($data['code']) && $data['code'] !== ''
            ? strtoupper(trim($data['code']))
            : null;

        $promotion->update([
            'kind'                     => $data['kind'],
            'name'                     => $data['name'],
            'code'                     => $code,
            'type'                     => $data['type'],
            'value'                    => $data['value'],
            'scope'                    => $data['scope'],
            'min_purchase'             => $data['min_purchase'] ?? null,
            'max_discount'             => $data['max_discount'] ?? null,
            'valid_from'               => $data['valid_from'] ?? null,
            'valid_until'              => $data['valid_until'] ?? null,
            'usage_limit_total'        => $data['usage_limit_total'] ?? null,
            'usage_limit_per_customer' => $data['usage_limit_per_customer'] ?? null,
            'applies_to'               => 'ORDER',
        ]);

        if ($data['scope'] === 'specific') {
            $promotion->products()->sync($data['product_ids'] ?? []);
        } else {
            $promotion->products()->detach();
        }

        return response()->json(['promotion' => $this->presentPromotion($promotion->fresh()->load('products'))]);
    }

    /** DELETE /admin/promotions/{promotion} */
    public function destroy(Promotion $promotion): JsonResponse
    {
        $promotion->delete();
        return response()->json(['message' => 'Đã xoá khuyến mãi']);
    }

    /** POST /admin/promotions/{promotion}/toggle */
    public function toggle(Promotion $promotion): JsonResponse
    {
        $promotion->update(['is_active' => !$promotion->is_active]);
        return response()->json(['is_active' => $promotion->is_active]);
    }

    /* ─── Helpers ─── */

    private function buildPromotions(): array
    {
        return Promotion::orderBy('sort_order')
            ->with('products:id')
            ->get()
            ->map(fn (Promotion $p) => $this->presentPromotion($p))
            ->values()
            ->toArray();
    }

    private function buildProducts(): array
    {
        return Product::with('category')
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Product $p) => [
                'id'    => $p->id,
                'name'  => $p->name,
                'price' => (int) $p->base_price,
                'cat'   => $p->category?->name ?? '',
                'img'   => $p->image_url ?: null,
                'grad'  => $p->color ?? 'linear-gradient(150deg,#0F623F,#1AA86A)',
            ])
            ->values()
            ->toArray();
    }

    private function presentPromotion(Promotion $p): array
    {
        return [
            'id'                       => $p->id,
            'kind'                     => $p->kind ?? 'price',
            'name'                     => $p->name,
            'code'                     => $p->code,
            'type'                     => $p->type,
            'value'                    => $p->value,
            'scope'                    => $p->scope,
            'is_active'                => $p->is_active,
            'sort_order'               => $p->sort_order,
            'badge'                    => $p->badgeLabel(),
            'product_ids'              => $p->products->pluck('id')->values()->toArray(),
            'min_purchase'             => $p->min_purchase ? (float) $p->min_purchase : null,
            'max_discount'             => $p->max_discount ? (float) $p->max_discount : null,
            'valid_from'               => $p->valid_from?->format('Y-m-d'),
            'valid_until'              => $p->valid_until?->format('Y-m-d'),
            'usage_limit_total'        => $p->usage_limit_total,
            'usage_limit_per_customer' => $p->usage_limit_per_customer,
            'applies_to'               => $p->applies_to ?? 'ORDER',
            'claimed_count'            => $p->claimed_count ?? 0,
        ];
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last  = array_pop($parts);
        $first = $parts[0] ?? '';
        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
