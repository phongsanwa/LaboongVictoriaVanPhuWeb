<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\CustomerTier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    /** Default values used until an admin saves overrides. */
    private const GENERAL_DEFAULTS = [
        'brand' => 'Laboong',
        'tagline' => 'Victoria Văn Phú · Trà sữa & cà phê',
        'email' => 'hello@laboong.vn',
        'hotline' => '1900 8386',
        'logo_url' => null,
        'favicon_url' => null,
    ];

    private const POINTS_DEFAULTS = [
        'per_point' => 10000,
        'welcome' => 50,
        'expiry' => 12,
        'rounding' => 'down',
    ];

    private const NOTIF_DEFAULTS = [
        'earn' => true,
        'expiry' => true,
        'promo' => true,
        'tier' => true,
        'birthday' => true,
        'weekly' => false,
    ];

    private const INTEGRATIONS = [
        ['id' => 'kiotviet', 'name' => 'KiotViet POS', 'desc' => 'Đồng bộ hoá đơn & tích điểm tự động', 'logo' => 'K', 'grad' => 'linear-gradient(135deg,#2B6CB0,#4A90D9)', 'default' => true],
        ['id' => 'zalo', 'name' => 'Zalo OA', 'desc' => 'Gửi thông báo & chăm sóc khách qua Zalo', 'logo' => 'Z', 'grad' => 'linear-gradient(135deg,#0068FF,#3B8BFF)', 'default' => true],
        ['id' => 'vnpay', 'name' => 'VNPAY QR', 'desc' => 'Thanh toán QR & tích điểm cùng lúc', 'logo' => 'V', 'grad' => 'linear-gradient(135deg,#005A9E,#0089D0)', 'default' => false],
        ['id' => 'gsheets', 'name' => 'Google Sheets', 'desc' => 'Xuất dữ liệu khách hàng định kỳ', 'logo' => 'G', 'grad' => 'linear-gradient(135deg,#0F9D58,#34A853)', 'default' => false],
    ];

    /** Tier UI metadata (color/background) cycled by level for tiers not in this list. */
    private const TIER_STYLES = [
        ['color' => '#7C8794', 'bg' => '#EEF1F4'],
        ['color' => '#C99A2E', 'bg' => '#FBF1D8'],
        ['color' => '#1E8FA8', 'bg' => '#DCF0F4'],
        ['color' => '#6B4FA0', 'bg' => '#EDE7F6'],
    ];

    public function index()
    {
        $admin = Auth::user();

        $general = AppSetting::get('general', self::GENERAL_DEFAULTS);
        $points = AppSetting::get('points', self::POINTS_DEFAULTS);
        $notif = AppSetting::get('notifications', self::NOTIF_DEFAULTS);
        $integEnabled = AppSetting::get('integrations', collect(self::INTEGRATIONS)->mapWithKeys(fn ($i) => [$i['id'] => $i['default']])->all());

        $tiers = CustomerTier::orderBy('level')->get()->values()->map(function (CustomerTier $tier, int $i) {
            $style = self::TIER_STYLES[$i % count(self::TIER_STYLES)];

            return [
                'id' => $tier->id,
                'label' => $tier->name,
                'min' => $tier->min_points,
                'mult' => (float) $tier->point_multiplier,
                'color' => $tier->color_code ?: $style['color'],
                'bg' => $style['bg'],
            ];
        })->all();

        $integrations = array_map(fn ($i) => [
            'id' => $i['id'],
            'name' => $i['name'],
            'desc' => $i['desc'],
            'logo' => $i['logo'],
            'grad' => $i['grad'],
            'on' => (bool) ($integEnabled[$i['id']] ?? $i['default']),
        ], self::INTEGRATIONS);

        return view('admin.settings', [
            'settingsData' => [
                'admin' => [
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'general' => $general,
                'points' => $points,
                'tiers' => $tiers,
                'notifications' => array_merge(self::NOTIF_DEFAULTS, $notif),
                'integrations' => $integrations,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'general' => ['required', 'array'],
            'general.brand' => ['required', 'string', 'max:100'],
            'general.tagline' => ['required', 'string', 'max:150'],
            'general.email' => ['required', 'email'],
            'general.hotline' => ['required', 'string', 'max:30'],

            'points' => ['required', 'array'],
            'points.per_point' => ['required', 'integer', 'min:1'],
            'points.welcome' => ['required', 'integer', 'min:0'],
            'points.expiry' => ['required', 'integer', 'min:0'],
            'points.rounding' => ['required', 'in:down,nearest,up'],

            'tiers' => ['required', 'array'],
            'tiers.*.id' => ['required', 'integer', 'exists:customer_tiers,id'],
            'tiers.*.min' => ['required', 'integer', 'min:0'],
            'tiers.*.mult' => ['required', 'numeric', 'min:1'],

            'notifications' => ['required', 'array'],
            'notifications.earn' => ['required', 'boolean'],
            'notifications.expiry' => ['required', 'boolean'],
            'notifications.promo' => ['required', 'boolean'],
            'notifications.tier' => ['required', 'boolean'],
            'notifications.birthday' => ['required', 'boolean'],
            'notifications.weekly' => ['required', 'boolean'],

            'integrations' => ['required', 'array'],
            'integrations.*.id' => ['required', 'string'],
            'integrations.*.on' => ['required', 'boolean'],
        ]);

        $current = AppSetting::get('general', self::GENERAL_DEFAULTS);
        $general = $data['general'];
        $general['logo_url'] = $current['logo_url'] ?? null;
        $general['favicon_url'] = $current['favicon_url'] ?? null;
        AppSetting::set('general', $general);
        AppSetting::set('points', $data['points']);
        AppSetting::set('notifications', $data['notifications']);

        $integEnabled = collect($data['integrations'])->mapWithKeys(fn ($i) => [$i['id'] => (bool) $i['on']])->all();
        AppSetting::set('integrations', $integEnabled);

        foreach ($data['tiers'] as $tier) {
            CustomerTier::where('id', $tier['id'])->update([
                'min_points' => $tier['min'],
                'point_multiplier' => $tier['mult'],
            ]);
        }

        return response()->json(['message' => 'Đã lưu thay đổi cài đặt']);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'mimes:png,jpg,jpeg,svg,webp', 'max:2048'],
        ], [
            'logo.required' => 'Vui lòng chọn một tệp hình ảnh',
            'logo.image' => 'Tệp phải là hình ảnh (PNG, JPG, SVG, WEBP)',
            'logo.mimes' => 'Tệp phải là hình ảnh (PNG, JPG, SVG, WEBP)',
            'logo.max' => 'Kích thước ảnh tối đa 2MB',
        ]);

        $url = $this->replaceGeneralImage('logo_url', $request->file('logo'), 'branding');

        return response()->json(['message' => 'Đã tải lên logo', 'logo_url' => $url]);
    }

    public function deleteLogo(): JsonResponse
    {
        $this->removeGeneralImage('logo_url');

        return response()->json(['message' => 'Đã xoá logo']);
    }

    public function uploadFavicon(Request $request): JsonResponse
    {
        $request->validate([
            'favicon' => ['required', 'image', 'mimes:png,jpg,jpeg,ico,svg,webp', 'max:512'],
        ], [
            'favicon.required' => 'Vui lòng chọn một tệp hình ảnh',
            'favicon.image' => 'Tệp phải là hình ảnh (PNG, ICO, SVG, WEBP)',
            'favicon.mimes' => 'Tệp phải là hình ảnh (PNG, ICO, SVG, WEBP)',
            'favicon.max' => 'Kích thước ảnh tối đa 512KB',
        ]);

        $url = $this->replaceGeneralImage('favicon_url', $request->file('favicon'), 'branding');

        return response()->json(['message' => 'Đã tải lên favicon', 'favicon_url' => $url]);
    }

    public function deleteFavicon(): JsonResponse
    {
        $this->removeGeneralImage('favicon_url');

        return response()->json(['message' => 'Đã xoá favicon']);
    }

    /** Stores a new image for a general-settings field, removing the previous file, and returns its public URL. */
    private function replaceGeneralImage(string $field, \Illuminate\Http\UploadedFile $file, string $folder): string
    {
        $general = AppSetting::get('general', self::GENERAL_DEFAULTS);

        if (!empty($general[$field])) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $general[$field]));
        }

        $general[$field] = Storage::url($file->store($folder, 'public'));
        AppSetting::set('general', $general);

        return $general[$field];
    }

    /** Removes a stored image for a general-settings field, if any. */
    private function removeGeneralImage(string $field): void
    {
        $general = AppSetting::get('general', self::GENERAL_DEFAULTS);

        if (!empty($general[$field])) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $general[$field]));
        }

        $general[$field] = null;
        AppSetting::set('general', $general);
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
