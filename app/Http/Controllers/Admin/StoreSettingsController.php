<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreMonthlyCost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreSettingsController extends Controller
{
    public const SIZES = ['Nhỏ (dưới 30m²)', 'Vừa (30–60m²)', 'Lớn (trên 60m²)'];

    public function index()
    {
        $admin = auth()->user();
        $name = trim($admin->name ?? '') ?: ($admin->phone ?? 'A');

        return view('admin.store-settings', ['settingsData' => $this->payload() + [
            'admin' => ['name' => $name, 'initial' => mb_strtoupper(mb_substr($name, 0, 1))],
            'sizes' => self::SIZES,
            'urls'  => [
                'save'        => route('admin.store-settings.save'),
                'deleteStore' => route('admin.stores.destroy', ['store' => '__ID__']),
            ],
        ]]);
    }

    /**
     * Body: {stores: [{id|null, name, address, size, costs: {"YYYY-MM": {rent, ..., custom_N: {label, amount}}}}]}
     * Only months the user edited are sent; untouched months keep carrying forward.
     */
    public function save(Request $request): JsonResponse
    {
        $data = $request->validate([
            'stores'           => ['required', 'array', 'min:1'],
            'stores.*.id'      => ['nullable', 'integer', 'exists:stores,id'],
            'stores.*.name'    => ['required', 'string', 'max:255'],
            'stores.*.address' => ['nullable', 'string', 'max:1000'],
            'stores.*.size'    => ['nullable', 'string', Rule::in(self::SIZES)],
            'stores.*.costs'   => ['nullable', 'array'],
        ], [
            'stores.*.name.required' => 'Tên quán không được để trống.',
        ]);

        foreach ($data['stores'] as $s) {
            foreach (array_keys($s['costs'] ?? []) as $ym) {
                if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', (string) $ym)) {
                    return response()->json(['message' => "Tháng không hợp lệ: {$ym}"], 422);
                }
            }
        }

        DB::transaction(function () use ($data) {
            foreach ($data['stores'] as $s) {
                $fields = [
                    'name'    => trim($s['name']),
                    'address' => trim($s['address'] ?? ''),
                    'size'    => $s['size'] ?? null,
                ];

                if (!empty($s['id'])) {
                    $store = Store::findOrFail($s['id']);
                    $store->update($fields);
                } else {
                    // Other required columns get defaults; full details live on /admin/stores.
                    $store = Store::create($fields + [
                        'city'           => '',
                        'phone'          => '',
                        'opening_time'   => '07:00:00',
                        'closing_time'   => '22:00:00',
                        'operating_days' => [0, 1, 2, 3, 4, 5, 6],
                        'status'         => 'active',
                    ]);
                }

                foreach ($s['costs'] ?? [] as $ym => $costs) {
                    StoreMonthlyCost::updateOrCreate(
                        ['store_id' => $store->id, 'year_month' => $ym],
                        ['costs' => StoreMonthlyCost::normalize(is_array($costs) ? $costs : [])]
                    );
                }
            }
        });

        return response()->json(['message' => 'Đã lưu cài đặt cửa hàng.'] + $this->payload());
    }

    private function payload(): array
    {
        $stores = Store::with('monthlyCosts')->orderBy('id')->get();

        $months = $stores->flatMap(fn ($s) => $s->monthlyCosts->pluck('year_month'))
            ->push(now()->format('Y-m'))
            ->unique()->sort()->values()->all();

        return [
            'currentMonth' => now()->format('Y-m'),
            'months'       => $months,
            'stores'       => $stores->map(fn (Store $s) => [
                'id'           => $s->id,
                'name'         => $s->name,
                'address'      => $s->address,
                'size'         => $s->size,
                'costsByMonth' => $s->monthlyCosts
                    ->mapWithKeys(fn ($mc) => [$mc->year_month => (object) StoreMonthlyCost::normalize($mc->costs)])
                    ->all(),
            ])->values()->all(),
        ];
    }
}
