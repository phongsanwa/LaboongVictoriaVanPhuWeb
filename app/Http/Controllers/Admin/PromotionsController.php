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
            'name'        => ['required', 'string', 'max:100'],
            'type'        => ['required', Rule::in(['percent', 'amount'])],
            'value'       => ['required', 'integer', 'min:1'],
            'scope'       => ['required', Rule::in(['all', 'specific'])],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer', Rule::exists('products', 'id')],
        ], [
            'value.min' => 'Giá trị giảm phải lớn hơn 0',
        ]);

        if ($data['type'] === 'percent' && $data['value'] > 100) {
            return response()->json(['message' => 'Phần trăm giảm không được vượt quá 100%'], 422);
        }

        $order = Promotion::max('sort_order') + 1;

        $promo = Promotion::create([
            'name'       => $data['name'],
            'type'       => $data['type'],
            'value'      => $data['value'],
            'scope'      => $data['scope'],
            'is_active'  => true,
            'sort_order' => $order,
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
            'name'          => ['required', 'string', 'max:100'],
            'type'          => ['required', Rule::in(['percent', 'amount'])],
            'value'         => ['required', 'integer', 'min:1'],
            'scope'         => ['required', Rule::in(['all', 'specific'])],
            'product_ids'   => ['nullable', 'array'],
            'product_ids.*' => ['integer', Rule::exists('products', 'id')],
        ], [
            'value.min' => 'Giá trị giảm phải lớn hơn 0',
        ]);

        if ($data['type'] === 'percent' && $data['value'] > 100) {
            return response()->json(['message' => 'Phần trăm giảm không được vượt quá 100%'], 422);
        }

        $promotion->update([
            'name'  => $data['name'],
            'type'  => $data['type'],
            'value' => $data['value'],
            'scope' => $data['scope'],
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
            'id'          => $p->id,
            'name'        => $p->name,
            'type'        => $p->type,
            'value'       => $p->value,
            'scope'       => $p->scope,
            'is_active'   => $p->is_active,
            'sort_order'  => $p->sort_order,
            'badge'       => $p->badgeLabel(),
            'product_ids' => $p->products->pluck('id')->values()->toArray(),
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
