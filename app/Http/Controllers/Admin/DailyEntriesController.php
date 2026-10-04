<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DailyEntry;
use App\Models\DailyEntryExpense;
use App\Models\DailyEntrySale;
use App\Models\Recipe;
use App\Models\Store;
use App\Support\PosSalesImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DailyEntriesController extends Controller
{
    public function index()
    {
        $admin = Auth::user();

        return view('admin.daily-entries', [
            'dailyData' => [
                'admin' => [
                    'name'     => $admin->name ?? $admin->phone,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'stores' => Store::where('status', 'active')
                    ->orderBy('id')
                    ->get()
                    ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])
                    ->values(),
                'recipes' => Recipe::orderBy('sort_order')
                    ->get()
                    ->map(fn ($r) => [
                        'id'      => $r->id,
                        'name'    => $r->name,
                        'price_m' => (float) $r->price_m,
                        'price_l' => (float) $r->price_l,
                    ])
                    ->values(),
                'today'   => now()->toDateString(),
                'urls'    => [
                    'save'   => route('admin.daily-entries.save', ['store' => '__STORE__', 'date' => '__DATE__']),
                    'import' => route('admin.daily-entries.import'),
                ],
                'entries' => $this->todayEntries(),
            ],
        ]);
    }

    public function save(Request $request, Store $store)
    {
        $data = $request->validate([
            'date'                    => ['required', 'date'],
            'is_saved'                => ['boolean'],
            'sales'                   => ['nullable', 'array'],
            'sales.*.recipe_id'       => ['required', 'integer', 'exists:recipes,id'],
            'sales.*.qty_m'           => ['required', 'integer', 'min:0'],
            'sales.*.qty_l'           => ['required', 'integer', 'min:0'],
            'expenses'                => ['nullable', 'array'],
            'expenses.*.description'  => ['nullable', 'string'],
            'expenses.*.amount'       => ['required', 'numeric', 'min:0'],
        ]);

        $entry = DB::transaction(function () use ($store, $data) {
            // A Carbon date binds as "Y-m-d 00:00:00", matching what the date cast stores.
            $entry = DailyEntry::updateOrCreate(
                ['store_id' => $store->id, 'entry_date' => Carbon::parse($data['date'])->startOfDay()],
                ['is_saved' => $data['is_saved'] ?? false]
            );

            $entry->sales()->delete();
            foreach ($data['sales'] ?? [] as $sale) {
                DailyEntrySale::create([
                    'daily_entry_id' => $entry->id,
                    'recipe_id'      => $sale['recipe_id'],
                    'qty_m'          => $sale['qty_m'],
                    'qty_l'          => $sale['qty_l'],
                ]);
            }

            $entry->expenses()->delete();
            foreach ($data['expenses'] ?? [] as $expense) {
                DailyEntryExpense::create([
                    'daily_entry_id' => $entry->id,
                    'description'    => $expense['description'] ?? '',
                    'amount'         => $expense['amount'],
                ]);
            }

            return $entry->load('sales', 'expenses');
        });

        return response()->json(['entry' => $this->presentEntry($entry)]);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5120', 'mimes:csv,txt,xlsx'],
        ], [
            'file.mimes' => 'Chỉ hỗ trợ file .csv hoặc .xlsx.',
            'file.max'   => 'File tối đa 5MB.',
        ]);

        $file = $request->file('file');
        $recipes = Recipe::get(['id', 'name'])->map(fn ($r) => ['id' => $r->id, 'name' => $r->name])->all();

        try {
            $result = (new PosSalesImport($recipes))->import($file->getRealPath(), $file->getClientOriginalExtension());
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($result + ['file' => $file->getClientOriginalName()]);
    }

    // ─── private helpers ──────────────────────────────────────────────────────

    private function todayEntries(): array
    {
        return DailyEntry::with(['sales', 'expenses'])
            ->whereIn('store_id', Store::where('status', 'active')->pluck('id'))
            ->where('entry_date', today())
            ->get()
            ->map(fn ($e) => $this->presentEntry($e))
            ->keyBy('store_id')
            ->toArray();
    }

    private function presentEntry(DailyEntry $e): array
    {
        return [
            'id'         => $e->id,
            'store_id'   => $e->store_id,
            'entry_date' => $e->entry_date->toDateString(),
            'is_saved'   => (bool) $e->is_saved,
            'sales'      => $e->sales->map(fn ($s) => [
                'id'        => $s->id,
                'recipe_id' => $s->recipe_id,
                'qty_m'     => (int) $s->qty_m,
                'qty_l'     => (int) $s->qty_l,
            ])->values(),
            'expenses'   => $e->expenses->map(fn ($x) => [
                'id'          => $x->id,
                'description' => $x->description,
                'amount'      => (float) $x->amount,
            ])->values(),
        ];
    }

    private function initials(?string $name): string
    {
        $name ??= "A"; $parts = preg_split("/\\s+/", trim($name));
        $last  = array_pop($parts);
        $first = $parts[0] ?? '';
        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
