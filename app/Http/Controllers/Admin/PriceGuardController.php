<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Order;
use App\Models\Product;
use App\Support\PriceGuard;
use App\Support\ShopTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PriceGuardController extends Controller
{
    public function index(Request $request)
    {
        $g = new PriceGuard();
        $admin = $request->user();
        $products = Product::where('is_available', true)->orderBy('name')->get();

        return view('admin.price-guard', ['guardData' => [
            'admin'    => ['name' => $admin->name ?? $admin->phone, 'email' => $admin->email, 'initials' => mb_strtoupper(mb_substr($admin->name ?? 'A', 0, 1))],
            'settings' => PriceGuard::settings(),
            'royalty'  => PriceGuard::royaltyPct(),
            'fixed_per_cup' => round($g->fixedPerCup()),
            'channels' => ['web' => 'Website', 'tai_cho' => 'Tại quầy', 'mang_ve' => 'Mang về', 'grab' => 'GrabFood', 'shopee' => 'ShopeeFood', 'xanhsm' => 'Xanh SM'],
            'floors'   => $products->map(function ($p) use ($g) {
                $m = $g->evaluateProduct($p, 'M', (float) $p->base_price);
                $l = $g->evaluateProduct($p, 'L', (float) $p->base_price);
                return ['id' => $p->id, 'name' => $p->name, 'price' => (int) $p->base_price, 'recipe' => $m['recipe'] ?? null, 'm' => $m, 'l' => $l];
            })->values(),
            'loss_orders' => $this->lossOrders($g),
        ]]);
    }

    /** Shared check used by the promotion, flash sale, voucher, reward and shipping forms. */
    public function check(Request $request): JsonResponse
    {
        $g = new PriceGuard();
        $type = $request->input('type', 'item');
        $channel = $request->input('channel', 'web');

        if ($type === 'order') {
            return response()->json($g->evaluateOrder((float) $request->input('subtotal', 0), (float) $request->input('discount', 0), (float) $request->input('ship', 0), $channel));
        }
        if ($type === 'reward') {
            $p = $request->filled('product_id') ? Product::find($request->input('product_id')) : null;
            return response()->json($g->evaluateReward((int) $request->input('points', 0), $p, $request->filled('value') ? (float) $request->input('value') : null, (string) $request->input('reward_type', 'discount_voucher'), (int) $request->input('qty', 1)));
        }

        if ($type === 'items') {
            // Price-cut promotions: evaluate every affected product at its discounted price.
            $out = [];
            $products = Product::whereIn('id', collect($request->input('items', []))->pluck('product_id'))->get()->keyBy('id');
            foreach (array_slice($request->input('items', []), 0, 300) as $it) {
                $p = $products[$it['product_id'] ?? 0] ?? null;
                if (!$p) continue;
                $e = $g->evaluateProduct($p, 'M', (float) ($it['price'] ?? $p->base_price), $channel, $request->input('kind', 'promo'));
                if ($e['known']) $out[] = ['name' => $p->name, 'price' => (float) ($it['price'] ?? 0)] + $e;
            }
            $worst = collect($out)->sortBy('margin_pct')->values();
            $status = $worst->contains('status', 'loss') ? 'loss' : ($worst->contains('status', 'thin') ? 'thin' : 'ok');
            return response()->json(['known' => $worst->isNotEmpty(), 'status' => $status, 'checked' => $worst->count(),
                'loss' => $worst->where('status', 'loss')->count(), 'thin' => $worst->where('status', 'thin')->count(), 'worst' => $worst->take(3)]);
        }

        $p = Product::find($request->input('product_id'));
        if (!$p) return response()->json(['known' => false]);
        $size = $request->input('size', 'M') === 'L' ? 'L' : 'M';
        $price = $request->filled('price') ? (float) $request->input('price') : (float) $p->base_price;
        return response()->json($g->evaluateProduct($p, $size, $price, $channel, $request->input('kind', 'promo')));
    }

    public function saveSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'min_margin_pct'       => ['required', 'numeric', 'min:0', 'max:90'],
            'flash_min_margin_pct' => ['required', 'numeric', 'min:0', 'max:90'],
            'reward_max_pct'       => ['required', 'numeric', 'min:0', 'max:100'],
            'commission'           => ['required', 'array'],
            'commission.*'         => ['numeric', 'min:0', 'max:90'],
        ]);
        AppSetting::set('price_guard', $data);
        return response()->json(['settings' => PriceGuard::settings()]);
    }

    /** Website orders (last 30 days) that earned less than the minimum margin after discounts. */
    private function lossOrders(PriceGuard $g): array
    {
        $s = PriceGuard::settings();
        $keep = 1 - PriceGuard::royaltyPct() / 100;
        $fixed = $g->fixedPerCup();
        $rows = [];
        $orders = Order::with(['items.product', 'discounts'])->where('status', '!=', 'CANCELLED')
            ->where('created_at', '>=', ShopTime::now()->subDays(30)->utc())->latest()->limit(500)->get();
        foreach ($orders as $o) {
            $cogs = 0; $cups = 0; $unknown = false;
            foreach ($o->items as $it) {
                $r = $it->product ? $g->recipeFor($it->product) : null;
                if (!$r) { $unknown = true; continue; }
                $size = str_contains(strtolower((string) $it->size_name), 'l') && !str_contains(strtolower((string) $it->size_name), 'm') ? 'L' : 'M';
                $cogs += PriceGuard::recipeCogs($r, $size) * $it->quantity;
                $cups += $it->quantity;
            }
            $paid = (float) $o->total_amount - (float) $o->shipping_fee;
            $beforeFixed = $paid * $keep - $cogs;
            $profit = $beforeFixed - $fixed * $cups;
            $margin = $paid > 0 ? $profit / $paid * 100 : 0;
            if ($beforeFixed >= 0 && $margin >= $s['min_margin_pct']) continue;
            $rows[] = [
                'code' => '#' . $o->id, 'date' => $o->created_at->setTimezone(ShopTime::TZ)->format('d/m H:i'),
                'paid' => round($paid), 'cogs' => round($cogs), 'profit' => round($profit), 'margin_pct' => round($margin, 1),
                'status' => $beforeFixed < 0 ? 'loss' : 'thin', 'unknown_cost' => $unknown,
                'discounts' => $o->discounts->map(fn ($d) => $d->description . ' -' . number_format($d->discount_amount, 0, ',', '.') . 'đ')->values(),
            ];
        }
        return $rows;
    }
}
