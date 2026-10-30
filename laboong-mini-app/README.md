# Zalo Mini App — Laboong Victoria Văn Phú

Mini app đặt món, tích điểm, đổi quà trên Zalo. Toàn bộ dữ liệu (thực đơn, giá, khuyến mãi,
flash sale, điểm, quà, đơn hàng) lấy từ **API của website** — sửa trong trang Admin là mini app
cập nhật theo, không phải build lại.

Công nghệ: React 18 + [ZMP UI](https://mini.zalo.me/docs/zaui/) + `zmp-sdk` + Vite (bộ công cụ chính thức của Zalo).

## Mini app có gì

| Màn hình | Nội dung |
|---|---|
| Trang chủ | Thẻ thành viên (điểm, hạng, tiến độ đổi quà, mã QR tích điểm), banner, flash sale đếm ngược, điểm danh mỗi ngày, ưu đãi đang chạy, món bán chạy, quan tâm OA, tin tức |
| Thực đơn | Chọn cửa hàng, tìm món (gõ không dấu), lọc danh mục, chọn size / topping / đường / đá |
| Giỏ hàng | Nhận tại quầy hoặc giao tận nơi, địa chỉ + phí ship theo khoảng cách, voucher & mã giảm, tiền mặt / chuyển khoản VietQR, ghi chú. **Tổng tiền do máy chủ tính** (đúng như website) |
| Đơn hàng | Lịch sử và trạng thái đơn (tự cập nhật 30 giây/lần), chi tiết, mã VietQR cho đơn chưa chuyển khoản, đặt lại đơn cũ |
| Thành viên | Lịch sử điểm, đổi quà, ví quà (mã QR cho thu ngân quét), địa chỉ, thông tin cá nhân, cửa hàng, nhắn tin OA, chia sẻ |

Đăng nhập bằng Zalo: lần đầu Zalo hỏi chia sẻ số điện thoại → website tạo thẻ thành viên hoặc
liên kết với tài khoản sẵn có cùng số điện thoại (điểm dùng chung với website).

## Cấu trúc

```
laboong-mini-app/
├─ app-config.json        # Tiêu đề, màu thanh trạng thái của mini app
├─ .env.example           # APP_ID, ZMP_TOKEN, địa chỉ API, OA ID (sao chép thành .env)
├─ index.html
├─ vite.config.mts        # Build ra www/ cho zmp deploy
└─ src/
   ├─ main.tsx            # Khởi động app
   ├─ config.ts           # API_BASE, OA_ID (mặc định trỏ website thật)
   ├─ lib/                # api.ts (gọi API + token), zalo.ts (SDK Zalo), variants.ts (size/topping)…
   ├─ state/              # auth (đăng nhập), data (thực đơn, trang chủ), cart (giỏ hàng)
   ├─ components/         # Layout + thanh tab, bảng chọn món, ô QR, icon…
   └─ pages/              # Các màn hình
```

## Chạy thử trên máy

Cần Node.js 18 trở lên.

```bash
cd laboong-mini-app
npm install
cp .env.example .env          # sửa VITE_API_BASE nếu muốn trỏ website chạy local
npm run dev                   # mở http://localhost:3000
```

- Ngoài Zalo thì không đăng nhập bằng Zalo được. Để thử phần thành viên, tạo một API token
  cho tài khoản test trên máy chủ (`php artisan tinker` →
  `App\Models\ApiToken::issue(App\Models\User::where('phone','09…')->first(), 'test')`)
  rồi mở `http://localhost:3000/?dev_token=<token>` (chỉ có tác dụng ở chế độ `npm run dev`).
- Xem trong khung Zalo giả lập: `npm i -g zmp-cli` rồi `npm start` (`zmp start`).

Kiểm tra trước khi deploy: `npm run typecheck` và `npm run build`.

## Đưa lên Zalo

1. Cài công cụ một lần: `npm i -g zmp-cli`.
2. Trong file `.env`: `APP_ID=<ID Mini App>` (xem ở trang quản lý Mini App).
3. `npm run login` → chọn **Login Via QR Code With Zalo App** → quét bằng Zalo của tài khoản
   quản trị/cộng tác viên mini app. Token (`ZMP_TOKEN`) tự ghi vào `.env`, có hạn sử dụng — hết hạn thì chạy lại.
4. `npm run deploy` → đặt mô tả phiên bản → bản build được đẩy lên Zalo ở chế độ thử nghiệm.
5. Vào trang quản lý Mini App để thử bằng mã QR, rồi gửi duyệt khi ổn.

**Không** đưa file `.env` lên GitHub (đã có trong `.gitignore`).

## Cấu hình cần làm một lần

**Trên máy chủ website** — thêm vào `.env` của Laravel rồi chạy `php artisan config:clear`:

```
ZALO_APP_ID=<ID ứng dụng>
ZALO_APP_SECRET=<khóa bí mật của ứng dụng>
```

Khóa bí mật chỉ để trên máy chủ, không bao giờ đặt trong mã nguồn mini app.

**Trên trang quản lý Mini App của Zalo:**

- Xin quyền dùng API **Số điện thoại** và **Thông tin người dùng** (Zalo duyệt; chưa duyệt thì chỉ
  tài khoản quản trị/cộng tác viên dùng được).
- Liên kết **Official Account** của quán (OA ID trong `.env`: `VITE_OA_ID`) để nút "Quan tâm" và
  "Nhắn tin cho quán" hoạt động.
- Nếu Zalo yêu cầu khai báo tên miền được gọi từ mini app, thêm tên miền website
  (`laboongtoanhav3victoriavanphu.com`) và `img.vietqr.io` (ảnh mã chuyển khoản).

API mini app dùng được liệt kê ở [`docs/api-zalo-mini-app.md`](../docs/api-zalo-mini-app.md).
