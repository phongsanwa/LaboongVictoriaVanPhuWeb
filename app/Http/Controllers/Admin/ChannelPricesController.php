<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Category;
use App\Models\PosOrder;
use App\Models\Product;
use App\Support\ChannelPricing;
use App\Support\PriceGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/** Admin → Giá bán app: giá ShopeeFood / GrabFood / Xanh SM dùng khi lên đơn tại quầy. */
class ChannelPricesController extends Controller
{
    public function index()
    {
        $admin = Auth::user();
        $cats = Category::orderBy('sort_order')->orderBy('id')->get(['id', 'name']);
        $products = Product::orderBy('sort_order')->orderBy('id')->get(['id', 'category_id', 'name', 'base_price', 'is_available']);

        return view('admin.channel-prices', ['priceData' => [
            'admin'      => ['name' => $admin->name ?? $admin->phone, 'email' => $admin->email, 'initials' => mb_strtoupper(mb_substr($admin->name ?? 'A', 0, 1))],
            'channels'   => collect(PosOrder::APP_CHANNELS)->map(fn ($c) => ['key' => $c, 'label' => PosOrder::CHANNELS[$c]])->values()->all(),
            'settings'   => ChannelPricing::settings(),
            'commission' => PriceGuard::settings()['commission'] ?? [],
            'cats'       => $cats->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->values()->all(),
            'products'   => $products->map(fn ($p) => [
                'id' => $p->id, 'cat' => $p->category_id, 'name' => $p->name,
                'price' => (int) $p->base_price, 'available' => (bool) $p->is_available,
            ])->values()->all(),
            'urls'       => ['save' => route('admin.channel-prices.save')],
        ]]);
    }

    /** POST { markup: {shopee, grab, xanhsm}, round, overrides: { product_id: { ch: giá|null } } } */
    public function save(Request $request): JsonResponse
    {
        $data = $request->validate([
            'markup'      => ['required', 'array'],
            'markup.*'    => ['nullable', 'numeric', 'min:0', 'max:200'],
            'round'       => ['required', 'integer', Rule::in(ChannelPricing::ROUNDING)],
            'overrides'   => ['nullable', 'array'],
            'overrides.*' => ['array'],
            'overrides.*.*' => ['nullable', 'integer', 'min:1000', 'max:10000000'],
        ], ['overrides.*.*.min' => 'Giá riêng phải từ 1.000đ.']);

        $ids = Product::pluck('id')->map(fn ($id) => (string) $id)->all();
        $overrides = [];
        foreach ($data['overrides'] ?? [] as $pid => $prices) {
            if (!in_array((string) $pid, $ids, true)) continue;
            foreach ($prices as $ch => $price) {
                if (ChannelPricing::isApp((string) $ch) && $price) $overrides[(string) $pid][$ch] = (int) $price;
            }
        }

        AppSetting::set(ChannelPricing::KEY, [
            'markup'    => collect(PosOrder::APP_CHANNELS)->mapWithKeys(fn ($c) => [$c => (float) ($data['markup'][$c] ?? 0)])->all(),
            'round'     => (int) $data['round'],
            'overrides' => $overrides,
        ]);

        return response()->json(['message' => 'Đã lưu giá bán app', 'settings' => ChannelPricing::settings()]);
    }
}
