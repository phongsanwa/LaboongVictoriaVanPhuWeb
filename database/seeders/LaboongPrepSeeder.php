<?php

namespace Database\Seeders;

use App\Models\Ingredient;
use App\Models\Recipe;
use Illuminate\Database\Seeder;

/**
 * "Chuẩn bị nguyên liệu Laboong" (10/2026): prices each semi-product as one batch ("mẻ")
 * costed from the price list, with the batch yield as the conversion.
 * Run after LaboongRecipesSeeder:
 *   php artisan db:seed --class=LaboongPrepSeeder --force
 *
 * Yields: brewed tea = water volume; coffee = 220 ml as stated; creams/jelly/syrups =
 * total input weight/volume. Edit "Quy đổi" on the ingredients page if the measured
 * yield differs. Re-run after a price-list update to refresh batch costs.
 */
class LaboongPrepSeeder extends Seeder
{
    private const P = [
        'tq'        => 'Trà Ô Long Tứ Quý Laboong',
        'nhai'      => 'Trà Ô Long nhài Laboong',
        'dd'        => 'Trà Ô Long hoa dành dành Laboong',
        'nuong'     => 'Trà Ô Long nướng Laboong',
        'sen'       => 'Trà Ô Long sen Laboong',
        'hong'      => 'Hồng trà (trà đen cao cấp)',
        'bot_sua'   => 'Bột kem Laboong (bột sữa)',
        'sua_dac'   => 'Sữa đặc Hoàn Hảo',
        'duong'     => 'Đường kính trắng',
        'bot_thach' => 'Bột thạch Konjac',
        'ambiante'  => 'Kem Ambiante',
        'sua_tuoi'  => 'Sữa tươi Emborg',
        'bot_trung' => 'Bột Brulee Laboong (bột kem trứng)',
        'bot_cheese'=> 'Bột tạo màng sữa phô mai Laboong (bột Cheese)',
        'bot_sc'    => 'Bột sữa chua Laboong',
        'matcha'    => 'Bột trà xanh matcha hương nhài',
        'cafe'      => 'Cà phê bột Laboong',
    ];

    /** semi-product => [inputs (key => qty in g/ml), yield, unit] */
    private const BATCHES = [
        'Cốt trà ô long Tứ Quý nguyên vị'        => [['tq' => 50], 1500, 'ml'],
        'Cốt trà ô long nhài nguyên vị'          => [['nhai' => 100], 2000, 'ml'],
        'Cốt trà ô long hoa dành dành nguyên vị' => [['dd' => 100], 2000, 'ml'],
        'Cốt trà ô long Tứ Quý sữa'              => [['tq' => 100, 'bot_sua' => 360, 'sua_dac' => 160], 2000, 'ml'],
        'Cốt trà ô long nhài sữa'                => [['nhai' => 100, 'bot_sua' => 360, 'sua_dac' => 160], 2000, 'ml'],
        'Cốt trà ô long nướng sữa'               => [['nuong' => 100, 'bot_sua' => 360, 'sua_dac' => 160], 2000, 'ml'],
        'Cốt trà ô long sen sữa'                 => [['sen' => 100, 'bot_sua' => 360, 'sua_dac' => 100], 2000, 'ml'],
        'Cốt trà ô long hoa dành dành sữa'       => [['dd' => 100, 'bot_sua' => 360, 'sua_dac' => 100], 2000, 'ml'],
        'Cốt hồng trà sữa'                       => [['hong' => 100, 'bot_sua' => 300, 'sua_dac' => 100], 2400, 'ml'],
        'Thạch thủy tinh'                        => [['bot_thach' => 70, 'duong' => 30], 800, 'g'],
        // 1 kg sugar in 600 ml water ≈ 1.2 l syrup.
        'Đường nước'                             => [['duong' => 1000], 1200, 'ml'],
        'Kem trứng'                              => [['ambiante' => 150, 'sua_tuoi' => 150, 'bot_trung' => 70], 370, 'g'],
        'Kem mây'                                => [['ambiante' => 150, 'sua_tuoi' => 150, 'bot_cheese' => 30], 330, 'g'],
        'Cốt sữa chua'                           => [['bot_sc' => 100], 400, 'ml'],
        'Cốt nước matcha'                        => [['matcha' => 10], 110, 'ml'],
        'Cốt cà phê'                             => [['cafe' => 100], 220, 'ml'],
    ];

    public function run(): void
    {
        $price = [];
        foreach (self::P as $k => $name) {
            $ing = Ingredient::where('name', $name)->first();
            if (!$ing) throw new \RuntimeException("Thiếu nguyên liệu trong bảng giá: {$name}");
            $price[$k] = $ing->use_price;
        }

        foreach (self::BATCHES as $name => [$inputs, $yield, $unit]) {
            $cost = 0;
            foreach ($inputs as $k => $qty) $cost += $qty * $price[$k];
            Ingredient::updateOrCreate(['name' => $name], [
                'buy_unit' => 'mẻ', 'buy_price' => round($cost), 'conversion' => $yield, 'use_unit' => $unit,
            ]);
        }

        // A recipe switches back to ingredient-based COGS only when it reproduces the official
        // cost sheet within 5% for both sizes; otherwise the sheet value stays authoritative.
        foreach (Recipe::with('ingredients.ingredient')->whereIn('input_mode', ['direct', 'detailed'])->get() as $r) {
            if ((float) $r->direct_cogs_m <= 0 || $r->ingredients->isEmpty()) continue;
            $ok = true;
            foreach (['m' => (float) $r->direct_cogs_m, 'l' => (float) $r->direct_cogs_l] as $size => $official) {
                $v = 0;
                foreach ($r->ingredients as $ri) {
                    $qty = $size === 'l' ? $ri->qty_l : ($ri->qty_m ?? $ri->qty_l * 0.75);
                    $v += $qty * ($ri->ingredient?->use_price ?? 0);
                }
                $cogs = $v * (1 + $r->wastage_pct / 100) + ($size === 'l' ? $r->packaging_l : $r->packaging_m);
                if (abs($cogs / $official - 1) > 0.05) $ok = false;
            }
            $r->update(['input_mode' => $ok ? 'detailed' : 'direct']);
        }
    }
}
