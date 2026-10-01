<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class BannersController extends Controller
{
    public function index()
    {
        $admin = Auth::user();

        return view('admin.banners', [
            'bannersData' => [
                'admin' => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'banners' => Banner::orderBy('sort_order')->orderByDesc('id')
                    ->get()->map(fn (Banner $b) => $this->present($b))->all(),
                'urls' => [
                    'store'   => route('admin.banners.store'),
                    'update'  => route('admin.banners.update', ['banner' => '__ID__']),
                    'toggle'  => route('admin.banners.toggle', ['banner' => '__ID__']),
                    'destroy' => route('admin.banners.destroy', ['banner' => '__ID__']),
                    'upload'  => route('admin.banners.upload'),
                    'reorder' => route('admin.banners.reorder'),
                ],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['sort_order'] = (Banner::max('sort_order') ?? 0) + 1;

        $banner = Banner::create($data);

        return response()->json(['banner' => $this->present($banner)], 201);
    }

    public function update(Request $request, Banner $banner): JsonResponse
    {
        $data = $this->validated($request);

        // Xoá ảnh cũ nếu thay bằng ảnh khác
        foreach (['image_desktop', 'image_mobile'] as $field) {
            if (($banner->$field ?? null) && $banner->$field !== ($data[$field] ?? null)) {
                $this->deleteStored($banner->$field);
            }
        }

        $banner->update($data);

        return response()->json(['banner' => $this->present($banner->fresh())]);
    }

    /** Sắp xếp lại thứ tự banner theo danh sách id kéo-thả. */
    public function reorder(Request $request): JsonResponse
    {
        $ids = $request->validate(['ids' => ['required', 'array']])['ids'];

        foreach ($ids as $i => $id) {
            Banner::where('id', $id)->update(['sort_order' => $i]);
        }

        return response()->json(['ok' => true]);
    }

    public function toggle(Banner $banner): JsonResponse
    {
        $banner->status = $banner->status === 'active' ? 'inactive' : 'active';
        $banner->save();

        return response()->json(['banner' => $this->present($banner)]);
    }

    public function destroy(Banner $banner): JsonResponse
    {
        $this->deleteStored($banner->image_desktop);
        $this->deleteStored($banner->image_mobile);
        $banner->delete();

        return response()->json(['message' => 'Đã xoá banner']);
    }

    /** Upload ảnh banner (max 4MB) — trả về URL công khai. */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:4096'],
        ], [
            'file.required' => 'Vui lòng chọn ảnh',
            'file.image'    => 'Tệp phải là hình ảnh',
            'file.mimes'    => 'Ảnh phải là JPG, PNG, WEBP hoặc GIF',
            'file.max'      => 'Kích thước ảnh tối đa 4MB',
        ]);

        $path = Storage::disk('public')->put('banners', $request->file('file'));

        return response()->json(['url' => Storage::url($path)]);
    }

    /* ─── Helpers ─── */

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title'         => ['nullable', 'string', 'max:150'],
            'subtitle'      => ['nullable', 'string', 'max:300'],
            'text_position' => ['nullable', Rule::in(['none', 'inside', 'outside'])],
            'text_align'    => ['nullable', Rule::in(['left', 'center', 'right'])],
            'image_desktop' => ['required', 'string', 'max:500'],
            'image_mobile'  => ['nullable', 'string', 'max:500'],
            'link_url'      => ['nullable', 'string', 'max:500'],
            'status'        => ['required', Rule::in(['active', 'inactive'])],
        ], [
            'image_desktop.required' => 'Vui lòng tải lên banner desktop',
        ]);

        return [
            'title'         => trim($data['title'] ?? '') ?: null,
            'subtitle'      => trim($data['subtitle'] ?? '') ?: null,
            'text_position' => $data['text_position'] ?? 'none',
            'text_align'    => $data['text_align'] ?? 'left',
            'image_desktop' => $data['image_desktop'],
            'image_mobile'  => $data['image_mobile'] ?? null,
            'link_url'      => trim($data['link_url'] ?? '') ?: null,
            'status'        => $data['status'],
        ];
    }

    private function present(Banner $b): array
    {
        return [
            'id'            => $b->id,
            'title'         => $b->title ?? '',
            'subtitle'      => $b->subtitle ?? '',
            'text_position' => $b->text_position ?: 'none',
            'text_align'    => $b->text_align ?: 'left',
            'image_desktop' => $b->image_desktop,
            'image_mobile'  => $b->image_mobile,
            'link_url'      => $b->link_url ?? '',
            'status'        => $b->status,
        ];
    }

    private function deleteStored(?string $url): void
    {
        if (!$url) return;
        $path = str_replace('/storage/', '', parse_url($url, PHP_URL_PATH) ?? $url);
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';
        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1)) ?: 'QT';
    }
}
