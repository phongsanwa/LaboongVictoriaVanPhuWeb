<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FlashSale;
use App\Models\OrderItem;
use App\Models\Product;
use App\Support\ShopTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FlashSalesController extends Controller
{
    public function index(Request $request)
    {
        $admin = $request->user();

        return view('admin.flash-sales', ['flashData' => [
            'admin'    => ['name' => $admin->name ?? $admin->phone, 'email' => $admin->email, 'initials' => mb_strtoupper(mb_substr($admin->name ?? 'A', 0, 1))],
            'sales'    => FlashSale::with('items.product')->orderByDesc('id')->get()->map(fn ($s) => $this->present($s))->values(),
            'products' => Product::where('is_available', true)->orderBy('name')->get(['id', 'name', 'base_price'])
                ->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'price' => (int) $p->base_price])->values(),
            'today'    => ShopTime::today()->toDateString(),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $sale = DB::transaction(fn () => $this->persist(new FlashSale(), $this->validated($request)));
        return response()->json(['sale' => $this->present($sale)]);
    }

    public function update(Request $request, FlashSale $flashSale): JsonResponse
    {
        $sale = DB::transaction(fn () => $this->persist($flashSale, $this->validated($request)));
        return response()->json(['sale' => $this->present($sale)]);
    }

    public function toggle(FlashSale $flashSale): JsonResponse
    {
        $flashSale->update(['is_active' => !$flashSale->is_active]);
        return response()->json(['sale' => $this->present($flashSale->fresh('items.product'))]);
    }

    public function destroy(FlashSale $flashSale): JsonResponse
    {
        $flashSale->delete();
        return response()->json(['ok' => true]);
    }

    private function persist(FlashSale $sale, array $data): FlashSale
    {
        $sale->fill([
            'name' => $data['name'], 'repeat' => $data['repeat'],
            'start_date' => $data['start_date'], 'end_date' => $data['repeat'] === 'weekly' ? ($data['end_date'] ?? null) : null,
            'weekdays' => $data['repeat'] === 'weekly' ? array_values(array_map('intval', $data['weekdays'] ?? [])) : null,
            'start_time' => $data['start_time'], 'end_time' => $data['end_time'],
            'upcoming_hours' => $data['upcoming_hours'] ?? 2, 'is_active' => $data['is_active'] ?? true,
        ])->save();

        $sale->items()->delete();
        foreach ($data['items'] as $i => $it) {
            $sale->items()->create([
                'product_id' => $it['product_id'], 'flash_price' => $it['flash_price'],
                'quota' => $it['quota'] ?? null, 'per_customer' => $it['per_customer'] ?? null, 'sort_order' => $i,
            ]);
        }
        return $sale->load('items.product');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:100'],
            'repeat'         => ['required', Rule::in(['once', 'weekly'])],
            'start_date'     => ['required', 'date_format:Y-m-d'],
            'end_date'       => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'weekdays'       => ['required_if:repeat,weekly', 'array'],
            'weekdays.*'     => ['integer', 'between:1,7'],
            'start_time'     => ['required', 'date_format:H:i'],
            'end_time'       => ['required', 'date_format:H:i', 'different:start_time'],
            'upcoming_hours' => ['nullable', 'integer', 'min:0', 'max:72'],
            'is_active'      => ['boolean'],
            'items'                => ['required', 'array', 'min:1'],
            'items.*.product_id'   => ['required', 'integer', 'exists:products,id', 'distinct'],
            'items.*.flash_price'  => ['required', 'integer', 'min:0'],
            'items.*.quota'        => ['nullable', 'integer', 'min:1'],
            'items.*.per_customer' => ['nullable', 'integer', 'min:1'],
        ], [
            'items.required' => 'Thêm ít nhất 1 món vào đợt flash sale.',
            'weekdays.required_if' => 'Chọn ít nhất 1 ngày trong tuần để lặp lại.',
            'items.*.product_id.distinct' => 'Mỗi món chỉ thêm một lần.',
        ]);

        $prices = \App\Models\Product::whereIn('id', array_column($data['items'], 'product_id'))->pluck('base_price', 'id');
        foreach ($data['items'] as $i => $it) {
            $base = (float) ($prices[$it['product_id']] ?? 0);
            if ($it['flash_price'] >= $base) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    "items.$i.flash_price" => 'Giá flash phải thấp hơn giá gốc ' . number_format($base, 0, ',', '.') . 'đ.',
                ]);
            }
        }

        return $data;
    }

    private function present(FlashSale $s): array
    {
        $session = $s->sessionAt();
        $itemIds = $s->items->pluck('id');
        $sold = OrderItem::whereIn('flash_sale_item_id', $itemIds)->whereHas('order', fn ($q) => $q->where('status', '!=', 'CANCELLED'));
        $isPast = $s->repeat === 'once'
            ? $s->start_date->toDateString() < ShopTime::today()->toDateString() && !$session
            : ($s->end_date && $s->end_date->toDateString() < ShopTime::today()->toDateString());

        return [
            'id' => $s->id, 'name' => $s->name, 'repeat' => $s->repeat,
            'start_date' => $s->start_date->toDateString(), 'end_date' => $s->end_date?->toDateString(),
            'weekdays' => $s->weekdays ?? [], 'start_time' => substr($s->start_time, 0, 5), 'end_time' => substr($s->end_time, 0, 5),
            'upcoming_hours' => $s->upcoming_hours, 'is_active' => $s->is_active,
            'status' => !$s->is_active ? 'off' : ($session['status'] ?? ($isPast ? 'ended' : 'scheduled')),
            'sold_total' => (int) (clone $sold)->sum('quantity'),
            'revenue_total' => (int) $s->items->sum(fn ($it) => OrderItem::where('flash_sale_item_id', $it->id)
                ->whereHas('order', fn ($q) => $q->where('status', '!=', 'CANCELLED'))->sum('quantity') * $it->flash_price),
            'items' => $s->items->map(fn ($it) => [
                'product_id' => $it->product_id, 'name' => $it->product?->name, 'price' => (int) ($it->product?->base_price ?? 0),
                'flash_price' => $it->flash_price, 'quota' => $it->quota, 'per_customer' => $it->per_customer,
                'sold_now' => $session && $session['status'] === 'live' ? $it->soldIn($session['start']) : null,
            ])->values(),
        ];
    }
}
