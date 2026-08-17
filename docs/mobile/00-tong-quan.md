# Tổng quan: Làm app Android & iOS cho Laboong

Tài liệu này là **bản đồ tổng thể**. Mỗi mục nhỏ bên dưới sẽ có một file
hướng dẫn chi tiết riêng — bạn hỏi tới đâu mình viết tới đó.

---

## 1. Điểm xuất phát của bạn (hiện trạng)

| Thành phần | Hiện tại |
|---|---|
| Backend | Laravel 12 (PHP 8.2) |
| Đăng nhập | **Session cookie** (web guard) — hợp cho trình duyệt, **không hợp cho app** |
| API | **Chưa có** `routes/api.php`, chưa có token |
| Giao diện | Blade + React (CDN) chạy trong trình duyệt |
| Thông báo | Email, Telegram, ntfy.sh |
| Hosting | Hostinger (shared) |

> **Kết luận quan trọng:** App điện thoại **không dùng chung** cách đăng nhập
> bằng session cookie của web được. Việc **bắt buộc đầu tiên** — dù bạn chọn
> hướng làm app nào — là **xây một lớp API có token** cho backend. Cụ thể là
> cài **Laravel Sanctum** và tạo `routes/api.php`. (Chi tiết ở Mục A.)

---

## 2. Ba hướng làm app — chọn 1

Bạn nói muốn viết bằng **Kotlin cho cả Android và iOS**. Điều đó ứng với
**Kotlin Multiplatform** (hướng B). Nhưng mình liệt kê đủ 3 hướng để bạn cân
nhắc, kèm đánh giá thật.

### Hướng A — WebView wrapper (bọc web thành app)
App chỉ là một khung mỏng mở website của bạn bên trong. Thêm được thông báo
đẩy, icon, splash, cài từ store.

- ✅ Nhanh nhất (vài ngày–1 tuần), tận dụng 100% web đã viết.
- ✅ Sửa web là app cập nhật theo ngay, không phải build lại.
- ❌ Cảm giác "không thật sự native", cuộn/animation kém mượt.
- ❌ Apple **hay từ chối** app chỉ bọc web nếu không có giá trị thêm (thông
  báo đẩy, tính năng thiết bị…). Cần làm đúng cách để qua duyệt.
- ❌ **Không phải Kotlin** cho phần UI (dùng khung wrapper).

**Hợp khi:** cần lên store thật nhanh, ngân sách/thời gian hạn chế.

### Hướng B — Kotlin Multiplatform + Compose Multiplatform (KMP/CMP) ⭐
Viết **một lần bằng Kotlin**, chạy cả Android lẫn iOS. UI dùng **Compose
Multiplatform** (Jetpack Compose cho cả 2 nền). Đây là **đúng ý bạn**.

- ✅ Đúng mong muốn: **một codebase Kotlin cho cả hai**.
- ✅ App native thật, mượt, chia sẻ được ~80–95% code (logic + UI).
- ✅ Do JetBrains/Google hậu thuẫn, Compose iOS đã **ổn định (stable)** từ 2025.
- ❌ Học nhiều hơn: Kotlin, Compose, coroutine, kiến trúc.
- ❌ **Build & publish bản iOS vẫn cần máy Mac** (bắt buộc của Apple).
- ❌ Vài API iOS đặc thù thi thoảng phải viết thêm bằng Swift.

**Hợp khi:** muốn app native lâu dài, chấp nhận đầu tư học + có (hoặc thuê)
máy Mac để build iOS.

### Hướng C — Native tách rời (Kotlin cho Android, Swift cho iOS)
Hai app riêng biệt, hai ngôn ngữ.

- ✅ "Chuẩn native" nhất, hiệu năng và độ tương thích cao nhất.
- ❌ **Làm việc gấp đôi** — viết mọi thứ 2 lần. Không hợp nếu chỉ có 1 người.
- ❌ iOS phải học Swift (không còn là "Kotlin cho iOS").

**Hợp khi:** có 2 đội / nhiều thời gian, cần tối đa hiệu năng.

### Gợi ý chọn
- Muốn **ra mắt nhanh, ít công**, chấp nhận không thuần native → **Hướng A**.
- Muốn **đúng "Kotlin cho cả hai"** và app native lâu dài → **Hướng B** (mình
  khuyến nghị theo đúng điều bạn nói).
- Chỉ chọn **C** nếu có nguồn lực lớn.

> Từ đây tài liệu **mặc định đi theo Hướng B (KMP/CMP)**, và có ghi chú riêng
> cho Hướng A ở những chỗ khác nhau.

---

## 3. Những thứ bắt buộc phải có (cho mọi hướng)

1. **Máy Mac để build iOS** — mua Mac mini, mượn, hoặc thuê Mac trên mây
   (MacinCloud, MacStadium…). Không có cách lách hợp pháp nào khác.
2. **Tài khoản nhà phát triển:**
   - Google Play: **25 USD** trả một lần.
   - Apple Developer: **99 USD/năm**.
3. **API backend có token** (Laravel Sanctum) — Mục A.
4. **Dịch vụ thông báo đẩy** cho app:
   - Android: **Firebase Cloud Messaging (FCM)** — miễn phí.
   - iOS: **APNs** (qua Firebase cho gọn) — cần tài khoản Apple ở trên.
   *(ntfy/Telegram hiện tại vẫn giữ để quán nhận đơn; FCM/APNs là để báo cho
   khách trên app.)*

---

## 4. Lộ trình & danh mục các mục sẽ hướng dẫn

Thứ tự nên làm từ trên xuống. Mỗi mục là một file riêng bạn sẽ hỏi sau.

### Phần I — Chuẩn bị Backend (làm trước, dùng chung mọi hướng)
- **A. Xây API cho app** — cài Sanctum, tạo `routes/api.php`, chuẩn hoá JSON,
  CORS, versioning (`/api/v1`).
- **B. API Xác thực** — đăng ký / đăng nhập / quên mật khẩu / đăng xuất trả về
  token; bảo vệ route bằng `auth:sanctum`.
- **C. Chuyển nghiệp vụ web sang API** — menu, giỏ hàng, đặt hàng, điểm thưởng,
  voucher, địa chỉ, lịch sử đơn… (tái dùng logic Controller đã có).

### Phần II — Dựng app (đi theo Hướng B: KMP)
- **D. Cài môi trường** — Android Studio, JDK, Xcode (trên Mac), KMP plugin.
- **E. Tạo project KMP + Compose Multiplatform** — cấu trúc thư mục
  `commonMain` / `androidMain` / `iosMain`.
- **F. Kiến trúc app** — lớp data (Ktor client gọi API, lưu token), lớp
  domain, lớp UI (Compose), quản lý trạng thái (ViewModel/StateFlow).
- **G. Màn hình lõi** — Onboarding/Đăng nhập → Trang chủ/Menu → Tuỳ chỉnh món →
  Giỏ hàng → Đặt hàng → Lịch sử → Tài khoản/Điểm.
- **H. Lưu phiên đăng nhập** — cất token an toàn (Keychain/EncryptedPrefs).

### Phần III — Tính năng nền tảng
- **I. Thông báo đẩy** — FCM cho Android, APNs cho iOS, gắn với sự kiện đơn hàng.
- **J. Bản đồ & vị trí** — chọn địa chỉ giao, tính phí ship (như web đang làm).
- **K. Thanh toán** (nếu cần online) — cổng nội địa (VNPay/MoMo…) hoặc COD.
- **L. Deep link / QR** — mở app từ link, mã QR bàn.

### Phần IV — Phát hành & vận hành
- **M. Icon, splash, tên, ảnh chụp store.**
- **N. Build & ký (signing)** — keystore Android, certificate/provisioning iOS.
- **O. Đưa lên Google Play** — nội bộ → thử nghiệm → chính thức.
- **P. Đưa lên App Store** — App Store Connect, TestFlight, duyệt của Apple.
- **Q. Cập nhật & phiên bản** — quy trình ra bản mới, bắt buộc cập nhật tối thiểu.

*(Nếu bạn chọn Hướng A — WebView — thì bỏ qua E–H, thay bằng một mục
"A′. Bọc web bằng WebView" ngắn hơn nhiều; các phần API, thông báo, phát hành
vẫn giữ nguyên.)*

---

## 5. Ước lượng thời gian (1 người, mới học)

| Giai đoạn | Hướng A (WebView) | Hướng B (KMP) |
|---|---|---|
| API backend (Sanctum) | 3–5 ngày | 3–5 ngày |
| Dựng app + màn hình | 3–7 ngày | 3–6 tuần |
| Thông báo đẩy | 2–3 ngày | 3–5 ngày |
| Phát hành 2 store | 3–7 ngày | 3–7 ngày |
| **Tổng ước lượng** | **~2–3 tuần** | **~6–10 tuần** |

Con số chỉ để hình dung; tuỳ tốc độ học và mức độ hoàn thiện mong muốn.

---

## 6. Chi phí tối thiểu

- Google Play: 25 USD (một lần)
- Apple Developer: 99 USD/năm
- Máy Mac để build iOS: mua/mượn, hoặc thuê Mac mây ~20–30 USD/tháng
- FCM/APNs, backend hiện tại: **0đ thêm** (dùng hạ tầng đã có)

---

## 7. Bạn nên bắt đầu từ đâu?

1. **Quyết định Hướng A hay B** (mục 2).
2. Dù chọn hướng nào, **làm Mục A trước** — API + Sanctum. Không có bước này
   thì app không đăng nhập / đặt hàng được.
3. Sau đó hỏi mình từng mục theo lộ trình ở phần 4.

> Nhắn cho mình **"làm Mục A"** (hoặc bất kỳ chữ cái nào ở trên) để mình viết
> hướng dẫn chi tiết cho mục đó. Nếu bạn còn phân vân Hướng A/B, nói mình biết
> ưu tiên của bạn (tốc độ ra mắt vs. app native lâu dài, có máy Mac chưa) —
> mình tư vấn chốt trước.
