<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MenuPageController;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    /**
     * GET /api/home — dữ liệu trang chủ Mini App: banner, flash sale, chiến dịch, tin tức,
     * cửa hàng, cấu hình điểm danh; có token thì kèm điểm/hạng/điểm danh của khách.
     */
    public function home(Request $request): JsonResponse
    {
        $data = app(HomeController::class)->buildHomeData($request->user());
        unset($data['adminAccess'], $data['iosGuideHtml'], $data['staffEntry']);

        $data['stores'] = collect($data['stores'])->map(fn (Store $s) => $this->storePayload($s))->values()->all();
        $data['store']  = $data['store'] ? $this->storePayload($data['store']) : null;

        return response()->json($data);
    }

    private function storePayload(Store $s): array
    {
        return [
            'id'           => $s->id,
            'name'         => $s->name,
            'address'      => $s->address,
            'phone'        => $s->phone,
            'latitude'     => $s->latitude !== null ? (float) $s->latitude : null,
            'longitude'    => $s->longitude !== null ? (float) $s->longitude : null,
            'opening_time' => $s->opening_time,
            'closing_time' => $s->closing_time,
            'photos'       => array_values(array_filter((array) ($s->photos ?? []))),
            'operating_days' => $s->operating_days,
        ];
    }
}
