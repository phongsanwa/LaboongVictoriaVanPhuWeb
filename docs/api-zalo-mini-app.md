# API cho Zalo Mini App — Laboong Victoria Văn Phú

Base URL: `https://<domain>/api`
Định dạng: JSON. Xác thực: **Bearer token** (header `Authorization: Bearer <token>`).

> Token lấy từ `POST /api/auth/zalo`. Lưu token ở Mini App và gửi kèm mọi request cần đăng nhập.

---

## 1. Cấu hình phía máy chủ (làm 1 lần)
Thêm vào `.env` (App ID/Secret của Zalo Mini App, lấy trong Zalo Developers):
```
ZALO_APP_ID=xxxxxxxx
ZALO_APP_SECRET=xxxxxxxx
```
Rồi chạy:
```
php artisan migrate      # tạo bảng api_tokens + cột users.zalo_id
php artisan config:clear
```

---

## 2. Đăng nhập bằng Zalo — `POST /api/auth/zalo` (công khai)
Luồng ở Mini App:
1. Gọi SDK Zalo `getAccessToken()` → `access_token`.
2. Xin số điện thoại: `getPhoneNumber()` → `token` (gọi là **phone_token**).
3. Gửi lên server:

**Request**
```json
{ "access_token": "<zalo access token>", "phone_token": "<zalo phone token>", "name": "Tên (tuỳ chọn)" }
```
- `phone_token` chỉ cần cho **lần đầu** (để tạo/liên kết tài khoản theo SĐT). Lần sau chỉ cần `access_token` là nhận diện được qua `zalo_id`.

**Response 200**
```json
{
  "token": "<api token — lưu lại>",
  "is_new": true,
  "user": { "id": 12, "name": "...", "phone": "0987654321", "email": null,
            "avatar_url": null, "points": 50, "lifetime_points": 50,
            "tier": { "id": 1, "name": "Đồng" }, "referral_code": "LBVP-XXXXXX",
            "total_orders": 0, "total_spent": 0 }
}
```
**Các lỗi**
- `422 { "need_phone": true }` — chưa có SĐT, cần cho phép `getPhoneNumber` rồi gửi lại kèm `phone_token`.
- `401` — access token sai/hết hạn. `503` — máy chủ chưa cấu hình Zalo. `403` — tài khoản bị khoá.

---

## 3. Tài khoản
- `GET /api/me` *(cần token)* → `{ "user": { …như trên… } }`
- `POST /api/auth/logout` *(cần token)* → thu hồi token hiện tại.

---

## 4. Thực đơn & trang chủ (công khai, token tuỳ chọn)
Không cần đăng nhập; nếu gửi kèm Bearer token thì có thêm dữ liệu riêng của khách.
- `GET /api/menu` → toàn bộ dữ liệu để dựng màn đặt hàng:
  - `cats` (danh mục), `menu` (món — mỗi món có `id` dạng `"p12"`, `price`, `salePrice`, `variants`, `isCombo`, `comboItems`…), `variantGroups` (size/topping/đường/đá),
  - `stores`, `shippingTiers`, `shippingPromos`, `orderPromos`,
  - `weatherSurcharge` (phụ thu thời tiết), `payment` (cấu hình chuyển khoản VietQR: `bankEnabled/bankCode/accountNumber/accountName`),
  - `perPoint` (số tiền / 1 điểm).
  - *Lưu ý:* trường `urls` trong payload là route web — Mini App **bỏ qua**, dùng các endpoint `/api/...` trong tài liệu này.
  - Có token: kèm `addresses` (địa chỉ đã lưu), `customerName`, `customerPhone`.
- `GET /api/home` → dữ liệu trang chủ giống website:
  `banners`, `flashSale` (`{name, status: live|upcoming, start, end, items[]}` hoặc `null`), `promos` (chiến dịch đang chạy),
  `news`, `stores`, `checkinConfig`, `checkinEnabled`.
  Có token: thêm `member`, `points`, `goal` + `reward` (quà kế tiếp), `transactions` (3 giao dịch điểm gần nhất),
  `pointsThisWeek`, `checkin` (`{streak, last, today}`), `store`.

---

## 5. Địa chỉ nhận hàng *(cần token)*
- `GET /api/addresses` → `{ "addresses": [ { id, label, name, text, lat, lng, def } ] }`
- `POST /api/addresses`
  ```json
  { "label": "Nhà", "recipient_name": "…", "address_text": "…", "lat": 20.9, "lng": 105.7, "def": true }
  ```
  → `{ "address": { … } }`
- `DELETE /api/addresses/{id}` → `{ "message": "Đã xoá địa chỉ" }`

---

## 6. Đặt hàng *(cần token)* — `POST /api/orders`
Dùng **chung logic với web** (server tự tính giá, khuyến mãi, phí ship, điểm). Body:
```json
{
  "lines": [ { "id": "p12", "qty": 2, "selections": { "SIZE": "L", "TOPPING": ["pearl","pearl"], "SUGAR": "50", "ICE": "100" } } ],
  "note": "ít đá",
  "store_id": 1,
  "shipping_fee": 15000,
  "payment_method": "cod",            // "cod" | "bank"
  "delivery_address": "Số 1, ...",    // null nếu NHẬN TẠI QUẦY
  "delivery_phone": "0987654321",
  "delivery_lat": 20.9, "delivery_lng": 105.7,
  "voucher_id": null, "order_promo_id": null,
  "shipping_voucher_id": null, "ship_promo_id": null
}
```
- **Nhận tại quầy:** để `delivery_address = null` và `shipping_fee = 0` (không tính phí ship, không phụ thu thời tiết).
- **Giao tận nơi:** gửi `delivery_address` + toạ độ; `shipping_fee` tính theo `shippingTiers` (server sẽ kiểm lại).
- `selections` chỉ gửi với món có tuỳ chọn; combo/topping thêm nhanh thì bỏ `selections` (hoặc `null`).

**Xem trước tổng tiền:** gửi đúng body trên kèm `"quote": true` → server tính như khi đặt thật nhưng **không tạo đơn**:
```json
{ "subtotal": 122000, "badge_discount": 0, "voucher_discount": 0, "promo_discount": 0, "order_discount": 0,
  "shipping_fee": 0, "ship_discount": 0, "weather_surcharge": 0, "total": 122000, "points_earned": 12, "payment_method": "cod" }
```

**Response 201**
```json
{ "order_id": 34, "order_code": "LB-0034", "payment_method": "bank",
  "total_amount": 89000, "points_earned": 8, "points_pending": true, "message": "Đặt hàng thành công!" }
```
- Nếu `payment_method = "bank"`, dựng mã **VietQR** phía Mini App:
  `https://img.vietqr.io/image/{bankCode}-{accountNumber}-compact2.png?amount={total_amount}&addInfo={order_code}&accountName={accountName}`
  (lấy `bankCode/accountNumber/accountName` từ `payment` trong `/api/menu`).

---

## 7. Lịch sử đơn *(cần token)* — `GET /api/orders`
```json
{
  "orders": [ { "code": "LB-0034", "time": "...", "status": "new|making|ready|done|cancel",
                "type": "ship|pickup", "items": [...], "sub": 0, "ship": 0, "total": 0,
                "points": 8, "paymentMethod": "bank", "paymentStatus": "unpaid" } ],
  "bank": { "bankCode": "VCB", "accountNumber": "…", "accountName": "…", "ready": true }
}
```
- Đơn `paymentMethod="bank"` + `paymentStatus="unpaid"` → cho khách xem lại mã VietQR (dựng như mục 6, dùng `order.total` + `order.code`).

---

## 8. Geocode địa chỉ *(cần token)*
- `GET /api/geo/geocode?q=<địa chỉ>` → `{ ok, lat, lng }` (đổi địa chỉ → toạ độ để tính phí ship).
- `GET /api/geo/autocomplete?q=<chuỗi>` → `{ ok, results:[{text,lat,lng}] }`.
- `GET /api/geo/distance?olat=&olng=&dlat=&dlng=` → `{ ok, km }` (khoảng cách đường bộ từ cửa hàng tới khách).
Dùng đúng nhà cung cấp bản đồ đã chọn trong Admin (Google/SerpApi/Apify/Goong).

## 9. Thành viên *(cần token)*
- `GET /api/points` → `{ balance, earnedTotal, redeemedTotal, expiring, expireDate, months:[{key,label}], history:{ "YYYY-MM": [{type,title,store,day,time,amt}] } }`
- `GET /api/rewards` → `{ balance, gifts:[{id,name,cat,points,stock,img,grad,tags,perLimit,limitReached}] }` (`stock = -1` là không giới hạn)
- `POST /api/rewards/redeem` `{ "reward_id": 2 }` → `{ message, balance }` · lỗi 422 khi thiếu điểm / hết quà / đạt giới hạn
- `GET /api/rewards/wallet` → `{ balance, vouchers:[{id,name,cat,code,fine,created,expiry,status: active|used|expired}] }` — `code` là mã cho thu ngân quét
- `GET /api/cart/vouchers` → `{ order:[…], shipping:[…], redemptions:[{…, voucher}] }` — voucher dùng được khi đặt hàng (`voucher_id` / `shipping_voucher_id`)
- `POST /api/promotions/claim` `{ "code": "MA_GIAM" }` → `{ voucher }` (nhận mã giảm vào ví)
- `POST /api/checkin` → `{ ok, streak, points_awarded, total_points }` · 409 nếu hôm nay đã điểm danh
- `PUT /api/profile` `{ name, dob?, email? }` → `{ message, user }` (tài khoản tạo từ Zalo không bắt buộc email)

Mã QR thẻ thành viên = `user.referral_code` (thu ngân quét ở màn hình Tích điểm).

## Mini app
Mã nguồn mini app (React + ZMP UI) nằm ở thư mục **`laboong-mini-app/`** — xem README trong đó để chạy thử và deploy.
Thư mục `public/zalo/` là bản mẫu cũ (HTML tĩnh), giữ lại để tham khảo.

## Ghi chú kỹ thuật
- Mọi số tiền là **VND (số nguyên)**. Điểm là số.
- Giá & khuyến mãi **luôn được tính lại ở server** khi đặt hàng — Mini App chỉ hiển thị ước tính.
- Token không hết hạn tự động; gọi `logout` để thu hồi. Có thể có nhiều token / thiết bị.
