<?php

namespace App\Http\Controllers;

use App\Models\CustomerAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        $customer = $user->customer()->with(['tier', 'addresses'])->first();

        $member = [
            'name'       => $user->name,
            'email'      => $user->email,
            'dob'        => $customer?->date_of_birth?->toDateString(),
            'phone'      => $user->phone,
            'tier'       => $customer?->tier->name ?? '',
            'id'         => $customer?->referral_code ?? ('LBVP-' . str_pad((string) ($customer?->id ?? 0), 5, '0', STR_PAD_LEFT)),
            'avatar_url' => $user->avatar_url,
        ];

        $addresses = ($customer?->addresses ?? collect())->map(fn (CustomerAddress $a) => $this->formatAddress($a))->values()->all();

        return view('profile', ['profileData' => [
            'member'       => $member,
            'addresses'    => $addresses,
            'favorites'    => $customer?->favorite_items ?? [],
            'googleMapsKey'  => config('services.google_maps.key', ''),
        ]]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = Auth::user();
        $customer = $user->customer()->first();

        $request->merge(['dob' => $request->input('dob') ?: null]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'dob' => ['nullable', 'date'],
            'favorites' => ['array'],
            'favorites.*' => ['string'],
        ], [
            'name.min' => 'Vui lòng nhập họ tên',
            'email.email' => 'Email không hợp lệ',
            'email.unique' => 'Email này đã được sử dụng',
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        if ($customer) {
            $customer->update([
                'date_of_birth' => $validated['dob'] ?? null,
                'favorite_items' => $validated['favorites'] ?? [],
            ]);
        }

        return response()->json(['message' => 'Đã lưu thông tin cá nhân']);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:2048', 'mimes:jpg,jpeg,png,webp,gif'],
        ], [
            'avatar.image'  => 'File phải là hình ảnh',
            'avatar.max'    => 'Ảnh tối đa 2MB',
            'avatar.mimes'  => 'Định dạng hỗ trợ: JPG, PNG, WebP, GIF',
        ]);

        $user = Auth::user();

        if ($user->avatar_url && str_starts_with($user->avatar_url, '/storage/avatars/')) {
            Storage::disk('public')->delete('avatars/' . basename($user->avatar_url));
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $url  = '/storage/' . $path;

        $user->forceFill(['avatar_url' => $url])->save();

        return response()->json(['avatar_url' => $url]);
    }

    public function storeAddress(Request $request): JsonResponse
    {
        $customer = Auth::user()->customer()->first();

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'text' => ['required', 'string', 'min:6'],
            'def' => ['boolean'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $address = $customer->addresses()->create([
            'label' => $validated['label'],
            'recipient_name' => $validated['name'],
            'address_text' => $validated['text'],
            'is_default' => (bool) ($validated['def'] ?? false) || $customer->addresses()->count() === 0,
            'latitude' => $validated['lat'] ?? null,
            'longitude' => $validated['lng'] ?? null,
        ]);

        if ($address->is_default) {
            $customer->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
        }

        return response()->json(['message' => 'Đã thêm địa chỉ', 'address' => $this->formatAddress($address)]);
    }

    public function updateAddress(Request $request, CustomerAddress $address): JsonResponse
    {
        $this->authorizeAddress($address);

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'text' => ['required', 'string', 'min:6'],
            'def' => ['boolean'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $address->update([
            'label' => $validated['label'],
            'recipient_name' => $validated['name'],
            'address_text' => $validated['text'],
            'is_default' => (bool) ($validated['def'] ?? false),
            'latitude' => $validated['lat'] ?? null,
            'longitude' => $validated['lng'] ?? null,
        ]);

        if ($address->is_default) {
            $address->customer->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
        }

        return response()->json(['message' => 'Đã cập nhật địa chỉ', 'address' => $this->formatAddress($address)]);
    }

    public function destroyAddress(CustomerAddress $address): JsonResponse
    {
        $this->authorizeAddress($address);

        $customer = $address->customer;
        $wasDefault = $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $customer->addresses()->orderBy('id')->first()?->update(['is_default' => true]);
        }

        return response()->json(['message' => 'Đã xoá địa chỉ']);
    }

    public function setDefaultAddress(CustomerAddress $address): JsonResponse
    {
        $this->authorizeAddress($address);

        $address->customer->addresses()->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return response()->json(['message' => 'Đã đặt địa chỉ mặc định']);
    }

    private function authorizeAddress(CustomerAddress $address): void
    {
        $customer = Auth::user()->customer()->first();

        abort_unless($customer && $address->customer_id === $customer->id, 403);
    }

    private function formatAddress(CustomerAddress $address): array
    {
        return [
            'id' => $address->id,
            'label' => $address->label,
            'name' => $address->recipient_name,
            'text' => $address->address_text,
            'def' => $address->is_default,
            'lat' => $address->latitude ? (float) $address->latitude : null,
            'lng' => $address->longitude ? (float) $address->longitude : null,
        ];
    }
}
