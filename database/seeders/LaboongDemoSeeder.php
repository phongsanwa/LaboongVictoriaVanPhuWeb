<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;

class LaboongDemoSeeder extends Seeder
{
    /**
     * Seed demo data for the Laboong loyalty app.
     */
    public function run(): void
    {
        $now = Carbon::now();

        /* ---------------- customer_tiers ---------------- */
        $tierIds = [];
        foreach ([
            ['name' => 'Hạng Bạc', 'level' => 1, 'min_points' => 0, 'min_transactions' => 0, 'min_days_active' => 0, 'point_multiplier' => 1.00, 'description' => 'Hạng mặc định cho thành viên mới', 'color_code' => '#9CA3AF', 'icon_url' => null],
            ['name' => 'Hạng Vàng', 'level' => 2, 'min_points' => 1000, 'min_transactions' => 10, 'min_days_active' => 30, 'point_multiplier' => 1.20, 'description' => 'Tích lũy từ 1.000 điểm', 'color_code' => '#FFB13D', 'icon_url' => null],
            ['name' => 'Hạng Kim Cương', 'level' => 3, 'min_points' => 5000, 'min_transactions' => 30, 'min_days_active' => 90, 'point_multiplier' => 1.50, 'description' => 'Tích lũy từ 5.000 điểm', 'color_code' => '#38BDF8', 'icon_url' => null],
        ] as $tier) {
            $tierIds[$tier['level']] = DB::table('customer_tiers')->insertGetId($tier + [
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        /* ---------------- stores ---------------- */
        $storeIds = [];
        $storeIds['vp'] = DB::table('stores')->insertGetId([
            'name' => 'Laboong Victoria Văn Phú',
            'address' => 'S2.03 KĐT Văn Phú, P. Phú La, Hà Đông, Hà Nội',
            'city' => 'Hà Nội',
            'phone' => '0243 555 0101',
            'email' => 'vanphu@laboong.vn',
            'latitude' => 20.965230,
            'longitude' => 105.764880,
            'opening_time' => '07:00:00',
            'closing_time' => '22:30:00',
            'operating_days' => json_encode([0, 1, 2, 3, 4, 5, 6]),
            'qr_code_url' => null,
            'status' => 'active',
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $storeIds['ld'] = DB::table('stores')->insertGetId([
            'name' => 'Laboong Linh Đàm',
            'address' => 'Tòa HH2, KĐT Linh Đàm, Hoàng Mai, Hà Nội',
            'city' => 'Hà Nội',
            'phone' => '0243 555 0202',
            'email' => 'linhdam@laboong.vn',
            'latitude' => 20.964800,
            'longitude' => 105.832500,
            'opening_time' => '07:00:00',
            'closing_time' => '22:00:00',
            'operating_days' => json_encode([0, 1, 2, 3, 4, 5, 6]),
            'qr_code_url' => null,
            'status' => 'active',
            'created_at' => $now, 'updated_at' => $now,
        ]);

        /* ---------------- users ---------------- */
        $password = Hash::make('password');

        $adminId = DB::table('users')->insertGetId([
            'name' => 'Quản trị viên',
            'phone' => '0900000001',
            'email' => 'admin@laboong.vn',
            'email_verified_at' => $now,
            'phone_verified_at' => $now,
            'password' => $password,
            'user_type' => 'admin',
            'status' => 'active',
            'avatar_url' => null,
            'last_login_at' => $now,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $staffUserId = DB::table('users')->insertGetId([
            'name' => 'Trần Văn Bình',
            'phone' => '0900000002',
            'email' => 'binh.tran@laboong.vn',
            'email_verified_at' => $now,
            'phone_verified_at' => $now,
            'password' => $password,
            'user_type' => 'staff',
            'status' => 'active',
            'avatar_url' => null,
            'last_login_at' => $now,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $customerUsers = [
            'minh_anh' => [
                'name' => 'Minh Anh',
                'phone' => '0912345678',
                'email' => 'minhanh@gmail.com',
                'tier' => 2,
                'total_points' => 2450,
                'lifetime_points' => 5380,
                'total_spent' => 3450000,
                'referral_code' => 'LBVP-MANH01',
            ],
            'hoa_le' => [
                'name' => 'Lê Thị Hoa',
                'phone' => '0987654321',
                'email' => 'hoa.le@gmail.com',
                'tier' => 1,
                'total_points' => 320,
                'lifetime_points' => 320,
                'total_spent' => 480000,
                'referral_code' => 'LBVP-HOALE1',
            ],
            'long_pham' => [
                'name' => 'Phạm Văn Long',
                'phone' => '0978123456',
                'email' => 'long.pham@gmail.com',
                'tier' => 3,
                'total_points' => 6200,
                'lifetime_points' => 12500,
                'total_spent' => 9800000,
                'referral_code' => 'LBVP-LONGP1',
            ],
        ];

        $userIds = [];
        foreach ($customerUsers as $key => $c) {
            $userIds[$key] = DB::table('users')->insertGetId([
                'name' => $c['name'],
                'phone' => $c['phone'],
                'email' => $c['email'],
                'email_verified_at' => $now,
                'phone_verified_at' => $now,
                'password' => $password,
                'user_type' => 'customer',
                'status' => 'active',
                'avatar_url' => null,
                'last_login_at' => $now,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        /* ---------------- staff ---------------- */
        $staffId = DB::table('staff')->insertGetId([
            'user_id' => $staffUserId,
            'store_id' => $storeIds['vp'],
            'role' => 'manager',
            'employee_code' => 'NV001',
            'pin' => '135790',
            'status' => 'active',
            'hired_date' => $now->copy()->subYear(),
            'created_at' => $now, 'updated_at' => $now,
        ]);

        /* extra staff (for the "Phân quyền" / roles page) */
        $extraStaff = [
            ['name' => 'Hoàng Thu Trang', 'phone' => '0900000010', 'email' => 'trang.hoang@laboong.vn', 'role' => 'manager', 'code' => 'NV002', 'pin' => '246810', 'store' => 'ld'],
            ['name' => 'Phạm Gia Huy',    'phone' => '0900000011', 'email' => 'huy.pham@laboong.vn',    'role' => 'cashier', 'code' => 'NV003', 'pin' => '100001', 'store' => 'vp'],
            ['name' => 'Đỗ Khánh Linh',   'phone' => '0900000012', 'email' => 'linh.do@laboong.vn',     'role' => 'cashier', 'code' => 'NV004', 'pin' => '100002', 'store' => 'vp'],
            ['name' => 'Vũ Đức Thành',    'phone' => '0900000013', 'email' => 'thanh.vu@laboong.vn',    'role' => 'cashier', 'code' => 'NV005', 'pin' => '100003', 'store' => 'ld'],
            ['name' => 'Ngô Hải Đăng',    'phone' => '0900000014', 'email' => 'dang.ngo@laboong.vn',    'role' => 'cashier', 'code' => 'NV006', 'pin' => '100004', 'store' => 'ld'],
            ['name' => 'Lý Thanh Phong',  'phone' => '0900000015', 'email' => 'phong.ly@laboong.vn',    'role' => 'cashier', 'code' => 'NV007', 'pin' => '100005', 'store' => 'vp'],
            ['name' => 'Cao Diệu My',     'phone' => '0900000016', 'email' => 'my.cao@laboong.vn',      'role' => 'cashier', 'code' => 'NV008', 'pin' => '100006', 'store' => 'ld'],
        ];
        foreach ($extraStaff as $s) {
            $extraStaffUserId = DB::table('users')->insertGetId([
                'name' => $s['name'],
                'phone' => $s['phone'],
                'email' => $s['email'],
                'email_verified_at' => $now,
                'phone_verified_at' => $now,
                'password' => $password,
                'user_type' => 'staff',
                'status' => 'active',
                'avatar_url' => null,
                'last_login_at' => $now,
                'created_at' => $now, 'updated_at' => $now,
            ]);

            DB::table('staff')->insert([
                'user_id' => $extraStaffUserId,
                'store_id' => $storeIds[$s['store']],
                'role' => $s['role'],
                'employee_code' => $s['code'],
                'pin' => $s['pin'],
                'status' => 'active',
                'hired_date' => $now->copy()->subMonths(6),
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        /* ---------------- customers ---------------- */
        $customerIds = [];
        foreach ($customerUsers as $key => $c) {
            $customerIds[$key] = DB::table('customers')->insertGetId([
                'user_id' => $userIds[$key],
                'store_id' => $storeIds['vp'],
                'date_of_birth' => '1996-05-20',
                'gender' => null,
                'address' => null,
                'city' => 'Hà Nội',
                'tier_id' => $tierIds[$c['tier']],
                'total_points' => $c['total_points'],
                'lifetime_points' => $c['lifetime_points'],
                'total_spent' => $c['total_spent'],
                'referral_code' => $c['referral_code'],
                'referred_by_id' => null,
                'last_purchase_at' => $now->copy()->subHours(6),
                'is_newsletter' => true,
                'is_push_enabled' => true,
                'favorite_items' => json_encode(['m1', 'm2']),
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        $minhAnhId = $customerIds['minh_anh'];

        /* ---------------- helper: a date within a given past month ---------------- */
        $dateInMonth = function (int $monthsAgo, int $day, int $hour, int $minute) use ($now) {
            $monthStart = $now->copy()->subMonthsNoOverflow($monthsAgo)->startOfMonth();
            $maxDay = $monthsAgo === 0 ? min($day, $now->day) : min($day, $monthStart->daysInMonth);

            return $monthStart->copy()->addDays($maxDay - 1)->setTime($hour, $minute);
        };

        /* ---------------- extra customers (12 months of growth history) ---------------- */
        $extraCustomers = [
            ['name' => 'Nguyễn Thị Lan', 'phone' => '0911000001', 'email' => 'lan.nguyen01@gmail.com', 'tier' => 1, 'monthsAgo' => 11],
            ['name' => 'Trần Văn Minh', 'phone' => '0911000002', 'email' => 'minh.tran02@gmail.com', 'tier' => 1, 'monthsAgo' => 10],
            ['name' => 'Phạm Thị Hương', 'phone' => '0911000003', 'email' => 'huong.pham03@gmail.com', 'tier' => 2, 'monthsAgo' => 9],
            ['name' => 'Lê Văn Đức', 'phone' => '0911000004', 'email' => 'duc.le04@gmail.com', 'tier' => 1, 'monthsAgo' => 8],
            ['name' => 'Hoàng Thị Mai', 'phone' => '0911000005', 'email' => 'mai.hoang05@gmail.com', 'tier' => 2, 'monthsAgo' => 7],
            ['name' => 'Vũ Văn Tùng', 'phone' => '0911000006', 'email' => 'tung.vu06@gmail.com', 'tier' => 1, 'monthsAgo' => 6],
            ['name' => 'Đặng Thị Thu', 'phone' => '0911000007', 'email' => 'thu.dang07@gmail.com', 'tier' => 3, 'monthsAgo' => 5],
            ['name' => 'Bùi Văn Hải', 'phone' => '0911000008', 'email' => 'hai.bui08@gmail.com', 'tier' => 1, 'monthsAgo' => 4],
            ['name' => 'Ngô Thị Hằng', 'phone' => '0911000009', 'email' => 'hang.ngo09@gmail.com', 'tier' => 2, 'monthsAgo' => 3],
            ['name' => 'Đỗ Văn Quân', 'phone' => '0911000010', 'email' => 'quan.do10@gmail.com', 'tier' => 1, 'monthsAgo' => 2],
            ['name' => 'Vương Thị Nga', 'phone' => '0911000011', 'email' => 'nga.vuong11@gmail.com', 'tier' => 2, 'monthsAgo' => 1],
            ['name' => 'Phan Văn Đạt', 'phone' => '0911000012', 'email' => 'dat.phan12@gmail.com', 'tier' => 1, 'monthsAgo' => 0],
        ];

        $extraCustomerIds = [];
        foreach ($extraCustomers as $i => $c) {
            $createdAt = $dateInMonth($c['monthsAgo'], 15, 10, 0);

            $extraUserId = DB::table('users')->insertGetId([
                'name' => $c['name'],
                'phone' => $c['phone'],
                'email' => $c['email'],
                'email_verified_at' => $createdAt,
                'phone_verified_at' => $createdAt,
                'password' => $password,
                'user_type' => 'customer',
                'status' => 'active',
                'avatar_url' => null,
                'last_login_at' => $createdAt,
                'created_at' => $createdAt, 'updated_at' => $createdAt,
            ]);

            $extraCustomerIds[] = DB::table('customers')->insertGetId([
                'user_id' => $extraUserId,
                'store_id' => $i % 2 === 0 ? $storeIds['vp'] : $storeIds['ld'],
                'date_of_birth' => null,
                'gender' => null,
                'address' => null,
                'city' => 'Hà Nội',
                'tier_id' => $tierIds[$c['tier']],
                'total_points' => 0,
                'lifetime_points' => 0,
                'total_spent' => 0,
                'referral_code' => sprintf('LBVP-EXT%02d', $i + 1),
                'referred_by_id' => null,
                'last_purchase_at' => null,
                'is_newsletter' => true,
                'is_push_enabled' => true,
                'favorite_items' => json_encode([]),
                'created_at' => $createdAt, 'updated_at' => $createdAt,
            ]);
        }

        $allCustomerIds = array_merge(array_values($customerIds), $extraCustomerIds);

        /* ---------------- rewards ---------------- */
        $rewardIds = [];
        $rewardIds['free_milktea'] = DB::table('rewards')->insertGetId([
            'name' => '1 ly trà sữa size L miễn phí',
            'description' => 'Đổi 3.000 điểm lấy 1 ly trà sữa trân châu đường đen size L',
            'reward_type' => 'free_item',
            'points_required' => 3000,
            'value' => 55000,
            'quantity_available' => -1,
            'quantity_total' => null,
            'image_url' => null,
            'valid_from' => $now->copy()->subMonths(2)->toDateString(),
            'valid_until' => $now->copy()->addMonths(6)->toDateString(),
            'min_purchase' => null,
            'category' => 'drink',
            'status' => 'active',
            'display_order' => 1,
            'is_featured' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $rewardIds['voucher_30k'] = DB::table('rewards')->insertGetId([
            'name' => 'Voucher giảm 30.000đ',
            'description' => 'Áp dụng cho hóa đơn từ 99.000đ',
            'reward_type' => 'discount_voucher',
            'points_required' => 300,
            'value' => 30000,
            'quantity_available' => -1,
            'quantity_total' => null,
            'image_url' => null,
            'valid_from' => $now->copy()->subMonths(2)->toDateString(),
            'valid_until' => $now->copy()->addMonths(6)->toDateString(),
            'min_purchase' => 99000,
            'category' => 'voucher',
            'status' => 'active',
            'display_order' => 2,
            'is_featured' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $rewardIds['tier_upgrade'] = DB::table('rewards')->insertGetId([
            'name' => 'Nâng hạng Kim Cương sớm',
            'description' => 'Đổi điểm để nâng hạng thành viên ngay lập tức',
            'reward_type' => 'tier_upgrade',
            'points_required' => 5000,
            'value' => null,
            'quantity_available' => -1,
            'quantity_total' => null,
            'image_url' => null,
            'valid_from' => $now->copy()->subMonths(1)->toDateString(),
            'valid_until' => $now->copy()->addYear()->toDateString(),
            'min_purchase' => null,
            'category' => 'tier_benefit',
            'status' => 'active',
            'display_order' => 3,
            'is_featured' => false,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        /* additional rewards catalog items */
        $extraRewardIds = [];
        foreach ([
            ['key' => 'topping',          'name' => 'Thêm topping trân châu',    'reward_type' => 'free_item',       'points_required' => 80,   'value' => null,   'quantity_available' => 312, 'min_purchase' => null,   'category' => 'upgrade', 'display_order' => 4,  'is_featured' => false, 'age_days' => 60],
            ['key' => 'upsize',           'name' => 'Upsize miễn phí mọi đơn',   'reward_type' => 'free_item',       'points_required' => 120,  'value' => null,   'quantity_available' => 358, 'min_purchase' => null,   'category' => 'upgrade', 'display_order' => 5,  'is_featured' => false, 'age_days' => 55],
            ['key' => 'peach_tea',        'name' => 'Trà đào cam sả miễn phí',   'reward_type' => 'free_item',       'points_required' => 400,  'value' => 45000,  'quantity_available' => 12,  'min_purchase' => null,   'category' => 'drink',   'display_order' => 6,  'is_featured' => false, 'age_days' => 50],
            ['key' => 'voucher_50k',      'name' => 'Voucher giảm 50.000đ',      'reward_type' => 'discount_voucher','points_required' => 500,  'value' => 50000,  'quantity_available' => 116, 'min_purchase' => 150000, 'category' => 'voucher', 'display_order' => 7,  'is_featured' => false, 'age_days' => 45],
            ['key' => 'sticker',          'name' => 'Bộ sticker Laboong',        'reward_type' => 'other',           'points_required' => 200,  'value' => null,   'quantity_available' => 367, 'min_purchase' => null,   'category' => 'gift',    'display_order' => 8,  'is_featured' => false, 'age_days' => 5],
            ['key' => 'macchiato_combo',  'name' => 'Combo 2 ly Macchiato',      'reward_type' => 'free_item',       'points_required' => 800,  'value' => 110000, 'quantity_available' => 104, 'min_purchase' => null,   'category' => 'drink',   'display_order' => 9,  'is_featured' => false, 'age_days' => 40],
            ['key' => 'tote',             'name' => 'Túi tote canvas Laboong',   'reward_type' => 'other',           'points_required' => 1800, 'value' => null,   'quantity_available' => 73,  'min_purchase' => null,   'category' => 'gift',    'display_order' => 10, 'is_featured' => false, 'age_days' => 3],
            ['key' => 'thermos',          'name' => 'Ly giữ nhiệt Laboong',      'reward_type' => 'other',           'points_required' => 2500, 'value' => null,   'quantity_available' => 8,   'min_purchase' => null,   'category' => 'gift',    'display_order' => 11, 'is_featured' => false, 'age_days' => 70],
            ['key' => 'voucher_birthday', 'name' => 'Voucher sinh nhật 70.000đ', 'reward_type' => 'discount_voucher','points_required' => 700,  'value' => 70000,  'quantity_available' => 189, 'min_purchase' => 150000, 'category' => 'voucher', 'display_order' => 12, 'is_featured' => false, 'age_days' => 2],
            ['key' => 'voucher_100k',     'name' => 'Voucher giảm 100.000đ',     'reward_type' => 'discount_voucher','points_required' => 1000, 'value' => 100000, 'quantity_available' => 6,   'min_purchase' => 300000, 'category' => 'voucher', 'display_order' => 13, 'is_featured' => true,  'age_days' => 35],
        ] as $r) {
            $createdAt = $now->copy()->subDays($r['age_days']);

            $extraRewardIds[$r['key']] = DB::table('rewards')->insertGetId([
                'name' => $r['name'],
                'description' => $r['name'],
                'reward_type' => $r['reward_type'],
                'points_required' => $r['points_required'],
                'value' => $r['value'],
                'quantity_available' => $r['quantity_available'],
                'quantity_total' => $r['quantity_available'],
                'image_url' => null,
                'valid_from' => $now->copy()->subMonths(1)->toDateString(),
                'valid_until' => $now->copy()->addMonths(6)->toDateString(),
                'min_purchase' => $r['min_purchase'],
                'category' => $r['category'],
                'status' => 'active',
                'display_order' => $r['display_order'],
                'is_featured' => $r['is_featured'],
                'created_at' => $createdAt, 'updated_at' => $createdAt,
            ]);
        }

        /* ---------------- transactions + details + points ---------------- */
        // Transaction 1: today, earn points
        $tx1 = DB::table('transactions')->insertGetId([
            'transaction_code' => 'TXN' . $now->format('Ymd') . '001',
            'customer_id' => $minhAnhId,
            'store_id' => $storeIds['vp'],
            'staff_id' => $staffId,
            'total_amount' => 45000,
            'discount_amount' => 0,
            'points_earned' => 45,
            'point_multiplier' => 1.20,
            'payment_method' => 'qr_pay',
            'status' => 'completed',
            'notes' => null,
            'created_at' => $now->copy()->setTime(14, 20), 'updated_at' => $now->copy()->setTime(14, 20),
        ]);
        DB::table('transaction_details')->insert([
            'transaction_id' => $tx1,
            'item_name' => 'Trà sữa trân châu đường đen size L',
            'item_code' => 'TS-001-L',
            'quantity' => 1,
            'unit_price' => 45000,
            'total_price' => 45000,
            'notes' => null,
            'created_at' => $now->copy()->setTime(14, 20),
        ]);
        DB::table('customer_points')->insert([
            'customer_id' => $minhAnhId,
            'transaction_id' => $tx1,
            'point_type' => 'purchase',
            'points' => 45,
            'description' => 'Trà sữa trân châu đường đen',
            'reference_id' => 'TXN' . $now->format('Ymd') . '001',
            'expires_at' => $now->copy()->addYear()->toDateString(),
            'created_at' => $now->copy()->setTime(14, 20), 'updated_at' => $now->copy()->setTime(14, 20),
        ]);

        // Transaction 2: yesterday, two macchiatos
        $yesterday = $now->copy()->subDay();
        $tx2 = DB::table('transactions')->insertGetId([
            'transaction_code' => 'TXN' . $yesterday->format('Ymd') . '004',
            'customer_id' => $minhAnhId,
            'store_id' => $storeIds['vp'],
            'staff_id' => $staffId,
            'total_amount' => 120000,
            'discount_amount' => 0,
            'points_earned' => 60,
            'point_multiplier' => 1.20,
            'payment_method' => 'cash',
            'status' => 'completed',
            'notes' => null,
            'created_at' => $yesterday->copy()->setTime(12, 30), 'updated_at' => $yesterday->copy()->setTime(12, 30),
        ]);
        DB::table('transaction_details')->insert([
            'transaction_id' => $tx2,
            'item_name' => 'Macchiato kem phô mai',
            'item_code' => 'MC-002-M',
            'quantity' => 2,
            'unit_price' => 60000,
            'total_price' => 120000,
            'notes' => null,
            'created_at' => $yesterday->copy()->setTime(12, 30),
        ]);
        DB::table('customer_points')->insert([
            'customer_id' => $minhAnhId,
            'transaction_id' => $tx2,
            'point_type' => 'purchase',
            'points' => 60,
            'description' => '2 ly Macchiato kem phô mai',
            'reference_id' => 'TXN' . $yesterday->format('Ymd') . '004',
            'expires_at' => $now->copy()->addYear()->toDateString(),
            'created_at' => $yesterday->copy()->setTime(12, 30), 'updated_at' => $yesterday->copy()->setTime(12, 30),
        ]);

        /* ---------------- redemptions + vouchers ---------------- */
        $redemptionDate = $yesterday->copy()->setTime(19, 5);
        $redemptionId = DB::table('redemptions')->insertGetId([
            'redemption_code' => 'RDMP' . $yesterday->format('Ymd') . '001',
            'customer_id' => $minhAnhId,
            'reward_id' => $rewardIds['voucher_30k'],
            'points_spent' => 300,
            'quantity' => 1,
            'status' => 'used',
            'redeemed_at' => $redemptionDate,
            'used_at' => $redemptionDate,
            'expires_at' => $now->copy()->addMonths(3)->toDateString(),
            'notes' => null,
            'created_at' => $redemptionDate, 'updated_at' => $redemptionDate,
        ]);
        DB::table('customer_points')->insert([
            'customer_id' => $minhAnhId,
            'transaction_id' => null,
            'point_type' => 'redemption',
            'points' => -300,
            'description' => 'Đổi voucher giảm 30.000đ',
            'reference_id' => 'RDMP' . $yesterday->format('Ymd') . '001',
            'expires_at' => null,
            'created_at' => $redemptionDate, 'updated_at' => $redemptionDate,
        ]);
        DB::table('vouchers')->insert([
            'voucher_code' => 'VOC' . $yesterday->format('Ymd') . '001',
            'customer_id' => $minhAnhId,
            'redemption_id' => $redemptionId,
            'qr_code' => null,
            'discount_type' => 'fixed',
            'discount_value' => 30000,
            'min_purchase' => 99000,
            'max_discount' => null,
            'valid_from' => $yesterday->toDateString(),
            'valid_until' => $now->copy()->addMonths(3)->toDateString(),
            'usage_count' => 1,
            'status' => 'used',
            'used_at' => $redemptionDate,
            'used_by_staff_id' => $staffId,
            'transaction_id' => $tx2,
            'created_at' => $redemptionDate, 'updated_at' => $redemptionDate,
        ]);

        /* ---------------- campaigns ---------------- */
        $campaignIds = [];
        $campaignIds['bogo'] = DB::table('campaigns')->insertGetId([
            'name' => 'Mua 1 Tặng 1 trà sữa',
            'description' => 'Trân châu đường đen size L · Thứ 4 hàng tuần',
            'campaign_type' => 'free_item',
            'target_audience' => 'all_customers',
            'tier_id' => null,
            'store_id' => null,
            'start_date' => $now->copy()->subWeeks(2)->toDateString(),
            'end_date' => $now->copy()->addMonths(2)->toDateString(),
            'bonus_points' => null,
            'multiplier' => null,
            'min_purchase' => null,
            'max_participants' => null,
            'current_participants' => 128,
            'status' => 'active',
            'is_stackable' => false,
            'banner_image_url' => null,
            'created_by' => $adminId,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $campaignIds['discount30'] = DB::table('campaigns')->insertGetId([
            'name' => 'Giảm 30% qua App',
            'description' => 'Đơn từ 99k · áp dụng đến hết cuối tháng',
            'campaign_type' => 'discount_promotion',
            'target_audience' => 'all_customers',
            'tier_id' => null,
            'store_id' => null,
            'start_date' => $now->copy()->subWeek()->toDateString(),
            'end_date' => $now->copy()->addWeeks(3)->toDateString(),
            'bonus_points' => null,
            'multiplier' => null,
            'min_purchase' => 99000,
            'max_participants' => null,
            'current_participants' => 256,
            'status' => 'active',
            'is_stackable' => false,
            'banner_image_url' => null,
            'created_by' => $adminId,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $campaignIds['double_points'] = DB::table('campaigns')->insertGetId([
            'name' => 'Tích điểm x2 cho hạng Vàng trở lên',
            'description' => 'Áp dụng cho khách hạng Vàng và Kim Cương vào cuối tuần',
            'campaign_type' => 'double_points',
            'target_audience' => 'specific_tier',
            'tier_id' => $tierIds[2],
            'store_id' => $storeIds['vp'],
            'start_date' => $now->copy()->subDays(3)->toDateString(),
            'end_date' => $now->copy()->addMonths(1)->toDateString(),
            'bonus_points' => null,
            'multiplier' => 2.00,
            'min_purchase' => null,
            'max_participants' => -1,
            'current_participants' => 64,
            'status' => 'active',
            'is_stackable' => true,
            'banner_image_url' => null,
            'created_by' => $adminId,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        DB::table('campaign_details')->insert([
            [
                'campaign_id' => $campaignIds['double_points'],
                'rule_key' => 'time_window',
                'rule_value' => json_encode(['days' => ['Sat', 'Sun'], 'from' => '00:00', 'to' => '23:59']),
                'created_at' => $now,
            ],
            [
                'campaign_id' => $campaignIds['discount30'],
                'rule_key' => 'excluded_items',
                'rule_value' => json_encode(['Voucher', 'Thẻ quà tặng']),
                'created_at' => $now,
            ],
        ]);

        /* ---------------- otp_tokens ---------------- */
        DB::table('otp_tokens')->insert([
            'phone' => '0912345678',
            'otp_code' => '123456',
            'purpose' => 'login',
            'is_used' => true,
            'used_at' => $now->copy()->subDays(1),
            'expires_at' => $now->copy()->subDays(1)->addMinutes(3),
            'created_at' => $now->copy()->subDays(1),
        ]);

        /* ---------------- referral_rewards ---------------- */
        DB::table('referral_rewards')->insert([
            'referrer_id' => $customerIds['minh_anh'],
            'referred_user_id' => $customerIds['hoa_le'],
            'referrer_points' => 100,
            'referred_points' => 50,
            'status' => 'completed',
            'completed_at' => $now->copy()->subDays(10),
            'created_at' => $now->copy()->subDays(10), 'updated_at' => $now->copy()->subDays(10),
        ]);

        /* ---------------- 12 months of transaction history (for admin dashboard charts) ---------------- */
        $drinkMenu = [
            ['name' => 'Trà sữa trân châu đường đen', 'code' => 'TS-001-L'],
            ['name' => 'Macchiato kem phô mai', 'code' => 'MC-002-M'],
            ['name' => 'Trà đào cam sả', 'code' => 'TD-003-L'],
            ['name' => 'Cà phê sữa đá', 'code' => 'CF-004-M'],
            ['name' => 'Hồng trà sữa nướng', 'code' => 'HT-005-L'],
            ['name' => 'Matcha latte đá xay', 'code' => 'MT-006-L'],
            ['name' => 'Sữa chua trân châu', 'code' => 'SC-007-M'],
            ['name' => 'Cacao đá xay', 'code' => 'CC-008-L'],
        ];
        $paymentMethods = ['cash', 'qr_pay'];
        $storeRotation = [$storeIds['vp'], $storeIds['ld']];

        for ($monthsAgo = 11; $monthsAgo >= 0; $monthsAgo--) {
            $m = 11 - $monthsAgo; // 0..11, 0 = oldest
            $count = 6 + ($m % 4);

            for ($i = 0; $i < $count; $i++) {
                $amount = 35000 + (($m * 37 + $i * 53) % 12) * 10000;
                $points = (int) round($amount / 1000);
                $item = $drinkMenu[($m + $i) % count($drinkMenu)];
                $storeId = $storeRotation[($m + $i) % 2];
                $payment = $paymentMethods[($m + $i) % 2];
                $customerId = $allCustomerIds[($m * 7 + $i) % count($allCustomerIds)];
                $day = 2 + (($m * 5 + $i * 3) % 26);
                $hour = 8 + (($m + $i) % 12);
                $minute = ($i * 17) % 60;
                $txDate = $dateInMonth($monthsAgo, $day, $hour, $minute);

                $txId = DB::table('transactions')->insertGetId([
                    'transaction_code' => 'TXN' . $txDate->format('Ymd') . str_pad((string) ($i + 10), 3, '0', STR_PAD_LEFT),
                    'customer_id' => $customerId,
                    'store_id' => $storeId,
                    'staff_id' => $staffId,
                    'total_amount' => $amount,
                    'discount_amount' => 0,
                    'points_earned' => $points,
                    'point_multiplier' => 1.00,
                    'payment_method' => $payment,
                    'status' => 'completed',
                    'notes' => null,
                    'created_at' => $txDate, 'updated_at' => $txDate,
                ]);

                DB::table('transaction_details')->insert([
                    'transaction_id' => $txId,
                    'item_name' => $item['name'],
                    'item_code' => $item['code'],
                    'quantity' => 1,
                    'unit_price' => $amount,
                    'total_price' => $amount,
                    'notes' => null,
                    'created_at' => $txDate,
                ]);

                DB::table('customer_points')->insert([
                    'customer_id' => $customerId,
                    'transaction_id' => $txId,
                    'point_type' => 'purchase',
                    'points' => $points,
                    'description' => $item['name'],
                    'reference_id' => 'TXN' . $txDate->format('Ymd') . str_pad((string) ($i + 10), 3, '0', STR_PAD_LEFT),
                    'expires_at' => $txDate->copy()->addYear()->toDateString(),
                    'created_at' => $txDate, 'updated_at' => $txDate,
                ]);
            }
        }

        /* ---------------- 6 months of redemption history (for admin dashboard charts) ---------------- */
        $redemptionRewardRotation = [
            ['key' => 'voucher_30k', 'reward_id' => $rewardIds['voucher_30k'], 'points' => 300, 'name' => 'Voucher giảm 30.000đ'],
            ['key' => 'topping', 'reward_id' => $extraRewardIds['topping'], 'points' => 80, 'name' => 'Thêm topping trân châu'],
            ['key' => 'voucher_50k', 'reward_id' => $extraRewardIds['voucher_50k'], 'points' => 500, 'name' => 'Voucher giảm 50.000đ'],
            ['key' => 'upsize', 'reward_id' => $extraRewardIds['upsize'], 'points' => 120, 'name' => 'Upsize miễn phí mọi đơn'],
            ['key' => 'sticker', 'reward_id' => $extraRewardIds['sticker'], 'points' => 200, 'name' => 'Bộ sticker Laboong'],
        ];

        for ($monthsAgo = 5; $monthsAgo >= 0; $monthsAgo--) {
            $m = 5 - $monthsAgo; // 0..5, 5 = this month
            $count = 1 + ($m % 2);

            for ($i = 0; $i < $count; $i++) {
                $reward = $redemptionRewardRotation[($m + $i) % count($redemptionRewardRotation)];
                $customerId = $allCustomerIds[($m * 5 + $i) % count($allCustomerIds)];
                $day = 4 + (($m * 6 + $i * 5) % 22);
                $hour = 13 + (($m + $i) % 8);
                $minute = ($i * 23) % 60;
                $rDate = $dateInMonth($monthsAgo, $day, $hour, $minute);

                DB::table('redemptions')->insertGetId([
                    'redemption_code' => 'RDMP' . $rDate->format('Ymd') . str_pad((string) ($i + 10), 3, '0', STR_PAD_LEFT),
                    'customer_id' => $customerId,
                    'reward_id' => $reward['reward_id'],
                    'points_spent' => $reward['points'],
                    'quantity' => 1,
                    'status' => 'used',
                    'redeemed_at' => $rDate,
                    'used_at' => $rDate,
                    'expires_at' => $rDate->copy()->addMonths(3)->toDateString(),
                    'notes' => null,
                    'created_at' => $rDate, 'updated_at' => $rDate,
                ]);

                DB::table('customer_points')->insert([
                    'customer_id' => $customerId,
                    'transaction_id' => null,
                    'point_type' => 'redemption',
                    'points' => -$reward['points'],
                    'description' => 'Đổi ' . $reward['name'],
                    'reference_id' => 'RDMP' . $rDate->format('Ymd') . str_pad((string) ($i + 10), 3, '0', STR_PAD_LEFT),
                    'expires_at' => null,
                    'created_at' => $rDate, 'updated_at' => $rDate,
                ]);
            }
        }
    }
}
