# ZMA Mini Game Engine Plan

Stack: PHP/Laminas (BE) · Angular (FE) · MySQL

---

# I. Tư duy cốt lõi

```text
Game Template = mẫu game do dev định nghĩa bằng code
Game          = game thực tế được admin tạo từ template
Engine        = bộ xử lý logic cho từng template
BE            = tính kết quả, kiểm tra lượt, lưu DB
FE            = hiển thị UI, animate theo kết quả BE trả về
```
# II. Flow tổng quan dễ hiểu

## 1. Flow Admin tạo game

```text
Admin
  ↓
Tạo campaign
  ↓
INSERT zma_game_campaigns
  ↓
Chọn template: lucky_wheel
  ↓
Lấy default_config từ LuckyWheelTemplate
  ↓
Tạo game
  ↓
INSERT zma_games
  ↓
Tạo danh sách prize / ô thưởng
  ↓
INSERT zma_game_prizes
  ↓
Game sẵn sàng chạy
```

Ví dụ:

```text
Campaign: Game mùa hè 2026
  ↓
Game: Vòng quay tháng 6
  ↓
Template: lucky_wheel
  ↓
Prizes:
  - Voucher 50k
  - Xu 100
  - Trượt
  - Chúc may mắn lần sau
```

---

## 2. Flow User mở game

```text
User mở game
  ↓
FE gọi API lấy game detail
  ↓
BE lấy zma_games
  ↓
BE lấy zma_game_prizes
  ↓
BE tính số lượt còn lại từ zma_game_ticket_logs
  ↓
BE gọi engine.getDisplayMeta()
  ↓
FE nhận dữ liệu và vẽ game
```

Với Lucky Wheel:

```text
FE nhận segments
  ↓
Vẽ vòng quay
  ↓
Hiển thị số lượt còn lại
```

Lưu ý:

```text
FE không nhận probability nếu không cần.
FE không tự tính kết quả.
FE chỉ vẽ UI.
```

---

## 3. Flow User bấm chơi

```text
User bấm quay
  ↓
FE gọi POST /play
  ↓
BE kiểm tra game có tồn tại không
  ↓
BE kiểm tra campaign/game còn active không
  ↓
BE tính số lượt còn lại
  ↓
Nếu hết lượt → trả lỗi
  ↓
Nếu còn lượt → lấy templateKey từ zma_games
  ↓
GameRegistry lấy đúng engine
  ↓
Engine resolve kết quả
  ↓
BE ghi DB trong 1 transaction
  ↓
FE nhận kết quả
  ↓
FE animate theo resultData
```

---

# IV. Runtime Transaction Flow

Đây là phần quan trọng nhất.

Khi user chơi thành công, toàn bộ thao tác phải nằm trong một transaction.

```text
BEGIN TRANSACTION

1. Lock game prize còn hàng nếu cần
2. Kiểm tra lượt hiện tại
3. Insert ticket log trừ lượt
4. Engine tính kết quả
5. Insert game history
6. Update qtyGiven nếu trúng prize có giới hạn
7. Insert game reward nếu trúng thưởng thật

COMMIT
```

Nếu lỗi ở bất kỳ bước nào:

```text
ROLLBACK
```

---

## Chi tiết từng bước

### Bước 1: Kiểm tra lượt

```mysql
SELECT COALESCE(SUM(turn), 0) AS balance
FROM zma_game_ticket_logs
WHERE userId = ?
AND gameId = ?;
```

Nếu:

```text
balance <= 0
```

thì trả lỗi:

```json
{
  "error": "INSUFFICIENT_TICKET",
  "message": "Bạn đã hết lượt chơi"
}
```

---

### Bước 2: Trừ lượt

Không update số lượt.

Chỉ insert log:

```mysql
INSERT INTO zma_game_ticket_logs
(
    userId,
    gameId,
    turn,
    event,
    createdAt
)
VALUES
(
    ?,
    ?,
    -1,
    'play',
    ?
);
```

---

### Bước 3: Engine tính kết quả

Pseudo flow:

```php
$game = $gameService->findById($gameId);

$engine = $gameRegistry->get($game['templateKey']);

$prizes = $gamePrizeService->getAvailablePrizes($gameId);

$result = $engine->resolvePlay($game, $prizes, $input);
```

Với Lucky Wheel, result có thể là:

```php
[
    'prizeId' => 12,
    'resultData' => [
        'stopAngle' => 127,
        'label' => 'Xu 100',
    ],
]
```

---

### Bước 4: Insert lịch sử chơi

```mysql
INSERT INTO zma_game_histories
(
    userId,
    gameId,
    prizeId,
    resultData,
    ticketLogId,
    ipAddress,
    userAgent,
    playedAt
)
VALUES
(
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?
);
```

Nếu kết quả là trượt nhưng vẫn có row prize dạng `prizeType = nothing`, có thể vẫn lưu `prizeId`.

Nhưng không insert reward.

---

### Bước 5: Tăng số lượng đã trao

Chỉ áp dụng nếu prize là phần thưởng thật và có giới hạn.

```mysql
UPDATE zma_game_prizes
SET qtyGiven = qtyGiven + 1
WHERE id = ?
AND (
    qtyLimit IS NULL
    OR qtyGiven < qtyLimit
);
```

Với prize hết số lượng:

```text
Không được chọn trong resolvePlay
hoặc update fail thì rollback
```

---

### Bước 6: Insert reward nếu trúng thưởng thật

Nếu `prizeType = nothing`:

```text
Không insert zma_game_rewards
```

Nếu trúng coin/voucher/item/point/custom:

```mysql
INSERT INTO zma_game_rewards
(
    userId,
    gameId,
    gameHistoryId,
    prizeId,
    rewardType,
    rewardRef,
    rewardValue,
    status,
    expiredAt,
    createdAt
)
VALUES
(
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    1,
    ?,
    ?
);
```

---

# V. Service Layer đề xuất

## 1. GameTemplateRegistry

Quản lý danh sách template bằng code.

```text
GameTemplateRegistry
  ├─ LuckyWheelTemplate
  ├─ SlotMachineTemplate
  └─ ScratchCardTemplate
```

Nhiệm vụ:

```text
- getAll()
- getByKey(templateKey)
- lấy default_config
- lấy config_schema
```

---

## 2. GameRegistry

Quản lý engine xử lý logic game.

```text
GameRegistry
  ├─ lucky_wheel     → LuckyWheelEngine
  ├─ slot_machine    → SlotMachineEngine
  └─ scratch_card    → ScratchCardEngine
```

Nhiệm vụ:

```text
- register(templateKey, engine)
- get(templateKey)
```

---

## 3. GameCampaignService

Xử lý:

```text
- tạo campaign
- sửa campaign
- bật/tắt campaign
- lấy campaign theo webapp
```

DB chính:

```text
zma_game_campaigns
```

---

## 4. GameService

Xử lý:

```text
- tạo game từ template
- lấy game detail
- cập nhật config
- bật/tắt game
```

DB chính:

```text
zma_games
```

---

## 5. GamePrizeService

Xử lý:

```text
- tạo danh sách prize
- validate tổng probability
- lấy prize còn active
- filter prize hết số lượng
- update qtyGiven
```

DB chính:

```text
zma_game_prizes
```

---

## 6. GameTicketService

Xử lý lượt chơi.

```text
- getBalance(userId, gameId)
- addTurn(userId, gameId, turn, event)
- useTurn(userId, gameId)
```

DB chính:

```text
zma_game_ticket_logs
```

Nguyên tắc:

```text
Chỉ INSERT.
Không UPDATE số lượt.
Balance = SUM(turn).
```

---

## 7. GameHistoryService

Xử lý lịch sử chơi.

```text
- createHistory()
- getUserHistories()
- getGameHistories()
```

DB chính:

```text
zma_game_histories
```

---

## 8. GameRewardService

Xử lý phần thưởng user nhận được.

```text
- createReward()
- getUserRewards()
- claimReward()
- expireRewards()
```

DB chính:

```text
zma_game_rewards
```

---

## 9. GamePlayService

Service quan trọng nhất.

Nhiệm vụ:

```text
Điều phối toàn bộ flow chơi game.
```

Pseudo flow:

```php
class GamePlayService
{
    public function play(int $userId, int $gameId, array $input): array
    {
        return $this->db->transaction(function () use ($userId, $gameId, $input) {

            $game = $this->gameService->findActiveGame($gameId);

            $balance = $this->ticketService->getBalance($userId, $gameId);

            if ($balance <= 0) {
                throw new InsufficientTicketException();
            }

            $ticketLogId = $this->ticketService->useTurn($userId, $gameId);

            $engine = $this->gameRegistry->get($game['templateKey']);

            $prizes = $this->prizeService->getAvailablePrizesForUpdate($gameId);

            $result = $engine->resolvePlay($game, $prizes, $input);

            $historyId = $this->historyService->createHistory([
                'userId' => $userId,
                'gameId' => $gameId,
                'prizeId' => $result['prizeId'],
                'resultData' => $result['resultData'],
                'ticketLogId' => $ticketLogId,
            ]);

            if ($result['isReward']) {
                $this->prizeService->increaseQtyGiven($result['prizeId']);

                $rewardId = $this->rewardService->createReward([
                    'userId' => $userId,
                    'gameId' => $gameId,
                    'gameHistoryId' => $historyId,
                    'prizeId' => $result['prizeId'],
                    'rewardType' => $result['rewardType'],
                    'rewardRef' => $result['rewardRef'],
                    'rewardValue' => $result['rewardValue'],
                ]);
            }

            return [
                'historyId' => $historyId,
                'rewardId' => $rewardId ?? null,
                'resultData' => $result['resultData'],
                'ticketBalance' => $balance - 1,
            ];
        });
    }
}
```

---

# VI. Lucky Wheel Engine

Lucky Wheel là engine đầu tiên.

## Nhiệm vụ

```text
- validateConfig()
- resolvePlay()
- getDisplayMeta()
- getConfigSchema()
```

---

## 1. validateConfig()

Kiểm tra:

```text
- spinDuration hợp lệ
- dailyTickets hợp lệ
- số prize tối thiểu >= minSegments
- tổng probability = 100
```

---

## 2. resolvePlay()

Flow:

```text
Nhận danh sách zma_game_prizes còn active
  ↓
Bỏ prize hết qtyLimit
  ↓
Weighted random theo probability
  ↓
Tính stopAngle
  ↓
Trả resultData cho FE
```

Ví dụ result:

```json
{
  "prizeId": 12,
  "isReward": true,
  "rewardType": 1,
  "rewardValue": 100,
  "resultData": {
    "stopAngle": 127,
    "label": "Xu 100"
  }
}
```

---

## 3. getDisplayMeta()

Trả dữ liệu cho FE vẽ vòng quay.

```json
{
  "segments": [
    {
      "id": 1,
      "label": "Voucher 50k",
      "color": "#FF6B6B",
      "position": 1,
      "angleStart": 0,
      "angleEnd": 60
    }
  ],
  "spinDuration": 5000,
  "ticketBalance": 1
}
```

Không trả:

```text
probability
```

---

## 4. getConfigSchema()

Dùng cho admin panel render form cấu hình.

---

# VII. API Plan

## 1. Admin APIs

| Method | Endpoint | Mục đích |
|---|---|---|
| POST | `/api/admin/game-campaigns` | Tạo campaign |
| PUT | `/api/admin/game-campaigns/:id` | Sửa campaign |
| PUT | `/api/admin/game-campaigns/:id/active` | Bật/tắt campaign |
| GET | `/api/admin/game-templates` | Lấy danh sách template từ code |
| POST | `/api/admin/games` | Tạo game từ template |
| GET | `/api/admin/games/:id` | Xem game detail |
| PUT | `/api/admin/games/:id` | Sửa config game |
| PUT | `/api/admin/games/:id/active` | Bật/tắt game |
| POST | `/api/admin/games/:id/prizes` | Thêm prize |
| PUT | `/api/admin/game-prizes/:id` | Sửa prize |
| DELETE | `/api/admin/game-prizes/:id` | Tắt/xóa mềm prize |
| POST | `/api/admin/games/:id/tickets/gift` | Tặng lượt |
| GET | `/api/admin/games/:id/stats` | Thống kê game |

---

## 2. User Gameplay APIs

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/api/games/:id/display-meta` | Lấy dữ liệu để FE render game |
| POST | `/api/games/:id/play` | User chơi game |
| GET | `/api/games/:id/tickets` | Lấy số lượt còn lại |
| GET | `/api/games/:id/histories` | Lịch sử chơi |
| GET | `/api/game-rewards` | Kho thưởng của user |
| POST | `/api/game-rewards/:id/claim` | Nhận thưởng |

---

# VIII. FE Flow Lucky Wheel

## 1. Mở game

```text
Angular page init
  ↓
GET /api/games/:id/display-meta
  ↓
Render wheel bằng segments
  ↓
Hiển thị ticketBalance
```

---

## 2. Bấm quay

```text
User click Spin
  ↓
Disable button
  ↓
POST /api/games/:id/play
  ↓
BE trả resultData.stopAngle
  ↓
FE animate wheel đến stopAngle
  ↓
Animation xong
  ↓
Hiện popup kết quả
  ↓
Update ticketBalance
```

---

## 3. Nhận thưởng

Nếu response có `rewardId`:

```text
Hiện nút nhận thưởng
  ↓
POST /api/game-rewards/:id/claim
  ↓
Update trạng thái reward
```

Nếu không có `rewardId`:

```text
Chỉ hiển thị kết quả
Không có reward để claim
```

---

# IX. Rule không được phá vỡ

## 1. FE không tính kết quả

Sai:

```text
FE tự random kết quả
```

Đúng:

```text
BE random, FE chỉ animate
```

---

## 2. Không update lượt chơi dạng quantity

Sai:

```mysql
UPDATE user_tickets
SET quantity = quantity - 1
WHERE userId = ?;
```

Đúng:

```mysql
INSERT INTO zma_game_ticket_logs
(
    userId,
    gameId,
    turn,
    event,
    createdAt
)
VALUES
(
    ?,
    ?,
    -1,
    'play',
    ?
);
```

---

## 3. Không hardcode lucky_wheel trong GamePlayService

Sai:

```php
if ($game['templateKey'] === 'lucky_wheel') {
    // lucky wheel logic
}
```

Đúng:

```php
$engine = $this->gameRegistry->get($game['templateKey']);
$result = $engine->resolvePlay($game, $prizes, $input);
```

---

## 4. Không insert reward khi trượt

Nếu:

```text
prizeType = nothing
```

thì:

```text
INSERT zma_game_histories
Không INSERT zma_game_rewards
```

---

## 5. Transaction bắt buộc cho POST play

Các thao tác sau phải cùng transaction:

```text
- trừ lượt
- resolve kết quả
- insert history
- update qtyGiven
- insert reward nếu trúng
```

---

# X. Thứ tự triển khai MVP

## Giai đoạn 1: DB

```text
1. zma_game_campaigns
2. zma_games
3. zma_game_prizes
4. zma_game_ticket_logs
5. zma_game_histories
6. zma_game_rewards
```

---

## Giai đoạn 2: Template + Registry

```text
1. GameTemplateConst
2. LuckyWheelTemplate
3. GameTemplateRegistry
4. GameRegistry
```

---

## Giai đoạn 3: Core Services

```text
1. GameCampaignService
2. GameService
3. GamePrizeService
4. GameTicketService
5. GameHistoryService
6. GameRewardService
7. GamePlayService
```

---

## Giai đoạn 4: Lucky Wheel Engine

```text
1. validateConfig
2. resolvePlay
3. getDisplayMeta
4. getConfigSchema
```

---

## Giai đoạn 5: Gameplay APIs

```text
1. GET display-meta
2. POST play
3. GET tickets
4. GET histories
5. GET rewards
6. POST claim reward
```

---

## Giai đoạn 6: Admin APIs

```text
1. CRUD campaign
2. CRUD game
3. CRUD prize
4. Gift ticket
5. Stats
```

---

## Giai đoạn 7: Frontend Lucky Wheel

```text
1. Render wheel
2. Call play API
3. Animate stopAngle
4. Show result popup
5. Show reward/histories
```

---

# XI. Checklist thêm game mới

Ví dụ thêm Slot Machine:

```text
1. Thêm GameTemplateConst::SLOT_MACHINE
2. Tạo SlotMachineTemplate
3. Register vào GameTemplateRegistry
4. Tạo SlotMachineEngine implements IGameEngine
5. Register vào GameRegistry
6. Tạo FE SlotMachine component nếu UI khác Lucky Wheel
```

Không sửa:

```text
- zma_games
- zma_game_prizes
- zma_game_ticket_logs
- zma_game_histories
- zma_game_rewards
- GamePlayService
- GameTicketService
- GameRewardService
```
