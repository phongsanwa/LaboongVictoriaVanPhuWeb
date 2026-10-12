<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
use Illuminate\Http\JsonResponse;

/** Drink recipes for staff at the counter: quantities and steps only, no costs or prices. */
class PosRecipesController extends Controller
{
    /** Cups, lids, covers, stickers… listed apart from the drink itself. */
    private const PACKAGING = '/^(cốc|ly |nắp|cover|tem|ống hút|túi|màng)/iu';

    public function index(): JsonResponse
    {
        $recipes = Recipe::with('ingredients.ingredient')->orderBy('sort_order')->orderBy('name')->get();

        return response()->json(['recipes' => $recipes->map(function (Recipe $r) {
            $rows = $r->ingredients->map(function ($i) {
                $name = trim((string) ($i->ingredient->name ?? $i->custom_name ?? ''));
                return [
                    'name'      => $name,
                    'unit'      => $i->ingredient->use_unit ?? $i->custom_unit ?? '',
                    'm'         => $i->qty_m,
                    'l'         => $i->qty_l,
                    'packaging' => (bool) preg_match(self::PACKAGING, $name),
                ];
            })->filter(fn ($row) => $row['name'] !== '')->values();

            return [
                'id'           => $r->id,
                'name'         => $r->name,
                'instructions' => $r->instructions,
                'ingredients'  => $rows,
            ];
        })->values()]);
    }
}
