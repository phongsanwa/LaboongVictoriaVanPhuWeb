<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DailyEntry;
use App\Models\DailyEntryExpense;
use App\Models\DailyEntrySale;
use App\Models\Recipe;
use App\Models\Store;
use App\Models\DailyEntryChannel;
use App\Models\DailyEntryShift;
use App\Models\Worker;
use App\Models\Order;
use App\Support\PosGeneralReportImport;
use App\Support\PosSalesImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DailyEntriesController extends Controller
{
    public const SHIFT_PRESETS = [
        ['label' => 'Ca sáng', 'in' => '08:00', 'out' => '12:00'],
        ['label' => 'Ca chiều', 'in' => '12:00', 'out' => '18:00'],
        ['label' => 'Ca tối', 'in' => '18:00', 'out' => '23:00'],
    ];

    public function index(Request $request)
    {
        // ?date=YYYY-MM-DD to enter or correct a past day; never a future one.
        $date = Carbon::today();
        if ($request->filled('date')) {
            try { $date = Carbon::createFromFormat('Y-m-d', $request->query('date'))->startOfDay(); } catch (\Throwable) {}
            if ($date->isFuture()) $date = Carbon::today();
        }

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
                    ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'royalty_pct' => (float) $s->royalty_pct, 'wage_probation' => (int) $s->wage_probation, 'wage_official' => (int) $s->wage_official])
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
                'date'    => $date->toDateString(),
                'channels' => DailyEntryChannel::CHANNELS,
                'shift_presets' => self::SHIFT_PRESETS,
                'workers' => (function () use ($date) {
                    $stores = Store::where('status', 'active')->get();
                    return Worker::where('active', true)->orderBy('name')->get()->map(fn ($w) => [
                        'id' => $w->id, 'name' => $w->name, 'store_id' => $w->store_id, 'official' => $w->isOfficialOn($date),
                        // Rate that day at each store (seniority raises included).
                        'rates' => $stores->mapWithKeys(fn ($s) => [$s->id => $w->rateOn($date, $s)]),
                    ])->values();
                })(),
                // Completed website orders that day, to prefill the "Website" channel.
                'web_orders' => Order::where('status', 'COMPLETED')
                    ->whereDate('created_at', $date)
                    ->selectRaw('store_id, SUM(total_amount) as total, COUNT(*) as cnt')
                    ->groupBy('store_id')->get()
                    ->mapWithKeys(fn ($o) => [$o->store_id => ['total' => (float) $o->total, 'orders' => (int) $o->cnt]]),
                'urls'    => [
                    'save'   => route('admin.daily-entries.save', ['store' => '__STORE__', 'date' => '__DATE__']),
                    'import' => route('admin.daily-entries.import'),
                ],
                'entries' => $this->entriesFor($date),
            ],
        ]);
    }

    public function save(Request $request, Store $store)
    {
        $data = $request->validate([
            'date'                    => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'is_saved'                => ['boolean'],
            'sales'                   => ['nullable', 'array'],
            'sales.*.recipe_id'       => ['required', 'integer', 'exists:recipes,id'],
            'sales.*.qty_m'           => ['required', 'integer', 'min:0'],
            'sales.*.qty_l'           => ['required', 'integer', 'min:0'],
            'expenses'                => ['nullable', 'array'],
            'expenses.*.description'  => ['nullable', 'string'],
            'expenses.*.amount'       => ['required', 'numeric', 'min:0'],
            'shifts'                  => ['nullable', 'array'],
            'shifts.*.worker_id'      => ['required', 'integer', 'exists:workers,id'],
            'shifts.*.time_in'        => ['required', 'date_format:H:i'],
            'shifts.*.time_out'       => ['required', 'date_format:H:i'],
            'shifts.*.kpi_bonus'      => ['nullable', 'integer', 'min:0'],
            'shifts.*.allowance'      => ['nullable', 'integer', 'min:0'],
            'shifts.*.note'           => ['nullable', 'string', 'max:255'],
            'channels'                => ['nullable', 'array'],
            'channels.*.channel'      => ['required', 'string', 'in:' . implode(',', array_keys(DailyEntryChannel::CHANNELS))],
            'channels.*.net_revenue'  => ['required', 'numeric'],
            'channels.*.orders'       => ['nullable', 'integer', 'min:0'],
            'gross_revenue'           => ['nullable', 'numeric', 'min:0'],
            'discount_total'          => ['nullable', 'numeric', 'min:0'],
            'commission_total'        => ['nullable', 'numeric', 'min:0'],
        ]);

        $entry = DB::transaction(function () use ($store, $data) {
            // A Carbon date binds as "Y-m-d 00:00:00", matching what the date cast stores.
            $entry = DailyEntry::updateOrCreate(
                ['store_id' => $store->id, 'entry_date' => Carbon::parse($data['date'])->startOfDay()],
                [
                    'is_saved'         => $data['is_saved'] ?? false,
                    'gross_revenue'    => $data['gross_revenue'] ?? 0,
                    'discount_total'   => $data['discount_total'] ?? 0,
                    'commission_total' => $data['commission_total'] ?? 0,
                ]
            );

            $entry->shifts()->delete();
            $day = Carbon::parse($data['date']);
            foreach ($data['shifts'] ?? [] as $sh) {
                $worker = Worker::findOrFail($sh['worker_id']);
                $hours = DailyEntryShift::hoursBetween($sh['time_in'], $sh['time_out']);
                $rate = $worker->rateOn($day, $store);
                $kpi = (int) ($sh['kpi_bonus'] ?? 0);
                $allowance = (int) ($sh['allowance'] ?? 0);
                $entry->shifts()->create([
                    'worker_id' => $worker->id, 'time_in' => $sh['time_in'], 'time_out' => $sh['time_out'],
                    'hours' => $hours, 'rate' => $rate, 'kpi_bonus' => $kpi, 'allowance' => $allowance,
                    'note' => $sh['note'] ?? null, 'wage_total' => (int) round($hours * $rate) + $kpi + $allowance,
                ]);
            }

            $entry->channels()->delete();
            foreach ($data['channels'] ?? [] as $ch) {
                if ((float) $ch['net_revenue'] == 0 && empty($ch['orders'])) continue;
                $entry->channels()->create([
                    'channel'     => $ch['channel'],
                    'net_revenue' => $ch['net_revenue'],
                    'orders'      => $ch['orders'] ?? null,
                ]);
            }

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

            return $entry->load('sales', 'expenses', 'channels', 'shifts');
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
        $recipes = Recipe::get(['id', 'name', 'price_m', 'price_l'])
            ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'price_m' => (float) $r->price_m, 'price_l' => (float) $r->price_l])->all();

        try {
            $reader = new PosSalesImport($recipes);
            $ext = strtolower($file->getClientOriginalExtension());
            $rows = $ext === 'xlsx' ? $reader->readXlsx($file->getRealPath()) : $reader->readCsv($file->getRealPath());
            $result = PosGeneralReportImport::looksLikeGeneralReport($rows)
                ? (new PosGeneralReportImport($recipes))->import($rows)
                : ['type' => 'items'] + $reader->import($file->getRealPath(), $ext);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($result + ['file' => $file->getClientOriginalName()]);
    }

    // ─── private helpers ──────────────────────────────────────────────────────

    private function entriesFor(Carbon $date): array
    {
        return DailyEntry::with(['sales', 'expenses', 'channels', 'shifts'])
            ->whereIn('store_id', Store::where('status', 'active')->pluck('id'))
            ->whereDate('entry_date', $date)
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
            'gross_revenue'    => (float) $e->gross_revenue,
            'discount_total'   => (float) $e->discount_total,
            'commission_total' => (float) $e->commission_total,
            'shifts'     => $e->shifts->map(fn ($x) => [
                'worker_id' => $x->worker_id, 'time_in' => substr($x->time_in, 0, 5), 'time_out' => substr($x->time_out, 0, 5),
                'hours' => $x->hours, 'rate' => $x->rate, 'kpi_bonus' => $x->kpi_bonus, 'allowance' => $x->allowance,
                'note' => $x->note, 'wage_total' => $x->wage_total,
            ])->values(),
            'channels'   => $e->channels->map(fn ($c) => ['channel' => $c->channel, 'net_revenue' => (float) $c->net_revenue, 'orders' => $c->orders])->values(),
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
