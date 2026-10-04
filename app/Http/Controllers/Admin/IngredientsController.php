<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class IngredientsController extends Controller
{
    public function index()
    {
        $admin = Auth::user();

        $ingredients = Ingredient::with('overrides')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return view('admin.ingredients', [
            'ingredientsData' => [
                'admin' => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'ingredients' => $ingredients->map(fn ($i) => $this->present($i))->values(),
                'stores'      => Store::where('status', 'active')
                    ->orderBy('id')
                    ->get()
                    ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])
                    ->values(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $ingredient = Ingredient::create($data);

        return response()->json(['ingredient' => $this->present($ingredient->load('overrides'))]);
    }

    public function update(Request $request, Ingredient $ingredient): JsonResponse
    {
        $data = $this->validated($request);

        $ingredient->update($data);

        return response()->json(['ingredient' => $this->present($ingredient->load('overrides'))]);
    }

    public function destroy(Ingredient $ingredient): JsonResponse
    {
        if ($ingredient->recipeIngredients()->exists()) {
            return response()->json(
                ['error' => 'Nguyên liệu đang được dùng trong công thức, không thể xóa.'],
                422
            );
        }

        $ingredient->delete();

        return response()->json(['ok' => true]);
    }

    public function storeOverride(Request $request, Ingredient $ingredient, Store $store): JsonResponse
    {
        $data = $request->validate([
            'use_price' => ['required', 'numeric', 'min:0'],
        ]);

        $override = $ingredient->overrides()->updateOrCreate(
            ['store_id' => $store->id],
            ['use_price' => $data['use_price']]
        );

        return response()->json(['ingredient' => $this->present($ingredient->load('overrides'))]);
    }

    public function destroyOverride(Ingredient $ingredient, Store $store): JsonResponse
    {
        $ingredient->overrides()->where('store_id', $store->id)->delete();

        return response()->json(['ingredient' => $this->present($ingredient->load('overrides'))]);
    }

    // ─── private helpers ──────────────────────────────────────────────────────

    private function validated(Request $request): array
    {
        return $request->validate([
            'name'       => ['required', 'string', 'max:100'],
            'buy_unit'   => ['required', 'string', 'max:20'],
            'buy_price'  => ['required', 'numeric', 'min:0'],
            'conversion' => ['required', 'numeric', 'min:0.001'],
            'use_unit'   => ['required', 'string', 'max:20'],
            'sort_order' => ['nullable', 'integer'],
        ]);
    }

    private function present(Ingredient $ing): array
    {
        return [
            'id'         => $ing->id,
            'name'       => $ing->name,
            'buy_unit'   => $ing->buy_unit,
            'buy_price'  => (float) $ing->buy_price,
            'conversion' => (float) $ing->conversion,
            'use_unit'   => $ing->use_unit,
            'use_price'  => (float) $ing->use_price,
            'sort_order' => $ing->sort_order,
            'overrides'  => $ing->overrides->keyBy('store_id')->map(fn ($o) => [
                'id'        => $o->id,
                'store_id'  => $o->store_id,
                'use_price' => (float) $o->use_price,
            ]),
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
