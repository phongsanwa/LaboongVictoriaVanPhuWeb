<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class SeoController extends Controller
{
    /** Các trang có thể tuỳ chỉnh SEO + giá trị mặc định (dùng khi admin chưa sửa). */
    public const PAGES = [
        'home' => [
            'label' => 'Trang chủ',
            'title' => 'Laboong Victoria Văn Phú · Trà sữa & Tích điểm',
            'desc'  => 'Trà sữa Laboong Victoria Văn Phú, Hà Đông — tích điểm mỗi ly, điểm danh nhận thưởng, đổi quà và đặt món giao tận nơi.',
        ],
        'login' => [
            'label' => 'Đăng nhập',
            'title' => 'Đăng nhập · Laboong Victoria Văn Phú',
            'desc'  => 'Đăng nhập tài khoản thành viên Laboong Victoria Văn Phú để tích điểm, đổi quà và đặt trà sữa giao tận nơi.',
        ],
        'register' => [
            'label' => 'Đăng ký',
            'title' => 'Đăng ký thành viên · Laboong Victoria Văn Phú',
            'desc'  => 'Tạo tài khoản Laboong Victoria Văn Phú miễn phí — nhận ưu đãi thành viên, tích điểm mỗi đơn và quà sinh nhật.',
        ],
        'menu' => [
            'label' => 'Thực đơn',
            'title' => 'Thực đơn · Laboong Victoria Văn Phú',
            'desc'  => 'Thực đơn trà sữa Laboong: trà sữa trân châu, trà trái cây, topping đa dạng — đặt món online, giao nhanh tại Hà Đông.',
        ],
        'store' => [
            'label' => 'Cửa hàng',
            'title' => 'Cửa hàng · Laboong Victoria Văn Phú',
            'desc'  => 'Địa chỉ, giờ mở cửa và bản đồ cửa hàng Laboong Victoria Văn Phú, Hà Đông, Hà Nội.',
        ],
        'rewards' => [
            'label' => 'Đổi quà',
            'title' => 'Đổi quà · Laboong',
            'desc'  => 'Dùng điểm tích luỹ Laboong đổi voucher, món miễn phí và quà tặng hấp dẫn.',
        ],
    ];

    public function index()
    {
        $admin = Auth::user();
        $saved = AppSetting::get('seo', []);

        $pages = [];
        foreach (self::PAGES as $key => $def) {
            $over = $saved['pages'][$key] ?? [];
            $pages[] = [
                'key'          => $key,
                'label'        => $def['label'],
                'defaultTitle' => $def['title'],
                'defaultDesc'  => $def['desc'],
                'title'        => $over['title'] ?? '',
                'desc'         => $over['desc'] ?? '',
                'index'        => (bool) ($over['index'] ?? true),
            ];
        }

        return view('admin.seo', [
            'seoData' => [
                'admin' => [
                    'name'     => $admin->name,
                    'email'    => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'pages'    => $pages,
                'og_image' => $saved['og_image'] ?? '',
                'urls'     => [
                    'update' => route('admin.seo.update'),
                    'upload' => route('admin.seo.upload'),
                ],
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'og_image'        => ['nullable', 'string', 'max:500'],
            'pages'           => ['required', 'array'],
            'pages.*.title'   => ['nullable', 'string', 'max:100'],
            'pages.*.desc'    => ['nullable', 'string', 'max:300'],
            'pages.*.index'   => ['nullable', 'boolean'],
        ]);

        $pages = [];
        foreach (self::PAGES as $key => $def) {
            $in = $data['pages'][$key] ?? [];
            $pages[$key] = [
                'title' => trim($in['title'] ?? '') ?: null,
                'desc'  => trim($in['desc'] ?? '') ?: null,
                'index' => (bool) ($in['index'] ?? true),
            ];
        }

        $ogImage = $data['og_image'] ?? null;
        // Không lưu URL tạm blob: của trình duyệt
        if ($ogImage && str_starts_with($ogImage, 'blob:')) $ogImage = null;

        AppSetting::set('seo', [
            'og_image' => $ogImage,
            'pages'    => $pages,
        ]);

        return response()->json(['message' => 'Đã lưu cấu hình SEO']);
    }

    /** Upload ảnh chia sẻ mạng xã hội (og:image) — khuyến nghị 1200×630. */
    public function upload(Request $request): JsonResponse
    {
        $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072']]);
        $path = Storage::disk('public')->put('seo', $request->file('image'));

        return response()->json(['url' => Storage::url($path)]);
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
