<?php

namespace App\Support;

use App\Models\AppSetting;
use App\Models\DailyEntry;
use App\Models\Product;
use App\Models\Recipe;
use App\Models\Store;
use App\Models\StoreMonthlyCost;

/**
 * Profit guard for promotions. Two floors per cup:
 *  - "hoà vốn nguyên liệu": price × (1 − brand fee − app commission) covers the cup cost
 *  - "có lãi thật": also covers fixed cost per cup and keeps the minimum margin
 */
class PriceGuard
{
    public const DEFAULTS = [
        'min_margin_pct'       => 15,
        'flash_min_margin_pct' => 5,
        'reward_max_pct'       => 5,   // reward cost as % of the spend that earned its points
        'commission'           => ['tai_cho' => 0, 'mang_ve' => 0, 'web' => 0, 'grab' => 25, 'shopee' => 25, 'xanhsm' => 20],
    ];
    public const PER_POINT = 10000; // 1 điểm per 10.000đ spent

    private array $recipes;
    private ?float $fixedPerCup = null;

    public function __construct()
    {
        $this->recipes = Recipe::with('ingredients.ingredient')->get()->all();
    }

    public static function settings(): array
    {
        $s = AppSetting::get('price_guard', self::DEFAULTS);
        $s['commission'] = array_merge(self::DEFAULTS['commission'], $s['commission'] ?? []);
        return $s;
    }

    public static function royaltyPct(): float
    {
        return (float) (Store::where('status', 'active')->avg('royalty_pct') ?? 3);
    }

    /** Recipe for a menu product: exact name, the cold version, or a recipe containing the name. */
    public function recipeFor(Product $p): ?Recipe
    {
        $base = PosSalesImport::normalize($p->name);
        $contains = null;
        foreach ($this->recipes as $r) {
            $rn = PosSalesImport::normalize($r->name);
            if ($rn === $base || $rn === "$base lanh") return $r;
            if (!$contains && str_contains(" $rn ", " $base ") && !str_ends_with($rn, ' nong')) $contains = $r;
        }
        return $contains;
    }

    /** Cost of one cup (size M or L), same rules as the recipes page. */
    public static function recipeCogs(Recipe $r, string $size): float
    {
        $sk = strtolower($size);
        if ($r->input_mode === 'direct') return (float) $r->{"direct_cogs_$sk"};
        $variable = 0;
        foreach ($r->ingredients as $ri) {
            $qty = $sk === 'l' ? (float) $ri->qty_l : ($ri->qty_m !== null ? (float) $ri->qty_m : (float) $ri->qty_l * 0.75);
            $unit = $ri->ingredient ? (float) $ri->ingredient->use_price : (float) ($ri->custom_unit_price ?? 0);
            $variable += $qty * $unit;
        }
        return $variable * (1 + (float) $r->wastage_pct / 100) + (float) $r->{"packaging_$sk"};
    }

    /** Fixed costs + wages per cup, from the last 30 days of saved entries. */
    public function fixedPerCup(): float
    {
        if ($this->fixedPerCup !== null) return $this->fixedPerCup;
        $entries = DailyEntry::with(['sales', 'shifts'])->where('is_saved', true)
            ->whereDate('entry_date', '>=', ShopTime::today()->subDays(30))->get();
        $days = max(1, $entries->pluck('entry_date')->map->toDateString()->unique()->count());
        $cups = $entries->sum(fn ($e) => $e->sales->sum(fn ($s) => $s->qty_m + $s->qty_l));
        $labor = $entries->sum(fn ($e) => $e->laborCost());
        $ym = ShopTime::today()->format('Y-m');
        $timesheet = StoreMonthlyCost::storesWithShifts($ym);
        $fixedDaily = Store::where('status', 'active')->get()->sum(function ($s) use ($ym, $timesheet) {
            $mc = StoreMonthlyCost::effectiveFor($s->id, $ym);
            return $mc ? (in_array($s->id, $timesheet) ? $mc->totalWithoutSalary() : $mc->total()) / 30 : 0;
        });
        $cupsPerDay = $cups / $days;
        return $this->fixedPerCup = $cupsPerDay > 0 ? ($fixedDaily + $labor / $days) / $cupsPerDay : 0;
    }

    /** Floors and profit for one cup sold at $price. */
    public function evaluate(?float $cogs, float $price, string $channel = 'web', string $kind = 'promo'): array
    {
        $s = self::settings();
        $fees = (self::royaltyPct() + ($s['commission'][$channel] ?? 0)) / 100;
        $minMargin = ($kind === 'flash' ? $s['flash_min_margin_pct'] : $s['min_margin_pct']) / 100;
        $fixed = $this->fixedPerCup();
        if ($cogs === null) return ['known' => false, 'fixed_per_cup' => round($fixed)];

        $keep = 1 - $fees;
        $floorCost = $keep > 0 ? $cogs / $keep : null;
        $floorProfit = ($keep - $minMargin) > 0 ? ($cogs + $fixed) / ($keep - $minMargin) : null;
        $profit = $price * $keep - $cogs - $fixed;

        return [
            'known'        => true,
            'cogs'         => round($cogs),
            'fees'         => round($price * $fees),
            'fees_pct'     => round($fees * 100, 1),
            'fixed_per_cup'=> round($fixed),
            'floor_cost'   => $floorCost ? (int) ceil($floorCost / 100) * 100 : null,
            'floor_profit' => $floorProfit ? (int) ceil($floorProfit / 100) * 100 : null,
            'profit'       => round($profit),
            'margin_pct'   => $price > 0 ? round($profit / $price * 100, 1) : 0,
            'min_margin_pct' => $minMargin * 100,
            // loss: below ingredient breakeven; thin: covers ingredients but not fixed cost + margin
            'status'       => $price < $floorCost ? 'loss' : ($floorProfit !== null && $price < $floorProfit ? 'thin' : 'ok'),
        ];
    }

    public function evaluateProduct(Product $p, string $size, float $price, string $channel = 'web', string $kind = 'promo'): array
    {
        $r = $this->recipeFor($p);
        return $this->evaluate($r ? self::recipeCogs($r, $size) : null, $price, $channel, $kind)
            + ['recipe' => $r?->name, 'list_price' => (int) $p->base_price];
    }

    /** Average cup cost as a share of the list price across the menu (for order-level checks). */
    public function avgCostRatio(): float
    {
        $ratios = [];
        foreach (Product::where('is_available', true)->get() as $p) {
            $r = $this->recipeFor($p);
            if ($r && $p->base_price > 0) $ratios[] = self::recipeCogs($r, 'M') / $p->base_price;
        }
        return $ratios ? array_sum($ratios) / count($ratios) : 0.3;
    }

    /** Smallest qualifying order with an order discount and/or shipping subsidy. */
    public function evaluateOrder(float $subtotal, float $discount, float $shipSubsidy = 0, string $channel = 'web'): array
    {
        $s = self::settings();
        $fees = (self::royaltyPct() + ($s['commission'][$channel] ?? 0)) / 100;
        $paid = max(0, $subtotal - $discount);
        $cupCost = $subtotal * $this->avgCostRatio();
        $cups = max(1, round($subtotal / 35000)); // typical cup price, for the fixed-cost share
        $fixed = $this->fixedPerCup() * $cups;
        $profitCost = $paid * (1 - $fees) - $cupCost - $shipSubsidy;
        $profit = $profitCost - $fixed;
        return [
            'known' => true, 'paid' => round($paid), 'cogs' => round($cupCost), 'fees' => round($paid * $fees),
            'fixed' => round($fixed), 'ship' => round($shipSubsidy), 'profit' => round($profit),
            'margin_pct' => $paid > 0 ? round($profit / $paid * 100, 1) : 0, 'min_margin_pct' => $s['min_margin_pct'],
            'status' => $profitCost < 0 ? 'loss' : ($paid > 0 && $profit / $paid * 100 < $s['min_margin_pct'] ? 'thin' : 'ok'),
        ];
    }

    /** Cost of a reward vs the spend that earned its points. */
    public function evaluateReward(int $points, ?Product $product, ?float $value, string $type, int $qty = 1): array
    {
        $s = self::settings();
        $cost = match (true) {
            $product !== null && ($r = $this->recipeFor($product)) !== null => self::recipeCogs($r, 'M'),
            $type === 'free_item' => ($value ?? 0) * $this->avgCostRatio(),
            default => (float) ($value ?? 0),
        } * max(1, $qty);
        $spend = max(1, $points * self::PER_POINT);
        $pct = $cost / $spend * 100;
        return [
            'known' => true, 'cost' => round($cost), 'spend' => $spend, 'pct' => round($pct, 1), 'max_pct' => $s['reward_max_pct'],
            'status' => $pct > $s['reward_max_pct'] * 2 ? 'loss' : ($pct > $s['reward_max_pct'] ? 'thin' : 'ok'),
        ];
    }
}
