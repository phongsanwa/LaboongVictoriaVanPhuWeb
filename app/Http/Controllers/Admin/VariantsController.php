<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StoreVariantOff;
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
                // Danh sách cửa hàng + option đang HẾT theo từng cửa hàng (để tách tồn riêng).
                'stores' => \App\Models\Store::where('status', 'active')->orderBy('id')
                    ->get(['id', 'name'])->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->all(),
                'storeOffs' => \App\Models\StoreVariantOff::all()
                    ->groupBy('store_id')
                    ->map(fn ($rows) => $rows->map(fn ($r) => "{$r->variant_type}|{$r->name}")->values()->all())
                    ->all(),
                'urls'   => [
                    'storeOption'  => route('admin.variants.options.store'),
                    'updateOption' => route('admin.variants.options.update'),
                    'deleteOption' => route('admin.variants.options.destroy'),
                    'toggleOption' => route('admin.variants.options.toggle'),
                    'toggleAll'    => route('admin.variants.options.toggle-all'),
                    'storeGroup'   => route('admin.variants.groups.store'),
                    'updateGroup'  => route('admin.variants.groups.update', ['group' => '__ID__']),
                    'destroyGroup' => route('admin.variants.groups.destroy', ['group' => '__ID__']),
                    'setDefault'   => route('admin.variants.groups.setDefault', ['group' => '__ID__']),
                    'reorderGroups' => route('admin.variants.groups.reorder'),
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

        $anyAvail = ProductVariant::where('variant_type', $type)
            ->where('name', $newName)
            ->where('is_available', true)
            ->exists();

        return response()->json([
            'option' => $this->presentOption($newName, $extra, $anyAvail),
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
            'store_id'  => ['nullable', 'integer', Rule::exists('stores', 'id')],
        ]);

        $type = $data['group_key'];
        $name = $data['name'];
        $storeId = $data['store_id'] ?? null;

        // Có store_id → bật/tắt tồn RIÊNG cho cửa hàng đó (không đụng các cửa hàng khác).
        if ($storeId) {
            $off = StoreVariantOff::where('store_id', $storeId)
                ->where('variant_type', $type)->where('name', $name)->first();

            if ($off) {
                $off->delete();
                $nowOff = false;
            } else {
                StoreVariantOff::create(['store_id' => $storeId, 'variant_type' => $type, 'name' => $name]);
                $nowOff = true;
            }

            $globalAvail = ProductVariant::where('variant_type', $type)
                ->where('name', $name)->where('is_available', true)->exists();

            return response()->json(['available' => $globalAvail && !$nowOff]);
        }

        // Không có store_id → "Tất cả cửa hàng": bật/tắt toàn hệ thống như cũ.
        $anyAvail = ProductVariant::where('variant_type', $type)
            ->where('name', $name)
            ->where('is_available', true)
            ->exists();

        ProductVariant::where('variant_type', $type)
            ->where('name', $name)
            ->update(['is_available' => !$anyAvail]);

        return response()->json(['available' => !$anyAvail]);
    }

    /** POST /admin/variants/groups/reorder  (ids: [id, id, ...]) */
    public function reorderGroups(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array'],
            'ids.*' => ['required', 'integer', Rule::exists('variant_groups', 'id')],
        ]);

        foreach ($data['ids'] as $order => $id) {
            VariantGroup::where('id', $id)->update(['sort_order' => $order + 1]);
        }

        return response()->json(['message' => 'Đã cập nhật thứ tự']);
    }

    /** POST /admin/variants/groups/{group}/set-default  (option_id or null) */
    public function setDefault(Request $request, VariantGroup $group): JsonResponse
    {
        $data = $request->validate([
            'option_id' => ['nullable', 'string', 'max:100'],
        ]);

        $optionId = $data['option_id'] ?? null;

        if ($optionId !== null) {
            $exists = ProductVariant::where('variant_type', $group->key)
                ->where('name', $optionId)
                ->exists();

            if (!$exists) {
                return response()->json(['message' => 'Lựa chọn không tồn tại'], 422);
            }
        }

        $group->update(['default_option' => $optionId]);

        return response()->json(['default_option' => $optionId]);
    }

    /** POST /admin/variants/options/toggle-all  (group_key) */
    public function toggleAllOptions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'group_key' => ['required', 'string', Rule::exists('variant_groups', 'key')],
            'store_id'  => ['nullable', 'integer', Rule::exists('stores', 'id')],
        ]);

        $type = $data['group_key'];
        $storeId = $data['store_id'] ?? null;

        if ($storeId) {
            $names    = ProductVariant::where('variant_type', $type)->distinct()->pluck('name');
            $offNames = StoreVariantOff::where('store_id', $storeId)->where('variant_type', $type)->pluck('name')->all();
            $availNames = ProductVariant::where('variant_type', $type)->where('is_available', true)->distinct()->pluck('name')->all();
            // Còn ít nhất 1 option đang bán được tại cửa hàng này?
            $anyAvail = collect($availNames)->contains(fn ($n) => !in_array($n, $offNames, true));

            if ($anyAvail) {
                foreach ($names as $n) {
                    StoreVariantOff::firstOrCreate(['store_id' => $storeId, 'variant_type' => $type, 'name' => $n]);
                }
                return response()->json(['available' => false]);
            }

            StoreVariantOff::where('store_id', $storeId)->where('variant_type', $type)->delete();
            return response()->json(['available' => true]);
        }

        // Any-on semantics: if any product sells any option in this group,
        // the toggle turns the whole group off; otherwise it turns it all on.
        $anyAvail = ProductVariant::where('variant_type', $type)
            ->where('is_available', true)
            ->exists();

        ProductVariant::where('variant_type', $type)
            ->update(['is_available' => !$anyAvail]);

        return response()->json(['available' => !$anyAvail]);
    }

    /* ─── Helpers ─── */

    private function buildGroups(): array
    {
        $dbGroups = VariantGroup::orderBy('sort_order')->orderBy('id')->get();
        $all      = ProductVariant::orderBy('sort_order')->orderBy('name')->get()->groupBy('variant_type');

        $groups = [];

        foreach ($dbGroups as $meta) {
            $options = $this->buildOptionsForGroupFromCollection($meta->key, $meta->required, $meta->default_option, $all);
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

        return $this->buildOptionsForGroupFromCollection($key, $group->required, $group->default_option, $all);
    }

    private function buildOptionsForGroupFromCollection(string $key, bool $required, ?string $defaultOption, $all): array
    {
        $byName = ($all[$key] ?? collect())->groupBy('name');

        $options = $byName->map(function ($records, $name) {
            // Globally "on" if at least one product still sells this option;
            // per-product offs (set in the menu editor) must not read as a global off.
            $anyAvail = $records->contains(fn (ProductVariant $v) => $v->is_available);
            $extra    = (int) $records->first()->extra_price;

            return [
                'id'        => $name,
                'label'     => $name,
                'extra'     => $extra,
                'available' => $anyAvail,
                'def'       => false,
            ];
        })
        ->sortBy(fn ($o) => $o['extra'])
        ->values()
        ->toArray();

        if ($defaultOption !== null) {
            foreach ($options as &$opt) {
                $opt['def'] = ($opt['id'] === $defaultOption);
            }
        } elseif ($required && !empty($options)) {
            $options[0]['def'] = true;
        }

        return $options;
    }

    private function presentGroup(VariantGroup $group, array $options): array
    {
        return [
            'id'             => $group->id,
            'key'            => $group->key,
            'label'          => $group->label,
            'ic'             => $group->ic,
            'type'           => $group->type,
            'required'       => $group->required,
            'default_option' => $group->default_option,
            'options'        => $options,
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
