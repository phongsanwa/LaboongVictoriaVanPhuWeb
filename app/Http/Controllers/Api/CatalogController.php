<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\MenuPageController;
use App\Models\Banner;
use App\Models\Store;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    /**
     * GET /api/menu — toàn bộ dữ liệu để dựng màn đặt hàng:
     * danh mục, món (kèm biến thể), nhóm biến thể, cửa hàng, bậc phí ship,
     * khuyến mãi ship/đơn, phụ thu thời tiết, cấu hình thanh toán, địa chỉ KH…
     */
    public function menu(): JsonResponse
    {
        return response()->json(app(MenuPageController::class)->buildMenuPageData());
    }

    /** GET /api/home — banner + danh sách cửa hàng cho trang chủ Mini App. */
    public function home(): JsonResponse
    {
        $banners = Banner::where('status', 'active')
            ->orderBy('sort_order')->orderByDesc('id')
            ->get()
            ->map(fn (Banner $b) => [
                'desktop'  => $b->image_desktop,
                'mobile'   => $b->image_mobile ?: $b->image_desktop,
                'link'     => $b->link_url,
                'title'    => $b->title,
                'subtitle' => $b->subtitle,
                'textPos'  => $b->text_position ?: 'none',
                'textAlign' => $b->text_align ?: 'left',
            ])->all();

        $stores = Store::where('status', 'active')
            ->orderBy('name')
            ->get()
            ->map(fn (Store $s) => [
                'id'        => $s->id,
                'name'      => $s->name,
                'address'   => $s->address,
                'phone'     => $s->phone,
                'latitude'  => $s->latitude !== null ? (float) $s->latitude : null,
                'longitude' => $s->longitude !== null ? (float) $s->longitude : null,
                'opening_time' => $s->opening_time,
                'closing_time' => $s->closing_time,
            ])->all();

        return response()->json(['banners' => $banners, 'stores' => $stores]);
    }
}
