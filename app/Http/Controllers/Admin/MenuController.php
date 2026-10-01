<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\VariantGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MenuController extends Controller
{
    /* ─── Pages ─── */

    public function index()
    {
        $admin = Auth::user();

        return view('admin.menu', [
            'menuData' => [
                'admin'      => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'categories'    => $this->buildCategories(),
                'products'      => $this->buildProducts(),
                'variantGroups' => $this->buildVariantGroups(),
                'urls'       => [
                    'storeProduct'   => route('admin.menu.products.store'),
                    'updateProduct'  => route('admin.menu.products.update', ['product' => '__ID__']),
                    'deleteProduct'  => route('admin.menu.products.destroy', ['product' => '__ID__']),
                    'toggleProduct'  => route('admin.menu.products.toggle', ['product' => '__ID__']),
                    'reorderProducts'=> route('admin.menu.products.reorder'),
                    'updateVariants' => route('admin.menu.products.variants', ['product' => '__ID__']),
                    'storeCategory'  => route('admin.menu.categories.store'),
                    'updateCategory' => route('admin.menu.categories.update', ['category' => '__ID__']),
                    'deleteCategory' => route('admin.menu.categories.destroy', ['category' => '__ID__']),
                ],
            ],
        ]);
    }

    /* ─── API: Product CRUD ─── */

    /** POST /admin/menu/products */
    public function storeProduct(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'category_slug' => ['required', 'string', Rule::exists('categories', 'slug')],
            'description'   => ['nullable', 'string', 'max:500'],
            'base_price'    => ['required', 'integer', 'min:0'],
            'color'         => ['nullable', 'string', 'max:255'],
            'tags'          => ['nullable', 'string'],
            'is_available'  => ['nullable'],
            'is_combo'      => ['nullable'],
            'combo_items'   => ['nullable', 'string'],
            'prep_minutes'  => ['nullable', 'integer', 'min:0', 'max:120'],
            'image'         => ['nullable', 'image', 'max:4096', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $category  = Category::where('slug', $data['category_slug'])->firstOrFail();
        $slug      = $this->uniqueSlug($data['name']);
        $sortOrder = (Product::max('sort_order') ?? 0) + 1;
        $imageUrl  = null;
        $isCombo   = (bool) $request->input('is_combo', false);

        if ($request->hasFile('image')) {
            $path     = Storage::disk('public')->put('products', $request->file('image'));
            $imageUrl = Storage::url($path);
        }

        $product = Product::create([
            'category_id'  => $category->id,
            'is_combo'     => $isCombo,
            'name'         => $data['name'],
            'slug'         => $slug,
            'description'  => $data['description'] ?? null,
            'base_price'   => (int) $data['base_price'],
            'color'        => $data['color'] ?? null,
            'tags'         => $this->parseTags($data['tags'] ?? '[]'),
            'image_url'    => $imageUrl,
            'is_available' => (bool) ($request->input('is_available', '1')),
            'prep_minutes' => $request->filled('prep_minutes') ? (int) $request->input('prep_minutes') : null,
            'sort_order'   => $sortOrder,
        ]);

        // Combo dùng giá cố định, không có size/topping → không sinh variant mặc định.
        if ($isCombo) {
            $this->syncComboItems($product, $data['combo_items'] ?? null);
        } elseif ($data['category_slug'] !== 'topping') {
            $this->createDefaultVariants($product);
        }

        $product->load(['category', 'variants' => fn ($q) => $q->orderBy('sort_order'), 'comboItems.item']);

        return response()->json(['product' => $this->presentProduct($product)], 201);
    }

    /** POST /admin/menu/products/{product} */
    public function updateProduct(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'category_slug' => ['required', 'string', Rule::exists('categories', 'slug')],
            'description'   => ['nullable', 'string', 'max:500'],
            'base_price'    => ['required', 'integer', 'min:0'],
            'color'         => ['nullable', 'string', 'max:255'],
            'tags'          => ['nullable', 'string'],
            'is_available'  => ['nullable'],
            'is_combo'      => ['nullable'],
            'combo_items'   => ['nullable', 'string'],
            'prep_minutes'  => ['nullable', 'integer', 'min:0', 'max:120'],
            'image'         => ['nullable', 'image', 'max:4096', 'mimes:jpg,jpeg,png,webp'],
            'remove_image'  => ['nullable'],
        ]);

        $category = Category::where('slug', $data['category_slug'])->firstOrFail();
        $imageUrl = $product->image_url;
        $isCombo  = (bool) $request->input('is_combo', false);

        if ($request->hasFile('image')) {
            // Delete old image
            if ($product->image_url) {
                $oldPath = str_replace('/storage/', '', $product->image_url);
                Storage::disk('public')->delete($oldPath);
            }
            $path     = Storage::disk('public')->put('products', $request->file('image'));
            $imageUrl = Storage::url($path);
        } elseif ($request->input('remove_image') == '1') {
            if ($product->image_url) {
                $oldPath = str_replace('/storage/', '', $product->image_url);
                Storage::disk('public')->delete($oldPath);
            }
            $imageUrl = null;
        }

        $product->update([
            'category_id'  => $category->id,
            'is_combo'     => $isCombo,
            'name'         => $data['name'],
            'description'  => $data['description'] ?? null,
            'base_price'   => (int) $data['base_price'],
            'color'        => $data['color'] ?? null,
            'tags'         => $this->parseTags($data['tags'] ?? '[]'),
            'image_url'    => $imageUrl,
            'is_available' => (bool) ($request->input('is_available', '1')),
            'prep_minutes' => $request->filled('prep_minutes') ? (int) $request->input('prep_minutes') : null,
        ]);

        if ($isCombo) {
            // Chuyển thành combo → bỏ mọi variant cũ (nếu có) rồi lưu danh sách món con.
            $product->variants()->delete();
            $this->syncComboItems($product, $data['combo_items'] ?? null);
        } else {
            // Không còn là combo → xoá danh sách món con.
            $product->comboItems()->delete();
        }

        $product->load(['category', 'variants' => fn ($q) => $q->orderBy('sort_order'), 'comboItems.item']);

        return response()->json(['product' => $this->presentProduct($product)]);
    }

    /** DELETE /admin/menu/products/{product} */
    public function destroyProduct(Product $product): JsonResponse
    {
        // Món đã nằm trong đơn hàng cũ → không xoá cứng (vướng khoá ngoại
        // order_items, và làm mất lịch sử). Xoá mềm: ẩn khỏi thực đơn nhưng
        // giữ nguyên dữ liệu đơn cũ. Món chưa từng được đặt → xoá hẳn.
        if ($product->orderItems()->exists()) {
            $product->update(['is_available' => false]);
            $product->delete(); // soft delete (giữ ảnh + dữ liệu cho lịch sử)

            return response()->json(['message' => 'Món đã có trong đơn cũ nên được ẩn khỏi thực đơn (giữ lịch sử đơn hàng).']);
        }

        if ($product->image_url) {
            $oldPath = str_replace('/storage/', '', $product->image_url);
            Storage::disk('public')->delete($oldPath);
        }

        $product->forceDelete(); // xoá hẳn: variant/khuyến mãi tự xoá theo (cascade)

        return response()->json(['message' => 'Đã xoá món']);
    }

    /** POST /admin/menu/products/{product}/toggle */
    public function toggleProduct(Product $product): JsonResponse
    {
        $product->update(['is_available' => !$product->is_available]);
        $product->load(['category', 'variants' => fn ($q) => $q->orderBy('sort_order')]);

        return response()->json(['product' => $this->presentProduct($product)]);
    }

    /** POST /admin/menu/products/reorder  (ids: [id, id, ...]) — sắp thứ tự món */
    public function reorderProducts(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array'],
            'ids.*' => ['required', 'integer', Rule::exists('products', 'id')],
        ]);

        foreach ($data['ids'] as $order => $id) {
            Product::where('id', $id)->update(['sort_order' => $order + 1]);
        }

        return response()->json(['message' => 'Đã cập nhật thứ tự món']);
    }

    /** POST /admin/menu/products/{product}/variants */
    public function updateVariants(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'variants'              => ['required', 'array'],
            'variants.*.type'       => ['required', 'string'],
            'variants.*.name'       => ['required', 'string'],
            'variants.*.available'  => ['required', 'boolean'],
        ]);

        foreach ($data['variants'] as $v) {
            ProductVariant::where('product_id', $product->id)
                ->where('variant_type', $v['type'])
                ->where('name', $v['name'])
                ->update(['is_available' => $v['available']]);
        }

        return response()->json(['ok' => true]);
    }

    private function groupVariants(Product $product): array
    {
        if (! $product->relationLoaded('variants')) {
            return [];
        }

        $map = [];
        foreach ($product->variants as $v) {
            $map[$v->variant_type][] = [
                'name'      => $v->name,
                'available' => (bool) $v->is_available,
            ];
        }

        return $map;
    }

    /* ─── API: Category CRUD ─── */

    /** POST /admin/menu/categories */
    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'icon' => ['required', 'string', 'max:50'],
        ]);

        $slug      = $this->uniqueCategorySlug($data['name']);
        $sortOrder = (Category::max('sort_order') ?? 0) + 1;

        $category = Category::create([
            'name'       => $data['name'],
            'slug'       => $slug,
            'icon'       => $data['icon'],
            'is_active'  => true,
            'sort_order' => $sortOrder,
        ]);

        return response()->json(['category' => $this->presentCategory($category)], 201);
    }

    /** POST /admin/menu/categories/{category} */
    public function updateCategory(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'icon' => ['required', 'string', 'max:50'],
        ]);

        $category->update([
            'name' => $data['name'],
            'icon' => $data['icon'],
        ]);

        return response()->json(['category' => $this->presentCategory($category)]);
    }

    /** DELETE /admin/menu/categories/{category} */
    public function destroyCategory(Category $category): JsonResponse
    {
        if ($category->products()->exists()) {
            return response()->json([
                'message' => "Nhóm \"{$category->name}\" đang có sản phẩm. Hãy chuyển hoặc xoá các món trước.",
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Đã xoá nhóm']);
    }

    /* ─── Private helpers ─── */

    private function buildCategories(): array
    {
        return Category::orderBy('sort_order')
            ->get()
            ->map(fn (Category $c) => $this->presentCategory($c))
            ->values()
            ->toArray();
    }

    private function buildProducts(): array
    {
        return Product::with(['category', 'variants' => fn ($q) => $q->orderBy('sort_order'), 'comboItems.item'])
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Product $p) => $this->presentProduct($p))
            ->values()
            ->toArray();
    }

    /** Lưu danh sách món con của combo từ chuỗi JSON [{product_id, quantity}, ...]. */
    private function syncComboItems(Product $combo, ?string $json): void
    {
        $rows = json_decode($json ?? '[]', true);
        if (! is_array($rows)) {
            $rows = [];
        }

        $combo->comboItems()->delete();

        $order = 0;
        foreach ($rows as $row) {
            $pid = (int) ($row['product_id'] ?? 0);
            $qty = max(1, (int) ($row['quantity'] ?? 1));
            // Món con phải tồn tại và không phải chính combo này (tránh vòng lặp).
            if ($pid <= 0 || $pid === $combo->id) {
                continue;
            }
            if (! Product::where('id', $pid)->where('is_combo', false)->exists()) {
                continue;
            }
            $combo->comboItems()->create([
                'item_product_id' => $pid,
                'quantity'        => $qty,
                'sort_order'      => $order++,
            ]);
        }
    }

    private function buildVariantGroups(): array
    {
        return VariantGroup::orderBy('sort_order')
            ->get()
            ->map(fn (VariantGroup $g) => [
                'key'   => $g->key,
                'label' => $g->label,
                'ic'    => $g->ic,
                'type'  => $g->type,
            ])
            ->values()
            ->toArray();
    }

    private function presentProduct(Product $product): array
    {
        $tags = [];
        if ($product->tags) {
            $tags = is_array($product->tags) ? $product->tags : (json_decode($product->tags, true) ?? []);
        }

        $comboItems = [];
        if ($product->is_combo && $product->relationLoaded('comboItems')) {
            foreach ($product->comboItems as $ci) {
                $comboItems[] = [
                    'product_id' => $ci->item_product_id,
                    'name'       => $ci->item?->name ?? 'Món đã xoá',
                    'quantity'   => (int) $ci->quantity,
                ];
            }
        }

        return [
            'id'        => $product->id,
            'cat'       => $product->category->slug,
            'name'      => $product->name,
            'desc'      => $product->description ?? '',
            'price'     => (int) $product->base_price,
            'grad'      => $product->color ?? 'linear-gradient(150deg,#6B4A2B,#9B7150)',
            'img'       => $product->image_url,
            'tags'      => $tags,
            'available' => (bool) $product->is_available,
            'prep_minutes' => $product->prep_minutes,
            'sold'      => 0,
            'is_combo'  => (bool) $product->is_combo,
            'combo_items' => $comboItems,
            'variants'  => $this->groupVariants($product),
        ];
    }

    private function presentCategory(Category $category): array
    {
        return [
            'id'    => $category->id,
            'key'   => $category->slug,
            'label' => $category->name,
            'ic'    => $category->icon ?? 'cup',
        ];
    }

    private function createDefaultVariants(Product $product): void
    {
        // Find first product that has SIZE variants (a drink product)
        $sourceProduct = Product::whereHas('variants', fn ($q) => $q->where('variant_type', 'SIZE'))
            ->where('id', '!=', $product->id)
            ->first();

        if (! $sourceProduct) {
            return;
        }

        // Copy every variant type the source product has, but always start
        // all-on: per-product offs on the source must not leak into new products.
        $variants = ProductVariant::where('product_id', $sourceProduct->id)
            ->orderBy('variant_type')
            ->orderBy('sort_order')
            ->get();

        foreach ($variants as $variant) {
            ProductVariant::create([
                'product_id'   => $product->id,
                'variant_type' => $variant->variant_type,
                'name'         => $variant->name,
                'extra_price'  => $variant->extra_price,
                'is_available' => true,
                'sort_order'   => $variant->sort_order,
            ]);
        }
    }

    private function parseTags(string $json): array
    {
        $decoded = json_decode($json, true);
        if (! is_array($decoded)) {
            return [];
        }

        $allowed = ['hot', 'veg', 'new'];

        return array_values(array_filter($decoded, fn ($t) => in_array($t, $allowed, true)));
    }

    private function uniqueSlug(string $name): string
    {
        $base  = Str::slug($name);
        $slug  = $base;
        $count = 1;

        // Kể cả món đã xoá mềm vẫn giữ slug (unique) → phải tính withTrashed
        // để không trùng khi tạo món mới cùng tên.
        while (Product::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base . '-' . $count;
            $count++;
        }

        return $slug;
    }

    private function uniqueCategorySlug(string $name): string
    {
        $base  = Str::slug($name);
        $slug  = $base;
        $count = 1;

        while (Category::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $count;
            $count++;
        }

        return $slug;
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last  = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
