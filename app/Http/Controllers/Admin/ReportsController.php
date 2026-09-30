<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DailyEntry;
use App\Models\Recipe;
use App\Models\RecipeCostHistory;
use App\Models\Store;
use App\Models\StoreMonthlyCost;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class ReportsController extends Controller
{
    public function index()
    {
        $admin = Auth::user();

        $stores = Store::where('is_active', true)->get();

        $entries = DailyEntry::with(['sales.recipe', 'expenses'])
            ->where('entry_date', '>=', today()->subDays(89))
            ->orderBy('entry_date')
            ->get();

        $recipes = Recipe::all();

        // Latest cogs_l per recipe
        $cogsCache = [];
        foreach ($recipes as $recipe) {
            $cogsCache[$recipe->id] = RecipeCostHistory::where('recipe_id', $recipe->id)
                ->orderByDesc('recorded_on')
                ->value('cogs_l') ?? 0;
        }

        // Monthly costs for last 3 months
        $months = [];
        for ($i = 2; $i >= 0; $i--) {
            $months[] = Carbon::now()->subMonthsNoOverflow($i)->format('Y-m');
        }
        $monthlyCostRows = StoreMonthlyCost::whereIn('year_month', $months)->get();

        $monthlyCosts = [];
        foreach ($monthlyCostRows as $mc) {
            $total = is_array($mc->costs) ? array_sum(array_column($mc->costs, 'amount')) : 0;
            $monthlyCosts[$mc->store_id][$mc->year_month] = $total / 30;
        }

        // Build entries keyed by store_id
        $entriesByStore = [];
        foreach ($entries as $entry) {
            $revenue = 0; $cogs = 0; $cups = 0;
            $salesData = [];

            foreach ($entry->sales as $sale) {
                $recipe = $sale->recipe;
                if (!$recipe) continue;

                $cogsL = $cogsCache[$recipe->id] ?? 0;
                $cogsM = $cogsL * 0.75;

                $revenue += $sale->qty_m * $recipe->price_m + $sale->qty_l * $recipe->price_l;
                $cogs += $sale->qty_m * $cogsM + $sale->qty_l * $cogsL;
                $cups += $sale->qty_m + $sale->qty_l;

                $salesData[] = [
                    'recipe_id' => $recipe->id,
                    'recipe_name' => $recipe->name,
                    'qty_m' => $sale->qty_m,
                    'qty_l' => $sale->qty_l,
                    'price_m' => $recipe->price_m,
                    'price_l' => $recipe->price_l,
                    'cogs_l' => $cogsL,
                ];
            }

            $expensesTotal = $entry->expenses->sum('amount');

            $entriesByStore[$entry->store_id][] = [
                'date' => $entry->entry_date->toDateString(),
                'revenue' => $revenue,
                'cogs' => $cogs,
                'expenses_total' => $expensesTotal,
                'cups' => $cups,
                'sales' => $salesData,
            ];
        }

        return view('admin.reports', ['reportsData' => [
            'admin' => [
                'name' => $admin->name,
                'initials' => $this->initials($admin->name),
            ],
            'stores' => $stores->map(fn($s) => ['id' => $s->id, 'name' => $s->name])->values()->all(),
            'entries' => $entriesByStore,
            'monthly_costs' => $monthlyCosts,
            'recipes' => $recipes->map(fn($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'price_m' => $r->price_m,
                'price_l' => $r->price_l,
            ])->values()->all(),
        ]]);
    }

    private function initials(string $name): string
    {
        $parts = array_values(array_filter(preg_split('/\s+/', trim($name))));
        if (count($parts) === 0) return '?';
        if (count($parts) === 1) return mb_strtoupper(mb_substr($parts[0], 0, 2));
        return mb_strtoupper(mb_substr($parts[0], 0, 1) . mb_substr(end($parts), 0, 1));
    }
}
