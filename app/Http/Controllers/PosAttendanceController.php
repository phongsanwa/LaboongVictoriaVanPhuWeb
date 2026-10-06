<?php

namespace App\Http\Controllers;

use App\Models\DailyEntry;
use App\Models\DailyEntryShift;
use App\Models\Store;
use App\Models\Worker;
use App\Support\ShopTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/** Clock-in / clock-out from the cashier's POS screen; shifts land on the end-of-day entry. */
class PosAttendanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $store = $this->store($request);

        return response()->json(['workers' => $this->list($store)]);
    }

    public function clockIn(Request $request, Worker $worker): JsonResponse
    {
        $store = $this->store($request);
        abort_unless($worker->active, 422, 'Nhân viên đã nghỉ việc.');
        if ($this->openShift($worker)) {
            return response()->json(['message' => "{$worker->name} đang trong ca, hãy bấm Ra ca trước."], 422);
        }

        $now = ShopTime::now();
        DB::transaction(function () use ($store, $worker, $now) {
            $entry = DailyEntry::firstOrCreate(['store_id' => $store->id, 'entry_date' => ShopTime::today()]);
            $entry->shifts()->create([
                'worker_id' => $worker->id,
                'time_in'   => $now->format('H:i'),
                'time_out'  => null,
                'rate'      => $worker->rateOn(ShopTime::today(), $store),
                'note'      => 'Chấm công tại quầy',
            ]);
        });

        return response()->json(['message' => "{$worker->name} vào ca lúc {$now->format('H:i')}", 'workers' => $this->list($store)]);
    }

    public function clockOut(Request $request, Worker $worker): JsonResponse
    {
        $store = $this->store($request);
        $shift = $this->openShift($worker);
        if (!$shift) {
            return response()->json(['message' => "{$worker->name} chưa vào ca."], 422);
        }

        $out = ShopTime::now()->format('H:i');
        $hours = DailyEntryShift::hoursBetween(substr($shift->time_in, 0, 5), $out);
        $shift->update([
            'time_out'   => $out,
            'hours'      => $hours,
            'wage_total' => (int) round($hours * $shift->rate) + $shift->kpi_bonus + $shift->allowance,
        ]);

        return response()->json(['message' => "{$worker->name} ra ca lúc {$out} · {$hours} giờ", 'workers' => $this->list($store)]);
    }

    /** Open shift from today or yesterday (an evening shift may end after midnight). */
    private function openShift(Worker $worker): ?DailyEntryShift
    {
        return DailyEntryShift::where('worker_id', $worker->id)->whereNull('time_out')
            ->whereHas('entry', fn ($q) => $q->whereDate('entry_date', '>=', ShopTime::today()->subDay()))
            ->latest('id')->first();
    }

    private function list(Store $store): array
    {
        $today = ShopTime::today();
        $workers = Worker::where('active', true)->orderBy('name')->get();
        $shifts = DailyEntryShift::with('entry')->whereIn('worker_id', $workers->pluck('id'))
            ->whereHas('entry', fn ($q) => $q->whereDate('entry_date', '>=', $today->copy()->subDay()))
            ->orderBy('id')->get()->groupBy('worker_id');

        return $workers
            ->filter(fn ($w) => $w->store_id === $store->id || $shifts->has($w->id))
            ->map(function ($w) use ($shifts, $today) {
                $mine = $shifts->get($w->id, collect());
                $open = $mine->first(fn ($s) => $s->time_out === null);
                $doneToday = $mine->filter(fn ($s) => $s->time_out !== null && $s->entry->entry_date->isSameDay($today));
                return [
                    'id'         => $w->id,
                    'name'       => $w->name,
                    'on_shift'   => (bool) $open,
                    'since'      => $open ? substr($open->time_in, 0, 5) : null,
                    'today'      => $doneToday->map(fn ($s) => substr($s->time_in, 0, 5) . '–' . substr($s->time_out, 0, 5))->values(),
                    'hours_today'=> round($doneToday->sum('hours'), 2),
                ];
            })->values()->all();
    }

    /** The store the cashier is selling at (must be one they're assigned to). */
    private function store(Request $request): Store
    {
        $staff = Auth::user()->staff;
        $requested = (int) $request->input('store_id', 0);
        $id = $requested && in_array($requested, $staff->storeIds()) ? $requested : $staff->store_id;
        return Store::findOrFail($id);
    }
}
