# Hướng dẫn lấy Ad Account ID + Access Token để làm báo cáo quảng cáo Facebook

Tài liệu này hướng dẫn bạn lấy **2 thứ** mà website cần để đọc số liệu quảng cáo Facebook:

1. **Ad Account ID** — mã tài khoản quảng cáo (dạng `act_1234567890`)
2. **Access Token dài hạn có quyền `ads_read`** — chìa khoá để web đọc số liệu thay bạn

> ⚠️ **Quan trọng về bảo mật:** Access Token giống như mật khẩu. Ai có nó cũng đọc được dữ liệu quảng cáo của bạn. **Không** gửi token qua chat công khai, không dán lên Facebook/Zalo, không commit vào code. Khi có token, đưa cho lập trình viên lưu vào **server** (biến môi trường `.env` hoặc bảng cài đặt), tuyệt đối không để lộ ra trình duyệt.

---

## Phần A — Lấy Ad Account ID (2 phút)

1. Vào **Trình quản lý quảng cáo** (Ads Manager): https://adsmanager.facebook.com
2. Góc trên bên trái, bấm vào tên tài khoản quảng cáo đang chọn.
3. Bạn sẽ thấy dãy số **ID tài khoản quảng cáo**, ví dụ `1234567890`.
   - Khi dùng trong API, mã đầy đủ là **`act_` + số**, tức `act_1234567890`.
4. Ghi lại con số này.

> Cách khác: vào https://business.facebook.com/settings → **Tài khoản** → **Tài khoản quảng cáo** → chọn tài khoản → xem cột ID.

---

## Phần B — Tạo App trên Facebook Developers (5 phút)

Để lấy token đọc số liệu quảng cáo, bạn cần một **App**. Đây chỉ là "vỏ ứng dụng" để Facebook cấp quyền, không cần lập trình gì trong app này.

1. Vào https://developers.facebook.com → đăng nhập bằng tài khoản Facebook **có quyền trên tài khoản quảng cáo**.
2. Nếu lần đầu: bấm **Bắt đầu / Get Started** → xác nhận là nhà phát triển (điền số điện thoại, đồng ý điều khoản).
3. Bấm **Ứng dụng của tôi (My Apps)** → **Tạo ứng dụng (Create App)**.
4. Chọn loại app: **Khác (Other)** → **Tiếp** → chọn kiểu **Doanh nghiệp (Business)**.
5. Đặt tên app (ví dụ: `Laboong Ads Report`), điền email, chọn **Tài khoản doanh nghiệp (Business Manager)** của bạn nếu có → **Tạo ứng dụng**.
6. Vào app vừa tạo → **Cài đặt (Settings) → Cơ bản (Basic)**. Ghi lại:
   - **App ID**
   - **App Secret** (bấm "Hiện" để xem — cũng phải giữ bí mật như token)

> Trong lúc app ở **chế độ phát triển (Development)**, bạn — với tư cách admin của app — vẫn đọc được dữ liệu tài khoản quảng cáo của **chính mình** mà **không cần Facebook duyệt (App Review)**. App Review chỉ cần khi bạn muốn đọc dữ liệu của **tài khoản người khác**.

---

## Phần C — Lấy Access Token có quyền `ads_read`

Có 2 cách. **Cách 1 (Graph API Explorer)** nhanh, hợp để chạy thử. **Cách 2 (System User)** bền hơn, token gần như không hết hạn — nên dùng cho chạy lâu dài.

### Cách 1 — Nhanh, qua Graph API Explorer (token sống ~60 ngày)

1. Vào https://developers.facebook.com/tools/explorer
2. Ở góc phải: mục **Meta App** → chọn đúng app bạn vừa tạo.
3. Bấm **Add a permission** (hoặc ô "Permissions") → tìm và tích chọn: **`ads_read`** (nếu cần đọc thêm cấu hình quảng cáo thì thêm `ads_management`, nhưng để làm báo cáo chỉ cần `ads_read`).
4. Bấm **Generate Access Token** → cửa sổ Facebook hiện lên → **đồng ý cấp quyền**.
5. Bạn nhận được một **token ngắn hạn (short-lived, ~1-2 giờ)**. Cần đổi nó thành **token dài hạn (~60 ngày)** ở bước dưới.

#### Đổi sang token dài hạn (60 ngày)
Mở đường link sau trên trình duyệt (thay 3 chỗ in đậm bằng của bạn):

```
https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=TOKEN_NGAN_HAN
```

- `APP_ID` = App ID ở Phần B
- `APP_SECRET` = App Secret ở Phần B
- `TOKEN_NGAN_HAN` = token vừa tạo ở Graph API Explorer

Facebook trả về JSON chứa `access_token` — **đây là token dài hạn (~60 ngày)**. Ghi lại.

> Token 60 ngày sẽ hết hạn và phải tạo lại. Nếu muốn khỏi lo hết hạn, dùng **Cách 2**.

### Cách 2 — Bền nhất: System User Token (nên dùng cho chạy thật)

Token của **System User** trong Business Manager có thể đặt **không hết hạn**, rất hợp để web tự động lấy số liệu hằng ngày.

1. Vào **Business Settings**: https://business.facebook.com/settings
2. Menu trái → **Người dùng (Users) → Người dùng hệ thống (System Users)** → **Thêm (Add)**.
3. Đặt tên (ví dụ `laboong-ads-bot`), vai trò **Nhân viên (Employee)** → tạo.
4. Chọn system user vừa tạo → **Gán tài sản (Assign Assets)** → chọn **Tài khoản quảng cáo** của bạn → bật quyền **Xem hiệu suất (View performance)** hoặc **Quản lý** → Lưu.
5. Bấm **Tạo token (Generate new token)** → chọn đúng **App** (ở Phần B) → tích quyền **`ads_read`** → **Tạo token**.
6. Khi hỏi thời hạn, chọn **Không hết hạn (Never)** nếu có tùy chọn → **Tạo**.
7. Facebook hiện token **một lần duy nhất** — **copy và cất giữ ngay**, đóng cửa sổ là không xem lại được (phải tạo token mới).

---

## Phần D — Kiểm tra token có hoạt động không (tuỳ chọn nhưng nên làm)

Dán đường link sau lên trình duyệt (thay `act_...` và `TOKEN`):

```
https://graph.facebook.com/v21.0/act_1234567890/insights?fields=spend,impressions,clicks,ctr,cpc,reach&date_preset=last_7d&access_token=TOKEN
```

- Nếu trả về JSON có `spend`, `impressions`... → **token OK**, sẵn sàng dùng.
- Nếu trả về lỗi:
  - `(#100) ... permission` → token thiếu quyền `ads_read`, tạo lại và nhớ tích quyền.
  - `Error validating access token` → token sai/hết hạn, tạo lại.
  - `(#803) act_... does not exist` → sai Ad Account ID (nhớ có tiền tố `act_`).

---

## Phần E — Sau khi có đủ, đưa cho tôi những gì?

Khi xong, bạn chuẩn bị **3 thông tin** (đưa qua kênh an toàn, không public):

| Thông tin | Ví dụ |
|---|---|
| **Ad Account ID** | `act_1234567890` |
| **Access Token** (dài hạn hoặc System User) | `EAAG...rất dài...` |
| **Phiên bản API** (không bắt buộc) | `v21.0` (mặc định) |

Tôi sẽ:
1. Thêm mục **"Kết nối Facebook Ads"** trong Admin → Cài đặt để bạn dán Ad Account ID + Token (lưu an toàn ở server).
2. Viết phần đọc số liệu từ Marketing API (có cache).
3. Thêm tab báo cáo **"Quảng cáo Facebook"**: thẻ KPI (chi tiêu, hiển thị, tiếp cận, click, CTR, CPC, kết quả, giá/kết quả), biểu đồ chi tiêu theo ngày, chi tiêu theo chiến dịch, và bảng chi tiết từng chiến dịch — lọc theo khoảng ngày, giống các báo cáo hiện có.

> Mẹo giữ an toàn: token nên đặt trong `.env` của server (ví dụ `FACEBOOK_ADS_TOKEN=...`) thay vì gõ trực tiếp, để không bị lộ khi ai đó xem cấu hình. Tôi sẽ hỗ trợ cách lưu đúng khi bắt tay vào code.
