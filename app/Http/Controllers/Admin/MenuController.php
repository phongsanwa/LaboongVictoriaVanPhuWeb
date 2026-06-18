<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
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
                'categories' => $this->buildCategories(),
                'products'   => $this->buildProducts(),
                'urls'       => [
                    'storeProduct'   => route('admin.menu.products.store'),
                    'updateProduct'  => route('admin.menu.products.update', ['product' => '__ID__']),
                    'deleteProduct'  => route('admin.menu.products.destroy', ['product' => '__ID__']),
                    'toggleProduct'  => route('admin.menu.products.toggle', ['product' => '__ID__']),
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
            'image'         => ['nullable', 'image', 'max:4096', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $category  = Category::where('slug', $data['category_slug'])->firstOrFail();
        $slug      = $this->uniqueSlug($data['name']);
        $sortOrder = (Product::max('sort_order') ?? 0) + 1;
        $imageUrl  = null;

        if ($request->hasFile('image')) {
            $path     = Storage::disk('public')->put('products', $request->file('image'));
            $imageUrl = Storage::url($path);
        }

        $product = Product::create([
            'category_id'  => $category->id,
            'name'         => $data['name'],
            'slug'         => $slug,
            'description'  => $data['description'] ?? null,
            'base_price'   => (int) $data['base_price'],
            'color'        => $data['color'] ?? null,
            'tags'         => $this->parseTags($data['tags'] ?? '[]'),
            'image_url'    => $imageUrl,
            'is_available' => (bool) ($request->input('is_available', '1')),
            'sort_order'   => $sortOrder,
        ]);

        if ($data['category_slug'] !== 'topping') {
            $this->createDefaultVariants($product);
        }

        $product->load('category');

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
            'image'         => ['nullable', 'image', 'max:4096', 'mimes:jpg,jpeg,png,webp'],
            'remove_image'  => ['nullable'],
        ]);

        $category = Category::where('slug', $data['category_slug'])->firstOrFail();
        $imageUrl = $product->image_url;

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
            'name'         => $data['name'],
            'description'  => $data['description'] ?? null,
            'base_price'   => (int) $data['base_price'],
            'color'        => $data['color'] ?? null,
            'tags'         => $this->parseTags($data['tags'] ?? '[]'),
            'image_url'    => $imageUrl,
            'is_available' => (bool) ($request->input('is_available', '1')),
        ]);

        $product->load('category');

        return response()->json(['product' => $this->presentProduct($product)]);
    }

    /** DELETE /admin/menu/products/{product} */
    public function destroyProduct(Product $product): JsonResponse
    {
        if ($product->image_url) {
            $oldPath = str_replace('/storage/', '', $product->image_url);
            Storage::disk('public')->delete($oldPath);
        }

        $product->delete();

        return response()->json(['message' => 'Đã xoá món']);
    }

    /** POST /admin/menu/products/{product}/toggle */
    public function toggleProduct(Product $product): JsonResponse
    {
        $product->update(['is_available' => !$product->is_available]);
        $product->load('category');

        return response()->json(['product' => $this->presentProduct($product)]);
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
        return Product::with('category')
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Product $p) => $this->presentProduct($p))
            ->values()
            ->toArray();
    }

    private function presentProduct(Product $product): array
    {
        $tags = [];
        if ($product->tags) {
            $tags = is_array($product->tags) ? $product->tags : (json_decode($product->tags, true) ?? []);
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
            'sold'      => 0,
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

        $variants = ProductVariant::where('product_id', $sourceProduct->id)
            ->whereIn('variant_type', ['SIZE', 'TOPPING'])
            ->orderBy('variant_type')
            ->orderBy('sort_order')
            ->get();

        foreach ($variants as $variant) {
            ProductVariant::create([
                'product_id'   => $product->id,
                'variant_type' => $variant->variant_type,
                'name'         => $variant->name,
                'extra_price'  => $variant->extra_price,
                'is_available' => $variant->is_available,
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

        while (Product::where('slug', $slug)->exists()) {
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
