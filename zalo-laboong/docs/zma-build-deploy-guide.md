# Build & Deploy Zalo Mini App — Hướng dẫn Dev

> Tài liệu **thao tác**: làm gì, gõ lệnh nào, theo thứ tự nào.
> Cần hiểu **cơ chế** đằng sau (vì sao token per-app, GUARD chặn deploy nhầm như thế nào) → đọc
> [`zma-build-deploy-architecture.md`](./zma-build-deploy-architecture.md).

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Điều kiện tiên quyết](#2-điều-kiện-tiên-quyết)
3. [Bối cảnh quy trình — Dev vào cuộc khi nào](#3-bối-cảnh-quy-trình--dev-vào-cuộc-khi-nào)
4. [Setup môi trường (1 lần / máy)](#4-setup-môi-trường-1-lần--máy)
5. [Bảng lệnh nhanh](#5-bảng-lệnh-nhanh)
6. [Token deploy — cấp tự động khi deploy](#6-token-deploy--cấp-tự-động-khi-deploy)
7. [Chạy local dev — `local`](#7-chạy-local-dev--local)
8. [Build — `zma:build`](#8-build--zmabuild)
9. [Deploy — `zma:deploy`](#9-deploy--zmadeploy)
10. [Vòng đời sau deploy](#10-vòng-đời-sau-deploy)
11. [Ví dụ luồng thực tế](#11-ví-dụ-luồng-thực-tế)
12. [Tham chiếu cấu hình](#12-tham-chiếu-cấu-hình)
13. [Xử lý sự cố](#13-xử-lý-sự-cố)
14. [Checklist trước khi bàn giao](#14-checklist-trước-khi-bàn-giao)
15. [Tài liệu tham khảo](#15-tài-liệu-tham-khảo)

---

## 1. Tổng quan

Mỗi Zalo Mini App (ZMA) là một **bundle độc lập** build ra từ một template Angular dùng chung
(`apps/zma-000X/`). Một template build được **nhiều** mini app khác nhau. Quy trình tách thành 4 lệnh
độc lập:

| Lệnh | Mục đích | Cần token? |
|---|---|---|
| `npm run local` | Chạy dev server 1 app để code & xem giao diện | Không |
| `npm run zma:build` | Build 1 hoặc nhiều app ra `dist/` | Không |
| `npm run zma:deploy` | Đẩy 1 bản đã build lên Zalo | Có (`zmp login` cấp khi cần) |

> ℹ️ **Note — Nguyên tắc cốt lõi:** `ZMP_TOKEN` là JWT gắn với **từng mini app** (claim `appId`),
> không gắn với template, và **có hạn** (`exp`). Token do `zmp login` cấp và ghi vào root `.env`. Bước
> build không đụng token; bước deploy mới lo token: nếu root `.env` chưa có token hợp lệ cho app đã
> chọn, deploy tự chạy `zmp login` để cấp token đúng app, rồi GUARD (`appId === miniAppId` & còn hạn)
> trước khi đẩy. **Không** còn kho token riêng, **không** còn lệnh init.

---

## 2. Điều kiện tiên quyết

**Công cụ & version:**

| Công cụ | Version | Ghi chú |
|---|---|---|
| Node.js | LTS 18.x | Bắt buộc đúng nhánh LTS để build ổn định |
| Angular CLI | 20.2.x | `npm i -g @angular/cli@20.2.0` |
| zmp-cli | mới nhất | `npm i -g zmp-cli` |
| npm | đi kèm Node 18 | — |

**Quyền & dữ liệu cần có trước khi build 1 app:**

- [ ] Tài khoản Zalo của dev đã là **collaborator** của mini app (admin thêm trên
  [Zalo Developer Console](https://developers.zalo.me)).
- [ ] App đã tồn tại trên Zalo Console với `miniAppId` thật (`appStatus` ≥ `PENDING` — xem
  [mục 3](#3-bối-cảnh-quy-trình--dev-vào-cuộc-khi-nào)).
- [ ] BE đã có `appBuildConfig` (gồm `template` + `apiUrl`) cho app đó.

**Kiểm tra nhanh** — gọi API config, phải trả `code: 1` với `template` và `apiUrl` khác `null`:

```bash
curl "https://<api-url>/zma/config?appId=<miniAppId>"
```

Ví dụ:

```bash
curl "https://tunglxbe.webapp.nhanhdev.com/zma/config?appId=4514690776835211220"
```

> ⚠️ **Warning:** Nếu `template` hoặc `apiUrl` là `null`, hoặc trả `ERR_404` → báo admin bổ sung
> `appBuildConfig` trong DB. **Chưa build vội** — xem [mục 12.1](#121-setup-backend-do-adminbe-thực-hiện).

---

## 3. Bối cảnh quy trình — Dev vào cuộc khi nào

Toàn bộ quy trình tạo mini app gồm 3 bên. Dev bắt đầu **sau khi admin đã** (1) tạo app thật trên
[Zalo Mini App Console](https://miniapp.zaloplatforms.com) và (2) nhập `miniAppId` + `privateKey`
vào hệ thống (`appStatus: NEW → PENDING`).

```
User tạo app          Admin tạo trên          Dev build + deploy        Admin submit
(webapp-admin)   →    Zalo Console      →     (dự án mini app)     →    review trên Zalo
appStatus=NEW         appStatus=PENDING        ── BẠN Ở ĐÂY ──           Console
```

Tới lúc này, mini app đã tồn tại trên Zalo nhưng **chưa có code chạy**. Việc của dev: build giao diện
Angular từ template chung rồi deploy bundle lên Zalo để app dùng được.

**Trạng thái app được phép build** — build script lọc theo `appStatus`. Chỉ app **đã có `miniAppId`
thật trên Zalo Console** mới build được:

| `appStatus` | Tên | Build được? | Ý nghĩa |
|---|---|---|---|
| `1` | `NEW` | 🚫 Không | Chưa lên Zalo Console — chưa có `miniAppId` để gắn bundle |
| `2` | `PENDING` | ✅ Có | Đã lên Console, đang chờ duyệt — build bản test cho admin submit |
| `3` | `APPROVED` | ✅ Có | Zalo đã duyệt — build bản cập nhật sau khi đã live |
| `4` | `REJECTED` | ✅ Có | Zalo từ chối — vẫn có `miniAppId`, dev rebuild để fix |

> ℹ️ **Note:** App `NEW` **không xuất hiện** trong danh sách của `npm run zma:build`. Không thấy app
> cần build → hỏi admin xem đã tạo trên Zalo Console + nhập `miniAppId` chưa. Filter này áp dụng 2 lớp:
> BE `/zma/config/apps` trả danh sách đã lọc; CLI lọc defensive thêm 1 lần.

---

## 4. Setup môi trường (1 lần / máy)

```bash
# 1. Cài tool global (nếu chưa có)
npm i -g @angular/cli@20.2.0
npm i -g zmp-cli

# 2. Đăng nhập Zalo bằng tài khoản dev (collaborator của app) — session global cho máy
zmp login

# 3. Cài dependencies dự án
cd pos-zalo-mini-app-fe
npm install
```

> ℹ️ **Note:** `zmp login` đăng nhập tài khoản Zalo cho máy. Bước [deploy](#9-deploy--zmadeploy) sẽ
> tự gọi lại `zmp login` khi cần token mới cho app đang đẩy (xem
> [mục 6](#6-token-deploy--cấp-tự-động-khi-deploy)). **Không** dùng `cd apps/zma-000X && zmp init`,
> **không** có lệnh init riêng.

> ⚠️ **Warning:** Nếu thiếu host local, thêm dòng sau vào `/etc/hosts` để chạy được `npm run local`:
> `127.0.0.1 zma-tpl.local`

---

## 5. Bảng lệnh nhanh

| Mục đích | Cú pháp | Ví dụ |
|---|---|---|
| Cài & đăng nhập | `npm install` → `zmp login` | `npm install` → `zmp login` |
| Local dev | `npm run local` | `npm run local` |
| Build (chọn từ bảng) | `npm run zma:build -- --apiUrl=<API_URL>` | `npm run zma:build -- --apiUrl=https://tunglxbe.webapp.nhanhdev.com` |
| Liệt kê app build được | `npm run build:zma:list -- --apiUrl=<API_URL>` | `npm run build:zma:list -- --apiUrl=https://tunglxbe.webapp.nhanhdev.com` |
| Deploy | `npm run zma:deploy` | `npm run zma:deploy` |

---

## 6. Token deploy — cấp tự động khi deploy

`zmp deploy` cần một `ZMP_TOKEN` (JWT) gắn đúng `appId` của app đang đẩy. Bạn **không cần** tạo token
thủ công: bước [deploy](#9-deploy--zmadeploy) tự lo.

- Khi deploy, nếu root `.env` **chưa có token hợp lệ** cho app đã chọn (chưa có / hết hạn / sai app),
  script tự ghi `APP_ID={miniAppId}` rồi chạy `zmp login` để Zalo cấp token mới cho **đúng** app, sau
  đó GUARD lại trước khi đẩy.
- Nếu root `.env` **đã có token còn hạn đúng app** → deploy chạy thẳng, **không** phải đăng nhập lại.
- Token là **per-app** và **sống ngắn** (JWT `exp`). Hết hạn thì lần deploy sau tự xin lại (quét QR).

> ℹ️ **Note:** `zmp login` ghi token cho **1 app tại một thời điểm** vào root `.env` (đúng mô hình của
> `zmp`). Deploy mỗi lần 1 app nên điều này không gây vướng. Không có kho token riêng, không có lệnh init.

> ⚠️ **Warning:** Khi `zmp login` bật lên, **chọn "Login Via QR Code With Zalo App"** và quét QR bằng
> tài khoản **collaborator của đúng app**. Đăng nhập nhầm tài khoản/app → GUARD chặn (không đẩy nhầm).

---

## 7. Chạy local dev — `local`

`npm run local` fetch danh sách app, hỏi chọn template + mini app, tự ghi `environment.ts` rồi chạy
`ng serve`.

```bash
# Lần đầu — truyền --apiUrl để script nhớ lại
npm run local -- --apiUrl=https://tunglxbe.webapp.nhanhdev.com

# Các lần sau — apiUrl đã nhớ, gõ gọn
npm run local
```

- Chọn template (`zma-0001`…`zma-0006`) → chọn mini app → mở `http://zma-tpl.local:6204`.
- **Không** cần token ở bước này. Mọi template chạy chung port **6204** — mỗi lần 1 template.

> ℹ️ **Note:** `apiUrl` được nhớ ở `scripts/.local-config.json` (không commit). Truyền lại `--apiUrl`
> bất kỳ lúc nào muốn đổi server.

> ⚠️ **Warning:** Vào không được `zma-tpl.local` → thêm `127.0.0.1 zma-tpl.local` vào `/etc/hosts`.

**Giới hạn local** — không chạy trong Zalo thật nên một số SDK không hoạt động; local chủ yếu để phát
triển UI + kiểm thử API:

| Tính năng | Local | Zalo thật |
|---|---|---|
| Giao diện / logic nghiệp vụ | ✅ | ✅ |
| Gọi API backend | ✅ | ✅ |
| `getUserInfo()` — thông tin Zalo user | ❌ | ✅ |
| Payment / follow OA | ❌ | ✅ |
| ZMP share, open link Zalo | ❌ | ✅ |

---

## 8. Build — `zma:build`

Build **không** cần token. Token chỉ dùng ở bước deploy.

### 8.1. Interactive — chọn từ bảng (khuyên dùng)

```bash
npm run zma:build -- --apiUrl=<API_URL>
```

Ví dụ:

```bash
npm run zma:build -- --apiUrl=https://tunglxbe.webapp.nhanhdev.com
```

→ Hiện bảng danh sách app → nhập số thứ tự (`1`, `1,3`, hoặc `all`) → build tuần tự.

### 8.2. Output sau khi build

```
dist/
├── {businessId}_{miniAppId}_{template}/
│   ├── index.html
│   ├── main.xxxxxxxx.js
│   ├── runtime.xxxxxxxx.js
│   ├── styles.xxxxxxxx.css
│   ├── app-config.json    ← config riêng: app section + listCSS/listSyncJS/listAsyncJS
│   └── .env               ← APP_ID={miniAppId}, ZMP_TOKEN=__ZMP_TOKEN__ (placeholder)
└── build-manifest.json    ← lịch sử build tất cả app
```

> ℹ️ **Note:** Root `app-config.json` và `.env` **không bị đụng** ở bước build. Dist `.env` giữ
> `ZMP_TOKEN=__ZMP_TOKEN__` (placeholder) — token thật điền ở bước deploy.

---

## 9. Deploy — `zma:deploy`

```bash
npm run zma:deploy
```

Script chạy lần lượt:

1. Đọc `dist/build-manifest.json`, hiện danh sách bản đã build (mới nhất lên đầu) → chọn 1 build → biết `miniAppId` đích.
2. Kiểm token trong root `.env`: còn hợp lệ cho `miniAppId` này không? (decode OK & `appId === miniAppId` & còn hạn)
3. Nếu **chưa** hợp lệ → ghi `APP_ID={miniAppId}` vào root `.env` rồi chạy **`zmp login`** (quét QR) để Zalo cấp token mới đúng app.
4. **GUARD** lại token; pass → chuẩn hoá root `.env` (`APP_ID` + token đúng) + copy `app-config.json` → root.
5. Chạy `zmp deploy` (interactive).

**GUARD (chốt an toàn, ngay trước khi đẩy)** — token phải:

- Decode JWT thành công.
- `payload.appId === miniAppId` (đúng app đã chọn).
- Còn hạn (`exp`).

Sai bất kỳ điều kiện nào → **dừng deploy**. Nhờ GUARD, **không thể** đẩy nhầm bundle app này lên app khác.

**Các bước trong `zmp deploy` (interactive):**

- **step 1**: chọn `deploy your existing project`.
- **step 2**: dist folder → tự điền sẵn từ `app-config.json`.
- **step 3**: chọn môi trường:
  - **`Development`** — sinh QR code, test trên tài khoản sở hữu app *(giới hạn 300 bản/tháng)*.
  - **`Testing`** — upload để share cho user được cấp quyền test *(giới hạn 60 bản/tháng)*.
- **step 4**: nhập mô tả deploy.

> ⚠️ **Warning:** Khi script bật `zmp login` (token chưa có/hết hạn/sai app) → chọn **"Login Via QR
> Code"**, quét QR bằng tài khoản **collaborator của đúng `miniAppId`** đã chọn. Sai app → GUARD chặn.

> 🚫 **Danger:** Zalo CLI chỉ deploy **1 app mỗi lần**. Muốn deploy app khác → chạy lại
> `npm run zma:deploy` và chọn build khác. Đừng chỉnh tay root `.env` — để script tự ghi, tránh
> đẩy nhầm app.

---

## 10. Vòng đời sau deploy

### 10.1. Test trên thiết bị thật

Quét QR (môi trường `Development`) → kiểm tra trên điện thoại:

- App mở được, đúng template / màu header / tên hiển thị.
- Gọi API backend thành công (đăng nhập, danh sách sản phẩm, đơn hàng…).
- Tính năng cần SDK Zalo (`getUserInfo`, payment, follow OA, share) hoạt động.

> ⚠️ **Warning:** Tính năng SDK Zalo **không test được ở local** — bắt buộc test trên Zalo thật.

### 10.2. Bàn giao cho admin

Sau khi deploy bản `Testing` chạy đúng → **báo admin**. Admin vào Zalo Console bấm "Gửi duyệt" để
Zalo review bản vừa deploy.

### 10.3. Khi Zalo từ chối (REJECTED)

Admin nhận lý do từ Zalo Console và phân loại. Dev xử lý khi lý do liên quan tới code/build:

| Loại lý do từ chối | Ai xử lý | Việc của dev |
|---|---|---|
| UI/UX lỗi, app crash, màn trắng | **Dev** | Fix code → `zma:build` → `zma:deploy` lại |
| Sai cấu hình build (màu, tên, route) | **Dev** | Sửa `appBuildConfig`/template → build + deploy lại |
| Tên app, logo vi phạm nhãn hiệu | User | Dev không cần làm gì |
| Thiếu giấy phép kinh doanh | User | Dev không cần làm gì |
| Mô tả app không rõ ràng | User | Dev không cần làm gì |

Sửa xong + deploy lại → báo admin resubmit (`REJECTED → PENDING`).

### 10.4. Cập nhật app đã APPROVED

App đã live nhưng có thay đổi:

1. Sửa code template → `npm run zma:build` → `npm run zma:deploy` bản mới.
2. Báo admin submit bản mới trên Zalo Console (`APPROVED → PENDING`).
3. App vẫn chạy bản cũ trong lúc Zalo review bản mới.

---

## 11. Ví dụ luồng thực tế

**Build:**

```
$ npm run zma:build -- --apiUrl=https://tunglxbe.webapp.nhanhdev.com

[build-zma] Fetching from https://tunglxbe.webapp.nhanhdev.com...

┌───┬──────────────────────┬──────────────────────┬────────────┬──────────────┐
│ # │ miniAppId            │ App name             │ Template   │ Last built   │
├───┼──────────────────────┼──────────────────────┼────────────┼──────────────┤
│ 1 │ 451469077683521...   │ Nhanh Shop Demo      │ zma-0001   │ 2h ago       │
│ 2 │ 312821265774173...   │ Nhanh Shop           │ zma-0001   │ never built  │
└───┴──────────────────────┴──────────────────────┴────────────┴──────────────┘

Nhập số thứ tự cần build (vd: 1  hoặc  1,3  hoặc  all): 1

[build-zma] Building: 451469077683521... (Nhanh Shop Demo)
[build-zma] ✅ Build complete: dist/35102_451469077683521..._zma-0001/
[build-zma]   1 succeeded, 0 failed.
```

**Deploy:**

```
$ npm run zma:deploy

[deploy-zma] Danh sách app đã build:
┌───┬──────────────────────┬────────────┬────────────┬──────────────────────────────────────┐
│ # │ miniAppId            │ Template   │ Built      │ apiUrl                               │
├───┼──────────────────────┼────────────┼────────────┼──────────────────────────────────────┤
│ 1 │ 451469077683521...   │ zma-0001   │ just now   │ https://tunglxbe.webapp.nhanhdev.com │
└───┴──────────────────────┴────────────┴────────────┴──────────────────────────────────────┘

Nhập số thứ tự app cần deploy (1–1): 1

[deploy-zma] Token cho app 4514690776835211220 chưa sẵn sàng: Token đã hết hạn lúc 00:34:34 4/6/2026.
[deploy-zma] → Đăng nhập Zalo để cấp token mới cho app 4514690776835211220...
  ? Choose a Login Method › 1. Login Via QR Code With Zalo App   (quét QR bằng Zalo)
[deploy-zma] GUARD ✓ token hợp lệ cho app 4514690776835211220
[deploy-zma] Root .env sẵn sàng (APP_ID=4514690776835211220, ZMP_TOKEN=••• đúng app)
[deploy-zma] Copied app-config.json → root
[deploy-zma] Running: zmp deploy

  <interactive zmp deploy prompts>

[deploy-zma] ✅ Deploy hoàn tất.
```

---

## 12. Tham chiếu cấu hình

### 12.1. Setup Backend (do admin/BE thực hiện)

> ℹ️ **Note:** Phần này **không phải việc của FE dev** — admin/BE đăng ký. Dev tham khảo để debug khi
> API config trả thiếu dữ liệu.

Đăng ký bản ghi trong `zalo_miniapp_configs` (lưu ý `appBuildConfig` phải đủ `template` + `apiUrl`):

```sql
INSERT INTO zalo_miniapp_configs (miniAppId, privateKey, appBuildConfig, status)
VALUES (
  '4514690776835211220',
  'YOUR_ZALO_APP_SECRET_KEY',
  '{
    "template": "zma-0001",
    "apiUrl": "https://tunglxbe.webapp.nhanhdev.com",
    "zaloOaId": "1371685331078162167",
    "appConfig": {
      "title": "Nhanh Shop Demo",
      "headerTitle": "Nhanh Shop Demo",
      "headerColor": "#ab1d1d"
    }
  }',
  1
);
```

Liên kết với business:

```sql
INSERT INTO business_webapp (businessId, configId, status, webAppType)
SELECT 35102, id, 1, 'TYPE_ZALO_APP'
FROM zalo_miniapp_configs
WHERE miniAppId = '4514690776835211220';
```

Response mong đợi của `GET /zma/config?appId=<miniAppId>`:

```json
{
  "code": 1,
  "data": {
    "miniAppId": "4514690776835211220",
    "businessId": 35102,
    "zaloOaId": "1371685331078162167",
    "template": "zma-0001",
    "apiUrl": "https://tunglxbe.webapp.nhanhdev.com",
    "appTitle": "Nhanh Shop Demo",
    "headerTitle": "Nhanh Shop Demo",
    "headerColor": "#ab1d1d"
  }
}
```

### 12.2. Manifest — `dist/build-manifest.json`

Lưu lịch sử tất cả mini app đã build, key = `{businessId}_{miniAppId}_{template}`:

```json
{
  "35102_4514690776835211220_zma-0001": {
    "miniAppId": "4514690776835211220",
    "businessId": 35102,
    "template": "zma-0001",
    "zaloOaId": "1371685331078162167",
    "apiUrl": "https://tunglxbe.webapp.nhanhdev.com",
    "builtAt": "2026-06-03T10:00:00.000Z"
  }
}
```

### 12.3. Placeholder trong template

| Placeholder | Giá trị | Đi vào bundle? |
|---|---|---|
| `__MINI_APP_ID__` | `miniAppId` | Không (chỉ vào `.env` → zmp) |
| `__ZALO_BASE_HREF__` | `/zapps/{miniAppId}/` | **Có** |
| `__API_URL__` | `apiUrl` | **Có** |
| `__WEB_APP_ID__` | DB id của webapp | **Có** |
| `__OA_ID__` | `zaloOaId` | **Có** |
| `__APP_TITLE__` / `__HEADER_TITLE__` / `__HEADER_COLOR__` | từ `appConfig` | **Có** (app-config) |
| `__ZMP_TOKEN__` | điền ở bước **deploy** | Không |

---

## 13. Xử lý sự cố

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Deploy **tự bật `zmp login`** | Root `.env` chưa có token hợp lệ (chưa có/hết hạn/sai app) | Bình thường — chọn "Login Via QR Code", quét QR bằng tài khoản collaborator đúng app |
| **GUARD chặn deploy** sau login | Đăng nhập nhầm tài khoản/app | Chạy lại, đăng nhập đúng collaborator của `miniAppId` đã chọn |
| App vừa deploy **404 `app-config.json`** | Deploy nhầm app | Kiểm tra `miniAppId` của build đã chọn khớp app trên Zalo Console |
| Build báo app **`NEW` không build được** | Chưa lên Zalo Console (`appStatus=1`) | Báo admin tạo app trên Console + nhập `miniAppId` |
| `Cannot resolve config` | `miniAppId` không có trong DB / sai `apiUrl` | Báo admin kiểm tra DB; dùng đúng `--apiUrl` |
| `template is missing` | `appBuildConfig` thiếu `template` | Báo admin bổ sung `template` vào JSON config |
| `Template app directory not found` | Template chưa có trong `apps/` | Tạo thư mục `apps/zma-000X` tương ứng |
| `error-router-no-match` | BE chưa deploy code mới | Đợi BE deploy xong rồi chạy lại |
| `zmp deploy` báo unauthorized | Session Zalo hết hạn | Chạy lại `zmp login` |
| `No builds found` khi `zma:deploy` | Chưa build app nào | Chạy `npm run zma:build` trước |
| `zmp: command not found` | Chưa cài zmp-cli | `npm i -g zmp-cli` |
| Local không vào được `zma-tpl.local` | Thiếu host | Thêm `127.0.0.1 zma-tpl.local` vào `/etc/hosts` |

---

## 14. Checklist trước khi bàn giao

- [ ] `GET /zma/config?appId=<miniAppId>` trả `code: 1`, `template` + `apiUrl` không `null`.
- [ ] Tài khoản Zalo của dev là collaborator của mini app.
- [ ] Khi deploy, đã `zmp login` đúng tài khoản collaborator của app (GUARD ✓ cho `miniAppId`).
- [ ] Build thành công, `dist/{key}/app-config.json` có `listSyncJS` không rỗng.
- [ ] `dist/{key}/.env` tồn tại, `APP_ID` đúng `miniAppId`.
- [ ] `zma:deploy` → GUARD pass → `zmp deploy` thành công.
- [ ] Đã test trên thiết bị thật: UI đúng, API chạy, SDK Zalo hoạt động.
- [ ] Đã báo admin để submit review.

---

## 15. Tài liệu tham khảo

- **[zma-build-deploy-architecture.md](./zma-build-deploy-architecture.md)** — cơ chế đằng sau:
  vì sao token per-app, GUARD chặn deploy nhầm thế nào, sơ đồ vòng đời + cây quyết định.
- **[README.md](../README.md)** — giới thiệu & cấu trúc dự án.
- **[Zalo Mini App Console](https://miniapp.zaloplatforms.com)** — admin tạo app & submit review.
- **[Zalo Developer Console](https://developers.zalo.me)** — quản lý collaborator.
