<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VariantsController extends Controller
{
    /** Fixed variant groups backed by the DB enum. */
    private const GROUPS = [
        'SIZE' => [
            'key'      => 'SIZE',
            'label'    => 'Size cốc',
            'ic'       => 'cup',
            'type'     => 'size',
            'required' => true,
        ],
        'TOPPING' => [
            'key'      => 'TOPPING',
            'label'    => 'Topping',
            'ic'       => 'plus',
            'type'     => 'addon',
            'required' => false,
        ],
    ];

    /* ─── Pages ─── */

    public function index()
    {
        $admin = Auth::user();

        return view('admin.variants', [
            'variantsData' => [
                'admin'  => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'groups' => $this->buildGroups(),
                'urls'   => [
                    'storeOption'  => route('admin.variants.options.store'),
                    'updateOption' => route('admin.variants.options.update'),
                    'deleteOption' => route('admin.variants.options.destroy'),
                    'toggleOption' => route('admin.variants.options.toggle'),
                    'toggleAll'    => route('admin.variants.options.toggle-all'),
                ],
            ],
        ]);
    }

    /* ─── API: option CRUD ─── */

    /** POST /admin/variants/options */
    public function storeOption(Request $request): JsonResponse
    {
        $data = $request->validate([
            'group_key'   => ['required', 'in:SIZE,TOPPING'],
            'name'        => ['required', 'string', 'max:100'],
            'extra_price' => ['required', 'integer', 'min:0'],
        ], [
            'name.required'      => 'Vui lòng nhập tên lựa chọn',
            'extra_price.min'    => 'Phụ phí không được âm',
        ]);

        $type  = $data['group_key'];
        $name  = $data['name'];
        $extra = $data['extra_price'];

        if (ProductVariant::where('variant_type', $type)->where('name', $name)->exists()) {
            return response()->json([
                'message' => "Đã tồn tại lựa chọn \"{$name}\" trong nhóm này.",
            ], 422);
        }

        $products  = $this->relevantProducts($type);
        $sortOrder = ProductVariant::where('variant_type', $type)->max('sort_order') + 1;

        foreach ($products as $product) {
            ProductVariant::create([
                'product_id'   => $product->id,
                'variant_type' => $type,
                'name'         => $name,
                'extra_price'  => $extra,
                'is_available' => true,
                'sort_order'   => $sortOrder,
            ]);
        }

        return response()->json([
            'option' => $this->presentOption($name, $extra, true),
        ], 201);
    }

    /** PUT /admin/variants/options */
    public function updateOption(Request $request): JsonResponse
    {
        $data = $request->validate([
            'group_key'   => ['required', 'in:SIZE,TOPPING'],
            'old_name'    => ['required', 'string', 'max:100'],
            'name'        => ['required', 'string', 'max:100'],
            'extra_price' => ['required', 'integer', 'min:0'],
        ]);

        $type    = $data['group_key'];
        $oldName = $data['old_name'];
        $newName = $data['name'];
        $extra   = $data['extra_price'];

        if (
            $oldName !== $newName &&
            ProductVariant::where('variant_type', $type)->where('name', $newName)->exists()
        ) {
            return response()->json([
                'message' => "Đã tồn tại lựa chọn \"{$newName}\" trong nhóm này.",
            ], 422);
        }

        ProductVariant::where('variant_type', $type)
            ->where('name', $oldName)
            ->update(['name' => $newName, 'extra_price' => $extra]);

        $allAvail = !ProductVariant::where('variant_type', $type)
            ->where('name', $newName)
            ->where('is_available', false)
            ->exists();

        return response()->json([
            'option' => $this->presentOption($newName, $extra, $allAvail),
        ]);
    }

    /** DELETE /admin/variants/options  (JSON body: group_key, name) */
    public function destroyOption(Request $request): JsonResponse
    {
        $data = $request->validate([
            'group_key' => ['required', 'in:SIZE,TOPPING'],
            'name'      => ['required', 'string', 'max:100'],
        ]);

        ProductVariant::where('variant_type', $data['group_key'])
            ->where('name', $data['name'])
            ->delete();

        return response()->json(['message' => 'Đã xoá']);
    }

    /** POST /admin/variants/options/toggle  (group_key, name) */
    public function toggleOption(Request $request): JsonResponse
    {
        $data = $request->validate([
            'group_key' => ['required', 'in:SIZE,TOPPING'],
            'name'      => ['required', 'string', 'max:100'],
        ]);

        $type = $data['group_key'];
        $name = $data['name'];

        // If ANY record is available → mark all unavailable; if ALL unavailable → mark all available.
        $anyAvail = ProductVariant::where('variant_type', $type)
            ->where('name', $name)
            ->where('is_available', true)
            ->exists();

        ProductVariant::where('variant_type', $type)
            ->where('name', $name)
            ->update(['is_available' => !$anyAvail]);

        return response()->json(['available' => !$anyAvail]);
    }

    /** POST /admin/variants/options/toggle-all  (group_key) */
    public function toggleAllOptions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'group_key' => ['required', 'in:SIZE,TOPPING'],
        ]);

        $type = $data['group_key'];

        // If ALL records in the group are available → make all unavailable; else → all available.
        $allAvail = !ProductVariant::where('variant_type', $type)
            ->where('is_available', false)
            ->exists();

        ProductVariant::where('variant_type', $type)
            ->update(['is_available' => !$allAvail]);

        return response()->json(['available' => !$allAvail]);
    }

    /* ─── Helpers ─── */

    /** Build VARIANT_GROUPS-compatible data from the DB. */
    private function buildGroups(): array
    {
        $all = ProductVariant::orderBy('sort_order')->orderBy('name')->get()->groupBy('variant_type');

        $groups = [];

        foreach (self::GROUPS as $type => $meta) {
            $byName = ($all[$type] ?? collect())->groupBy('name');

            $options = $byName->map(function ($records, $name) {
                $allAvail = $records->every(fn (ProductVariant $v) => $v->is_available);
                $extra    = (int) $records->first()->extra_price;

                return [
                    'id'        => $name,      // name is the stable unique key within a type
                    'label'     => $name,
                    'extra'     => $extra,
                    'available' => $allAvail,
                    'def'       => false,
                ];
            })
            ->sortBy(fn ($o) => $o['extra'])
            ->values()
            ->toArray();

            // First option in a required group is the default (cheapest / base price).
            if ($meta['required'] && !empty($options)) {
                $options[0]['def'] = true;
            }

            $groups[] = array_merge($meta, ['options' => $options]);
        }

        return $groups;
    }

    /**
     * Products that should receive a new variant of the given type.
     * SIZE and TOPPING variants are created for all products.
     */
    private function relevantProducts(string $type): \Illuminate\Database\Eloquent\Collection
    {
        return Product::orderBy('id')->get();
    }

    private function presentOption(string $name, int $extra, bool $available): array
    {
        return [
            'id'        => $name,
            'label'     => $name,
            'extra'     => $extra,
            'available' => $available,
            'def'       => false,
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
