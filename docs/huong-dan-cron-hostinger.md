# Hướng dẫn thêm Cron trên hPanel Hostinger (để email hẹn giờ tự gửi)

Cron là “đồng hồ hẹn giờ” của máy chủ. Ta hẹn nó **chạy mỗi phút** một lệnh
Laravel; lệnh đó sẽ kiểm tra có email nào tới giờ gửi không và gửi nốt các
đợt còn dở. Không có cron thì **chỉ “Gửi ngay” hoạt động**, còn “Lên lịch”
sẽ không tự gửi.

---

## Bước 1 — Xác định đường dẫn thư mục dự án (chứa file `artisan`)

Cron cần biết dự án nằm ở đâu. Thư mục đúng là **thư mục chứa file `artisan`**.

1. Đăng nhập **hPanel** → **Files** → **File Manager**.
2. Mở tới thư mục website. Trên Hostinger thường là:
   ```
   /home/uXXXXXXXXX/domains/TÊN-MIỀN/public_html
   ```
   (`uXXXXXXXXX` là mã tài khoản của bạn; DB của bạn tên `u594069199_...`
   nên nhiều khả năng là `/home/u594069199/...`).
3. **Tìm file `artisan`.**
   - Nếu thấy `artisan` ngay trong `public_html` → đường dẫn dự án chính là
     `.../public_html`.
   - Nếu **không thấy** `artisan` trong `public_html` (chỉ thấy `index.php`,
     thư mục `build`…), nghĩa là mã Laravel đặt ở thư mục cha. Lùi ra ngoài
     một cấp, tìm thư mục có `artisan` (ví dụ `.../domains/TÊN-MIỀN/laravel`
     hoặc `.../domains/TÊN-MIỀN`). Đó mới là đường dẫn dự án.
4. Bấm vào file `artisan`, hoặc xem thanh đường dẫn ở đầu File Manager, để
   **copy chính xác đường dẫn tuyệt đối** của thư mục đó. Ví dụ:
   ```
   /home/u594069199/domains/laboongtoanhav3victoriavanphu.com/public_html
   ```

> Ghi lại đường dẫn này — gọi là `ĐƯỜNG_DẪN_DỰ_ÁN`.

---

## Bước 2 — Mở phần Cron Jobs

1. Về **hPanel** (trang quản lý hosting của website đang dùng).
2. Vào menu **Advanced → Cron Jobs** (Tiếng Việt: **Nâng cao → Cron Jobs**).

---

## Bước 3 — Tạo Cron chạy mỗi phút

Trong phần **Create a new cron job**:

1. **Type / Common Settings (Tần suất):** chọn **Every Minute** (mỗi phút)
   — hoặc chọn *Custom* rồi điền 5 ô thời gian là `* * * * *`.
2. **Command to run (Lệnh cần chạy):** dán đúng dòng dưới, **thay
   `ĐƯỜNG_DẪN_DỰ_ÁN`** bằng đường dẫn bạn lấy ở Bước 1:

   ```bash
   cd ĐƯỜNG_DẪN_DỰ_ÁN && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
   ```

   Ví dụ cụ thể:
   ```bash
   cd /home/u594069199/domains/laboongtoanhav3victoriavanphu.com/public_html && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
   ```
3. Bấm **Create** (Tạo).

Xong. Từ giờ Laravel tự chạy mỗi phút và gửi email đã hẹn khi tới giờ.

---

## Về đường dẫn PHP (`/usr/bin/php`)

- `/usr/bin/php` thường là bản PHP mặc định của tài khoản — đa số trường hợp
  chạy tốt. Dự án cần **PHP 8.2 trở lên**.
- Nếu muốn chỉ định đúng PHP 8.2, có thể thử một trong các dạng sau (tuỳ
  Hostinger cấu hình): `/usr/bin/php8.2`, hoặc chỉ `php`. Nếu cron báo lỗi
  phiên bản PHP, đổi `/usr/bin/php` thành `/usr/bin/php8.2` rồi lưu lại.
- Bạn cũng có thể chọn phiên bản PHP cho tên miền tại **Advanced → PHP
  Configuration** để `php` mặc định là 8.2.

---

## Bước 4 — Kiểm tra cron có chạy không

**Cách nhanh:** vào admin → **Email** → tạo một email **Lên lịch** vào
**1–2 phút sau**, gửi cho **chính bạn** (dùng “Chọn khách hàng cụ thể” chọn
tài khoản có email của bạn, hoặc trước đó bấm *Gửi thử* để chắc SMTP ổn).
Đợi qua mốc giờ đã hẹn khoảng 1–2 phút, kiểm tra hộp thư. Trong tab **Lịch
sử gửi**, trạng thái sẽ chuyển từ **“Đã lên lịch”** → **“Đã gửi”**.

**Nếu muốn xem log** (không bắt buộc): tạm đổi phần cuối lệnh cron từ
`>> /dev/null 2>&1` thành ghi ra file để soi lỗi:
```bash
cd ĐƯỜNG_DẪN_DỰ_ÁN && /usr/bin/php artisan schedule:run >> storage/logs/cron.log 2>&1
```
Rồi mở `storage/logs/cron.log` trong File Manager để xem. Khi ổn thì đổi lại
về `>> /dev/null 2>&1` cho gọn.

---

## Cách khác (nếu `schedule:run` không tiện)

Bạn có thể cho cron gọi **thẳng** lệnh gửi email, cũng **mỗi phút**:
```bash
cd ĐƯỜNG_DẪN_DỰ_ÁN && /usr/bin/php artisan emails:dispatch >> /dev/null 2>&1
```
Cách này bỏ qua bộ lịch của Laravel, chỉ chạy đúng việc gửi email. Dùng
`schedule:run` (cách chính ở trên) vẫn tốt hơn vì sau này thêm tác vụ định
kỳ khác (VD thưởng sinh nhật) đều chạy chung một cron.

> **Lưu ý:** đừng đặt **cả hai** cron cùng lúc — chọn một trong hai để tránh
> chạy trùng.

---

## Sự cố thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Email hẹn giờ không gửi | Kiểm tra lại **đường dẫn dự án** (phải là thư mục có `artisan`) và PHP là 8.2 |
| Cron báo `php: command not found` | Đổi `php` thành đường dẫn đầy đủ `/usr/bin/php` hoặc `/usr/bin/php8.2` |
| Cron báo lỗi phiên bản PHP | Đổi sang `/usr/bin/php8.2`, hoặc set PHP 8.2 ở **PHP Configuration** |
| Gửi thử được nhưng hẹn giờ không chạy | Gần như chắc chắn do **cron chưa chạy / sai đường dẫn** — soi `storage/logs/cron.log` |
| Vẫn không nhận mail | Kiểm tra cấu hình SMTP (Gmail) và giới hạn gửi/ngày của Gmail |

---

## Tóm tắt 1 dòng cần dán vào Cron (mỗi phút)

```bash
cd /home/u594069199/domains/laboongtoanhav3victoriavanphu.com/public_html && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```
*(nhớ sửa đường dẫn cho khớp thư mục chứa `artisan` của bạn)*
