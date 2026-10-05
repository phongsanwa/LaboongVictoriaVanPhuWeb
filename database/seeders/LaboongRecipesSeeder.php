<?php

namespace Database\Seeders;

use App\Models\Ingredient;
use App\Models\Recipe;
use App\Models\RecipeIngredient;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Laboong drink recipes ("Công thức đồ uống Laboong", update 10/2026).
 * Run after LaboongIngredientsSeeder:
 *   php artisan db:seed --class=LaboongRecipesSeeder --force
 *
 * Cold drinks keep the 16oz quantities as size M and the "(L)" 22oz ones as size L;
 * hot drinks are separate "… Nóng" recipes (same quantities in M and L).
 * Cups, lids, covers and stickers are ingredient rows, so packaging_m/l stay 0.
 * Re-running rebuilds ingredient rows but keeps any prices already entered.
 */
class LaboongRecipesSeeder extends Seeder
{
    /** Price-list items (from LaboongIngredientsSeeder). */
    private const CATALOG = [
        'que_hoa'     => 'Mứt hoa quế Laboong',
        'la_dua'      => 'Mứt lá dứa Laboong (mứt lá nếp)',
        'dao_nhai'    => 'Mứt đào nhài Laboong',
        'thanh_mai'   => 'Mứt thanh mai Laboong',
        'mut_xoai'    => 'Mứt xoài',
        'siro_chanh'  => 'Siro chanh',
        'buoi'        => 'Siro Bưởi Hồng Laboong',
        'luu'         => 'Syrup Lựu Laboong',
        'vai'         => 'Syrup Vải Laboong',
        'nho_siro'    => 'Siro nho xanh',
        'cot_dua'     => 'Cốt dừa',
        'sua_tuoi'    => 'Sữa tươi Emborg',
        'sua_dac'     => 'Sữa đặc Hoàn Hảo',
        'ambiante'    => 'Kem Ambiante',
        'matcha'      => 'Bột trà xanh matcha hương nhài',
        'tc_banh_bo'  => 'Trân châu bánh bò (bảo quản tủ đông)',
        'tc_olong'    => 'Trân châu Ô Long Laboong',
        'tc_hoangkim' => 'Trân châu hoàng kim Laboong',
        'tc_trang'    => 'Trân châu ngọc trai Laboong (trân châu trắng giòn)',
        'ngoc_hong'   => 'Hạt nổ củ năng hồng Laboong (trân châu ngọc trai hồng)',
        'cg8'         => 'Cốc giấy 8oz',
        'cg12'        => 'Cốc giấy 12Oz LaBoong',
        'cg16'        => 'Cốc giấy 16Oz LaBoong',
        'cg22'        => 'Cốc giấy 22oz',
        'nap_cau'     => 'Nắp cầu cốc giấy (dùng cho cốc giấy 12Oz,16oz,22Oz)',
        'nap_det12'   => 'Nắp dẹt cốc giấy 12oz (Nắp trà nóng)',
        'nap_det8'    => 'Nắp dẹt cốc 8oz',
        'cn12'        => 'Cốc nhựa 12oz',
        'cn16'        => 'Cốc nhựa 16Oz Laboong',
        'cn22'        => 'Cốc nhựa 22Oz',
        'nap93'       => 'Nắp uống trực tiếp 93 (dùng cho cốc nhựa 16Oz,12Oz)',
        'nap98'       => 'Nắp uống trực tiếp 98 (dùng cho cốc nhựa 22oz)',
        'cover_sen'   => 'Cover hoa sen',
        'cover_dd'    => 'Cover hoa dành dành',
        'tem_tm'      => 'Tem Thanh Mai',
        'tem_xoai'    => 'Tem Xoài',
    ];

    /** Semi-products and fresh items not on the price list: created at price 0 for the owner to fill in. */
    private const EXTRA = [
        'tq_sua'      => ['Cốt trà ô long Tứ Quý sữa', 'ml'],
        'nhai_sua'    => ['Cốt trà ô long nhài sữa', 'ml'],
        'nuong_sua'   => ['Cốt trà ô long nướng sữa', 'ml'],
        'sen_sua'     => ['Cốt trà ô long sen sữa', 'ml'],
        'dd_sua'      => ['Cốt trà ô long hoa dành dành sữa', 'ml'],
        'hong_sua'    => ['Cốt hồng trà sữa', 'ml'],
        'tq_nv'       => ['Cốt trà ô long Tứ Quý nguyên vị', 'ml'],
        'nhai_nv'     => ['Cốt trà ô long nhài nguyên vị', 'ml'],
        'dd_nv'       => ['Cốt trà ô long hoa dành dành nguyên vị', 'ml'],
        'duong'       => ['Đường nước', 'ml'],
        'kem_may'     => ['Kem mây', 'g'],
        'kem_trung'   => ['Kem trứng', 'g'],
        'thach'       => ['Thạch thủy tinh', 'g'],
        'cafe'        => ['Cốt cà phê', 'ml'],
        'sua_chua'    => ['Cốt sữa chua', 'ml'],
        'matcha_nuoc' => ['Cốt nước matcha', 'ml'],
        'muoi'        => ['Nước muối', 'ml'],
        'nuoc'        => ['Nước lọc', 'ml'],
        'da'          => ['Đá bi', 'g'],
        'thanh_long'  => ['Thanh long đỏ', 'g'],
        'xoai'        => ['Xoài tươi', 'g'],
        'chanh'       => ['Chanh vàng', 'nửa lát'],
        'cam'         => ['Cam vàng', 'nửa lát'],
        'nho'         => ['Nho xanh', 'quả'],
    ];

    private const G8  = ['cg8' => 1, 'nap_det8' => 1];
    private const G12 = ['cg12' => 1, 'nap_det12' => 1];
    private const G16 = ['cg16' => 1, 'nap_cau' => 1];
    private const G22 = ['cg22' => 1, 'nap_cau' => 1];
    private const N12 = ['cn12' => 1, 'nap93' => 1];
    private const N16 = ['cn16' => 1, 'nap93' => 1];
    private const N22 = ['cn22' => 1, 'nap98' => 1];

    /** [name, size M (16oz / single size), size L (22oz) or null]. */
    private function recipes(): array
    {
        return [
            // ── TRÀ SỮA ──
            ['Ô Long Sữa Lạnh', ['tq_sua' => 180, 'duong' => 20, 'da' => 250] + self::G16, ['tq_sua' => 230, 'duong' => 25, 'da' => 250] + self::G22],
            ['Ô Long Sữa Nóng', ['tq_sua' => 150, 'duong' => 10, 'nuoc' => 50] + self::G12, null],
            ['Ô Long Nhài Sữa Lạnh', ['nhai_sua' => 180, 'duong' => 20, 'da' => 250] + self::G16, ['nhai_sua' => 230, 'duong' => 25, 'da' => 250] + self::G22],
            ['Ô Long Nhài Sữa Nóng', ['nhai_sua' => 150, 'duong' => 10, 'nuoc' => 50] + self::G12, null],
            ['Gạo Khói Lạnh', ['nuong_sua' => 180, 'duong' => 20, 'da' => 250] + self::G16, ['nuong_sua' => 230, 'duong' => 25, 'da' => 250] + self::G22],
            ['Gạo Khói Nóng', ['nuong_sua' => 150, 'duong' => 5, 'nuoc' => 50] + self::G12, null],
            ['Ô Long Hoa Sen Lạnh', ['sen_sua' => 180, 'duong' => 15, 'thanh_long' => 10, 'da' => 250, 'cover_sen' => 1] + self::N16, ['sen_sua' => 230, 'duong' => 20, 'thanh_long' => 15, 'da' => 350, 'cover_sen' => 1] + self::N22],
            ['Ô Long Hoa Sen Nóng', ['sen_sua' => 150, 'thanh_long' => 10, 'duong' => 10, 'nuoc' => 50, 'cover_sen' => 1] + self::G12, null],
            ['Ô Long Sữa Hoa Dành Dành Lạnh', ['dd_sua' => 180, 'duong' => 15, 'da' => 250, 'cover_dd' => 1] + self::N16, ['dd_sua' => 230, 'duong' => 20, 'da' => 250, 'cover_dd' => 1] + self::N22],
            ['Ô Long Sữa Hoa Dành Dành Nóng', ['dd_sua' => 150, 'duong' => 10, 'nuoc' => 50, 'cover_dd' => 1] + self::G12, null],
            ['Ô Long Sữa Quế Hoa Lạnh', ['tq_sua' => 180, 'que_hoa' => 15, 'duong' => 5, 'da' => 250] + self::G16, ['tq_sua' => 230, 'que_hoa' => 20, 'duong' => 5, 'da' => 250] + self::G22],
            ['Ô Long Sữa Quế Hoa Nóng', ['tq_sua' => 150, 'que_hoa' => 20, 'nuoc' => 50] + self::G12, null],
            ['Ô Long Sữa Dừa Lạnh', ['tq_sua' => 150, 'duong' => 30, 'cot_dua' => 40, 'da' => 250] + self::G16, null],
            ['Ô Long Sữa Dừa Nóng', ['tq_sua' => 150, 'duong' => 15, 'cot_dua' => 40, 'nuoc' => 50] + self::G12, null],
            ['Ô Long Nếp Lạnh', ['tq_sua' => 180, 'la_dua' => 20, 'duong' => 5, 'da' => 250] + self::G16, null],
            ['Ô Long Nếp Nóng', ['tq_sua' => 120, 'la_dua' => 15, 'nuoc' => 50] + self::G12, null],
            ['Hồng Trà Sữa Lạnh', ['hong_sua' => 180, 'duong' => 30, 'da' => 250] + self::G16, ['hong_sua' => 230, 'duong' => 40, 'da' => 250] + self::G22],
            ['Hồng Trà Sữa Nóng', ['hong_sua' => 150, 'duong' => 20, 'nuoc' => 50] + self::G12, null],
            ['Hồng Trà Bánh Bò Đường Đen Lạnh', ['hong_sua' => 180, 'duong' => 30, 'da' => 250, 'tc_banh_bo' => 50] + self::N16, ['hong_sua' => 230, 'duong' => 40, 'da' => 250, 'tc_banh_bo' => 50, 'cn22' => 1, 'nap_cau' => 1]],
            ['Hồng Trà Bánh Bò Đường Đen Nóng', ['hong_sua' => 150, 'duong' => 20, 'nuoc' => 50, 'tc_banh_bo' => 50] + self::G12, null],

            // ── SĂN MÂY ──
            ['Sữa Dừa Tuyết Mây Lạnh', ['tq_sua' => 150, 'duong' => 30, 'cot_dua' => 40, 'da' => 250, 'kem_may' => 50] + self::N16, null],
            ['Sữa Dừa Tuyết Mây Nóng', ['tq_sua' => 150, 'duong' => 15, 'cot_dua' => 40, 'nuoc' => 50, 'kem_may' => 50] + self::G12, null],
            ['Nếp Tuyết Mây Lạnh', ['tq_sua' => 120, 'la_dua' => 15, 'duong' => 5, 'da' => 250, 'kem_may' => 50] + self::N16, null],
            ['Nếp Tuyết Mây Nóng', ['tq_sua' => 120, 'la_dua' => 15, 'nuoc' => 50, 'kem_may' => 50] + self::G12, null],
            ['Hoa Sen Bồng Bềnh Lạnh', ['sen_sua' => 150, 'thanh_long' => 10, 'duong' => 15, 'da' => 250, 'kem_trung' => 50, 'cover_sen' => 1] + self::N16, ['sen_sua' => 200, 'thanh_long' => 15, 'duong' => 20, 'da' => 250, 'kem_trung' => 60, 'cover_sen' => 1] + self::N22],
            ['Hoa Sen Bồng Bềnh Nóng', ['sen_sua' => 150, 'thanh_long' => 10, 'duong' => 10, 'nuoc' => 50, 'kem_trung' => 50, 'cover_sen' => 1] + self::G12, null],
            ['Bồng Bềnh Lạnh', ['tq_sua' => 150, 'duong' => 20, 'da' => 250, 'kem_trung' => 50] + self::N16, ['tq_sua' => 200, 'duong' => 25, 'da' => 200, 'kem_trung' => 60] + self::N22],
            ['Bồng Bềnh Nóng', ['tq_sua' => 150, 'duong' => 10, 'nuoc' => 50, 'kem_trung' => 50] + self::G12, null],
            ['Nhài Bồng Bềnh Lạnh', ['nhai_sua' => 150, 'duong' => 20, 'da' => 250, 'kem_trung' => 50] + self::N16, ['nhai_sua' => 200, 'duong' => 25, 'da' => 200, 'kem_trung' => 60] + self::N22],
            ['Nhài Bồng Bềnh Nóng', ['nhai_sua' => 150, 'duong' => 10, 'nuoc' => 50, 'kem_trung' => 50] + self::G12, null],
            ['Gạo Khói Bồng Bềnh Lạnh', ['nuong_sua' => 150, 'duong' => 20, 'da' => 250, 'kem_trung' => 50] + self::N16, ['nuong_sua' => 200, 'duong' => 25, 'da' => 200, 'kem_trung' => 60] + self::N22],
            ['Gạo Khói Bồng Bềnh Nóng', ['nuong_sua' => 150, 'duong' => 10, 'nuoc' => 50, 'kem_trung' => 50] + self::G12, null],
            ['Dành Dành Thanh Mai Kem Mây Lạnh', ['dd_nv' => 100, 'nuoc' => 50, 'thanh_mai' => 25, 'siro_chanh' => 5, 'duong' => 10, 'da' => 200, 'kem_may' => 50, 'tem_tm' => 1] + self::N16, null],
            ['Ô Long Xoài Kem Mây Lạnh', ['xoai' => 20, 'nhai_nv' => 70, 'nuoc' => 80, 'siro_chanh' => 5, 'mut_xoai' => 35, 'da' => 200, 'kem_may' => 50, 'tem_xoai' => 1] + self::N16, null],

            // ── Ô LONG VỊ HOA QUẢ ──
            ['Ô Long Lắc Lạnh', ['tq_nv' => 120, 'nuoc' => 60, 'duong' => 30, 'da' => 250] + self::N16, ['tq_nv' => 150, 'nuoc' => 80, 'duong' => 35, 'da' => 250] + self::N22],
            ['Ô Long Nhài Lắc Lạnh', ['nhai_nv' => 120, 'nuoc' => 60, 'duong' => 30, 'da' => 250] + self::N16, ['nhai_nv' => 150, 'nuoc' => 80, 'duong' => 35, 'da' => 250] + self::N22],
            ['Ô Long Hoa Dành Dành Lắc Lạnh', ['dd_nv' => 120, 'nuoc' => 60, 'duong' => 30, 'da' => 250, 'cover_dd' => 1] + self::N16, ['dd_nv' => 150, 'nuoc' => 80, 'duong' => 35, 'da' => 250, 'cover_dd' => 1] + self::N22],
            ['Ô Long Dành Dành Chanh Hoa Lạnh', ['dd_nv' => 120, 'nuoc' => 30, 'siro_chanh' => 10, 'duong' => 30, 'da' => 250, 'chanh' => 2, 'thach' => 70, 'cover_dd' => 1] + self::N16, ['dd_nv' => 150, 'nuoc' => 60, 'duong' => 40, 'siro_chanh' => 15, 'da' => 300, 'chanh' => 3, 'thach' => 70, 'cover_dd' => 1] + self::N22],
            ['Ô Long Dành Dành Chanh Hoa Nóng', ['dd_nv' => 120, 'nuoc' => 130, 'duong' => 10, 'siro_chanh' => 10, 'chanh' => 2, 'thach' => 70, 'cover_dd' => 1] + self::G12, null],
            ['Ô Long Chanh Quế Hoa Lạnh', ['tq_nv' => 100, 'nuoc' => 50, 'duong' => 25, 'que_hoa' => 15, 'da' => 250, 'chanh' => 4, 'thach' => 70] + self::N16, ['tq_nv' => 150, 'nuoc' => 50, 'duong' => 30, 'que_hoa' => 20, 'da' => 250, 'chanh' => 4, 'thach' => 70] + self::N22],
            ['Ô Long Chanh Quế Hoa Nóng', ['tq_nv' => 100, 'nuoc' => 150, 'que_hoa' => 20, 'duong' => 10, 'chanh' => 4, 'thach' => 70] + self::G12, null],
            ['Mộc Sương Lạnh', ['nhai_nv' => 120, 'nuoc' => 30, 'dao_nhai' => 20, 'siro_chanh' => 10, 'duong' => 15, 'da' => 250, 'cam' => 2, 'thach' => 70] + self::N16, ['nhai_nv' => 130, 'nuoc' => 60, 'dao_nhai' => 25, 'siro_chanh' => 15, 'duong' => 20, 'da' => 250, 'cam' => 2, 'thach' => 70] + self::N22],
            ['Mộc Sương Nóng', ['nhai_nv' => 120, 'nuoc' => 130, 'dao_nhai' => 20, 'siro_chanh' => 10, 'cam' => 2, 'thach' => 70] + self::G12, null],
            ['Ô Long Bưởi Chanh Vàng Lạnh', ['tq_nv' => 120, 'nuoc' => 30, 'buoi' => 15, 'siro_chanh' => 15, 'duong' => 15, 'chanh' => 2, 'da' => 250, 'thach' => 70] + self::N16, ['tq_nv' => 140, 'nuoc' => 50, 'buoi' => 20, 'siro_chanh' => 15, 'duong' => 20, 'chanh' => 2, 'da' => 250, 'thach' => 70] + self::N22],
            ['Ô Long Bưởi Chanh Vàng Nóng', ['tq_nv' => 120, 'nuoc' => 130, 'buoi' => 15, 'siro_chanh' => 15, 'chanh' => 2, 'thach' => 70] + self::G12, null],
            ['Boong Đỏ Lạnh', ['tq_nv' => 80, 'nuoc' => 70, 'luu' => 25, 'duong' => 20, 'da' => 250, 'cam' => 2, 'thach' => 70] + self::N16, ['tq_nv' => 100, 'nuoc' => 90, 'luu' => 30, 'duong' => 25, 'da' => 250, 'cam' => 2, 'thach' => 70] + self::N22],
            ['Boong Đỏ Nóng', ['tq_nv' => 80, 'nuoc' => 170, 'luu' => 25, 'duong' => 20, 'cam' => 2, 'thach' => 70] + self::G12, null],
            ['Dành Dành Thanh Mai Lạnh', ['dd_nv' => 100, 'nuoc' => 50, 'thanh_mai' => 25, 'siro_chanh' => 5, 'duong' => 10, 'cam' => 2, 'da' => 250, 'thach' => 70, 'tem_tm' => 1] + self::N16, ['dd_nv' => 130, 'nuoc' => 60, 'duong' => 15, 'thanh_mai' => 25, 'siro_chanh' => 10, 'da' => 250, 'cam' => 2, 'thach' => 70] + self::N22],
            ['Dành Dành Thanh Mai Nóng', ['dd_nv' => 100, 'nuoc' => 150, 'thanh_mai' => 25, 'duong' => 10, 'siro_chanh' => 5, 'cam' => 2, 'thach' => 70] + self::G12, null],
            ['Ô Long Nho Xanh Lạnh', ['nho' => 2, 'tq_nv' => 80, 'nuoc' => 70, 'nho_siro' => 25, 'siro_chanh' => 5, 'duong' => 5, 'da' => 250, 'chanh' => 2] + self::N16, ['nho' => 3, 'tq_nv' => 100, 'nuoc' => 90, 'nho_siro' => 30, 'siro_chanh' => 10, 'duong' => 10, 'da' => 250, 'chanh' => 2] + self::N22],
            ['Ô Long Nho Xanh Nóng', ['tq_nv' => 80, 'nuoc' => 170, 'nho_siro' => 25, 'duong' => 5, 'siro_chanh' => 5, 'chanh' => 2, 'nho' => 2] + self::G12, null],
            ['Ô Long Vải Thanh Long Lạnh', ['thanh_long' => 50, 'tq_nv' => 70, 'nuoc' => 80, 'vai' => 20, 'siro_chanh' => 5, 'duong' => 5, 'da' => 250, 'chanh' => 2] + self::N16, ['thanh_long' => 60, 'tq_nv' => 100, 'nuoc' => 90, 'vai' => 25, 'siro_chanh' => 5, 'duong' => 10, 'da' => 250, 'chanh' => 2] + self::N22],
            ['Ô Long Vải Thanh Long Nóng', ['thanh_long' => 50, 'tq_nv' => 70, 'nuoc' => 180, 'vai' => 20, 'siro_chanh' => 5, 'duong' => 5, 'chanh' => 2] + self::G12, null],
            ['Ô Long Xoài Thanh Ca Lạnh', ['xoai' => 20, 'nhai_nv' => 70, 'nuoc' => 80, 'siro_chanh' => 5, 'mut_xoai' => 35, 'da' => 250, 'cam' => 2, 'tem_xoai' => 1] + self::N16, ['xoai' => 30, 'nhai_nv' => 90, 'nuoc' => 100, 'siro_chanh' => 10, 'mut_xoai' => 40, 'da' => 250, 'cam' => 2, 'tem_xoai' => 1] + self::N22],
            // The PDF's hot version also lists 250 g ice — a copy error, left out.
            ['Ô Long Xoài Thanh Ca Nóng', ['xoai' => 10, 'nhai_nv' => 70, 'nuoc' => 180, 'siro_chanh' => 5, 'mut_xoai' => 35, 'cam' => 2] + self::G12, null],

            // ── MATCHA ── (20 ml nước lọc + 40 ml nước nóng)
            ['Matcha Latte Hoa Nhài Lạnh', ['matcha' => 4, 'nuoc' => 60, 'sua_tuoi' => 120, 'sua_dac' => 20, 'da' => 50] + self::N12, null],
            ['Matcha Latte Hoa Nhài Nóng', ['matcha' => 4, 'nuoc' => 60, 'sua_tuoi' => 120, 'sua_dac' => 15] + self::G12, null],
            ['Ô Long Matcha Lạnh', ['tq_sua' => 180, 'duong' => 25, 'matcha_nuoc' => 25, 'da' => 250] + self::G16, null],
            ['Ô Long Matcha Nóng', ['tq_sua' => 150, 'duong' => 20, 'matcha_nuoc' => 20, 'nuoc' => 50] + self::G12, null],
            ['Matcha Săn Mây Lạnh', ['tq_sua' => 150, 'duong' => 10, 'matcha_nuoc' => 15, 'da' => 250, 'kem_may' => 50] + self::N16, null],
            ['Matcha Săn Mây Nóng', ['tq_sua' => 150, 'duong' => 15, 'matcha_nuoc' => 15, 'nuoc' => 50, 'kem_may' => 50] + self::G12, null],

            // ── CÀ PHÊ ──
            ['Cà Phê Đen Lạnh', ['cafe' => 50, 'duong' => 10, 'da' => 150] + self::N12, null],
            ['Cà Phê Đen Nóng', ['cafe' => 50, 'duong' => 10] + self::G8, null],
            ['Cà Phê Nâu Lạnh', ['cafe' => 50, 'sua_dac' => 20, 'da' => 150] + self::N12, null],
            ['Cà Phê Nâu Nóng', ['cafe' => 50, 'sua_dac' => 20] + self::G8, null],
            ['Bạc Sỉu Lạnh', ['cafe' => 30, 'sua_dac' => 30, 'sua_tuoi' => 30, 'cot_dua' => 15, 'da' => 150] + self::N12, null],
            ['Bạc Sỉu Nóng', ['cafe' => 30, 'sua_dac' => 30, 'sua_tuoi' => 30, 'cot_dua' => 15] + self::G8, null],
            ['Cà Phê Muối', ['cafe' => 40, 'sua_dac' => 20, 'ambiante' => 10, 'muoi' => 5, 'da' => 150, 'kem_may' => 30] + self::N12, null],

            // ── NON-CAFFEINE ──
            ['Sữa Chua Nếp', ['sua_chua' => 100, 'la_dua' => 25, 'siro_chanh' => 10, 'nuoc' => 50, 'sua_tuoi' => 50, 'da' => 200] + self::N16, null],
            ['Sữa Chua Xoài', ['xoai' => 30, 'sua_chua' => 80, 'sua_tuoi' => 20, 'nuoc' => 70, 'mut_xoai' => 15, 'siro_chanh' => 5, 'da' => 200] + self::N16, null],
            ['Sữa Dừa Thạch Thủy Tinh Lạnh', ['sua_tuoi' => 100, 'cot_dua' => 35, 'muoi' => 5, 'duong' => 15, 'da' => 250, 'thach' => 70] + self::G16, null],
            ['Sữa Dừa Thạch Thủy Tinh Nóng', ['sua_tuoi' => 100, 'cot_dua' => 35, 'muoi' => 5, 'duong' => 15, 'nuoc' => 50, 'thach' => 70] + self::G12, null],
            ['Sữa Tươi Bánh Bò Đường Đen Lạnh', ['tc_banh_bo' => 90, 'sua_tuoi' => 160, 'nuoc' => 40, 'duong' => 10, 'da' => 200] + self::N16, null],
            ['Sữa Tươi Bánh Bò Đường Đen Nóng', ['tc_banh_bo' => 90, 'sua_tuoi' => 160, 'nuoc' => 40, 'duong' => 5] + self::G12, null],
            ['Nước Chanh Vàng', ['chanh' => 3, 'nuoc' => 160, 'siro_chanh' => 20, 'muoi' => 5, 'da' => 250] + self::N16, ['chanh' => 4, 'nuoc' => 200, 'siro_chanh' => 30, 'muoi' => 5, 'da' => 250] + self::N22],

            // ── TOPPING (một phần) ──
            ['Topping Trân Châu Ô Long', ['tc_olong' => 70], null],
            ['Topping Trân Châu Hoàng Kim', ['tc_hoangkim' => 70], null],
            ['Topping Trân Châu Trắng Giòn', ['tc_trang' => 50], null],
            ['Topping Ngọc Trai Hồng', ['ngoc_hong' => 40], null],
            ['Topping Kem Trứng', ['kem_trung' => 50], null],
            ['Topping Kem Mây', ['kem_may' => 50], null],
            ['Topping Thạch Thủy Tinh', ['thach' => 70], null],
            ['Topping Trân Châu Bánh Bò', ['tc_banh_bo' => 50], null],
        ];
    }

    public function run(): void
    {
        $this->call(LaboongIngredientsSeeder::class);

        $ids = [];
        foreach (self::CATALOG as $key => $name) {
            $id = Ingredient::where('name', $name)->value('id');
            if (!$id) throw new \RuntimeException("Thiếu nguyên liệu trong bảng giá: {$name}");
            $ids[$key] = $id;
        }
        $order = Ingredient::max('sort_order') ?? 0;
        foreach (self::EXTRA as $key => [$name, $unit]) {
            $ids[$key] = Ingredient::firstOrCreate(
                ['name' => $name],
                ['buy_unit' => $unit, 'buy_price' => 0, 'conversion' => 1, 'use_unit' => $unit, 'sort_order' => ++$order]
            )->id;
        }

        DB::transaction(function () use ($ids) {
            foreach ($this->recipes() as $i => [$name, $m, $l]) {
                $l ??= $m;
                $recipe = Recipe::firstOrCreate(
                    ['name' => $name],
                    ['input_mode' => 'detailed', 'wastage_pct' => 5, 'packaging_m' => 0, 'packaging_l' => 0, 'price_m' => 0, 'price_l' => 0, 'sort_order' => $i]
                );
                $recipe->update(['input_mode' => 'detailed', 'packaging_m' => 0, 'packaging_l' => 0, 'sort_order' => $i]);
                $recipe->ingredients()->delete();

                $keys = array_values(array_unique([...array_keys($m), ...array_keys($l)]));
                foreach ($keys as $j => $key) {
                    RecipeIngredient::create([
                        'recipe_id'     => $recipe->id,
                        'ingredient_id' => $ids[$key],
                        'qty_m'         => $m[$key] ?? 0,
                        'qty_l'         => $l[$key] ?? 0,
                        'sort_order'    => $j,
                    ]);
                }
            }
        });
    }
}
