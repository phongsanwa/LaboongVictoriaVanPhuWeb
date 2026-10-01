# Database Schema - App Tích Điểm F&B

## Tóm Tắt Các Bảng Cần Tạo

| Bảng | Mục Đích | Kế Thừa |
|------|----------|--------|
| **users** | Lưu tài khoản khách/nhân viên/admin | users (Laravel) |
| **customers** | Thông tin chi tiết khách hàng | - |
| **stores** | Danh sách cửa hàng | - |
| **staff** | Thông tin nhân viên | - |
| **customer_points** | Lịch sử tích/trừ điểm | - |
| **customer_tiers** | Cấp độ VIP khách hàng | - |
| **transactions** | Giao dịch mua hàng | - |
| **transaction_details** | Chi tiết từng item trong giao dịch | - |
| **rewards** | Danh mục quà tặng | - |
| **redemptions** | Lịch sử đổi quà | - |
| **vouchers** | Template voucher | - |
| **user_vouchers** | Voucher của từng khách | - |
| **campaigns** | Chương trình khuyến mãi | - |
| **campaign_details** | Chi tiết rule campaign | - |
| **otp_tokens** | OTP gửi cho khách | - |

---

## CHI TIẾT CÁC BẢNG

### 1️⃣ USERS (Laravel)
Mở rộng bảng users mặc định của Laravel để lưu tất cả loại user

```
TABLE: users
├─ id (BIGINT, PK)
├─ name (VARCHAR 255) - Tên đầy đủ
├─ phone (VARCHAR 20, UNIQUE) - Số điện thoại (login identifier)
├─ email (VARCHAR 255, UNIQUE, NULLABLE) - Email
├─ password (VARCHAR 255) - Mật khẩu (hashed)
├─ user_type (ENUM: 'customer', 'staff', 'admin') - Loại user
├─ status (ENUM: 'active', 'inactive', 'banned') - Trạng thái
├─ phone_verified_at (TIMESTAMP, NULLABLE) - Thời gian xác thực SĐT
├─ avatar_url (VARCHAR 500, NULLABLE) - Link ảnh đại diện
├─ last_login_at (TIMESTAMP, NULLABLE) - Lần đăng nhập cuối
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ phone (UNIQUE)
├─ email (UNIQUE)
├─ user_type
├─ status
```

**Mục đích**: Bảng chính chứa tài khoản cho khách hàng, nhân viên, admin
**Ghi chú**: SĐT dùng làm username/login identifier

---

### 2️⃣ CUSTOMERS
Mở rộng thông tin khách hàng

```
TABLE: customers
├─ id (BIGINT, PK)
├─ user_id (BIGINT, FK → users.id)
├─ store_id (BIGINT, FK → stores.id, NULLABLE) - Cửa hàng chính
├─ date_of_birth (DATE, NULLABLE) - Ngày sinh
├─ gender (ENUM: 'M', 'F', 'Other', NULLABLE)
├─ address (TEXT, NULLABLE) - Địa chỉ
├─ city (VARCHAR 100, NULLABLE) - Thành phố
├─ tier_id (BIGINT, FK → customer_tiers.id) - Cấp độ hiện tại
├─ total_points (INT, DEFAULT 0) - Tổng điểm đang có
├─ lifetime_points (INT, DEFAULT 0) - Tổng điểm từng tích (không trừ)
├─ total_spent (DECIMAL 15,2, DEFAULT 0) - Tổng chi tiêu (VNĐ)
├─ referral_code (VARCHAR 20, UNIQUE, NULLABLE) - Mã giới thiệu
├─ referred_by_id (BIGINT, FK → users.id, NULLABLE) - ID người giới thiệu
├─ last_purchase_at (TIMESTAMP, NULLABLE) - Lần mua cuối
├─ is_newsletter (BOOLEAN, DEFAULT 1) - Đăng ký newsletter
├─ is_push_enabled (BOOLEAN, DEFAULT 1) - Cho phép push notification
├─ favorite_items (JSON, NULLABLE) - Danh sách ID món yêu thích
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ user_id (UNIQUE)
├─ store_id
├─ tier_id
├─ referral_code (UNIQUE)
├─ last_purchase_at
```

**Mục đích**: Lưu thông tin khách hàng, điểm, tier, prefereces

---

### 3️⃣ STORES
Danh sách cửa hàng

```
TABLE: stores
├─ id (BIGINT, PK)
├─ name (VARCHAR 255) - Tên cửa hàng
├─ address (TEXT) - Địa chỉ
├─ city (VARCHAR 100)
├─ phone (VARCHAR 20)
├─ email (VARCHAR 255, NULLABLE)
├─ latitude (DECIMAL 10,8, NULLABLE)
├─ longitude (DECIMAL 11,8, NULLABLE)
├─ opening_time (TIME) - Giờ mở cửa
├─ closing_time (TIME) - Giờ đóng cửa
├─ operating_days (JSON) - Ngày hoạt động [0-6 = Mon-Sun]
├─ qr_code_url (VARCHAR 500, NULLABLE) - QR code tích điểm của cửa hàng
├─ status (ENUM: 'active', 'inactive') - Trạng thái hoạt động
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ city
├─ status
```

**Mục đích**: Quản lý thông tin cơ bản các cửa hàng

---

### 4️⃣ STAFF
Thông tin nhân viên

```
TABLE: staff
├─ id (BIGINT, PK)
├─ user_id (BIGINT, FK → users.id)
├─ store_id (BIGINT, FK → stores.id) - Cửa hàng làm việc
├─ role (ENUM: 'cashier', 'manager', 'owner') - Vai trò
├─ employee_code (VARCHAR 50, UNIQUE) - Mã nhân viên
├─ pin (VARCHAR 6) - PIN 6 số để login tại POS/app
├─ status (ENUM: 'active', 'inactive')
├─ hired_date (DATE)
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ user_id (UNIQUE)
├─ store_id
├─ role
├─ employee_code (UNIQUE)
```

**Mục đích**: Quản lý nhân viên cửa hàng (Thu ngân, Quản lý, Chủ shop)

---

### 5️⃣ CUSTOMER_TIERS
Cấp độ VIP khách hàng

```
TABLE: customer_tiers
├─ id (BIGINT, PK)
├─ name (VARCHAR 100) - Tên tier (Bạc, Vàng, Kim cương)
├─ level (INT) - Mức độ (1, 2, 3)
├─ min_points (INT) - Điểm tối thiểu để lên tier này
├─ min_transactions (INT, NULLABLE) - Số giao dịch tối thiểu
├─ min_days_active (INT, NULLABLE) - Số ngày hoạt động tối thiểu
├─ point_multiplier (DECIMAL 3,2) - Nhân số điểm (1.0, 1.2, 1.5)
├─ description (TEXT, NULLABLE)
├─ color_code (VARCHAR 10, NULLABLE) - Hex color (#FFB800)
├─ icon_url (VARCHAR 500, NULLABLE) - URL icon
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ level (UNIQUE)
├─ min_points
```

**Mục đích**: Định nghĩa cấp độ loyalty (single tier lúc MVP, multi-tier ở Phase 2)

---

### 6️⃣ CUSTOMER_POINTS
Lịch sử tích/trừ điểm

```
TABLE: customer_points
├─ id (BIGINT, PK)
├─ customer_id (BIGINT, FK → customers.id)
├─ transaction_id (BIGINT, FK → transactions.id, NULLABLE)
├─ point_type (ENUM: 'purchase', 'redemption', 'bonus', 'admin', 'referral', 'campaign')
├─ points (INT, SIGNED) - Số điểm (dương hoặc âm)
├─ description (VARCHAR 255) - Mô tả (vd: "Mua cà phê")
├─ reference_id (VARCHAR 50, NULLABLE) - ID tham chiếu (bill ID, redemption ID)
├─ expires_at (DATE, NULLABLE) - Ngày hết hạn điểm (NULL = không hết hạn)
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ customer_id
├─ transaction_id
├─ point_type
├─ created_at
├─ expires_at
```

**Mục đích**: Lịch sử chi tiết mỗi lần cộng/trừ điểm của khách
**Ghi chú**: points có thể âm (khi đổi quà). Điểm có expiry_date.

---

### 7️⃣ TRANSACTIONS
Giao dịch mua hàng

```
TABLE: transactions
├─ id (BIGINT, PK)
├─ transaction_code (VARCHAR 50, UNIQUE) - Mã hóa đơn (vd: TXN20240615001)
├─ customer_id (BIGINT, FK → customers.id)
├─ store_id (BIGINT, FK → stores.id)
├─ staff_id (BIGINT, FK → staff.id, NULLABLE) - Thu ngân xử lý
├─ total_amount (DECIMAL 15,2) - Tổng tiền (VNĐ)
├─ discount_amount (DECIMAL 15,2, DEFAULT 0) - Tiền giảm (voucher)
├─ points_earned (INT) - Điểm nhận được
├─ point_multiplier (DECIMAL 3,2, DEFAULT 1.0) - Bội số điểm lúc mua
├─ payment_method (ENUM: 'cash', 'card', 'mobile_wallet', 'qr_pay')
├─ status (ENUM: 'completed', 'pending', 'cancelled') - Trạng thái
├─ notes (TEXT, NULLABLE)
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ transaction_code (UNIQUE)
├─ customer_id
├─ store_id
├─ created_at
├─ status
```

**Mục đích**: Ghi nhận mỗi giao dịch mua hàng tại cửa hàng

---

### 8️⃣ TRANSACTION_DETAILS
Chi tiết từng item trong giao dịch

```
TABLE: transaction_details
├─ id (BIGINT, PK)
├─ transaction_id (BIGINT, FK → transactions.id)
├─ item_name (VARCHAR 255) - Tên món
├─ item_code (VARCHAR 100, NULLABLE) - Mã món (nếu sync từ POS)
├─ quantity (INT)
├─ unit_price (DECIMAL 10,2)
├─ total_price (DECIMAL 15,2)
├─ notes (TEXT, NULLABLE)
├─ created_at (TIMESTAMP)

INDEXES:
├─ transaction_id
```

**Mục đích**: Chi tiết từng món trong giao dịch (tùy chọn, có thể bỏ nếu không cần analytics chi tiết)

---

### 9️⃣ REWARDS
Danh mục quà tặng

```
TABLE: rewards
├─ id (BIGINT, PK)
├─ name (VARCHAR 255) - Tên quà (vd: "Voucher 30k")
├─ description (TEXT, NULLABLE)
├─ reward_type (ENUM: 'discount_voucher', 'free_item', 'tier_upgrade', 'other')
├─ points_required (INT) - Số điểm cần đổi
├─ value (DECIMAL 10,2, NULLABLE) - Giá trị quà (nếu là voucher)
├─ quantity_available (INT, NULLABLE) - Số lượng còn lại (-1 = unlimited)
├─ quantity_total (INT, NULLABLE) - Tổng số lượng ban đầu
├─ image_url (VARCHAR 500, NULLABLE) - Ảnh quà
├─ valid_from (DATE)
├─ valid_until (DATE)
├─ min_purchase (DECIMAL 10,2, NULLABLE) - Đơn tối thiểu để dùng
├─ category (VARCHAR 100, NULLABLE) - Loại quà (drink, food, tier_benefit)
├─ status (ENUM: 'active', 'inactive', 'archived')
├─ display_order (INT) - Thứ tự hiển thị
├─ is_featured (BOOLEAN, DEFAULT 0) - Hiển thị nổi bật
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ points_required
├─ category
├─ status
├─ is_featured
├─ valid_until
```

**Mục đích**: Danh sách quà tặng có sẵn
**Ghi chú**: quantity_available = -1 nghĩa là unlimited (vd: discount voucher%)

---

### 🔟 REDEMPTIONS
Lịch sử đổi quà

```
TABLE: redemptions
├─ id (BIGINT, PK)
├─ redemption_code (VARCHAR 50, UNIQUE) - Mã đổi quà (vd: RDMP20240615001)
├─ customer_id (BIGINT, FK → customers.id)
├─ reward_id (BIGINT, FK → rewards.id)
├─ points_spent (INT) - Điểm đã dùng
├─ quantity (INT, DEFAULT 1) - Số lượng quà đổi
├─ status (ENUM: 'pending', 'approved', 'used', 'expired', 'cancelled')
├─ redeemed_at (TIMESTAMP, NULLABLE) - Ngày đổi
├─ used_at (TIMESTAMP, NULLABLE) - Ngày sử dụng quà
├─ expires_at (DATE, NULLABLE) - Ngày hết hạn
├─ notes (TEXT, NULLABLE)
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ redemption_code (UNIQUE)
├─ customer_id
├─ reward_id
├─ status
├─ used_at
├─ expires_at
```

**Mục đích**: Ghi nhận mỗi lần khách đổi quà

---

### 1️⃣1️⃣ VOUCHERS
Template/Instance voucher

```
TABLE: vouchers
├─ id (BIGINT, PK)
├─ voucher_code (VARCHAR 50, UNIQUE) - Mã voucher (vd: VOC2024001)
├─ customer_id (BIGINT, FK → customers.id) - Khách sở hữu
├─ redemption_id (BIGINT, FK → redemptions.id) - Lịch sử đổi quà
├─ qr_code (VARCHAR 500, NULLABLE) - QR code image URL
├─ discount_type (ENUM: 'fixed', 'percentage') - Loại giảm giá
├─ discount_value (DECIMAL 10,2) - Giá trị giảm
├─ min_purchase (DECIMAL 10,2, NULLABLE) - Đơn tối thiểu
├─ max_discount (DECIMAL 10,2, NULLABLE) - Giảm giá tối đa (nếu %)
├─ valid_from (DATE)
├─ valid_until (DATE)
├─ usage_count (INT, DEFAULT 0) - Lần sử dụng (0 hoặc 1 để prevent duplicate)
├─ status (ENUM: 'active', 'used', 'expired', 'cancelled')
├─ used_at (TIMESTAMP, NULLABLE)
├─ used_by_staff_id (BIGINT, FK → staff.id, NULLABLE)
├─ transaction_id (BIGINT, FK → transactions.id, NULLABLE) - Giao dịch sử dụng
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ voucher_code (UNIQUE)
├─ customer_id
├─ status
├─ valid_until
├─ used_at
```

**Mục đích**: Instance cụ thể của voucher mà khách sở hữu

---

### 1️⃣2️⃣ CAMPAIGNS
Chương trình khuyến mãi

```
TABLE: campaigns
├─ id (BIGINT, PK)
├─ name (VARCHAR 255) - Tên campaign
├─ description (TEXT, NULLABLE)
├─ campaign_type (ENUM: 'double_points', 'bonus_points', 'discount_promotion', 'free_item')
├─ target_audience (ENUM: 'all_customers', 'specific_tier', 'new_customers', 'vip_only')
├─ tier_id (BIGINT, FK → customer_tiers.id, NULLABLE) - Nếu target tier cụ thể
├─ store_id (BIGINT, FK → stores.id, NULLABLE) - Nếu áp dụng 1 cửa hàng (NULL = tất cả)
├─ start_date (DATE)
├─ end_date (DATE)
├─ bonus_points (INT, NULLABLE) - Điểm thưởng (nếu bonus_points campaign)
├─ multiplier (DECIMAL 3,2, NULLABLE) - Bội số (2.0 = x2) nếu double_points
├─ min_purchase (DECIMAL 10,2, NULLABLE) - Điều kiện mua tối thiểu
├─ max_participants (INT, NULLABLE) - Giới hạn số người tham gia (-1 = unlimited)
├─ current_participants (INT, DEFAULT 0) - Số người hiện tại
├─ status (ENUM: 'draft', 'active', 'scheduled', 'ended')
├─ is_stackable (BOOLEAN, DEFAULT 0) - Có thể kết hợp với campaign khác
├─ banner_image_url (VARCHAR 500, NULLABLE)
├─ created_by (BIGINT, FK → users.id)
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ campaign_type
├─ status
├─ start_date
├─ end_date
├─ store_id
```

**Mục đích**: Quản lý các chương trình KM (x2 điểm, tặng bonus, v.v.)

---

### 1️⃣3️⃣ CAMPAIGN_DETAILS
Chi tiết quy tắc campaign (tùy chọn)

```
TABLE: campaign_details
├─ id (BIGINT, PK)
├─ campaign_id (BIGINT, FK → campaigns.id)
├─ rule_key (VARCHAR 100) - Tên rule (vd: 'time_window', 'excluded_items')
├─ rule_value (JSON) - Giá trị rule
├─ created_at (TIMESTAMP)

INDEXES:
├─ campaign_id
```

**Mục đích**: Lưu các quy tắc phức tạp của campaign (time window, excluded items, v.v.)

---

### 1️⃣4️⃣ OTP_TOKENS
Token OTP gửi cho khách hàng

```
TABLE: otp_tokens
├─ id (BIGINT, PK)
├─ phone (VARCHAR 20) - Số điện thoại nhận OTP
├─ otp_code (VARCHAR 6) - Mã OTP (6 số)
├─ purpose (ENUM: 'registration', 'login', 'password_reset')
├─ is_used (BOOLEAN, DEFAULT 0)
├─ used_at (TIMESTAMP, NULLABLE)
├─ expires_at (TIMESTAMP) - Hết hạn sau 3 phút
├─ created_at (TIMESTAMP)

INDEXES:
├─ phone
├─ created_at
├─ expires_at
```

**Mục đích**: Lưu OTP tạm thời cho xác thực SĐT

---

### 1️⃣5️⃣ REFERRAL_REWARDS (Tùy chọn)
Quản lý referral program

```
TABLE: referral_rewards
├─ id (BIGINT, PK)
├─ referrer_id (BIGINT, FK → customers.id) - Người giới thiệu
├─ referred_user_id (BIGINT, FK → customers.id) - Người được giới thiệu
├─ referrer_points (INT) - Điểm nhận được
├─ referred_points (INT) - Điểm người được giới thiệu nhận
├─ status (ENUM: 'pending', 'completed', 'cancelled')
├─ completed_at (TIMESTAMP, NULLABLE)
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)

INDEXES:
├─ referrer_id
├─ referred_user_id
├─ status
```

**Mục đích**: Theo dõi referral program (người giới thiệu bạn bè)

---

## ER DIAGRAM (Mối Quan Hệ)

```
                ┌─────────────┐
                │    users    │
                │ (Bảng mở rộng)
                │   (Laravel) │
                └──────┬──────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼────┐    ┌───▼────┐    ┌───▼───┐
    │customers│   │  staff │    │admins │
    └───┬────┘    └───┬────┘    └───────┘
        │             │
        │      ┌──────▼──────┐
        │      │    stores   │
        │      └─────────────┘
        │
    ┌───▼──────────────────────────┐
    │   customer_points            │
    │ (Lịch sử tích/trừ điểm)      │
    └──────────────────────────────┘
        │
    ┌───▼──────────────────────────┐
    │   transactions               │
    │ (Giao dịch mua hàng)         │
    └──────┬───────────────────────┘
           │
    ┌──────▼──────────────┐
    │transaction_details  │
    └─────────────────────┘
        
    ┌────────────┐
    │  rewards   │
    │(Danh mục)  │
    └──────┬─────┘
           │
    ┌──────▼─────────────────┐
    │ redemptions            │
    │(Lịch sử đổi quà)       │
    └──────┬─────────────────┘
           │
    ┌──────▼─────────────────┐
    │ vouchers              │
    │(Voucher cụ thể)       │
    └───────────────────────┘

    ┌──────────────┐
    │ campaigns    │
    │(Khuyến mãi)  │
    └──────────────┘
```

---

## MIGRATION COMMAND LARAVEL

Để tạo migration files, chạy:

```bash
# Base tables
php artisan make:migration create_customers_table
php artisan make:migration create_stores_table
php artisan make:migration create_staff_table
php artisan make:migration create_customer_tiers_table

# Points & Rewards
php artisan make:migration create_customer_points_table
php artisan make:migration create_rewards_table
php artisan make:migration create_redemptions_table
php artisan make:migration create_vouchers_table

# Transactions
php artisan make:migration create_transactions_table
php artisan make:migration create_transaction_details_table

# Campaigns
php artisan make:migration create_campaigns_table
php artisan make:migration create_campaign_details_table

# OTP & Referral
php artisan make:migration create_otp_tokens_table
php artisan make:migration create_referral_rewards_table
```

---

## TÓMT ẮT: BẢNG ESSENTIAL vs NICE-TO-HAVE

### ✅ ESSENTIAL (MVP - Phải tạo)
```
1. users (mở rộng Laravel)
2. customers
3. stores
4. customer_points
5. transactions
6. rewards
7. redemptions
8. vouchers
9. otp_tokens
10. staff
11. customer_tiers
```

### 🟡 IMPORTANT (Nên tạo sớm)
```
12. campaigns
13. transaction_details
```

### 💙 NICE-TO-HAVE (Phase 2)
```
14. campaign_details (nếu campaign phức tạp)
15. referral_rewards (nếu có referral program)
```

---

## THỨ TỰ TẠO MIGRATION

**Ngôn ngữ**: Tạo bảng cha trước, con sau (follow foreign keys)

```
1. users (Laravel - có sẵn)
2. stores
3. customer_tiers
4. customers (FK → users, stores, customer_tiers)
5. staff (FK → users, stores)
6. transactions (FK → customers, stores, staff)
7. transaction_details (FK → transactions)
8. customer_points (FK → customers, transactions)
9. rewards
10. redemptions (FK → customers, rewards)
11. vouchers (FK → customers, redemptions, staff, transactions)
12. campaigns (FK → customer_tiers, stores, users)
13. campaign_details (FK → campaigns)
14. otp_tokens
15. referral_rewards (FK → customers)
```

---

## SAMPLE MIGRATION CODE (Laravel)

### Migration: Create Customers Table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->unique()
                  ->constrained('users')
                  ->onDelete('cascade');
            $table->foreignId('store_id')
                  ->nullable()
                  ->constrained('stores')
                  ->onDelete('set null');
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['M', 'F', 'Other'])->nullable();
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->foreignId('tier_id')
                  ->constrained('customer_tiers')
                  ->onDelete('restrict');
            $table->integer('total_points')->default(0);
            $table->integer('lifetime_points')->default(0);
            $table->decimal('total_spent', 15, 2)->default(0);
            $table->string('referral_code', 20)->unique()->nullable();
            $table->foreignId('referred_by_id')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamp('last_purchase_at')->nullable();
            $table->boolean('is_newsletter')->default(1);
            $table->boolean('is_push_enabled')->default(1);
            $table->json('favorite_items')->nullable();
            $table->timestamps();

            $table->index('store_id');
            $table->index('tier_id');
            $table->index('last_purchase_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
```

---

## ✅ CHECKLIST TRƯỚC KHI TẠO MIGRATION

Hỏi bản thân:
- [ ] Tất cả FK đã point đến bảng đúng?
- [ ] Có INDEX cho columns hay search/filter?
- [ ] ENUM fields có sử dụng `enum()` hay `string` + validation?
- [ ] Timestamps (`created_at`, `updated_at`) có đầy đủ?
- [ ] Nullable fields đã được đánh dấu `.nullable()` đúng?
- [ ] Soft deletes có cần không? (Nếu cần: `$table->softDeletes();`)
- [ ] Default values đã đặt chưa?

---

## NOTES QUAN TRỌNG

1. **Phone field là login identifier**: 
   - Đặt UNIQUE trên `users.phone`
   - Phải validate format SĐT Việt Nam (10 số, bắt đầu 0)

2. **Points expiry**:
   - Sử dụng `customer_points.expires_at` để track
   - Tạo job hàng ngày để auto expire điểm

3. **Voucher QR code**:
   - Tạo QR code từ `voucher_code` khi tạo voucher
   - Lưu QR image URL vào `qr_code_url`

4. **Transaction flow**:
   - 1 transaction → nhiều transaction_details
   - 1 transaction → cộng điểm vào customer_points
   - 1 redemption → trừ điểm vào customer_points
   - 1 voucher được tạo từ 1 redemption

5. **Cascade vs Restrict**:
   - `onDelete('cascade')`: Xóa cha → xóa con
   - `onDelete('restrict')`: Không xóa cha nếu có con
   - `onDelete('set null')`: Xóa cha → con thành NULL
