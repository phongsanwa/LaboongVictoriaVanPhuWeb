<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DailyEntry;
use App\Models\DailyEntryExpense;
use App\Models\DailyEntrySale;
use App\Models\Recipe;
use App\Models\Store;
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
                    'name'     => $admin->name,
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
            $entry = DailyEntry::updateOrCreate(
                ['store_id' => $store->id, 'entry_date' => $data['date']],
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
