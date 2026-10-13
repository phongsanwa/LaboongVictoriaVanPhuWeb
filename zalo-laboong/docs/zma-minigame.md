# ZMA Mini Game Lucky Wheel

## 1. Mục tiêu

Xây mini game vòng quay may mắn cho ZMA theo hướng **BE là nguồn quyết định kết quả**. FE chỉ nhận cấu hình từ BE, render giao diện, gọi API quay, animate vòng quay dừng đúng ô mà BE trả về và hiển thị kết quả cho user.

Trong giai đoạn chưa có BE đầy đủ, FE có thể dùng **service fallback/mock router** để fake response giống format BE. Cách này giúp làm trước UI/animation/flow, sau này thay fallback bằng API thật mà không phải viết lại màn hình.

## 2. Nguyên tắc bắt buộc

1. **BE quyết định 100% kết quả quay.** FE không được tự random phần thưởng.
2. BE không chỉ trả danh sách reward, mà phải trả thêm `rewardId`, `segmentId` hoặc `segmentIndex` để FE biết vòng quay cần dừng đúng ô nào.
3. FE không cần biết xác suất thật. Xác suất, quota, số lượng quà còn lại và điều kiện trúng thưởng nằm ở BE/admin.
4. Cần có idempotency/chống double click để user bấm nhiều lần không bị trừ nhiều lượt hoặc nhận nhiều quà.
5. Campaign cần có trạng thái rõ ràng: chưa bắt đầu, đang chạy, tạm dừng, hết hạn, hết quà, user hết lượt, user không đủ điều kiện.
6. Assets từ BE cần có fallback. Nếu BE không truyền asset custom thì FE dùng default asset.
7. BE cần lưu lịch sử quay, voucher/quà đã nhận để reload app không mất kết quả.

## 3. BE/Admin Cần Xây Gì

### 3.1. Màn quản lý campaign mini game

Admin cần có màn tạo/sửa campaign vòng quay.

Thông tin cần nhập:

- Tên campaign/game.
- Mã campaign.
- Thời gian bắt đầu và kết thúc.
- Trạng thái: `draft`, `active`, `paused`, `ended`.
- Số lượt quay mặc định mỗi user.
- Tổng số lượt quay tối đa của campaign nếu cần.
- Điều kiện tham gia: tất cả user, user đã follow OA, user có số điện thoại, user đã mua hàng, nhóm user cụ thể.
- Nội dung thể lệ chương trình.
- Nội dung thông báo cho các trạng thái: chưa bắt đầu, hết hạn, hết lượt, hết quà, user không đủ điều kiện.

BE sẽ dựa vào campaign để trả trạng thái cho FE. FE không nên tự suy luận campaign còn hiệu lực hay không chỉ bằng thời gian phía client.

### 3.2. Màn quản lý assets

Admin cần có màn upload/cấu hình assets cho mini game.

Assets nên có:

- Background màn game.
- Ảnh/khung vòng quay.
- Kim chỉ/pointer.
- Nút quay.
- Nền popup kết quả.
- Ảnh trạng thái hết lượt/hết quà nếu có.
- Icon/ảnh cho từng reward.

Nếu campaign không có asset custom, BE có thể trả `null` hoặc bỏ trống. FE dùng bộ default asset có sẵn để tránh vỡ UI.

### 3.3. Màn quản lý segment và reward

Admin nên quản lý riêng **segment** và **reward**.

`Segment` là ô hiển thị trên vòng quay:

- `segmentId`
- `segmentIndex`
- Label hiển thị trên ô
- Màu nền/màu chữ
- Icon/ảnh hiển thị
- `rewardId` liên kết

`Reward` là phần thưởng thật:

- `rewardId`
- Tên phần thưởng
- Loại phần thưởng: voucher, quà vật lý, điểm, sản phẩm, không trúng
- Voucher code hoặc rule tạo voucher
- Số lượng tồn/quota
- Trạng thái còn/hết
- Nội dung hiển thị khi trúng
- Hướng dẫn nhận quà

Lý do cần tách segment và reward: một reward có thể xuất hiện ở nhiều ô trên vòng quay. Nếu BE chỉ trả `rewardId`, FE có thể không biết phải dừng ở ô nào. Vì vậy response spin nên có `segmentId` hoặc `segmentIndex`.

### 3.3.1. Trường hợp thay đổi danh sách quà và gift product

Campaign cần hỗ trợ trường hợp khách hàng muốn thay đổi danh sách quà trong admin mà không phải sửa code FE. Cách làm nên là **BE/Admin quản lý danh sách reward và segment**, FE chỉ render theo response BE trả về.

Với case đơn giản nhất là quà dạng sản phẩm (`PRODUCT`) và khách chỉ muốn gắn tên sản phẩm lên vòng quay, admin cần nhập được:

- `rewardId`: mã định danh quà.
- `type`: ví dụ `PRODUCT`, `VOUCHER`, `POINT`, `NO_REWARD`.
- `name`: tên đầy đủ của quà, ví dụ `Áo thun basic`.
- `segmentLabel`: tên ngắn hiển thị trên ô vòng quay, ví dụ `Áo thun`.
- `imageUrl`: ảnh sản phẩm nếu có.
- `quantity` hoặc `quota`: tổng số lượng quà.
- `remainingQuantity`: số lượng còn lại.
- `status`: `active`, `inactive`, `out_of_stock`, `archived`.

FE nên dùng `segmentLabel` để hiển thị trên vòng quay, không dùng trực tiếp `name` nếu tên quá dài vì dễ vỡ layout. Full `name` chỉ nên hiển thị ở popup trúng thưởng, lịch sử nhận quà hoặc màn chi tiết quà.

Response gợi ý cho product gift:

```json
{
  "rewardId": "gift_001",
  "type": "PRODUCT",
  "name": "Áo thun basic",
  "segmentLabel": "Áo thun",
  "imageUrl": "https://cdn.example.com/rewards/shirt.png",
  "quantity": 100,
  "remainingQuantity": 87,
  "status": "active"
}
```

Khi admin thay đổi danh sách quà:

- Nếu thêm reward mới, BE tạo reward mới và gắn vào segment tương ứng.
- Nếu đổi tên hiển thị, FE tự cập nhật theo `segmentLabel` ở lần gọi `GET /zma/game/info` tiếp theo.
- Nếu đổi ảnh, FE dùng `imageUrl` mới; nếu không có ảnh thì dùng default asset.
- Nếu reward hết hàng, BE đổi trạng thái sang `out_of_stock` và không random ra reward đó nữa.
- Nếu reward không muốn quay ra nữa, admin chuyển sang `inactive`, không nên xóa cứng.
- Nếu reward đã có user trúng, không nên xóa khỏi database để tránh mất lịch sử/đối soát.

Lưu ý quan trọng: với campaign đang chạy, admin không nên sửa `rewardId` hoặc xóa reward đã phát sinh lịch sử. Nên dùng trạng thái `inactive`/`archived` để ngừng hiển thị hoặc ngừng quay ra, còn dữ liệu cũ vẫn giữ để lịch sử trúng thưởng, claim quà và CSKH tra cứu được.

### 3.4. Màn quản lý xác suất và quota

Admin cần cấu hình xác suất/quota ở BE.

Thông tin cần có:

- Weight/tỷ lệ trúng của từng reward.
- Số lượng tối đa của từng reward.
- Số lần mỗi user có thể trúng một loại reward.
- Giới hạn theo ngày nếu cần.
- Cơ chế chuyển sang reward khác khi reward hết quota.
- Trạng thái hết quà toàn campaign.

FE không nhận xác suất thật. FE chỉ nhận danh sách segment để render và kết quả cuối cùng sau khi BE xử lý spin.

### 3.5. Lịch sử quay và phần thưởng đã nhận

BE cần lưu lịch sử quay để đảm bảo tính đúng đắn.

Thông tin nên lưu:

- User nào đã quay.
- Campaign nào.
- `spinId`.
- `idempotencyKey`.
- Thời gian quay.
- `segmentId`, `segmentIndex`, `rewardId` trúng.
- Trạng thái spin: pending, success, failed, cancelled.
- Voucher/quà đã cấp.
- Số lượt còn lại sau lần quay.

Mục đích:

- Reload app vẫn thấy đúng kết quả.
- Không cấp lại voucher/quà sai.
- Có log cho CSKH/admin tra cứu.
- Chống double click/retry API.
- Dễ kiểm tra khi user phản ánh "bị mất quà" hoặc "bị trừ lượt".

## 4. API Cần Có

### 4.1. API lấy thông tin game

`GET /zma/game/info`

BE trả về:

- Campaign đang active hoặc trạng thái campaign.
- Assets.
- Danh sách segment/reward để FE render.
- Số lượt quay còn lại của user.
- Lịch sử trúng thưởng gần nhất nếu có.
- Thể lệ chương trình.

Response gợi ý:

```json
{
  "campaignId": "lucky-wheel-001",
  "name": "Vòng quay may mắn",
  "status": "active",
  "remainingSpins": 3,
  "assets": {
    "backgroundUrl": null,
    "wheelFrameUrl": null,
    "pointerUrl": null,
    "spinButtonUrl": null,
    "resultPopupBgUrl": null
  },
  "segments": [
    {
      "segmentId": "seg_01",
      "segmentIndex": 0,
      "rewardId": "reward_20k",
      "label": "20K",
      "imageUrl": null,
      "color": "#F9C74F",
      "textColor": "#111111"
    }
  ],
  "rules": "Mỗi khách hàng có 3 lượt quay.",
  "lastRewards": []
}
```

### 4.2. API quay thưởng

`POST /zma/game/spin`

Request cần có:

- `campaignId`
- `idempotencyKey`
- Thông tin user/session lấy từ hệ thống auth

BE xử lý:

- Kiểm tra campaign có tồn tại không.
- Kiểm tra campaign đang active không.
- Kiểm tra user có đủ điều kiện tham gia không.
- Kiểm tra user còn lượt quay không.
- Kiểm tra reward/quà còn quota không.
- Chọn reward theo xác suất/quota.
- Trừ lượt quay.
- Lưu lịch sử quay.
- Cấp voucher/quà nếu flow yêu cầu cấp ngay.
- Trả kết quả cho FE.

Response gợi ý:

```json
{
  "spinId": "spin_123",
  "campaignId": "lucky-wheel-001",
  "rewardId": "reward_20k",
  "segmentId": "seg_01",
  "segmentIndex": 0,
  "remainingSpins": 2,
  "reward": {
    "rewardId": "reward_20k",
    "type": "voucher",
    "label": "Voucher 20K",
    "voucherCode": "SALE20K",
    "imageUrl": null,
    "message": "Chúc mừng bạn nhận được voucher 20K"
  }
}
```

### 4.3. API lịch sử quay

`GET /zma/game/history?campaignId=...`

Dùng khi:

- User reload app.
- User vào lại màn mini game.
- Cần hiển thị danh sách voucher/quà đã nhận.
- CSKH/admin cần đối soát.

### 4.4. API claim quà nếu cần

Nếu BE cấp voucher/quà ngay trong API spin thì không bắt buộc cần API confirm riêng.

Nếu quà vật lý cần user xác nhận thông tin nhận quà, có thể thêm:

`POST /zma/game/reward/claim`

API này dùng để user xác nhận địa chỉ/số điện thoại/thông tin nhận quà. Khi claim thành công, BE cập nhật trạng thái reward từ pending sang claimed.

### 4.5. API/router mock để demo khi chưa có BE

Khi chưa có BE thật, không nên chỉ fake response trực tiếp trong FE service bằng `of(...)` nếu cần demo flow cho khách hoặc team BA/BE. Nên giả lập một API/router trong source để FE vẫn call như request thật.

Mục tiêu:

- Khi mở DevTools/Network vẫn thấy request `GET /zma/game/info` và `POST /zma/game/spin`.
- Response mock có format giống BE thật.
- Sau này thay mock router bằng BE thật thì FE chỉ đổi base URL hoặc service adapter, không phải viết lại logic màn hình.

Các endpoint mock nên có:

- `GET /mock/zma/game/info`
- `POST /mock/zma/game/spin`
- `GET /mock/zma/game/history?campaignId=...`

Response mock vẫn phải trả đủ `campaignId`, `segments`, `rewardId`, `segmentId`, `segmentIndex`, `remainingSpins`, `reward`. Không để FE tự random kết quả ngay cả khi đang mock.

## 5. Logic FE Cần Làm

### 5.1. Khi vào màn

- Gọi `GET /zma/game/info`.
- Nếu status là `active`, render màn quay.
- Nếu status là `not_started`, `ended`, `paused`, `sold_out`, `out_of_spin`, hiển thị state tương ứng.
- Nếu assets thiếu, dùng default asset.
- Render segment theo đúng `segmentIndex`.

### 5.2. Khi bấm nút quay

- Nếu đang quay thì bỏ qua.
- Nếu hết lượt thì hiện thông báo hết lượt.
- Tạo `idempotencyKey` cho lần bấm.
- Disable nút quay.
- Gọi `POST /zma/game/spin`.

### 5.3. Khi nhận kết quả từ BE

- FE nhận `segmentId` hoặc `segmentIndex`.
- Tính góc dừng dựa trên segment đó.
- Chạy animation vòng quay.
- Khi animation kết thúc, hiển thị popup kết quả.
- Cập nhật `remainingSpins`.
- Popup và lịch sử phải dùng đúng `reward` của response spin vừa nhận, không tự suy đoán lại theo vị trí visual.

### 5.4. Khi reload app

- Gọi lại `GET /zma/game/info` và/hoặc `GET /zma/game/history`.
- BE trả lại voucher/quà đã nhận.
- FE hiển thị đúng trạng thái mới nhất.

### 5.5. Test với nhiều số lượng phần thưởng

FE không được chỉ test với một cấu hình cố định. Cần test các campaign có số lượng segment khác nhau để đảm bảo wheel render và dừng đúng ô trong nhiều tình huống thực tế.

Các case tối thiểu nên test:

- 6 ô phần thưởng.
- 9 ô phần thưởng.
- 12 ô phần thưởng.

Mỗi case cần kiểm tra:

- Segment chia đều, không lệch màu hoặc sai thứ tự `segmentIndex`.
- Text trên ô không bị chồng, không nằm giữa hai ô.
- Mũi tên/pointer dừng vào giữa ô trúng, không dừng tại đường giao nhau giữa hai ô.
- Popup kết quả hiển thị đúng `reward` của ô vừa quay vào.
- Lịch sử trúng thưởng hiển thị đúng quà vừa nhận.
- Với số lượng ô lớn như 12, FE cần rút gọn label hoặc dùng icon/asset để tránh vỡ layout.

## 6. Service Fallback Khi Chưa Có BE

Nếu BE chưa sẵn sàng, FE có thể tạo service fallback.

Fallback service sẽ fake response giống BE:

- `getGameInfo()` trả assets, segments, remainingSpins, rules.
- `spin()` trả `spinId`, `rewardId`, `segmentId`, `segmentIndex`, `remainingSpins`, reward detail.

Quan trọng: component vẫn gọi service như đang gọi BE thật. Sau này chỉ đổi implementation của service từ fallback sang API thật.

Fallback chỉ dùng để demo UI và animation. Production bắt buộc dùng kết quả từ BE.

## 7. Phân Tích Khả Thi

### 7.1. Có khả thi không?

Phương án này **khả thi**.

Lý do:

- Repo hiện đã có route mini game ở `zma-0002`.
- FE có thể làm trước bằng fallback service hoặc mock router.
- Khi BE sẵn sàng, có thể thay fallback bằng API thật mà không đổi nhiều logic màn hình.
- Contract response đủ `segmentIndex/rewardId/reward` thì animation, popup và lịch sử đều map được chính xác.

### 7.2. Phần khả thi ngay ở FE

FE có thể làm trước:

- UI vòng quay theo Figma.
- Animation quay theo `segmentIndex`.
- Popup kết quả.
- State loading/active/spinning/result/error.
- Fallback assets.
- Service fallback hoặc mock router fake response giống BE.

### 7.3. Phần phụ thuộc BE/Admin

Những phần này cần BE/admin làm thì production mới an toàn:

- Quản lý campaign.
- Quản lý assets.
- Quản lý segment/reward.
- Quản lý xác suất/quota.
- API game info.
- API spin có idempotency.
- Lưu lịch sử quay.
- Cấp voucher/quà vào tài khoản user.

Nếu chưa có các phần này, FE chỉ demo được, chưa nên dùng thật cho campaign có giá trị.

### 7.4. Rủi ro nếu làm thiếu

- Nếu BE chỉ trả `rewardId` mà không trả `segmentId/segmentIndex`, FE có thể dừng sai ô khi reward xuất hiện nhiều lần.
- Nếu không có idempotency, user bấm nhiều lần có thể bị trừ nhiều lượt hoặc nhận nhiều quà.
- Nếu FE tự random kết quả, game có thể bị gian lận.
- Nếu không lưu history, reload app có thể mất kết quả hiển thị.
- Nếu assets không có fallback, UI có thể lỗi khi admin cấu hình thiếu.
- Nếu quota không xử lý ở BE, có thể phát quá số lượng quà.
- Nếu không có trạng thái campaign rõ ràng, FE sẽ khó biết nên cho quay hay hiển thị thông báo nào.

## 8. Kết Luận

Nên làm mini game theo hướng BE/admin quản lý campaign, assets, reward, quota và kết quả quay. FE chỉ render, gọi API, animate theo `segmentId/segmentIndex` BE trả về và hiển thị kết quả.

Trong giai đoạn đầu, có thể dùng service fallback hoặc mock router để fake response đúng format BE. Cách này giúp triển khai UI nhanh và kiểm thử flow, bên BE cần quyết định 100% kết quả, lưu lịch sử, chống double click và cấp voucher/quà chính thức.

## 9. Các Điểm Cần Bổ Sung Để Đủ Cho Production

### 9.1. API error code và state cần thống nhất

BE không nên chỉ trả lỗi chung chung kiểu `success: false`. Cần có mã lỗi/state rõ ràng để FE biết hiển thị màn nào.

Các state nên có ở `GET /zma/game/info`:

- `not_started`: campaign chưa bắt đầu.
- `active`: campaign đang chạy, user có thể quay.
- `paused`: campaign bị admin tạm dừng.
- `ended`: campaign đã hết hạn.
- `sold_out`: campaign đã hết quà hoặc không còn reward khả dụng.
- `out_of_spin`: user đã hết lượt quay.
- `ineligible`: user không đủ điều kiện tham gia.

Các error code nên có ở `POST /zma/game/spin`:

- `CAMPAIGN_NOT_FOUND`
- `CAMPAIGN_NOT_STARTED`
- `CAMPAIGN_PAUSED`
- `CAMPAIGN_ENDED`
- `CAMPAIGN_SOLD_OUT`
- `USER_NOT_ELIGIBLE`
- `OUT_OF_SPIN`
- `DUPLICATE_REQUEST`
- `SPIN_PROCESSING`
- `SYSTEM_ERROR`

Response lỗi gợi ý:

```json
{
  "success": false,
  "code": "OUT_OF_SPIN",
  "message": "Bạn đã hết lượt quay",
  "status": "out_of_spin",
  "remainingSpins": 0
}
```

### 9.2. Auth/user identity lấy từ đâu

BE cần xác định user bằng identity đáng tin cậy từ ZMA/OA/session, không lấy user id từ body do FE gửi lên.

Nguồn identity nên ưu tiên:

- ZMA auth/session token sau flow đăng nhập mini app.
- `webAppUserId` hoặc user context do BE đã map từ Zalo user.
- Phone/token nếu campaign yêu cầu user đã cấp số điện thoại.
- OA follow status nếu điều kiện tham gia yêu cầu đã follow OA.

Với guest hoặc user chưa đủ thông tin:

- Nếu campaign cho phép guest: BE vẫn tạo identity tạm theo session.
- Nếu campaign yêu cầu phone/follow/OA: BE trả `USER_NOT_ELIGIBLE` kèm `requiredAction`, ví dụ `grant_phone`, `follow_oa`, `login`.

### 9.3. Luồng voucher: cấp ngay hay pending rồi claim

Cần chốt rõ voucher/quà được cấp ở thời điểm nào.

**Hướng 1: Cấp ngay khi spin thành công**

- BE xử lý spin.
- Nếu trúng voucher, BE tạo/gắn voucher vào tài khoản user ngay trong transaction.
- Response trả `voucherCode`, `rewardStatus: issued`.
- FE chỉ hiển thị kết quả.

Phù hợp với voucher điện tử.

**Hướng 2: Pending rồi claim**

- BE xử lý spin và lưu reward ở trạng thái `pending`.
- FE hiển thị popup kết quả.
- User bấm "Nhận quà".
- FE gọi API claim.
- BE cấp voucher/quà và đổi trạng thái thành `claimed`.

Phù hợp với quà vật lý cần xác nhận thông tin.

Khuyến nghị:

- Voucher điện tử: cấp ngay khi spin thành công.
- Quà vật lý: lưu `pending`, user cần claim/xác nhận thông tin.
- Reward `no_reward`: lưu lịch sử spin nhưng không cấp quà.

### 9.4. Transaction/lock để chống race condition

Idempotency ở API là chưa đủ. BE còn cần transaction/lock để tránh race condition khi nhiều request đến cùng lúc.

BE cần xử lý trong transaction:

1. Lock user campaign balance hoặc row lượt quay của user.
2. Kiểm tra lại `remainingSpins`.
3. Lock/check quota reward khả dụng.
4. Chọn reward.
5. Trừ lượt.
6. Trừ quota reward nếu reward có giới hạn.
7. Tạo spin history.
8. Cấp voucher/quà nếu cấp ngay.
9. Commit transaction.

Các cơ chế có thể dùng:

- Database transaction với row-level lock.
- Unique constraint cho `(campaignId, userId, idempotencyKey)`.
- Unique constraint cho `spinId`.
- Atomic decrement quota, đảm bảo quota không âm.
- Distributed lock nếu hệ thống chạy nhiều instance và DB lock chưa đủ.

Idempotency behavior:

- Nếu cùng `idempotencyKey` gọi lại sau khi spin đã thành công, BE trả lại cùng kết quả cũ, không quay lại.
- Nếu request cũ đang xử lý, BE trả `SPIN_PROCESSING` hoặc chờ kết quả.
- Nếu request mới khác key nhưng user đang có spin pending, BE có thể từ chối bằng `SPIN_PROCESSING`.

### 9.5. Assets nên trả theo CDN URL và có metadata

BE/admin không nên chỉ trả URL ảnh. Nên trả thêm metadata để FE layout ổn định và biết fallback khi ảnh lỗi.

Assets nên có:

- URL CDN ổn định.
- Content type đúng: png, jpg, webp, svg nếu cần.
- Kích thước width/height.
- Tỉ lệ khuyến nghị.
- Version/hash để cache busting.
- Fallback key nếu asset custom thiếu.

Kích thước/tỉ lệ khuyến nghị:

- Background mobile: 375x812 hoặc tỉ lệ gần 9:19.5.
- Wheel: hình vuông, tối thiểu 640x640 để đủ nét.
- Pointer: nền trong suốt, tỉ lệ khoảng 3:4 hoặc theo thiết kế.
- Reward icon: hình vuông, 128x128 hoặc 256x256.
- Popup result background: 320x420 hoặc tỉ lệ theo Figma.

FE cần:

- Dùng default asset khi URL null hoặc load lỗi.
- Không để ảnh làm layout nhảy kích thước.
- Có CSS kích thước cố định/aspect-ratio cho wheel, pointer, popup.

### 9.6. Fallback/mock chỉ dùng cho dev, không bật production

Service fallback/mock router là cần thiết để FE làm trước khi BE xong, nhưng production không được chạy mock.

Cần có cơ chế kiểm soát:

- Biến môi trường, ví dụ `useMiniGameMock`.
- Ở production, `useMiniGameMock` bắt buộc là `false`.
- Build production nên fail hoặc cảnh báo mạnh nếu mock đang bật.
- Không import mock service trực tiếp trong component; component chỉ gọi interface/service chung.
- Mock response phải cùng contract với API thật để tránh lệch format.

Quy định:

- Local/demo: có thể bật fallback.
- Staging: ưu tiên API thật, chỉ bật fallback khi test riêng.
- Production: luôn API thật, không mock.

Nếu production chưa có BE thì mini game nên hiển thị trạng thái "Chương trình chưa sẵn sàng" thay vì tự quay bằng mock.

## 10. Kết Luận Bổ Sung

Để mini game đủ chắc cho production, BE không chỉ cần trả reward và assets. BE còn phải quản lý identity user, campaign state, error code rõ ràng, voucher lifecycle, transaction/lock, quota và history.

FE có thể làm trước bằng fallback service hoặc mock router, nhưng fallback chỉ là công cụ demo. Khi chạy thật, kết quả quay, cấp voucher/quà, trừ lượt và lưu lịch sử đều phải nằm ở BE để tránh gian lận và tránh sai lệch dữ liệu.
