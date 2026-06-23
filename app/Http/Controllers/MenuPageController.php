<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\ShippingTier;
use App\Models\Store;
use App\Models\VariantGroup;
use Illuminate\Support\Facades\Auth;

class MenuPageController extends Controller
{
    private const GRAD_FALLBACKS = [
        'milktea' => 'linear-gradient(150deg,#6B4A2B,#9B7150)',
        'fruit'   => 'linear-gradient(150deg,#FF8A3D,#FFB85C)',
        'coffee'  => 'linear-gradient(150deg,#3E2A1A,#6B4A2B)',
        'special' => 'linear-gradient(150deg,#0F623F,#1AA86A)',
        'topping' => 'linear-gradient(150deg,#5C4327,#8A6843)',
    ];

    private const DEFAULT_GRAD = 'linear-gradient(150deg,#0F623F,#1AA86A)';

    public function index()
    {
        return view('menu', ['menuPageData' => $this->buildMenuPageData()]);
    }

    private function buildMenuPageData(): array
    {
        // --- Products (available only, ordered by sort_order) ---
        $products = Product::with('category')
            ->where('is_available', true)
            ->orderBy('sort_order')
            ->get();

        // --- Categories: only those with at least one available product ---
        $activeCatIds = $products->pluck('category_id')->unique()->values();

        $categories = Category::whereIn('id', $activeCatIds)
            ->orderBy('sort_order')
            ->get();

        $cats = $categories->map(fn (Category $c) => [
            'key'   => $c->slug,
            'label' => $c->name,
            'ic'    => $c->icon ?? 'cup',
        ])->values()->toArray();

        // --- Active promotions (keyed for fast lookup) ---
        $activePromos = Promotion::where('is_active', true)
            ->orderBy('sort_order')
            ->with('products:id')
            ->get();

        // Build set of product IDs covered by specific-scope promos
        $specificPromoMap = []; // product_id => Promotion
        foreach ($activePromos as $promo) {
            if ($promo->scope === 'specific') {
                foreach ($promo->products as $prod) {
                    if (!isset($specificPromoMap[$prod->id])) {
                        $specificPromoMap[$prod->id] = $promo;
                    }
                }
            }
        }
        $allScopePromo = $activePromos->firstWhere('scope', 'all');

        // --- Menu items ---
        $menu = $products->map(function (Product $p) use ($allScopePromo, $specificPromoMap) {
            $catSlug = $p->category?->slug ?? '';
            $grad    = $p->color ?? (self::GRAD_FALLBACKS[$catSlug] ?? self::DEFAULT_GRAD);

            $tags = [];
            if ($p->tags) {
                $tags = is_array($p->tags) ? $p->tags : (json_decode($p->tags, true) ?? []);
            }

            $basePrice = (int) $p->base_price;
            $promo     = $specificPromoMap[$p->id] ?? $allScopePromo;
            $salePrice = $promo ? $promo->calcSalePrice($basePrice) : null;

            return [
                'id'         => 'p' . $p->id,
                'cat'        => $catSlug,
                'name'       => $p->name,
                'desc'       => $p->description ?? '',
                'price'      => $basePrice,
                'salePrice'  => $salePrice,
                'promoLabel' => $promo ? $promo->badgeLabel() : null,
                'grad'       => $grad,
                'img'        => $p->image_url ?: null,
                'tags'       => $tags,
                'available'  => (bool) $p->is_available,
            ];
        })->values()->toArray();

        // --- Variant groups ---
        $variantGroups = VariantGroup::orderBy('sort_order')->get();

        $variantRows = ProductVariant::orderBy('sort_order')->get();

        $variantGroupsData = $variantGroups->map(function (VariantGroup $group) use ($variantRows) {
            // Get all variants for this group's type, grouped by name
            $byName = $variantRows
                ->where('variant_type', $group->key)
                ->groupBy('name');

            $options = $byName->map(function ($rows, string $name) use ($group) {
                $first      = $rows->first();
                $allAvail   = $rows->every(fn ($r) => (bool) $r->is_available);
                $extraPrice = (int) ($first->extra_price ?? 0);

                return [
                    'id'        => $name,
                    'label'     => $name,
                    'extra'     => $extraPrice,
                    'available' => $allAvail,
                    'def'       => false,
                ];
            })->values()->toArray();

            if ($group->default_option !== null) {
                foreach ($options as &$opt) {
                    $opt['def'] = ($opt['id'] === $group->default_option);
                }
            } elseif ($group->required && count($options) > 0) {
                $options[0]['def'] = true;
            }

            return [
                'key'      => $group->key,
                'label'    => $group->label,
                'ic'       => $group->ic,
                'type'     => $group->type,
                'required' => (bool) $group->required,
                'options'  => $options,
            ];
        })->values()->toArray();

        // --- Customer, store, addresses ---
        $customer  = null;
        $store     = null;
        $addresses = [];

        if (Auth::check()) {
            $customer = Auth::user()->customer()->with(['store', 'addresses'])->first();
        }

        if ($customer?->store && $customer->store->status === 'active') {
            $store = $customer->store;
        } else {
            $store = Store::where('status', 'active')->first();
        }

        $storeName = $store?->name ?? 'Laboong';

        $stores = Store::where('status', 'active')
            ->orderBy('name')
            ->get()
            ->map(fn ($s) => [
                'id'      => $s->id,
                'name'    => $s->name,
                'address' => $s->address,
                'lat'     => $s->latitude  ? (float) $s->latitude  : null,
                'lng'     => $s->longitude ? (float) $s->longitude : null,
                'phone'   => $s->phone,
                'open'    => $s->opening_time,
                'close'   => $s->closing_time,
            ])
            ->values()
            ->toArray();

        if ($customer) {
            $addresses = $customer->addresses->map(fn ($a) => [
                'id'    => $a->id,
                'label' => $a->label,
                'text'  => $a->address_text,
                'def'   => (bool) $a->is_default,
                'lat'   => $a->latitude  ? (float) $a->latitude  : null,
                'lng'   => $a->longitude ? (float) $a->longitude : null,
            ])->values()->toArray();
        }

        // --- Promo codes for checkout (converted from Promotion model) ---
        $promoCodes = [];
        foreach ($activePromos as $promo) {
            // Only include promotions with scope 'all' for coupon codes
            // (specific-scope promos apply automatically to products)
            if ($promo->scope === 'all') {
                $promoCodes[$promo->name] = [
                    'name'  => $promo->name,
                    'type'  => $promo->type, // 'percent' or 'amount'
                    'value' => (int) $promo->value,
                    'min'   => 0,
                ];
            }
        }

        return [
            'cats'          => $cats,
            'menu'          => $menu,
            'variantGroups' => $variantGroupsData,
            'store'         => $storeName,
            'storeId'       => $store?->id,
            'stores'        => $stores,
            'shippingTiers' => ShippingTier::where('is_active', true)
                ->orderBy('sort_order')->orderBy('min_km')
                ->get()
                ->map(fn ($t) => [
                    'id'     => $t->id,
                    'label'  => $t->label,
                    'min_km' => (float) $t->min_km,
                    'max_km' => $t->max_km !== null ? (float) $t->max_km : null,
                    'fee'    => (int) $t->fee,
                ])
                ->values()
                ->toArray(),
            'perPoint'      => 10000,
            'promos'        => $promoCodes,
            'addresses'     => $addresses,
            'urls'          => [
                'placeOrder' => route('orders.place'),
            ],
            'tagMeta'       => [
                'hot' => ['l' => 'Best',   'ic' => 'flame'],
                'veg' => ['l' => 'Healthy', 'ic' => 'plant'],
                'new' => ['l' => 'Mới',    'ic' => 'sparkle2'],
            ],
        ];
    }
}
