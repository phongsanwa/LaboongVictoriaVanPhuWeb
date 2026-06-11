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
    }
}
