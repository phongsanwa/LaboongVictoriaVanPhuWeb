<?php

namespace App\Http\Controllers;

use App\Models\PosOrder;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\VariantGroup;
use App\Support\ShopTime;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Lên đơn tại quầy (POS web) cho các kênh: tại chỗ, mang về, ShopeeFood, GrabFood, Xanh SM.
 * Giá luôn tính lại ở máy chủ từ giá món + size + topping (không dùng giá gửi lên từ máy).
 */
class PosSellController extends Controller
{
    public function index()
    {
        $staff = Auth::user()->staff()->with(['user', 'store', 'stores'])->first();
        $stores = $staff->stores->isNotEmpty() ? $staff->stores : collect([$staff->store])->filter();
        $menu = app(MenuPageController::class)->buildMenuPageData();

        return view('pos.sell', ['sellData' => [
            'staff'    => ['name' => $staff->user->name, 'store_id' => $staff->store_id],
            'stores'   => $stores->map(fn (Store $s) => [
                'id' => $s->id, 'name' => $s->name, 'address' => $s->address, 'phone' => $s->phone,
            ])->values()->all(),
            'channels' => collect(PosOrder::CHANNELS)->map(fn ($label, $key) => [
                'key' => $key, 'label' => $label, 'app' => in_array($key, PosOrder::APP_CHANNELS, true),
            ])->values()->all(),
            // Giá bán tại quầy = giá gốc của món (không áp khuyến mãi / flash sale của website).
            'cats'          => $menu['cats'],
            'menu'          => collect($menu['menu'])->map(fn ($m) => [
                'id' => $m['id'], 'cat' => $m['cat'], 'name' => $m['name'], 'price' => $m['price'],
                'img' => $m['img'], 'grad' => $m['grad'], 'available' => $m['available'], 'variants' => $m['variants'],
            ])->values()->all(),
            'variantGroups' => $menu['variantGroups'],
            'storeOffs'     => $menu['storeOffs'],
            'today'         => ShopTime::today()->toDateString(),
            'siteUrl'       => \App\Support\Site::base(),
            'urls'          => [
                'orders' => route('pos.sell.orders'),
                'store'  => route('pos.sell.store'),
                'cancel' => route('pos.sell.cancel', ['posOrder' => '__ID__']),
                'home'   => route('pos.points'),
            ],
        ]]);
    }

    /**
     * POST /pos/sell/orders
     * { store_id, channel, external_code?, payment_method, note?, lines: [{ id: "p12", qty, selections?, note? }] }
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'store_id'           => ['required', 'integer'],
            'channel'            => ['required', Rule::in(array_keys(PosOrder::CHANNELS))],
            'external_code'      => ['nullable', 'string', 'max:60'],
            'payment_method'     => ['nullable', Rule::in(['cash', 'bank', 'app'])],
            'note'               => ['nullable', 'string', 'max:500'],
            'lines'              => ['required', 'array', 'min:1', 'max:100'],
            'lines.*.id'         => ['required', 'string'],
            'lines.*.qty'        => ['required', 'integer', 'min:1', 'max:99'],
            'lines.*.selections' => ['nullable', 'array'],
            'lines.*.note'       => ['nullable', 'string', 'max:255'],
        ], [
            'lines.required' => 'Đơn chưa có món nào.',
        ]);

        $storeId = $this->allowedStoreId((int) $data['store_id']);
        $isApp = in_array($data['channel'], PosOrder::APP_CHANNELS, true);
        $code = trim((string) ($data['external_code'] ?? ''));
        if ($isApp && $code === '') {
            return response()->json(['message' => 'Vui lòng nhập mã đơn ' . PosOrder::CHANNELS[$data['channel']] . '.'], 422);
        }

        $items = $this->priceLines($data['lines']);
        if (is_string($items)) {
            return response()->json(['message' => $items], 422);
        }

        $subtotal = array_sum(array_column($items, 'line_total'));
        $date = ShopTime::today()->toDateString();

        // Số thứ tự trong ngày — thử lại nếu hai máy cùng lưu một lúc (trùng số).
        for ($attempt = 0; ; $attempt++) {
            try {
                $order = DB::transaction(function () use ($storeId, $date, $data, $isApp, $code, $items, $subtotal) {
                    $next = (int) PosOrder::where('store_id', $storeId)->whereDate('business_date', $date)->lockForUpdate()->max('queue_no') + 1;
                    $order = PosOrder::create([
                        'store_id'       => $storeId,
                        'business_date'  => $date,
                        'queue_no'       => $next,
                        'channel'        => $data['channel'],
                        'external_code'  => $code !== '' ? $code : null,
                        'status'         => 'done',
                        'subtotal'       => $subtotal,
                        'total'          => $subtotal,
                        'payment_method' => $isApp ? 'app' : (($data['payment_method'] ?? 'cash') === 'bank' ? 'bank' : 'cash'),
                        'note'           => trim((string) ($data['note'] ?? '')) ?: null,
                        'created_by'     => Auth::id(),
                    ]);
                    $order->items()->createMany($items);

                    return $order;
                });
                break;
            } catch (QueryException $e) {
                if ($attempt >= 3) throw $e;
            }
        }

        return response()->json(['message' => "Đã lưu đơn #{$order->queue_no}", 'order' => $this->present($order->fresh(['items', 'store', 'creator']))], 201);
    }

    /** GET /pos/sell/orders?store_id=&date=YYYY-MM-DD — đơn trong ngày + tổng theo kênh. */
    public function orders(Request $request): JsonResponse
    {
        $storeId = $this->allowedStoreId($request->integer('store_id'));
        $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query('date')) ? $request->query('date') : ShopTime::today()->toDateString();

        $orders = PosOrder::with(['items', 'store', 'creator'])
            ->where('store_id', $storeId)->whereDate('business_date', $date)
            ->orderByDesc('queue_no')->get();

        $done = $orders->where('status', 'done');
        $summary = collect(PosOrder::CHANNELS)->map(fn ($label, $key) => [
            'key' => $key, 'label' => $label,
            'count' => $done->where('channel', $key)->count(),
            'total' => (int) $done->where('channel', $key)->sum('total'),
        ])->values()->all();

        return response()->json([
            'date'    => $date,
            'orders'  => $orders->map(fn ($o) => $this->present($o))->values()->all(),
            'summary' => $summary,
            'total'   => (int) $done->sum('total'),
            'count'   => $done->count(),
            'cups'    => (int) $done->sum(fn ($o) => $o->items->sum('quantity')),
        ]);
    }

    /** POST /pos/sell/orders/{posOrder}/cancel { reason } */
    public function cancel(Request $request, PosOrder $posOrder): JsonResponse
    {
        $this->allowedStoreId($posOrder->store_id, strict: true);
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);
        if ($posOrder->status === 'cancelled') {
            return response()->json(['message' => 'Đơn đã huỷ trước đó.'], 422);
        }

        $posOrder->update([
            'status'        => 'cancelled',
            'cancelled_at'  => now(),
            'cancel_reason' => trim((string) ($data['reason'] ?? '')) ?: null,
        ]);

        return response()->json(['message' => "Đã huỷ đơn #{$posOrder->queue_no}", 'order' => $this->present($posOrder->fresh(['items', 'store', 'creator']))]);
    }

    /* ─── Helpers ─── */

    /** Cửa hàng nhân viên được bán; không hợp lệ thì dùng cửa hàng chính (hoặc báo lỗi khi strict). */
    private function allowedStoreId(int $requested, bool $strict = false): int
    {
        $staff = Auth::user()->staff;
        $allowed = $staff->storeIds();
        if (in_array($requested, $allowed, true)) return $requested;
        abort_if($strict, 403, 'Bạn không phụ trách cửa hàng này.');

        return (int) $staff->store_id;
    }

    /**
     * Tính giá từng dòng theo món + lựa chọn (giống cách website lưu đơn).
     * Trả mảng dòng để lưu, hoặc chuỗi lỗi.
     */
    private function priceLines(array $lines): array|string
    {
        $groups = VariantGroup::all()->keyBy('key');
        $productIds = collect($lines)->map(fn ($l) => preg_match('/^p(\d+)$/', $l['id'], $m) ? (int) $m[1] : null)->filter()->unique();
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');
        $variants = ProductVariant::whereIn('product_id', $productIds)->get()->groupBy('product_id');

        $out = [];
        foreach ($lines as $line) {
            $pid = preg_match('/^p(\d+)$/', $line['id'], $m) ? (int) $m[1] : 0;
            $product = $products[$pid] ?? null;
            if (!$product) return 'Có món không còn trong thực đơn, vui lòng chọn lại.';
            if (!$product->is_available) return "\"{$product->name}\" đang tạm hết.";

            $own = $variants[$pid] ?? collect();
            $find = fn (string $type, string $name) => $own->first(fn ($v) => $v->variant_type === $type && $v->name === $name);

            $unit = (int) $product->base_price;
            $sizeName = null;
            $levels = [];
            $toppings = [];
            foreach ((array) ($line['selections'] ?? []) as $key => $value) {
                $group = $groups[$key] ?? null;
                if (!$group) continue;
                if ($group->type === 'size' && is_string($value) && $value !== '') {
                    $v = $find($key, $value);
                    $unit += $v ? (int) $v->extra_price : 0;
                    $sizeName = $value;
                } elseif ($group->type === 'addon' && is_array($value)) {
                    foreach (array_count_values(array_map('strval', $value)) as $name => $count) {
                        $v = $find($key, $name);
                        if (!$v) continue;
                        $unit += (int) $v->extra_price * $count;
                        $toppings[] = ['name' => $name, 'qty' => $count, 'price' => (int) $v->extra_price];
                    }
                } elseif (is_string($value) && $value !== '') {
                    $levels[] = ['label' => $group->label, 'value' => $value];
                }
            }

            $qty = (int) $line['qty'];
            $out[] = [
                'product_id' => $product->id,
                'name'       => $product->name,
                'quantity'   => $qty,
                'unit_price' => $unit,
                'line_total' => $unit * $qty,
                'size_name'  => $sizeName,
                'options'    => ['levels' => $levels, 'toppings' => $toppings],
                'note'       => trim((string) ($line['note'] ?? '')) ?: null,
            ];
        }

        return $out;
    }

    private function present(PosOrder $o): array
    {
        $at = $o->created_at->copy()->setTimezone(ShopTime::TZ);

        return [
            'id'             => $o->id,
            'queue_no'       => $o->queue_no,
            'channel'        => $o->channel,
            'channel_label'  => PosOrder::CHANNELS[$o->channel] ?? $o->channel,
            'external_code'  => $o->external_code,
            'status'         => $o->status,
            'subtotal'       => (int) $o->subtotal,
            'total'          => (int) $o->total,
            'payment_method' => $o->payment_method,
            'note'           => $o->note,
            'time'           => $at->format('H:i'),
            'date'           => $at->format('d/m/Y'),
            'cashier'        => $o->creator?->name,
            'cancel_reason'  => $o->cancel_reason,
            'store'          => $o->store ? ['name' => $o->store->name, 'address' => $o->store->address, 'phone' => $o->store->phone] : null,
            'items'          => $o->items->map(fn ($it) => [
                'name'       => $it->name,
                'qty'        => (int) $it->quantity,
                'unit_price' => (int) $it->unit_price,
                'line_total' => (int) $it->line_total,
                'size'       => $it->size_name,
                'levels'     => $it->options['levels'] ?? [],
                'toppings'   => $it->options['toppings'] ?? [],
                'note'       => $it->note,
            ])->values()->all(),
        ];
    }
}
