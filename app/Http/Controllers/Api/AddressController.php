<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    /** GET /api/addresses */
    public function index(Request $request): JsonResponse
    {
        return response()->json(['addresses' => $this->list($request)]);
    }

    /** POST /api/addresses */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label'          => ['nullable', 'string', 'max:40'],
            'recipient_name' => ['nullable', 'string', 'max:100'],
            'address_text'   => ['required', 'string', 'max:500'],
            'lat'            => ['nullable', 'numeric', 'between:-90,90'],
            'lng'            => ['nullable', 'numeric', 'between:-180,180'],
            'def'            => ['nullable', 'boolean'],
        ]);

        $customer = $request->user()->customer()->first();
        if (!$customer) {
            return response()->json(['message' => 'Không tìm thấy hồ sơ khách hàng'], 404);
        }

        $makeDefault = (bool) ($data['def'] ?? false) || $customer->addresses()->count() === 0;

        $address = $customer->addresses()->create([
            'label'          => $data['label'] ?? 'Nhà',
            'recipient_name' => $data['recipient_name'] ?? $request->user()->name,
            'address_text'   => $data['address_text'],
            'latitude'       => $data['lat'] ?? null,
            'longitude'      => $data['lng'] ?? null,
            'is_default'     => $makeDefault,
        ]);

        if ($address->is_default) {
            $customer->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
        }

        return response()->json(['address' => $this->present($address)], 201);
    }

    /** DELETE /api/addresses/{address} */
    public function destroy(Request $request, CustomerAddress $address): JsonResponse
    {
        $customer = $request->user()->customer()->first();
        if (!$customer || $address->customer_id !== $customer->id) {
            return response()->json(['message' => 'Không tìm thấy địa chỉ'], 404);
        }

        $wasDefault = $address->is_default;
        $address->delete();

        // Chuyển mặc định sang địa chỉ còn lại nếu vừa xoá địa chỉ mặc định.
        if ($wasDefault) {
            $next = $customer->addresses()->orderBy('id')->first();
            $next?->update(['is_default' => true]);
        }

        return response()->json(['message' => 'Đã xoá địa chỉ']);
    }

    /* ─── Helpers ─── */

    private function list(Request $request): array
    {
        $customer = $request->user()->customer()->first();
        if (!$customer) {
            return [];
        }

        return $customer->addresses()->orderByDesc('is_default')->orderBy('id')
            ->get()->map(fn ($a) => $this->present($a))->all();
    }

    private function present(CustomerAddress $a): array
    {
        return [
            'id'    => $a->id,
            'label' => $a->label,
            'name'  => $a->recipient_name,
            'text'  => $a->address_text,
            'lat'   => $a->latitude !== null ? (float) $a->latitude : null,
            'lng'   => $a->longitude !== null ? (float) $a->longitude : null,
            'def'   => (bool) $a->is_default,
        ];
    }
}
