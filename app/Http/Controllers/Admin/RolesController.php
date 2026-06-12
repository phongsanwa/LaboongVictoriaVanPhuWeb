<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\RolePermission;
use App\Models\Staff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RolesController extends Controller
{
    /** Role metadata shown on the role cards. */
    private const ROLES = [
        'cashier' => [
            'label' => 'Thu ngân',
            'ic' => 'scan',
            'grad' => 'linear-gradient(150deg,#1E8FA8,#4FC3D9)',
            'desc' => 'Nhân viên tại quầy — xử lý tích điểm, đổi quà và tra cứu khách hàng cơ bản.',
        ],
        'manager' => [
            'label' => 'Quản lý',
            'ic' => 'shield',
            'grad' => 'linear-gradient(150deg,#0F623F,#07432A)',
            'desc' => 'Quản lý cửa hàng — toàn quyền vận hành, marketing, báo cáo và phân quyền nhân viên.',
        ],
    ];

    /** Color palette cycled for staff avatars. */
    private const AVATAR_COLORS = ['#FF8A5B', '#1E8FA8', '#C99A2E', '#6B4FA0', '#3E7CB1', '#E0518A', '#0F623F', '#9B4DA0'];

    /**
     * Permission matrix. Each entry's 'cashier'/'manager' values are the
     * default state used the first time a permission is seen (before any
     * row exists in role_permissions).
     */
    private const PERM_GROUPS = [
        ['title' => 'Tích điểm & giao dịch', 'ic' => 'receipt', 'perms' => [
            ['id' => 'scan', 'name' => 'Quét mã QR tích điểm', 'desc' => 'Quét mã thành viên để cộng điểm khi bán hàng', 'cashier' => true, 'manager' => true],
            ['id' => 'adjust', 'name' => 'Cộng / trừ điểm thủ công', 'desc' => 'Điều chỉnh điểm kèm lý do', 'cashier' => false, 'manager' => true],
            ['id' => 'tx_view', 'name' => 'Xem lịch sử giao dịch', 'desc' => 'Tra cứu các giao dịch tích / tiêu điểm', 'cashier' => true, 'manager' => true],
            ['id' => 'tx_void', 'name' => 'Huỷ / hoàn giao dịch', 'desc' => 'Thu hồi điểm khi sai sót hoặc hoàn hàng', 'cashier' => false, 'manager' => true],
        ]],
        ['title' => 'Khách hàng', 'ic' => 'users', 'perms' => [
            ['id' => 'cust_list', 'name' => 'Xem danh sách khách hàng', 'desc' => 'Truy cập danh bạ thành viên', 'cashier' => true, 'manager' => true],
            ['id' => 'cust_detail', 'name' => 'Xem chi tiết hồ sơ', 'desc' => 'Hồ sơ, điểm và lịch sử của từng khách', 'cashier' => true, 'manager' => true],
            ['id' => 'cust_edit', 'name' => 'Sửa thông tin khách', 'desc' => 'Cập nhật tên, SĐT, email…', 'cashier' => false, 'manager' => true],
            ['id' => 'cust_export', 'name' => 'Xuất dữ liệu (Excel/CSV)', 'desc' => 'Tải danh sách khách hàng', 'cashier' => false, 'manager' => true],
        ]],
        ['title' => 'Quà & Voucher', 'ic' => 'gift', 'perms' => [
            ['id' => 'redeem', 'name' => 'Đổi quà cho khách', 'desc' => 'Xác nhận đổi điểm lấy quà / voucher', 'cashier' => true, 'manager' => true],
            ['id' => 'gift_edit', 'name' => 'Tạo / sửa voucher & quà', 'desc' => 'Quản lý danh mục phần thưởng', 'cashier' => false, 'manager' => true],
            ['id' => 'gift_del', 'name' => 'Xoá voucher & quà', 'desc' => 'Gỡ phần thưởng khỏi danh mục', 'cashier' => false, 'manager' => true],
        ]],
        ['title' => 'Chiến dịch & Marketing', 'ic' => 'mega', 'perms' => [
            ['id' => 'camp_view', 'name' => 'Xem chiến dịch', 'desc' => 'Theo dõi các chương trình đang chạy', 'cashier' => true, 'manager' => true],
            ['id' => 'camp_edit', 'name' => 'Tạo / sửa chiến dịch', 'desc' => 'Thiết lập ưu đãi, điều kiện, đối tượng', 'cashier' => false, 'manager' => true],
            ['id' => 'push', 'name' => 'Gửi push notification', 'desc' => 'Gửi thông báo đẩy tới khách hàng', 'cashier' => false, 'manager' => true],
        ]],
        ['title' => 'Báo cáo & Hệ thống', 'ic' => 'gear', 'perms' => [
            ['id' => 'report', 'name' => 'Xem báo cáo & thống kê', 'desc' => 'Doanh thu, điểm phát hành, hiệu quả CT', 'cashier' => false, 'manager' => true],
            ['id' => 'staff', 'name' => 'Quản lý nhân viên & phân quyền', 'desc' => 'Thêm nhân viên, gán vai trò', 'cashier' => false, 'manager' => true, 'lockManager' => true],
            ['id' => 'settings', 'name' => 'Cài đặt hệ thống', 'desc' => 'Cấu hình cửa hàng, quy tắc tích điểm', 'cashier' => false, 'manager' => true],
        ]],
    ];

    public function index()
    {
        $admin = Auth::user();

        $staffByRole = Staff::with('user')
            ->whereIn('role', ['cashier', 'manager'])
            ->where('status', 'active')
            ->get()
            ->groupBy('role');

        $saved = RolePermission::all()->keyBy(fn ($row) => $row->role . '.' . $row->permission_key);

        $perms = [];
        $counts = ['cashier' => 0, 'manager' => 0];
        foreach (self::PERM_GROUPS as $group) {
            foreach ($group['perms'] as $p) {
                $state = [];
                foreach (['cashier', 'manager'] as $role) {
                    $key = $role . '.' . $p['id'];
                    $state[$role] = $saved->has($key) ? (bool) $saved[$key]->enabled : $p[$role];
                    if ($state[$role]) {
                        $counts[$role]++;
                    }
                }
                $perms[$p['id']] = $state;
            }
        }

        $roles = [];
        foreach (self::ROLES as $key => $meta) {
            $team = ($staffByRole[$key] ?? collect())->values();
            $roles[$key] = [
                'key' => $key,
                'label' => $meta['label'],
                'ic' => $meta['ic'],
                'grad' => $meta['grad'],
                'desc' => $meta['desc'],
                'count' => $counts[$key],
                'staff' => $team->map(fn ($s, $i) => [
                    'name' => $s->user->name,
                    'color' => self::AVATAR_COLORS[$i % count(self::AVATAR_COLORS)],
                ])->all(),
            ];
        }

        $permGroups = array_map(fn ($g) => [
            'title' => $g['title'],
            'ic' => $g['ic'],
            'perms' => array_map(fn ($p) => [
                'id' => $p['id'],
                'name' => $p['name'],
                'desc' => $p['desc'],
                'lockManager' => $p['lockManager'] ?? false,
            ], $g['perms']),
        ], self::PERM_GROUPS);

        return view('admin.roles', [
            'rolesData' => [
                'admin' => [
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'roles' => $roles,
                'total' => array_sum(array_map(fn ($g) => count($g['perms']), self::PERM_GROUPS)),
                'permGroups' => $permGroups,
                'perms' => $perms,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $allIds = collect(self::PERM_GROUPS)->flatMap(fn ($g) => collect($g['perms'])->pluck('id'))->all();
        $lockedManager = collect(self::PERM_GROUPS)
            ->flatMap(fn ($g) => $g['perms'])
            ->filter(fn ($p) => $p['lockManager'] ?? false)
            ->pluck('id')
            ->all();

        $data = $request->validate([
            'perms' => ['required', 'array'],
            'perms.*' => ['required', 'array'],
            'perms.*.cashier' => ['required', 'boolean'],
            'perms.*.manager' => ['required', 'boolean'],
        ]);

        foreach ($data['perms'] as $permId => $state) {
            if (!in_array($permId, $allIds, true)) {
                continue;
            }

            foreach (['cashier', 'manager'] as $role) {
                $enabled = (bool) $state[$role];
                if ($role === 'manager' && in_array($permId, $lockedManager, true)) {
                    $enabled = true;
                }

                RolePermission::updateOrCreate(
                    ['role' => $role, 'permission_key' => $permId],
                    ['enabled' => $enabled]
                );
            }
        }

        return response()->json(['message' => 'Đã lưu thay đổi phân quyền']);
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
