<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StoresController extends Controller
{
    public function index()
    {
        $admin = Auth::user();

        return view('admin.stores', [
            'storesData' => [
                'admin' => [
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'stores' => $this->storesList(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $store = Store::create($data);

        return response()->json(['store' => $this->present($store)]);
    }

    public function update(Request $request, Store $store)
    {
        $data = $this->validated($request);

        $store->update($data);

        return response()->json(['store' => $this->present($store)]);
    }

    public function toggle(Store $store)
    {
        $store->status = $store->status === 'active' ? 'inactive' : 'active';
        $store->save();

        return response()->json(['store' => $this->present($store)]);
    }

    public function destroy(Store $store)
    {
        if ($store->staff()->exists() || $store->customers()->exists()) {
            return response()->json([
                'message' => 'Không thể xoá cửa hàng đang có nhân viên hoặc khách hàng gắn với cửa hàng này.',
            ], 422);
        }

        $store->delete();

        return response()->json(['message' => 'Đã xoá cửa hàng']);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:1000'],
            'city' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'opening_time' => ['required', 'date_format:H:i'],
            'closing_time' => ['required', 'date_format:H:i'],
            'operating_days' => ['required', 'array', 'min:1'],
            'operating_days.*' => ['integer', 'between:0,6'],
            'status' => ['required', 'in:active,inactive'],
        ], [
            'name.required' => 'Vui lòng nhập tên cửa hàng',
            'address.required' => 'Vui lòng nhập địa chỉ',
            'city.required' => 'Vui lòng nhập thành phố',
            'phone.required' => 'Vui lòng nhập số điện thoại',
            'email.email' => 'Email không hợp lệ',
            'latitude.between' => 'Vĩ độ phải trong khoảng -90 đến 90',
            'longitude.between' => 'Kinh độ phải trong khoảng -180 đến 180',
            'opening_time.required' => 'Vui lòng nhập giờ mở cửa',
            'opening_time.date_format' => 'Giờ mở cửa không hợp lệ (HH:MM)',
            'closing_time.required' => 'Vui lòng nhập giờ đóng cửa',
            'closing_time.date_format' => 'Giờ đóng cửa không hợp lệ (HH:MM)',
            'operating_days.required' => 'Vui lòng chọn ngày hoạt động',
            'operating_days.min' => 'Vui lòng chọn ít nhất một ngày hoạt động',
        ]);

        $data['opening_time'] .= ':00';
        $data['closing_time'] .= ':00';
        sort($data['operating_days']);
        $data['operating_days'] = array_values($data['operating_days']);

        return $data;
    }

    private function storesList()
    {
        return Store::withCount(['staff', 'customers'])
            ->orderBy('id')
            ->get()
            ->map(fn (Store $s) => $this->present($s))
            ->values();
    }

    private function present(Store $store): array
    {
        $store->loadCount(['staff', 'customers']);

        return [
            'id' => $store->id,
            'name' => $store->name,
            'address' => $store->address,
            'city' => $store->city,
            'phone' => $store->phone,
            'email' => $store->email,
            'latitude' => $store->latitude !== null ? (float) $store->latitude : null,
            'longitude' => $store->longitude !== null ? (float) $store->longitude : null,
            'opening_time' => substr((string) $store->opening_time, 0, 5),
            'closing_time' => substr((string) $store->closing_time, 0, 5),
            'operating_days' => $store->operating_days ?? [],
            'status' => $store->status,
            'staffCount' => $store->staff_count,
            'customerCount' => $store->customers_count,
        ];
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
