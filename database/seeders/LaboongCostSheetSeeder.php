<?php

namespace Database\Seeders;

use App\Models\Recipe;
use App\Models\RecipeCostHistory;
use Illuminate\Database\Seeder;

/**
 * "Bảng tỉ lệ cost đồ uống Laboong" (10/2026): selling prices and official cost per cup.
 * Run after LaboongRecipesSeeder:
 *   php artisan db:seed --class=LaboongCostSheetSeeder --force
 *
 * Listed drinks switch to "Nhập giá vốn trực tiếp" with the sheet's cost, and get a cost
 * snapshot dated 2026-10-01 so overview/reports use it. Hot drinks aren't on the sheet:
 * they take the cold size-M price and keep their ingredient-based cost.
 */
class LaboongCostSheetSeeder extends Seeder
{
    /** recipe => [cost M, price M, cost L, price L] (L null = single size) */
    private const SHEET = [
        'Ô Long Sữa Lạnh'                  => [8181, 29000, 10191, 36000],
        'Ô Long Nhài Sữa Lạnh'             => [8920, 35000, 11137, 42000],
        'Gạo Khói Lạnh'                    => [8748, 35000, 11147, 42000],
        'Ô Long Sữa Hoa Dành Dành Lạnh'    => [8804, 35000, 11222, 42000],
        'Ô Long Hoa Sen Lạnh'              => [8003, 35000, 12269, 42000],
        'Ô Long Sữa Quế Hoa Lạnh'          => [10558, 35000, 13465, 42000],
        'Ô Long Sữa Dừa Lạnh'              => [10265, 35000, null, null],
        'Ô Long Nếp Lạnh'                  => [11483, 35000, null, null],
        'Hồng Trà Sữa Lạnh'                => [6604, 28000, 8166, 35000],
        'Hồng Trà Bánh Bò Đường Đen Lạnh'  => [10348, 38000, 11910, 45000],
        // Sheet calls these "sủi bọt"; the recipe book calls them "lắc".
        'Ô Long Lắc Lạnh'                  => [3807, 20000, 4936, 25000],
        'Ô Long Nhài Lắc Lạnh'             => [5336, 20000, 6548, 25000],
        'Ô Long Hoa Dành Dành Lắc Lạnh'    => [5796, 20000, 10000, 25000],
        'Dành Dành Thanh Mai Lạnh'         => [13016, 35000, 15594, 42000],
        'Ô Long Nho Xanh Lạnh'             => [12535, 38000, 17146, 42000],
        'Ô Long Dành Dành Chanh Hoa Lạnh'  => [8613, 29000, 10692, 42000],
        'Ô Long Chanh Quế Hoa Lạnh'        => [8304, 35000, 11644, 42000],
        'Mộc Sương Lạnh'                   => [12779, 35000, 17443, 42000],
        // Sheet rows 35/36 have the "(L)" label swapped; the cheaper one is size M.
        'Ô Long Bưởi Chanh Vàng Lạnh'      => [9584, 35000, 11270, 42000],
        'Boong Đỏ Lạnh'                    => [9888, 35000, 12188, 42000],
        'Ô Long Vải Thanh Long Lạnh'       => [12019, 35000, 14753, 42000],
        'Ô Long Xoài Thanh Ca Lạnh'        => [13569, 35000, 16133, 42000],
        'Sữa Dừa Tuyết Mây Lạnh'           => [13883, 42000, null, null],
        'Nếp Tuyết Mây Lạnh'               => [10328, 42000, null, null],
        'Bồng Bềnh Lạnh'                   => [11131, 39000, 14505, 46000],
        'Nhài Bồng Bềnh Lạnh'              => [11745, 42000, 15365, 49000],
        'Hoa Sen Bồng Bềnh Lạnh'           => [12305, 40000, 14991, 49000],
        'Gạo Khói Bồng Bềnh Lạnh'          => [11557, 42000, 14765, 49000],
        'Dành Dành Thanh Mai Kem Mây Lạnh' => [14316, 42000, null, null],
        'Ô Long Xoài Kem Mây Lạnh'         => [16487, 42000, null, null],
        'Matcha Latte Hoa Nhài Lạnh'       => [10194, 38000, null, null],
        'Ô Long Matcha Lạnh'               => [10524, 35000, null, null],
        'Matcha Săn Mây Lạnh'              => [11717, 42000, null, null],
        'Cà Phê Đen Lạnh'                  => [7147, 25000, null, null],
        'Cà Phê Nâu Lạnh'                  => [8274, 25000, null, null],
        'Bạc Sỉu Lạnh'                     => [8864, 25000, null, null],
        'Cà Phê Muối'                      => [10381, 35000, null, null],
        'Sữa Dừa Thạch Thủy Tinh Lạnh'     => [8761, 38000, null, null],
        'Sữa Chua Nếp'                     => [13139, 35000, null, null],
        'Sữa Chua Xoài'                    => [12266, 38000, null, null],
        'Sữa Tươi Bánh Bò Đường Đen Lạnh'  => [13943, 38000, null, null],
        'Nước Chanh Vàng'                  => [5768, 20000, 7968, 25000],
        'Topping Trân Châu Ô Long'         => [2380, 10000, null, null],
        'Topping Trân Châu Hoàng Kim'      => [2439, 10000, null, null],
        'Topping Trân Châu Trắng Giòn'     => [2430, 10000, null, null],
        'Topping Ngọc Trai Hồng'           => [7317, 12000, null, null],
        'Topping Kem Trứng'                => [4229, 12000, null, null],
        'Topping Kem Mây'                  => [3968, 12000, null, null],
        'Topping Thạch Thủy Tinh'          => [918, 10000, null, null],
        'Topping Trân Châu Bánh Bò'        => [4524, 10000, null, null],
    ];

    public function run(): void
    {
        foreach (self::SHEET as $name => [$costM, $priceM, $costL, $priceL]) {
            $recipe = Recipe::where('name', $name)->first();
            if (!$recipe) throw new \RuntimeException("Không có công thức: {$name} — chạy LaboongRecipesSeeder trước.");
            $costL ??= $costM;
            $priceL ??= $priceM;
            $recipe->update([
                'input_mode' => 'direct',
                'price_m' => $priceM, 'price_l' => $priceL,
                'direct_cogs_m' => $costM, 'direct_cogs_l' => $costL,
            ]);
            RecipeCostHistory::updateOrCreate(
                ['recipe_id' => $recipe->id, 'recorded_on' => '2026-10-01'],
                ['cogs_l' => $costL]
            );

            $hot = Recipe::where('name', preg_replace('/ Lạnh$/u', ' Nóng', $name))->where('name', '!=', $name)->first();
            $hot?->update(['price_m' => $priceM, 'price_l' => $priceM]);
        }
    }
}
