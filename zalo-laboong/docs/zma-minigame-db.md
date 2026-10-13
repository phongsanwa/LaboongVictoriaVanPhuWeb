# Game Engine Architecture

## I. Game Templates

### Mục tiêu

Game Template là các mẫu game được định nghĩa bằng code.

Không lưu trong DB.

Mỗi game mới chỉ cần:

1. Thêm template
2. Thêm engine
3. Register vào registry

Không cần thay đổi kiến trúc platform.

---

## GameTemplateConst.php

```php
class GameTemplateConst
{
    public const LUCKY_WHEEL = 'lucky_wheel';
}
```

---

## LuckyWheelTemplate.php

```php
class LuckyWheelTemplate
{
    public static function getDefinition(): array
    {
        return [

            'key' => GameTemplateConst::LUCKY_WHEEL,

            'name' => 'Lucky Wheel',

            'engine' => LuckyWheelEngine::class,

            'default_config' => [
                'backgroundImage' => '',
                'spinDuration' => 5000,
                'dailyTickets' => 1,
                'minSegments' => 2,
                'defaultSegments' => 6,
            ],

            'config_schema' => [
                // ...
            ],
        ];
    }
}
```

---

## GameTemplateRegistry.php

```php
class GameTemplateRegistry
{
    public static function getAll(): array
    {
        return [

            LuckyWheelTemplate::getDefinition(),

        ];
    }
}
```

---

## Flow Add New Game Template

### 1. Thêm key

```php
class GameTemplateConst
{
    public const SLOT_MACHINE = 'slot_machine';
}
```

### 2. Tạo template

```php
SlotMachineTemplate.php
```

### 3. Register

```php
GameTemplateRegistry.php
```

### 4. Tạo engine

```php
SlotMachineEngine.php
```

---

# II. Database

## Danh sách bảng

```text
zma_game_campaigns
zma_games
zma_game_prizes
zma_game_ticket_logs
zma_game_histories
zma_game_rewards
```

---

## 1. zma_game_campaigns

### Mục đích

Lưu chiến dịch game.

Ví dụ:

```text
Webapp A

├─ Campaign: Game mùa hè 2026
│
└─ Campaign: Sinh nhật shop
```

### MySQL Structure

```mysql
CREATE TABLE zma_game_campaigns
(
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,

    webappId    BIGINT       NOT NULL,
    name        VARCHAR(150) NOT NULL,
    description TEXT         NULL,

    startAt     BIGINT       NULL,
    endAt       BIGINT       NULL,

    isActive    TINYINT      NOT NULL DEFAULT 1,

    createdBy   BIGINT       NULL,
    updatedBy   BIGINT       NULL,

    createdAt   BIGINT       NULL DEFAULT NULL,
    updatedAt   BIGINT       NULL DEFAULT NULL,

    INDEX idx_webapp_active (webappId, isActive),

    INDEX idx_webapp_active_time
    (
        webappId,
        isActive,
        startAt,
        endAt
    ),

    INDEX idx_webapp_created
    (
        webappId,
        createdAt
    )

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
```

---

## 2. zma_games

### Mục đích

Lưu một game cụ thể được tạo từ template.

Ví dụ:

```text
Campaign: Game mùa hè

├─ Lucky Wheel tháng 6
├─ Lucky Wheel tháng 7
└─ Scratch Card tháng 6
```

### MySQL Structure

```mysql
CREATE TABLE zma_games
(
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,

    campaignId      BIGINT       NOT NULL,

    templateKey     VARCHAR(50)  NOT NULL,

    name            VARCHAR(150) NOT NULL,

    description     TEXT         NULL,

    config          JSON         NULL,

    isActive        TINYINT      NOT NULL DEFAULT 1,

    createdBy       BIGINT       NULL,
    updatedBy       BIGINT       NULL,

    createdAt       BIGINT       NULL DEFAULT NULL,
    updatedAt       BIGINT       NULL DEFAULT NULL,

    INDEX idx_campaign (campaignId),

    INDEX idx_campaign_active
    (
        campaignId,
        isActive
    ),

    INDEX idx_template
    (
        templateKey
    )

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
```

---

## 3. zma_game_prizes

### Mục đích

Lưu các phần thưởng hoặc kết quả có thể xuất hiện trong game.

Ví dụ:

```text
Voucher 50k
Xu 100
Trượt
Chúc may mắn lần sau
```

### MySQL Structure

```mysql
CREATE TABLE zma_game_prizes
(
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,

    gameId          BIGINT       NOT NULL,

    label           VARCHAR(150) NOT NULL,

    color           VARCHAR(20)  NULL,

    prizeType       TINYINT      NOT NULL,

    prizeRef        VARCHAR(255) NULL,

    probability     DECIMAL(6,3) NOT NULL DEFAULT 0.000,

    qtyLimit        INT          NULL,

    qtyGiven        INT          NOT NULL DEFAULT 0,

    position        INT          NOT NULL DEFAULT 0,

    extraConfig     JSON         NULL,

    isActive        TINYINT      NOT NULL DEFAULT 1,

    createdAt       BIGINT       NULL DEFAULT NULL,
    updatedAt       BIGINT       NULL DEFAULT NULL,

    INDEX idx_game_position
    (
        gameId,
        isActive,
        position
    ),

    INDEX idx_game_active_probability
    (
        gameId,
        isActive,
        probability
    ),

    INDEX idx_game_qty
    (
        gameId,
        qtyLimit,
        qtyGiven
    ),

    INDEX idx_prize_type
    (
        prizeType
    ),

    INDEX idx_prize_ref
    (
        prizeType,
        prizeRef
    )

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
```

---

## 4. zma_game_ticket_logs

### Mục đích

Lưu lịch sử phát sinh lượt chơi.

Ví dụ:

```text
+1 Daily Reward
+2 Task Reward
-1 Play
+5 Admin Gift
```

Số lượt hiện tại:

```sql
SUM(turn)
```

### MySQL Structure

```mysql
CREATE TABLE zma_game_ticket_logs
(
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,

    userId          BIGINT       NOT NULL,

    gameId          BIGINT       NOT NULL,

    turn            INT          NOT NULL,

    event           VARCHAR(50)  NOT NULL,
    -- daily_reward
    -- task_reward
    -- admin_gift
    -- play
    -- system_adjust

    note            VARCHAR(255) NULL,

    createdBy       BIGINT       NULL,

    createdAt       BIGINT       NULL DEFAULT NULL,

    INDEX idx_user_game
    (
        userId,
        gameId
    ),

    INDEX idx_user_created
    (
        userId,
        createdAt
    ),

    INDEX idx_event
    (
        event
    ),

    INDEX idx_game_created
    (
        gameId,
        createdAt
    )

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
```

---

## 5. zma_game_histories

### Mục đích

Lưu lịch sử mỗi lần user chơi game.

Mỗi lượt chơi thành công:

```text
1 row
```

### MySQL Structure

```mysql
CREATE TABLE zma_game_histories
(
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,

    userId          BIGINT       NOT NULL,

    gameId          BIGINT       NOT NULL,

    prizeId         BIGINT       NULL,

    resultData      JSON         NULL,

    ticketLogId     BIGINT       NULL,

    ipAddress       VARCHAR(45)  NULL,

    userAgent       VARCHAR(255) NULL,

    playedAt        BIGINT       NULL DEFAULT NULL,

    INDEX idx_user_game
    (
        userId,
        gameId
    ),

    INDEX idx_user_played
    (
        userId,
        playedAt
    ),

    INDEX idx_game_played
    (
        gameId,
        playedAt
    ),

    INDEX idx_prize
    (
        prizeId
    ),

    INDEX idx_ticket_log
    (
        ticketLogId
    )

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
```

---

## 6. zma_game_rewards

### Mục đích

Lưu phần thưởng user nhận được.

Chỉ lưu khi:

```text
User trúng thưởng
```

Không trúng:

```text
Không insert
```

### MySQL Structure

```mysql
CREATE TABLE zma_game_rewards
(
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,

    userId          BIGINT      NOT NULL,

    gameId          BIGINT      NOT NULL,

    gameHistoryId   BIGINT      NOT NULL,

    prizeId         BIGINT      NOT NULL,

    rewardType      TINYINT     NOT NULL,

    rewardRef       VARCHAR(255) NULL,

    rewardValue     DECIMAL(18,2) NULL,

    status          TINYINT     NOT NULL DEFAULT 1,
    -- 1=pending
    -- 2=claimed
    -- 3=expired
    -- 4=cancelled

    claimData       JSON        NULL,

    expiredAt       BIGINT      NULL DEFAULT NULL,
    claimedAt       BIGINT      NULL DEFAULT NULL,

    createdAt       BIGINT      NULL DEFAULT NULL,
    updatedAt       BIGINT      NULL DEFAULT NULL,

    INDEX idx_user_status
    (
        userId,
        status
    ),

    INDEX idx_user_created
    (
        userId,
        createdAt
    ),

    INDEX idx_history
    (
        gameHistoryId
    ),

    INDEX idx_game_status
    (
        gameId,
        status
    ),

    INDEX idx_prize
    (
        prizeId
    ),

    INDEX idx_reward_ref
    (
        rewardType,
        rewardRef
    )

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
```

---

# III. Database Relationship

```text
zma_game_campaigns
        │
        ▼
zma_games
        │
        ├─────────────┐
        ▼             ▼

zma_game_prizes   zma_game_ticket_logs
        │             │
        │             ▼
        │      zma_game_histories
        │             │
        └─────────────┘
                      ▼
              zma_game_rewards
```
