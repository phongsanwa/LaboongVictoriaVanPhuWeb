<?php

namespace Database\Seeders;

use App\Models\Ingredient;
use Illuminate\Database\Seeder;

/**
 * Laboong ingredient price list (update 10/2026).
 * Run: php artisan db:seed --class=LaboongIngredientsSeeder --force
 * Idempotent: rows are matched by name, so re-running updates prices.
 */
class LaboongIngredientsSeeder extends Seeder
{
    public function run(): void
    {
        // [mã hàng, mặt hàng, đơn vị mua, giá mua, quy đổi, đơn vị dùng, nhóm]
        $rows = [
            ['LB01', 'Trà Ô Long nhài Laboong', 'Túi 500g', 188000, 500.0, 'g', 'TRÀ'],
            ['LB02', 'Trà Ô Long nướng Laboong', 'Túi 500g', 158000, 500.0, 'g', 'TRÀ'],
            ['LB03', 'Trà Ô Long Tứ Quý Laboong', 'Túi 500g', 145000, 500.0, 'g', 'TRÀ'],
            ['LB04', 'Trà Ô Long sen Laboong', 'Túi 500g', 120000, 500.0, 'g', 'TRÀ'],
            ['LB05', 'Trà Ô Long hoa dành dành Laboong', 'Túi 500g', 160000, 500.0, 'g', 'TRÀ'],
            ['LB09', 'Hồng trà (trà đen cao cấp)', 'Túi 500g', 110000, 500.0, 'g', 'TRÀ'],
            ['LB10', 'Cà phê bột Laboong', 'Túi 500g', 115000, 500.0, 'g', 'CÀ PHÊ'],
            ['LB14', 'Trân châu hoàng kim Laboong', 'Túi 1000g', 45000, 1000.0, 'g', 'TOPPING'],
            ['LB15', 'Trân châu ngọc trai Laboong (trân châu trắng giòn)', 'Túi 2000g', 50000, 2000.0, 'g', 'TOPPING'],
            ['LB217', 'Trân châu Ô Long Laboong', 'Túi 1000g', 48000, 1000.0, 'g', 'TOPPING'],
            ['LB18', 'Hạt nổ củ năng hồng Laboong (trân châu ngọc trai hồng)', 'Hộp 850g', 85000, 850.0, 'g', 'TOPPING'],
            ['LB17', 'Trân châu bánh bò (bảo quản tủ đông)', 'Túi 1000g', 75000, 1000.0, 'g', 'TOPPING'],
            ['LB212', 'Trân châu Ô Long Nhài LaBoong (bảo quản tủ đông)', 'Túi 500g', 42000, 500.0, 'g', 'TOPPING'],
            ['LB22', 'Siro nho xanh', 'Chai 1200g', 105000, 1200.0, 'g', 'MỨT'],
            ['LB32', 'Siro đường đen', 'Chai 1300g', 112000, 1300.0, 'g', 'MỨT'],
            ['LB21', 'Mứt đào nhài Laboong', 'Hộp 1000g', 135000, 1000.0, 'g', 'MỨT'],
            ['LB23', 'Mứt hoa quế Laboong', 'Hộp 1000g', 135000, 1000.0, 'g', 'MỨT'],
            ['LB25', 'Mứt xoài', 'Túi 1200g', 125000, 1200.0, 'g', 'MỨT'],
            ['LB29', 'Mứt lá dứa Laboong (mứt lá nếp)', 'Túi 1200g', 145000, 1200.0, 'g', 'MỨT'],
            ['LB227', 'Mứt thanh mai Laboong', 'Túi 1000g', 120000, 1000.0, 'g', 'MỨT'],
            ['LB225', 'Siro chanh', 'Chai 1300ml', 105000, 1300.0, 'ml', 'SYRUP'],
            ['LB28', 'Siro Bưởi Hồng Laboong', 'Chai 750ml', 120000, 750.0, 'ml', 'SYRUP'],
            ['LB211', 'Syrup Lựu Laboong', 'Túi 1000g', 135000, 1000.0, 'g', 'SYRUP'],
            ['LB35', 'Syrup Vải Laboong', 'Chai 750ml', 120000, 750.0, 'ml', 'SYRUP'],
            ['LB37', 'Bột khoai lang vàng', 'Gói 500g', 102000, 500.0, 'g', 'BỘT'],
            ['LB38', 'Bột kem Laboong (bột sữa)', 'Túi 1000g', 77000, 1000.0, 'g', 'BỘT'],
            ['LB39', 'Bột Brulee Laboong (bột kem trứng)', 'Túi 1000g', 175000, 1000.0, 'g', 'BỘT'],
            ['LB40', 'Bột trà xanh matcha hương nhài', 'Gói 100g', 90000, 100.0, 'g', 'BỘT'],
            ['LB287', 'Bột thạch Konjac', 'Túi 500g', 120000, 500.0, 'g', 'BỘT'],
            ['LB192', 'Bột sữa chua Laboong', 'Gói 800g', 130000, 800.0, 'g', 'BỘT'],
            ['LB215', 'Bột tạo màng sữa phô mai Laboong (bột Cheese)', 'Gói 500g', 145000, 500.0, 'g', 'BỘT'],
            ['LB228', 'Bột pudding tàu hũ vị phô mai Laboong (bột phô mai bồng bềnh)', 'Gói 800g', 150000, 800.0, 'g', 'BỘT'],
            ['LB48', 'Đường kính trắng', 'Túi 1000g', 26000, 1000.0, 'g', 'ĐƯỜNG, KEM, BỘT SỮA'],
            ['LB49', 'Kem Ambiante', 'Hộp 1000ml', 95000, 1000.0, 'ml', 'ĐƯỜNG, KEM, BỘT SỮA'],
            ['LB50', 'Sữa tươi Emborg', 'Hộp 1000ml', 32000, 1000.0, 'ml', 'ĐƯỜNG, KEM, BỘT SỮA'],
            ['LB51', 'Cốt dừa', 'Hộp 400ml', 28000, 400.0, 'ml', 'ĐƯỜNG, KEM, BỘT SỮA'],
            ['LB52', 'Sữa đặc Hoàn Hảo', 'Hộp 1270g', 61000, 1270.0, 'g', 'ĐƯỜNG, KEM, BỘT SỮA'],
            ['LB59', 'Ống hút nhựa Phi 8', 'Túi 500g', 35000, 500.0, 'g', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB60', 'Ống hút nhựa phi 12', 'Túi 500g', 35000, 500.0, 'g', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB61', 'Thìa nhựa mang về', 'Túi 50 chiếc', 8900, 50, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB63', 'Túi mang về đơn', 'Kg', 65000, 1, 'kg', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB64', 'Túi mang về đôi', 'Kg', 65000, 1, 'kg', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB65', 'Ống hút nóng', 'Gói', 13000, 1, 'gói', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB73', 'Nắp dẹt cốc giấy 12oz (Nắp trà nóng)', 'Chiếc', 500, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB72', 'Cốc giấy 12Oz LaBoong', 'Chiếc', 1300, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB67', 'Cốc giấy 16Oz LaBoong', 'Chiếc', 1300, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB62', 'Cốc giấy 22oz', 'Chiếc', 1580, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB66', 'Nắp cầu cốc giấy (dùng cho cốc giấy 12Oz,16oz,22Oz)', 'Chiếc', 350, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB71', 'Cốc nhựa 12oz', 'Chiếc', 860, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB68', 'Cốc nhựa 16Oz Laboong', 'Chiếc', 880, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB69', 'Nắp uống trực tiếp 93 (dùng cho cốc nhựa 16Oz,12Oz)', 'Chiếc', 350, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB58', 'Cốc nhựa 22Oz', 'Chiếc', 1380, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB75', 'Nắp uống trực tiếp 98 (dùng cho cốc nhựa 22oz)', 'Chiếc', 400, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB78', 'Cốc giấy 8oz', 'Chiếc', 1200, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB79', 'Nắp dẹt cốc 8oz', 'Chiếc', 250, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB209', 'Cốc đựng Topping liền nắp', 'Chiếc', 780, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB70', 'Cốc đựng tàu hũ phomai', 'Chiếc', 800, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB77', 'Cover hoa sen', 'Chiếc', 880, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB80', 'Cover hoa dành dành', 'Chiếc', 880, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB255', 'Cover gạo đào hồng', 'Chiếc', 950, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB81', 'Tem khoai mật', 'Tờ 32 cái', 11000, 32, 'cái', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB261', 'Tem trân châu bánh bò', 'Tờ 32 cái', 11000, 32, 'cái', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB270', 'Tag ống hút', 'Chiếc', 410, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB88', 'Tem Thanh Mai', 'Chiếc', 620, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB90', 'Tem Xoài', 'Chiếc', 620, 1, 'chiếc', 'VẬT DỤNG PHỤ CHO ĐỒ UỐNG'],
            ['LB91', 'Áo thun Laboong', 'Chiếc', 150000, 1, 'chiếc', 'ĐỒNG PHỤC'],
            ['LB92', 'Tạp dề Laboong', 'Chiếc', 110000, 1, 'chiếc', 'ĐỒNG PHỤC'],
            ['LB93', 'Mũ Laboong', 'Chiếc', 60000, 1, 'chiếc', 'ĐỒNG PHỤC'],
            ['LB97', 'Tem dán nhiệt 30*40', 'Cuộn', 31000, 1, 'cuộn', 'CCDC KHÁC'],
            ['LB98', 'Giấy in nhiệt', 'Cuộn', 22000, 1, 'cuộn', 'CCDC KHÁC'],
            ['LB99', 'Sổ thu chi', 'Cuốn', 25000, 1, 'cuốn', 'CCDC KHÁC'],
            ['LB74', 'Giấy chống tràn', 'Tập', 38000, 1, 'tập', 'CCDC KHÁC'],
            ['LB100', 'Viết date', 'Tờ', 20000, 1, 'tờ', 'CCDC KHÁC'],
            ['LB101', 'Hướng dương', 'Gói', 5000, 1, 'gói', 'CCDC KHÁC'],
            ['LB231', 'Băng dính Laboong', 'Cuộn', 14000, 1, 'cuộn', 'CCDC KHÁC'],
        ];

        foreach ($rows as $i => [$code, $name, $buyUnit, $price, $conversion, $useUnit, $group]) {
            Ingredient::updateOrCreate(
                ['name' => $name],
                ['buy_unit' => $buyUnit, 'buy_price' => $price, 'conversion' => $conversion, 'use_unit' => $useUnit, 'sort_order' => $i]
            );
        }
    }
}
