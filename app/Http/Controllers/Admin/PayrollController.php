<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DailyEntryShift;
use App\Models\Store;
use App\Models\Worker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PayrollController extends Controller
{
    public function index(Request $request)
    {
        $month = $this->month($request);
        $admin = $request->user();

        return view('admin.payroll', ['payrollData' => [
            'admin'   => ['name' => $admin->name ?? $admin->phone, 'initials' => mb_strtoupper(mb_substr($admin->name ?? 'A', 0, 1))],
            'month'   => $month->format('Y-m'),
            'stores'  => Store::orderBy('id')->get()->map(fn ($s) => [
                'id' => $s->id, 'name' => $s->name, 'wage_probation' => (int) $s->wage_probation, 'wage_official' => (int) $s->wage_official,
                'raise_amount' => (int) $s->raise_amount, 'raise_every_months' => (int) $s->raise_every_months,
            ])->values(),
            'workers' => Worker::orderByDesc('active')->orderBy('name')->get()->map(fn ($w) => $this->presentWorker($w))->values(),
            'rows'    => $this->summary($month),
        ]]);
    }

    public function storeWorker(Request $request): JsonResponse
    {
        $worker = Worker::create($this->validated($request));
        return response()->json(['worker' => $this->presentWorker($worker)]);
    }

    public function updateWorker(Request $request, Worker $worker): JsonResponse
    {
        $worker->update($this->validated($request));
        return response()->json(['worker' => $this->presentWorker($worker)]);
    }

    public function updateRates(Request $request, Store $store): JsonResponse
    {
        $data = $request->validate([
            'wage_probation' => ['required', 'integer', 'min:0', 'max:1000000'],
            'wage_official'  => ['required', 'integer', 'min:0', 'max:1000000'],
            'raise_amount'   => ['required', 'integer', 'min:0', 'max:1000000'],
            'raise_every_months' => ['required', 'integer', 'min:1', 'max:120'],
        ]);
        $store->update($data);
        return response()->json(['ok' => true]);
    }

    public function export(Request $request): StreamedResponse
    {
        $month = $this->month($request);
        $rows = $this->summary($month);
        $file = 'bang-luong-' . $month->format('Y-m') . '.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel shows Vietnamese correctly
            fputcsv($out, ['Nhân viên', 'Loại', 'Số ca', 'Số giờ', 'Tiền giờ', 'Thưởng KPI', 'Phụ cấp', 'Tổng nhận']);
            foreach ($rows as $r) {
                fputcsv($out, [$r['name'], $r['type_label'], $r['shifts'], $r['hours'], $r['base'], $r['kpi'], $r['allowance'], $r['total']]);
            }
            fputcsv($out, []);
            fputcsv($out, ['Chi tiết ca', 'Ngày', 'Cửa hàng', 'Vào', 'Ra', 'Giờ', 'Lương/giờ', 'Thưởng KPI', 'Phụ cấp', 'Ghi chú', 'Thành tiền']);
            foreach ($rows as $r) {
                foreach ($r['details'] as $d) {
                    fputcsv($out, [$r['name'], $d['date'], $d['store'], $d['time_in'], $d['time_out'], $d['hours'], $d['rate'], $d['kpi_bonus'], $d['allowance'], $d['note'], $d['wage_total']]);
                }
            }
            fclose($out);
        }, $file, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function summary(Carbon $month): array
    {
        $shifts = DailyEntryShift::with(['worker', 'entry.store'])->whereNotNull('time_out')
            ->whereHas('entry', fn ($q) => $q->whereDate('entry_date', '>=', $month->copy()->startOfMonth())
                ->whereDate('entry_date', '<=', $month->copy()->endOfMonth()))
            ->get()
            ->sortBy(fn ($s) => $s->entry->entry_date->toDateString() . $s->time_in);

        return $shifts->groupBy('worker_id')->map(function ($list) {
            $w = $list->first()->worker;
            return [
                'worker_id'  => $w->id,
                'name'       => $w->name,
                'type_label' => Worker::TYPES[$w->type],
                'shifts'     => $list->count(),
                'hours'      => round($list->sum('hours'), 2),
                'base'       => (int) $list->sum(fn ($s) => round($s->hours * $s->rate)),
                'kpi'        => (int) $list->sum('kpi_bonus'),
                'allowance'  => (int) $list->sum('allowance'),
                'total'      => (int) $list->sum('wage_total'),
                'details'    => $list->map(fn ($s) => [
                    'date' => $s->entry->entry_date->format('d/m/Y'), 'store' => $s->entry->store?->name,
                    'time_in' => substr($s->time_in, 0, 5), 'time_out' => substr($s->time_out, 0, 5),
                    'hours' => $s->hours, 'rate' => $s->rate, 'kpi_bonus' => $s->kpi_bonus,
                    'allowance' => $s->allowance, 'note' => $s->note, 'wage_total' => $s->wage_total,
                ])->values()->all(),
            ];
        })->sortBy('name')->values()->all();
    }

    private function month(Request $request): Carbon
    {
        try {
            return $request->filled('month') ? Carbon::createFromFormat('Y-m-d', $request->query('month') . '-01')->startOfDay() : now()->startOfMonth();
        } catch (\Throwable) {
            return now()->startOfMonth();
        }
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'store_id'      => ['nullable', 'integer', 'exists:stores,id'],
            'type'          => ['required', Rule::in(array_keys(Worker::TYPES))],
            'official_from' => ['nullable', 'date_format:Y-m-d'],
            'rate_adjust'   => ['nullable', 'integer', 'min:-1000000', 'max:1000000'],
            'active'        => ['boolean'],
        ], ['name.required' => 'Nhập tên nhân viên.']);
    }

    private function presentWorker(Worker $w): array
    {
        return [
            'id' => $w->id, 'name' => $w->name, 'phone' => $w->phone, 'store_id' => $w->store_id,
            'type' => $w->type, 'official_from' => $w->official_from?->toDateString(), 'active' => $w->active,
            'rate_adjust' => $w->rate_adjust,
            'rate_today' => $w->store ? $w->rateOn(now()->startOfDay(), $w->store) : null,
            'official_months' => $w->officialMonthsOn(now()->startOfDay()),
        ];
    }
}
