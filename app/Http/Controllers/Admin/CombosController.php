<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Combo;
use App\Models\ComboItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CombosController extends Controller
{
    public function index()
    {
        $combos = Combo::with(['items.product', 'items.defaultSizeVariant'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $products = Product::where('is_available', true)
            ->orderBy('name')
            ->get(['id', 'name', 'base_price', 'image_url']);

        $variants = ProductVariant::where('is_active', true)
            ->orderBy('label')
            ->get(['id', 'product_id', 'label', 'price_modifier']);

        return view('admin.combos', [
            'combosData' => [
                'combos'   => $combos,
                'products' => $products,
                'variants' => $variants,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'            => 'required|string|max:100',
            'description'     => 'nullable|string|max:500',
            'image_url'       => 'nullable|string|max:500',
            'combo_price'     => 'required|integer|min:0',
            'max_per_day'     => 'nullable|integer|min:1',
            'available_from'  => 'nullable|date_format:H:i',
            'available_until' => 'nullable|date_format:H:i',
            'valid_from'      => 'nullable|date',
            'valid_until'     => 'nullable|date',
            'status'          => 'required|in:active,inactive,draft',
            'sort_order'      => 'nullable|integer|min:0',
            'items'           => 'nullable|array',
            'items.*.product_id'            => 'required|exists:products,id',
            'items.*.quantity'              => 'required|integer|min:1',
            'items.*.default_size_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.sort_order'            => 'nullable|integer|min:0',
        ]);

        DB::transaction(function () use ($data) {
            $combo = Combo::create(array_merge($data, ['original_price' => 0]));
            $this->syncItems($combo, $data['items'] ?? []);
            $combo->recalcOriginalPrice();
        });

        return back()->with('success', 'Đã tạo combo.');
    }

    public function update(Request $request, Combo $combo)
    {
        $data = $request->validate([
            'name'            => 'required|string|max:100',
            'description'     => 'nullable|string|max:500',
            'image_url'       => 'nullable|string|max:500',
            'combo_price'     => 'required|integer|min:0',
            'max_per_day'     => 'nullable|integer|min:1',
            'available_from'  => 'nullable|date_format:H:i',
            'available_until' => 'nullable|date_format:H:i',
            'valid_from'      => 'nullable|date',
            'valid_until'     => 'nullable|date',
            'status'          => 'required|in:active,inactive,draft',
            'sort_order'      => 'nullable|integer|min:0',
            'items'           => 'nullable|array',
            'items.*.product_id'            => 'required|exists:products,id',
            'items.*.quantity'              => 'required|integer|min:1',
            'items.*.default_size_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.sort_order'            => 'nullable|integer|min:0',
        ]);

        DB::transaction(function () use ($combo, $data) {
            $combo->update($data);
            $this->syncItems($combo, $data['items'] ?? []);
            $combo->recalcOriginalPrice();
        });

        return back()->with('success', 'Đã cập nhật combo.');
    }

    public function toggle(Combo $combo)
    {
        $combo->update([
            'status' => $combo->status === 'active' ? 'inactive' : 'active',
        ]);
        return back();
    }

    public function destroy(Combo $combo)
    {
        $combo->delete();
        return back()->with('success', 'Đã xoá combo.');
    }

    private function syncItems(Combo $combo, array $items): void
    {
        $combo->items()->delete();
        foreach ($items as $i => $item) {
            ComboItem::create([
                'combo_id'                => $combo->id,
                'product_id'              => $item['product_id'],
                'quantity'                => $item['quantity'] ?? 1,
                'default_size_variant_id' => $item['default_size_variant_id'] ?? null,
                'sort_order'              => $item['sort_order'] ?? $i,
            ]);
        }
    }
}
