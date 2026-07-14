<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Reward;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class RewardsController extends Controller
{
    /** Reward categories shown in the admin catalogue; anything else (e.g. tier_benefit) is hidden here. */
    private const CATEGORIES = ['voucher', 'drink', 'gift', 'buyget', 'topping', 'upsize', 'upgrade'];

    private const GRADS = [
        'linear-gradient(135deg,#0F623F,#1AA86A)',
        'linear-gradient(135deg,#FF8A5B,#FF6FA5)',
        'linear-gradient(135deg,#F2598A,#C2477B)',
        'linear-gradient(135deg,#1E8FA8,#4FC3D9)',
        'linear-gradient(135deg,#C99A2E,#E0B84A)',
        'linear-gradient(135deg,#6B4FA0,#9B7FD4)',
        'linear-gradient(135deg,#3E7CB1,#6FB1E0)',
        'linear-gradient(135deg,#D4584B,#F2826F)',
        'linear-gradient(135deg,#A9743F,#C99A6A)',
        'linear-gradient(135deg,#5A8F7B,#7FB8A0)',
        'linear-gradient(135deg,#9B4DA0,#C77FD4)',
        'linear-gradient(135deg,#E08A2B,#F2B14A)',
    ];

    public function index()
    {
        $admin = Auth::user();

        return view('admin.rewards', [
            'rewardsData' => [
                'admin' => [
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'rewards'  => $this->rewardsList(),
                'products' => $this->buildProducts(),
                // Danh sách size để chọn khi quà miễn phí món áp dụng mọi sản phẩm
                'sizes'    => \App\Models\ProductVariant::where('variant_type', 'SIZE')
                    ->distinct()->orderBy('name')->pluck('name')->values()->all(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $reward = Reward::create([
            ...$data,
            'description' => $data['name'],
            'reward_type' => match (true) {
                $data['category'] === 'voucher' => 'discount_voucher',
                $data['category'] === 'gift'    => 'other', // quà vật phẩm (gấu bông, kẹp tóc…) — không gắn sản phẩm menu
                $data['category'] === 'buyget'  => 'other', // mua X tặng Y — giảm giá món rẻ nhất trong giỏ
                default                         => 'free_item',
            },
            'quantity_available' => $data['quantity_total'],
            'valid_from' => Carbon::now()->toDateString(),
        ]);

        return response()->json(['reward' => $this->present($reward)]);
    }

    public function update(Request $request, Reward $reward)
    {
        $data = $this->validated($request);

        $reward->update(array_merge($data, [
            'quantity_available' => max(0, $data['quantity_total'] - $reward->redemptions()->count()),
        ]));

        return response()->json(['reward' => $this->present($reward)]);
    }

    public function toggle(Reward $reward)
    {
        $reward->status = $reward->status === 'active' ? 'inactive' : 'active';
        $reward->save();

        return response()->json(['reward' => $this->present($reward)]);
    }

    public function duplicate(Reward $reward)
    {
        $copy = $reward->replicate();
        $copy->name = $reward->name . ' (bản sao)';
        $copy->status = 'inactive';
        $copy->save();

        return response()->json(['reward' => $this->present($copy)]);
    }

    public function uploadImage(Request $request)
    {
        $request->validate(['image' => ['required', 'image', 'max:2048']]);
        $path = Storage::disk('public')->put('rewards', $request->file('image'));
        return response()->json(['url' => Storage::url($path)]);
    }

    public function destroy(Reward $reward)
    {
        // Delete child vouchers then redemptions before deleting the reward
        foreach ($reward->redemptions as $redemption) {
            $redemption->voucher()->delete();
            $redemption->delete();
        }

        $reward->delete();

        return response()->json(['message' => 'Đã xoá phần thưởng']);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'cat'        => ['required', 'in:' . implode(',', self::CATEGORIES)],
            'points'     => ['required', 'integer', 'min:0'],
            'qty'        => ['required', 'integer', 'min:0'],
            // null/bỏ trống = mỗi khách đổi không giới hạn số lần
            'per_customer_limit' => ['nullable', 'integer', 'min:1'],
            'expiry'     => ['required', 'date'],
            'status'     => ['required', 'in:on,off'],
            'grad'       => ['nullable', 'string', 'max:100'],
            'img'        => ['nullable', 'string', 'max:500'],
            'product_id'          => ['nullable', 'integer', 'exists:products,id'],
            'free_item_quantity'  => ['nullable', 'integer', 'min:1', 'max:99'],
            // Chỉ dùng khi miễn phí món cho MỌI sản phẩm: giới hạn size (null = mọi size)
            'free_item_size'      => ['nullable', 'string', 'max:30'],
            'value'               => ['nullable', 'numeric', 'min:0'],
        ]);

        $isFreeItem = $data['cat'] === 'drink';
        $isGift     = $data['cat'] === 'gift';
        $isBuyGet   = $data['cat'] === 'buyget'; // value = số món phải mua (X), free_item_quantity = số món tặng (Y)
        $isUpgrade  = in_array($data['cat'], ['topping', 'upsize', 'upgrade']);

        return [
            'name'               => $data['name'],
            'category'           => $data['cat'],
            'points_required'    => $data['points'],
            'quantity_total'     => $data['qty'],
            'per_customer_limit' => $data['per_customer_limit'] ?? null,
            'valid_until'        => $data['expiry'],
            'status'             => $data['status'] === 'on' ? 'active' : 'inactive',
            'gradient'           => $data['grad'] ?? null,
            'image_url'          => $data['img'] ?? null,
            // product_id = null với loại "drink" nghĩa là áp dụng MỌI sản phẩm
            'product_id'         => $isFreeItem ? ($data['product_id'] ?? null) : null,
            'free_item_size'     => ($isFreeItem && empty($data['product_id'])) ? ($data['free_item_size'] ?? null) : null,
            'free_item_quantity' => ($isFreeItem || $isGift || $isBuyGet || $isUpgrade) ? (int) ($data['free_item_quantity'] ?? 1) : 1,
            'value'              => $isUpgrade ? (float) ($data['value'] ?? 0)
                                  : ($isBuyGet ? max(1, (float) ($data['value'] ?? 2)) : null),
        ];
    }

    private function buildProducts(): array
    {
        return Product::with('category')
            ->where('is_available', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Product $p) => [
                'id'    => $p->id,
                'name'  => $p->name,
                'price' => (int) $p->base_price,
                'cat'   => $p->category?->name ?? '',
                'img'   => $p->image_url ?: null,
                'grad'  => $p->color ?? 'linear-gradient(150deg,#0F623F,#1AA86A)',
            ])
            ->values()
            ->toArray();
    }

    private function rewardsList()
    {
        return Reward::withCount([
            'redemptions',
            'redemptions as used_count' => fn ($q) => $q->where('status', 'used'),
        ])
            ->whereIn('category', self::CATEGORIES)
            ->orderByDesc('id')
            ->get()
            ->map(fn (Reward $r) => $this->present($r))
            ->values();
    }

    private function present(Reward $reward): array
    {
        $reward->loadCount([
            'redemptions',
            'redemptions as used_count' => fn ($q) => $q->where('status', 'used'),
        ]);

        $redeemed = $reward->redemptions_count;
        $used = $reward->used_count;
        $qty = $reward->quantity_total
            ?? max($redeemed, $reward->quantity_available > 0 ? $reward->quantity_available + $redeemed : 0, 1);

        return [
            'id'         => 'RW' . (4000 + $reward->id),
            'dbId'       => $reward->id,
            'name'       => $reward->name,
            'cat'        => $reward->category,
            'points'     => $reward->points_required,
            'qty'        => $qty,
            'redeemed'   => $redeemed,
            'used'       => $used,
            'expiry'     => $reward->valid_until->toDateString(),
            'status'     => $reward->status === 'active' ? 'on' : 'off',
            'per_customer_limit' => $reward->per_customer_limit,
            'grad'               => $reward->gradient ?? self::GRADS[$reward->id % count(self::GRADS)],
            'img'                => $reward->image_url,
            'product_id'         => $reward->product_id,
            'free_item_quantity' => $reward->free_item_quantity ?? 1,
            'free_item_size'     => $reward->free_item_size,
            'value'              => $reward->value,
        ];
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
