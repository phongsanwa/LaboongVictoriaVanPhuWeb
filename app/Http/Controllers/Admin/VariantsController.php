<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\VariantGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class VariantsController extends Controller
{
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
                    'storeGroup'   => route('admin.variants.groups.store'),
                    'updateGroup'  => route('admin.variants.groups.update', ['group' => '__ID__']),
                    'destroyGroup' => route('admin.variants.groups.destroy', ['group' => '__ID__']),
                ],
            ],
        ]);
    }

    /* ─── API: group CRUD ─── */

    /** POST /admin/variants/groups */
    public function storeGroup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label'    => ['required', 'string', 'max:100'],
            'ic'       => ['required', 'string', 'max:50'],
            'type'     => ['required', Rule::in(['size', 'addon', 'level'])],
            'required' => ['required', 'boolean'],
        ]);

        $key   = strtoupper(preg_replace('/[^a-zA-Z0-9_]/', '_', $data['label']));
        $base  = $key;
        $count = 0;
        while (VariantGroup::where('key', $key)->exists()) {
            $key = $base . '_' . (++$count);
        }

        $order = VariantGroup::max('sort_order') + 1;

        $group = VariantGroup::create([
            'key'        => $key,
            'label'      => $data['label'],
            'ic'         => $data['ic'],
            'type'       => $data['type'],
            'required'   => $data['required'],
            'sort_order' => $order,
        ]);

        return response()->json(['group' => $this->presentGroup($group, [])], 201);
    }

    /** POST /admin/variants/groups/{group} */
    public function updateGroup(Request $request, VariantGroup $group): JsonResponse
    {
        $data = $request->validate([
            'label'    => ['required', 'string', 'max:100'],
            'ic'       => ['required', 'string', 'max:50'],
            'type'     => ['required', Rule::in(['size', 'addon', 'level'])],
            'required' => ['required', 'boolean'],
        ]);

        $group->update($data);

        $options = $this->buildOptionsForGroup($group->key);

        return response()->json(['group' => $this->presentGroup($group->fresh(), $options)]);
    }

    /** DELETE /admin/variants/groups/{group} */
    public function destroyGroup(VariantGroup $group): JsonResponse
    {
        ProductVariant::where('variant_type', $group->key)->delete();
        $group->delete();

        return response()->json(['message' => 'Đã xoá nhóm']);
    }

    /* ─── API: option CRUD ─── */

    /** POST /admin/variants/options */
    public function storeOption(Request $request): JsonResponse
    {
        $data = $request->validate([
            'group_key'   => ['required', 'string', Rule::exists('variant_groups', 'key')],
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

        $products  = Product::orderBy('id')->get();
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
            'group_key'   => ['required', 'string', Rule::exists('variant_groups', 'key')],
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
            'group_key' => ['required', 'string', Rule::exists('variant_groups', 'key')],
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
            'group_key' => ['required', 'string', Rule::exists('variant_groups', 'key')],
            'name'      => ['required', 'string', 'max:100'],
        ]);

        $type = $data['group_key'];
        $name = $data['name'];

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
            'group_key' => ['required', 'string', Rule::exists('variant_groups', 'key')],
        ]);

        $type = $data['group_key'];

        $allAvail = !ProductVariant::where('variant_type', $type)
            ->where('is_available', false)
            ->exists();

        ProductVariant::where('variant_type', $type)
            ->update(['is_available' => !$allAvail]);

        return response()->json(['available' => !$allAvail]);
    }

    /* ─── Helpers ─── */

    private function buildGroups(): array
    {
        $dbGroups = VariantGroup::orderBy('sort_order')->orderBy('id')->get();
        $all      = ProductVariant::orderBy('sort_order')->orderBy('name')->get()->groupBy('variant_type');

        $groups = [];

        foreach ($dbGroups as $meta) {
            $options = $this->buildOptionsForGroupFromCollection($meta->key, $meta->required, $all);
            $groups[] = $this->presentGroup($meta, $options);
        }

        return $groups;
    }

    private function buildOptionsForGroup(string $key): array
    {
        $group = VariantGroup::where('key', $key)->firstOrFail();
        $all   = ProductVariant::where('variant_type', $key)
            ->orderBy('sort_order')->orderBy('name')
            ->get()->groupBy('variant_type');

        return $this->buildOptionsForGroupFromCollection($key, $group->required, $all);
    }

    private function buildOptionsForGroupFromCollection(string $key, bool $required, $all): array
    {
        $byName = ($all[$key] ?? collect())->groupBy('name');

        $options = $byName->map(function ($records, $name) {
            $allAvail = $records->every(fn (ProductVariant $v) => $v->is_available);
            $extra    = (int) $records->first()->extra_price;

            return [
                'id'        => $name,
                'label'     => $name,
                'extra'     => $extra,
                'available' => $allAvail,
                'def'       => false,
            ];
        })
        ->sortBy(fn ($o) => $o['extra'])
        ->values()
        ->toArray();

        if ($required && !empty($options)) {
            $options[0]['def'] = true;
        }

        return $options;
    }

    private function presentGroup(VariantGroup $group, array $options): array
    {
        return [
            'id'       => $group->id,
            'key'      => $group->key,
            'label'    => $group->label,
            'ic'       => $group->ic,
            'type'     => $group->type,
            'required' => $group->required,
            'options'  => $options,
        ];
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
