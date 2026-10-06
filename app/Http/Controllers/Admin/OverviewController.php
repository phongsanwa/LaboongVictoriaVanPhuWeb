<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DailyEntry;
use App\Models\Recipe;
use App\Models\Store;
use App\Models\StoreMonthlyCost;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class OverviewController extends Controller
{
    public function index()
    {
        $admin = Auth::user();

        $stores = Store::where('status', 'active')->get();

        $todayEntries = DailyEntry::with(['sales.recipe', 'expenses', 'channels', 'store'])
            ->whereDate('entry_date', today())
            ->where('is_saved', true)
            ->get()
            ->keyBy('store_id');

        $last7Entries = DailyEntry::with(['sales.recipe', 'expenses', 'channels', 'store'])
            ->whereDate('entry_date', '>=', today()->subDays(6))
            ->whereDate('entry_date', '<=', today())
            ->where('is_saved', true)
            ->get()
            ->groupBy(fn($e) => $e->entry_date->toDateString());

        $recipes = Recipe::all()->keyBy('id');

        // Monthly costs keyed by store_id
        $currentYearMonth = Carbon::now()->format('Y-m');
        $monthlyCosts = $stores->mapWithKeys(fn ($s) => [$s->id => StoreMonthlyCost::effectiveFor($s->id, $currentYearMonth)]);

        // Helper: compute entry metrics
        $computeEntry = function (DailyEntry $entry) use ($recipes) {
            $revenue = 0;
            $cogs = 0;
            $cups = 0;

            foreach ($entry->sales as $sale) {
                $recipe = $sale->recipe ?? $recipes->get($sale->recipe_id);
                if (!$recipe) continue;

                $revenue += $sale->qty_m * $recipe->price_m + $sale->qty_l * $recipe->price_l;
                $cups += $sale->qty_m + $sale->qty_l;

                $cogsL = \App\Models\RecipeCostHistory::where('recipe_id', $recipe->id)
                    ->orderByDesc('recorded_on')
                    ->value('cogs_l') ?? 0;
                $cogsM = $cogsL * 0.75;
                $cogs += $sale->qty_m * $cogsM + $sale->qty_l * $cogsL;
            }

            $revenue = $entry->revenue($revenue);
            $royalty = $entry->royalty($revenue);
            // Brand fee counts with the day's expenses so every net-profit figure includes it.
            $expenses = $entry->expenses->sum('amount') + $royalty;

            return compact('revenue', 'cogs', 'expenses', 'cups');
        };

        // Per-store daily fixed cost
        $getDailyFixed = function (int $storeId) use ($monthlyCosts) {
            $mc = $monthlyCosts->get($storeId);
            return $mc ? $mc->total() / 30 : 0;
        };

        // Build store cards
        $storeCards = [];
        $totalRevenue = 0;
        $totalCogs = 0;
        $totalDailyFixed = 0;
        $totalCups = 0;
        $totalExpenses = 0;

        foreach ($stores as $store) {
            $entry = $todayEntries->get($store->id);
            $todayRevenue = 0;
            $todayCups = 0;

            if ($entry) {
                $metrics = $computeEntry($entry);
                $todayRevenue = $metrics['revenue'];
                $todayCups = $metrics['cups'];
                $totalRevenue += $metrics['revenue'];
                $totalCogs += $metrics['cogs'];
                $totalCups += $metrics['cups'];
                $totalExpenses += $metrics['expenses'];
            }

            $dailyFixed = $getDailyFixed($store->id);
            $totalDailyFixed += $dailyFixed;

            $storeCards[] = [
                'id' => $store->id,
                'name' => $store->name,
                'is_saved_today' => $entry !== null,
                'today_revenue' => $todayRevenue,
                'today_cups' => $todayCups,
            ];
        }

        // KPIs
        $grossProfit = $totalRevenue - $totalCogs;
        $netProfitToday = $grossProfit - $totalDailyFixed - $totalExpenses;
        $grossMarginPct = $totalRevenue > 0 ? ($grossProfit / $totalRevenue * 100) : 0;

        // Average margin per cup from recipes
        $avgMarginPerCup = 0;
        if ($recipes->isNotEmpty()) {
            $margins = [];
            foreach ($recipes as $recipe) {
                $cogsL = \App\Models\RecipeCostHistory::where('recipe_id', $recipe->id)
                    ->orderByDesc('recorded_on')
                    ->value('cogs_l') ?? 0;
                $cogsM = $cogsL * 0.75;
                // The brand fee takes a share of every cup's price.
                $keep = 1 - ($stores->avg('royalty_pct') ?? 3) / 100;
                $margins[] = ($recipe->price_m * $keep - $cogsM + $recipe->price_l * $keep - $cogsL) / 2;
            }
            $avgMarginPerCup = count($margins) > 0 ? array_sum($margins) / count($margins) : 0;
        }
        $breakevenCups = ($avgMarginPerCup > 0) ? ($totalDailyFixed / $avgMarginPerCup) : 0;

        // 7-day chart
        $dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        $chart7d = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = today()->subDays($i)->toDateString();
            $dayRevenue = 0;
            $dayCogs = 0;
            $dayFixed = 0;
            $dayExpenses = 0;

            $dayEntries = $last7Entries->get($date, collect());
            foreach ($dayEntries as $entry) {
                $metrics = $computeEntry($entry);
                $dayRevenue += $metrics['revenue'];
                $dayCogs += $metrics['cogs'];
                $dayExpenses += $metrics['expenses'];
                $dayFixed += $getDailyFixed($entry->store_id);
            }

            $dayProfit = $dayRevenue - $dayCogs - $dayFixed - $dayExpenses;
            $label = $dayLabels[Carbon::parse($date)->dayOfWeek];

            $chart7d[] = [
                'date' => $label,
                'revenue' => round($dayRevenue / 1_000_000, 2),
                'profit' => round($dayProfit / 1_000_000, 2),
            ];
        }

        // Store compare
        $storeCompare = [];
        foreach ($stores as $store) {
            $entry = $todayEntries->get($store->id);
            $rev = 0; $cogs = 0; $exp = 0; $cups = 0;
            if ($entry) {
                $m = $computeEntry($entry);
                $rev = $m['revenue']; $cogs = $m['cogs']; $exp = $m['expenses']; $cups = $m['cups'];
            }
            $dailyFixed = $getDailyFixed($store->id);
            $net = $rev - $cogs - $dailyFixed - $exp;
            $margin = $rev > 0 ? (($rev - $cogs) / $rev * 100) : 0;
            $storeCompare[] = [
                'id' => $store->id,
                'name' => $store->name,
                'revenue_today' => $rev,
                'net_profit_today' => $net,
                'margin_pct' => round($margin, 1),
                'cups_today' => $cups,
            ];
        }

        return view('admin.overview', ['overviewData' => [
            'admin' => [
                'name' => $admin->name ?? $admin->phone,
                'initials' => $this->initials($admin->name),
            ],
            'stores' => $storeCards,
            'today' => today()->toDateString(),
            'kpis' => [
                'revenue_today' => $totalRevenue,
                'net_profit_today' => $netProfitToday,
                'gross_margin_pct' => round($grossMarginPct, 1),
                'cups_today' => $totalCups,
                'breakeven_cups' => round($breakevenCups, 1),
            ],
            'chart7d' => $chart7d,
            'store_compare' => $storeCompare,
        ]]);
    }

    private function initials(?string $name): string
    {
        $parts = array_values(array_filter(preg_split('/\s+/', trim($name))));
        if (count($parts) === 0) return '?';
        if (count($parts) === 1) return mb_strtoupper(mb_substr($parts[0], 0, 2));
        return mb_strtoupper(mb_substr($parts[0], 0, 1) . mb_substr(end($parts), 0, 1));
    }
}
