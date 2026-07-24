<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\RolePermission;
use App\Models\Staff;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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
    public const PERM_GROUPS = [
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

        $saved = RolePermission::all()->keyBy(fn ($row) => $row->role . '.' . $row->permission_key);

        $perms = [];
        foreach (self::PERM_GROUPS as $group) {
            foreach ($group['perms'] as $p) {
                $state = [];
                foreach (['cashier', 'manager'] as $role) {
                    $key = $role . '.' . $p['id'];
                    $state[$role] = $saved->has($key) ? (bool) $saved[$key]->enabled : $p[$role];
                }
                $perms[$p['id']] = $state;
            }
        }

        $roles = $this->buildRoles($perms);

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
                'stores' => Store::orderBy('id')->get(['id', 'name'])
                    ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->all(),
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

    /** Assign an existing user to a role (cashier/manager), creating their staff record if needed. */
    public function assign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'role' => ['required', Rule::in(array_keys(self::ROLES))],
            // Nhiều cửa hàng nhân viên phụ trách (bỏ trống = giữ nguyên/mặc định cửa hàng đầu)
            'store_ids'   => ['nullable', 'array'],
            'store_ids.*' => ['integer', 'exists:stores,id'],
        ]);

        $user = User::where('phone', $data['phone'])->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'phone' => 'Không tìm thấy người dùng với số điện thoại này',
            ]);
        }

        if ($user->user_type === 'admin') {
            throw ValidationException::withMessages([
                'phone' => 'Không thể gán vai trò cho quản trị viên',
            ]);
        }

        $storeIds = array_values(array_unique(array_map('intval', $data['store_ids'] ?? [])));
        $primary  = $storeIds[0] ?? Store::orderBy('id')->value('id');

        $staff = Staff::where('user_id', $user->id)->first();

        if ($staff) {
            $staff->role = $data['role'];
            $staff->status = 'active';
            if (!empty($storeIds)) {
                $staff->store_id = $primary;
            }
            $staff->save();
        } else {
            $staff = Staff::create([
                'user_id' => $user->id,
                'store_id' => $primary,
                'role' => $data['role'],
                'employee_code' => $this->nextEmployeeCode(),
                'pin' => (string) random_int(100000, 999999),
                'status' => 'active',
                'hired_date' => now(),
            ]);
        }

        // Đồng bộ bảng nối cửa hàng (chỉ khi có gửi lên; giữ nguyên nếu bỏ trống)
        if (!empty($storeIds)) {
            $staff->stores()->sync($storeIds);
        } elseif ($staff->stores()->count() === 0 && $staff->store_id) {
            $staff->stores()->sync([$staff->store_id]);
        }

        if ($user->user_type !== 'admin') {
            $user->user_type = 'staff';
            $user->save();
        }

        return response()->json([
            'message' => "Đã gán \"{$user->name}\" vào vai trò " . self::ROLES[$data['role']]['label'],
            'roles' => $this->buildRoles($this->currentPerms()),
        ]);
    }

    /** Cập nhật danh sách cửa hàng nhân viên phụ trách. */
    public function setStore(Request $request, Staff $staff): JsonResponse
    {
        $data = $request->validate([
            'store_ids'   => ['required', 'array', 'min:1'],
            'store_ids.*' => ['integer', 'exists:stores,id'],
        ], [
            'store_ids.required' => 'Vui lòng chọn ít nhất 1 cửa hàng',
            'store_ids.min'      => 'Vui lòng chọn ít nhất 1 cửa hàng',
        ]);

        $storeIds = array_values(array_unique(array_map('intval', $data['store_ids'])));
        $staff->stores()->sync($storeIds);
        // Cửa hàng chính = cửa hàng đầu (giữ tương thích POS/thống kê)
        $staff->update(['store_id' => $storeIds[0]]);

        return response()->json([
            'message' => 'Đã cập nhật cửa hàng cho "' . ($staff->user->name ?? 'nhân viên') . '"',
            'roles' => $this->buildRoles($this->currentPerms()),
        ]);
    }

    /** Remove a staff member from their role (deactivates their staff record). */
    public function removeStaff(Staff $staff): JsonResponse
    {
        $staff->status = 'inactive';
        $staff->save();

        return response()->json([
            'message' => 'Đã gỡ nhân viên khỏi vai trò',
            'roles' => $this->buildRoles($this->currentPerms()),
        ]);
    }

    /** Current effective permission matrix (saved overrides applied over defaults). */
    private function currentPerms(): array
    {
        $saved = RolePermission::all()->keyBy(fn ($row) => $row->role . '.' . $row->permission_key);

        $perms = [];
        foreach (self::PERM_GROUPS as $group) {
            foreach ($group['perms'] as $p) {
                $state = [];
                foreach (['cashier', 'manager'] as $role) {
                    $key = $role . '.' . $p['id'];
                    $state[$role] = $saved->has($key) ? (bool) $saved[$key]->enabled : $p[$role];
                }
                $perms[$p['id']] = $state;
            }
        }

        return $perms;
    }

    /** Builds the role cards data (counts, team avatars) from the current permission matrix. */
    private function buildRoles(array $perms): array
    {
        $staffByRole = Staff::with(['user', 'store', 'stores'])
            ->whereIn('role', ['cashier', 'manager'])
            ->where('status', 'active')
            ->get()
            ->groupBy('role');

        $counts = ['cashier' => 0, 'manager' => 0];
        foreach ($perms as $state) {
            foreach (['cashier', 'manager'] as $role) {
                if ($state[$role]) {
                    $counts[$role]++;
                }
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
                    'id' => $s->id,
                    'name' => $s->user->name,
                    'phone' => $s->user->phone,
                    'store_id' => $s->store_id,
                    'store' => $s->store->name ?? '—',
                    'store_ids'   => $s->storeIds(),
                    'store_names' => ($s->stores->isNotEmpty() ? $s->stores : collect([$s->store])->filter())
                        ->pluck('name')->filter()->values()->all(),
                    'color' => self::AVATAR_COLORS[$i % count(self::AVATAR_COLORS)],
                ])->all(),
            ];
        }

        return $roles;
    }

    /** Generates the next sequential "NVxxx" employee code. */
    private function nextEmployeeCode(): string
    {
        $max = Staff::query()
            ->where('employee_code', 'like', 'NV%')
            ->get()
            ->map(fn ($s) => (int) substr($s->employee_code, 2))
            ->max();

        return 'NV' . str_pad((string) (($max ?? 0) + 1), 3, '0', STR_PAD_LEFT);
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
