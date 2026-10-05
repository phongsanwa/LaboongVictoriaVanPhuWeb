<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\Recipe;
use App\Models\RecipeCostHistory;
use App\Models\RecipeIngredient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RecipesController extends Controller
{
    public function index()
    {
        $admin = Auth::user();

        return view('admin.recipes', [
            'recipesData' => [
                'admin' => [
                    'name'     => $admin->name ?? $admin->phone,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'recipes' => Recipe::with(['ingredients.ingredient', 'costHistory'])
                    ->orderBy('sort_order')
                    ->get()
                    ->map(fn ($r) => $this->present($r))
                    ->values(),
                'ingredients' => Ingredient::orderBy('sort_order')
                    ->get()
                    ->map(fn ($i) => [
                        'id'        => $i->id,
                        'name'      => $i->name,
                        'use_unit'  => $i->use_unit,
                        'use_price' => (float) $i->use_price,
                    ])
                    ->values(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $recipe = DB::transaction(function () use ($data) {
            $recipe = Recipe::create($data['recipe']);
            $this->syncIngredients($recipe, $data['ingredients']);
            return $recipe->load('ingredients.ingredient', 'costHistory');
        });

        return response()->json(['recipe' => $this->present($recipe)]);
    }

    public function update(Request $request, Recipe $recipe)
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($recipe, $data) {
            $recipe->update($data['recipe']);
            $this->syncIngredients($recipe, $data['ingredients']);
        });

        return response()->json(['recipe' => $this->present($recipe->load('ingredients.ingredient', 'costHistory'))]);
    }

    public function destroy(Recipe $recipe)
    {
        $recipe->delete();
        return response()->json(['ok' => true]);
    }

    public function saveSnapshot(Request $request, Recipe $recipe)
    {
        $request->validate([
            'cogs_l' => ['required', 'numeric', 'min:0'],
        ]);

        $snapshot = RecipeCostHistory::updateOrCreate(
            ['recipe_id' => $recipe->id, 'recorded_on' => today()->toDateString()],
            ['cogs_l' => $request->input('cogs_l')]
        );

        return response()->json([
            'snapshot' => [
                'id'          => $snapshot->id,
                'cogs_l'      => (float) $snapshot->cogs_l,
                'recorded_on' => $snapshot->recorded_on->toDateString(),
            ],
        ]);
    }

    // ─── private helpers ──────────────────────────────────────────────────────

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name'                              => ['required', 'string', 'max:100'],
            'input_mode'                        => ['required', 'in:detailed,direct'],
            'wastage_pct'                       => ['nullable', 'numeric', 'min:0', 'max:100'],
            'packaging_m'                       => ['nullable', 'numeric', 'min:0'],
            'packaging_l'                       => ['nullable', 'numeric', 'min:0'],
            'price_m'                           => ['nullable', 'numeric', 'min:0'],
            'price_l'                           => ['nullable', 'numeric', 'min:0'],
            'direct_cogs_m'                     => ['nullable', 'numeric', 'min:0'],
            'direct_cogs_l'                     => ['nullable', 'numeric', 'min:0'],
            'sort_order'                        => ['nullable', 'integer'],
            'ingredients'                       => ['nullable', 'array'],
            'ingredients.*.ingredient_id'       => ['nullable', 'integer', 'exists:ingredients,id'],
            'ingredients.*.qty_l'               => ['required_if:input_mode,detailed', 'numeric', 'min:0'],
            'ingredients.*.qty_m'               => ['nullable', 'numeric', 'min:0'],
            'ingredients.*.custom_name'         => ['nullable', 'string'],
            'ingredients.*.custom_unit'         => ['nullable', 'string'],
            'ingredients.*.custom_unit_price'   => ['nullable', 'numeric', 'min:0'],
            'ingredients.*.sort_order'          => ['nullable', 'integer'],
        ]);

        return [
            'recipe' => [
                'name'           => $data['name'],
                'input_mode'     => $data['input_mode'],
                'wastage_pct'    => $data['wastage_pct'] ?? 5.00,
                'packaging_m'    => $data['packaging_m'] ?? 950,
                'packaging_l'    => $data['packaging_l'] ?? 1300,
                'price_m'        => $data['price_m'] ?? 0,
                'price_l'        => $data['price_l'] ?? 0,
                'direct_cogs_m'  => $data['direct_cogs_m'] ?? 0,
                'direct_cogs_l'  => $data['direct_cogs_l'] ?? 0,
                'sort_order'     => $data['sort_order'] ?? 0,
            ],
            'ingredients' => $data['ingredients'] ?? [],
        ];
    }

    private function syncIngredients(Recipe $recipe, array $ingredients): void
    {
        $recipe->ingredients()->delete();

        foreach ($ingredients as $i => $item) {
            RecipeIngredient::create([
                'recipe_id'         => $recipe->id,
                'ingredient_id'     => $item['ingredient_id'] ?? null,
                'qty_l'             => $item['qty_l'] ?? 0,
                'qty_m'             => $item['qty_m'] ?? null,
                'custom_name'       => $item['custom_name'] ?? null,
                'custom_unit'       => $item['custom_unit'] ?? null,
                'custom_unit_price' => $item['custom_unit_price'] ?? null,
                'sort_order'        => $item['sort_order'] ?? $i,
            ]);
        }
    }

    private function present(Recipe $r): array
    {
        return [
            'id'             => $r->id,
            'name'           => $r->name,
            'input_mode'     => $r->input_mode,
            'wastage_pct'    => (float) $r->wastage_pct,
            'packaging_m'    => (float) $r->packaging_m,
            'packaging_l'    => (float) $r->packaging_l,
            'price_m'        => (float) $r->price_m,
            'price_l'        => (float) $r->price_l,
            'direct_cogs_m'  => (float) $r->direct_cogs_m,
            'direct_cogs_l'  => (float) $r->direct_cogs_l,
            'sort_order'     => $r->sort_order,
            'ingredients'    => $r->ingredients->map(fn ($ing) => [
                'id'                => $ing->id,
                'ingredient_id'     => $ing->ingredient_id,
                'qty_l'             => (float) $ing->qty_l,
                'qty_m'             => $ing->qty_m !== null ? (float) $ing->qty_m : null,
                'custom_name'       => $ing->custom_name,
                'custom_unit'       => $ing->custom_unit,
                'custom_unit_price' => $ing->custom_unit_price !== null ? (float) $ing->custom_unit_price : null,
                'sort_order'        => $ing->sort_order,
            ])->values(),
            'cost_history'   => $r->costHistory->map(fn ($h) => [
                'id'          => $h->id,
                'cogs_l'      => (float) $h->cogs_l,
                'recorded_on' => $h->recorded_on->toDateString(),
            ])->values(),
        ];
    }

    private function initials(?string $name): string
    {
        $name ??= "A"; $parts = preg_split("/\\s+/", trim($name));
        $last  = array_pop($parts);
        $first = $parts[0] ?? '';
        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
