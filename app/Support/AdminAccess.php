<?php

namespace App\Support;

use App\Http\Controllers\Admin\RolesController;
use App\Models\RolePermission;
use App\Models\User;

/**
 * Quyền truy cập trang admin cho tài khoản quản lý (staff cashier/manager).
 * Admin (user_type=admin) luôn có toàn quyền; staff active được kiểm tra theo
 * ma trận phân quyền trên trang /admin/roles (bản lưu đè lên mặc định).
 */
class AdminAccess
{
    /** Nhãn mục sidebar → permission key cần có để thấy/mở trang (null = mọi staff active). */
    public const NAV_PERMS = [
        'Tổng quan'           => null,
        'Khách hàng'          => 'cust_list',
        'Điểm & giao dịch'    => 'tx_view',
        'Đơn hàng'            => 'order_view',
        'Phí ship'            => 'ship_edit',
        'Đổi quà'             => 'gift_edit',
        'Chiến dịch'          => 'camp_view',
        'Tin tức'             => 'news_edit',
        'Banner'              => 'banner_edit',
        'SEO'                 => 'seo_edit',
        'Điểm danh'           => 'checkin_edit',
        'Thực đơn'            => 'menu_edit',
        'Khuyến mãi'          => 'promo_edit',
        'Variant / Tuỳ chọn'  => 'variant_edit',
        'Cửa hàng'            => 'store_edit',
        'Phân quyền'          => 'staff',
        'Cài đặt'             => 'settings',
    ];

    /** Staff active với vai trò hợp lệ (hoặc admin) mới được vào khu admin. */
    public static function canEnter(?User $user): bool
    {
        if (!$user) return false;
        if ($user->user_type === 'admin') return true;

        $staff = $user->staff;

        return $staff
            && $staff->status === 'active'
            && in_array($staff->role, ['cashier', 'manager'], true);
    }

    public static function allows(?User $user, string $permKey): bool
    {
        if (!$user) return false;
        if ($user->user_type === 'admin') return true;
        if (!self::canEnter($user)) return false;

        return self::roleAllows($user->staff->role, $permKey);
    }

    /** Quyền hiệu lực của một vai trò: bản lưu trong role_permissions, chưa lưu thì dùng mặc định. */
    public static function roleAllows(string $role, string $permKey): bool
    {
        $saved = RolePermission::where('role', $role)
            ->where('permission_key', $permKey)
            ->first();

        if ($saved) {
            return (bool) $saved->enabled;
        }

        foreach (RolesController::PERM_GROUPS as $group) {
            foreach ($group['perms'] as $p) {
                if ($p['id'] === $permKey) {
                    return (bool) ($p[$role] ?? false);
                }
            }
        }

        return false;
    }

    /** Danh sách nhãn sidebar user được thấy (null = admin, thấy tất cả). */
    public static function allowedNavLabels(?User $user): ?array
    {
        if (!$user || $user->user_type === 'admin') return null;
        if (!self::canEnter($user)) return [];

        $role = $user->staff->role;

        return array_keys(array_filter(
            self::NAV_PERMS,
            fn ($perm) => $perm === null || self::roleAllows($role, $perm)
        ));
    }
}
