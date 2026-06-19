<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\VariantGroup;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

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

        // --- Menu items ---
        $menu = $products->map(function (Product $p) {
            $catSlug = $p->category?->slug ?? '';
            $grad    = $p->color ?? (self::GRAD_FALLBACKS[$catSlug] ?? self::DEFAULT_GRAD);

            $tags = [];
            if ($p->tags) {
                $tags = is_array($p->tags) ? $p->tags : (json_decode($p->tags, true) ?? []);
            }

            return [
                'id'        => 'p' . $p->id,
                'cat'       => $catSlug,
                'name'      => $p->name,
                'desc'      => $p->description ?? '',
                'price'     => (int) $p->base_price,
                'grad'      => $grad,
                'img'       => $p->image_url ? Storage::url($p->image_url) : null,
                'tags'      => $tags,
                'available' => (bool) $p->is_available,
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
                    'def'       => false, // will be set below for required groups
                ];
            })->values()->toArray();

            // For required groups, mark the first option as default
            if ($group->required && count($options) > 0) {
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

        if ($customer) {
            $addresses = $customer->addresses->map(fn ($a) => [
                'id'    => $a->id,
                'label' => $a->label,
                'text'  => $a->address_text,
                'def'   => (bool) $a->is_default,
            ])->values()->toArray();
        }

        return [
            'cats'          => $cats,
            'menu'          => $menu,
            'variantGroups' => $variantGroupsData,
            'store'         => $storeName,
            'perPoint'      => 10000,
            'promos'        => [
                'LABOONG10' => ['name' => 'Giảm 10% toàn đơn',               'type' => 'percent', 'value' => 10,    'min' => 0,     'max' => 30000],
                'WELCOME20' => ['name' => 'Giảm 20.000đ cho khách mới',      'type' => 'amount',  'value' => 20000, 'min' => 50000],
                'FREESHIP'  => ['name' => 'Miễn phí giao hàng',              'type' => 'amount',  'value' => 15000, 'min' => 0],
            ],
            'addresses'     => $addresses,
            'tagMeta'       => [
                'hot' => ['l' => 'Best',   'ic' => 'flame'],
                'veg' => ['l' => 'Healthy', 'ic' => 'plant'],
                'new' => ['l' => 'Mới',    'ic' => 'sparkle2'],
            ],
        ];
    }
}
