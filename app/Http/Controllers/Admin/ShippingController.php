<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ShippingTier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShippingController extends Controller
{
    public function index()
    {
        $tiers = ShippingTier::orderBy('sort_order')->orderBy('min_km')->get();

        return view('admin.shipping', [
            'shippingData' => [
                'tiers' => $tiers->map(fn ($t) => $this->present($t))->values(),
                'urls'  => [
                    'store'   => route('admin.shipping.store'),
                    'update'  => route('admin.shipping.update', ':id'),
                    'destroy' => route('admin.shipping.destroy', ':id'),
                    'reorder' => route('admin.shipping.reorder'),
                ],
            ],
        ]);
    }

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

        return response()->json(['tier' => $this->present($tier)], 201);
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

        return response()->json(['tier' => $this->present($shipping->fresh())]);
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

    private function present(ShippingTier $t): array
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
}
