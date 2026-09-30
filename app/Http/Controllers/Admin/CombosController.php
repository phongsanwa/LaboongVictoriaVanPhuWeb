<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Combo;
use App\Models\ComboItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CombosController extends Controller
{
    public function index()
    {
        $admin = Auth::user();

        $combos = Combo::with(['items.product', 'items.defaultSizeVariant'])
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($c) => $this->present($c))
            ->values();

        $products = Product::with('sizes')
            ->where('is_available', true)
            ->orderBy('name')
            ->get()
            ->map(fn ($p) => [
                'id'         => $p->id,
                'name'       => $p->name,
                'base_price' => (float) $p->base_price,
                'image_url'  => $p->image_url,
                'sizes'      => $p->sizes->map(fn ($v) => [
                    'id'          => $v->id,
                    'name'        => $v->name,
                    'extra_price' => (float) $v->extra_price,
                ])->values(),
            ])->values();

        return view('admin.combos', [
            'combosData' => [
                'admin' => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'combos'   => $combos,
                'products' => $products,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $combo = DB::transaction(function () use ($data) {
            $combo = Combo::create($data['combo']);
            $this->syncItems($combo, $data['items']);
            $combo->recalcOriginalPrice();
            return $combo->load('items.product');
        });

        return response()->json(['combo' => $this->present($combo)]);
    }

    public function update(Request $request, Combo $combo)
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($combo, $data) {
            $combo->update($data['combo']);
            $this->syncItems($combo, $data['items']);
            $combo->recalcOriginalPrice();
        });

        return response()->json(['combo' => $this->present($combo->load('items.product'))]);
    }

    public function toggle(Combo $combo)
    {
        $combo->status = $combo->status === 'active' ? 'inactive' : 'active';
        $combo->save();

        return response()->json(['combo' => $this->present($combo->load('items.product'))]);
    }

    public function destroy(Combo $combo)
    {
        $combo->delete();
        return response()->json(['ok' => true]);
    }

    // ─── private helpers ──────────────────────────────────────────────────────

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name'            => ['required', 'string', 'max:100'],
            'description'     => ['nullable', 'string', 'max:500'],
            'combo_price'     => ['required', 'numeric', 'min:0'],
            'max_per_day'     => ['nullable', 'integer', 'min:1'],
            'available_from'  => ['nullable', 'date_format:H:i'],
            'available_until' => ['nullable', 'date_format:H:i', 'after:available_from'],
            'valid_from'      => ['nullable', 'date'],
            'valid_until'     => ['nullable', 'date'],
            'status'          => ['required', Rule::in(['active', 'inactive', 'draft'])],
            'sort_order'      => ['nullable', 'integer'],
            'items'           => ['required', 'array', 'min:1'],
            'items.*.product_id'            => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'              => ['required', 'integer', 'min:1', 'max:20'],
            'items.*.default_size_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.sort_order'            => ['nullable', 'integer'],
        ]);

        // auto-generate slug from name
        $slug = Str::slug($data['name'], '-');

        return [
            'combo' => [
                'name'            => $data['name'],
                'slug'            => $slug,
                'description'     => $data['description'] ?? null,
                'combo_price'     => $data['combo_price'],
                'max_per_day'     => $data['max_per_day'] ?? null,
                'available_from'  => $data['available_from'] ?? null,
                'available_until' => $data['available_until'] ?? null,
                'valid_from'      => $data['valid_from'] ?? null,
                'valid_until'     => $data['valid_until'] ?? null,
                'status'          => $data['status'],
                'sort_order'      => $data['sort_order'] ?? 0,
            ],
            'items' => $data['items'],
        ];
    }

    private function syncItems(Combo $combo, array $items): void
    {
        $combo->items()->delete();

        foreach ($items as $i => $item) {
            ComboItem::create([
                'combo_id'                => $combo->id,
                'product_id'              => $item['product_id'],
                'quantity'                => $item['quantity'],
                'default_size_variant_id' => $item['default_size_variant_id'] ?? null,
                'sort_order'              => $item['sort_order'] ?? $i,
            ]);
        }
    }

    private function present(Combo $combo): array
    {
        return [
            'id'             => $combo->id,
            'name'           => $combo->name,
            'slug'           => $combo->slug,
            'description'    => $combo->description ?? '',
            'image_url'      => $combo->image_url,
            'combo_price'    => (float) $combo->combo_price,
            'original_price' => (float) $combo->original_price,
            'saving_percent' => $combo->savingPercent(),
            'max_per_day'    => $combo->max_per_day,
            'available_from' => $combo->available_from ? substr($combo->available_from, 0, 5) : null,
            'available_until'=> $combo->available_until ? substr($combo->available_until, 0, 5) : null,
            'valid_from'     => $combo->valid_from?->toDateString(),
            'valid_until'    => $combo->valid_until?->toDateString(),
            'status'         => $combo->status,
            'sort_order'     => $combo->sort_order,
            'items'          => $combo->items->map(fn ($ci) => [
                'id'                      => $ci->id,
                'product_id'              => $ci->product_id,
                'product_name'            => $ci->product->name ?? '',
                'product_price'           => (float) ($ci->product->base_price ?? 0),
                'product_image'           => $ci->product->image_url ?? null,
                'quantity'                => $ci->quantity,
                'default_size_variant_id' => $ci->default_size_variant_id,
                'default_size_name'       => $ci->defaultSizeVariant?->name,
                'sort_order'              => $ci->sort_order,
            ])->values(),
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
