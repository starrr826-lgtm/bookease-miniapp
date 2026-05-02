# 约见 v4 — 完整重构说明

本版本对 v3 做了结构性整理，解决之前反复出现的字段/集合名/状态类型不一致的问题。**所有前后端文件必须与本文件定义的 schema 和云函数协议保持一致。**

## 本次改动点（相对 v3）

1. **删除 `pages/guestView` 页。** 访客访问别人的日程表，现在是 `日程表` tab → `他人的日程表` 子 tab → 详情态（calendar），不再跳到独立页。
2. **`pages/schedule` 完全重写为月历样式。** 两个子 tab：
   - **我的日程表（Owner 视角）**：月历 + 下半屏该日已确认预约列表。
   - **他人的日程表（Guest 视角）**：列表态（我访问过的日程表）↔ 详情态（某张日程表的月历 + 下半屏可约时段）。
3. **扫码/分享链接入口统一**：app.js 解析 `options.query.key` 后 switchTab 到 `日程表`，并把 key 设为 `pendingShareKey`，schedule 页 onShow 自动打开 `他人的日程表 → 详情态`。
4. **统一 booking.status 为字符串** `'pending' | 'confirmed' | 'cancelled'`。
5. **统一 schedule.status 为数字** `1`（启用）/ `0`（停用）。
6. **新增云函数 `getOwnerCalendar`**，用于"我的日程表"月历展示。
7. **`utils/util.js` 用引用计数管理 loading**，消除 `showLoading 与 hideLoading 必须配对使用` 警告。

## 唯一数据库 Schema（权威）

### `users`
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | 自动 |
| `_openid` | string | 云自动写入，查询用这个 |
| `nickname` | string | |
| `avatarUrl` | string | |
| `visitedSchedules` | string[] | Guest 访问过的 scheduleId 列表 |
| `createdAt` / `updatedAt` | date | |

### `schedules`
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `ownerOpenid` | string | Owner 识别字段（**不是 `_openid`**） |
| `name` | string | |
| `description` | string | 可空 |
| `qrCodeKey` | string | 分享码 |
| `status` | number | `1` 启用，`0` 停用 |
| `createdAt` / `updatedAt` | date | |

### `service_items`（不是 `items`）
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `scheduleId` | string | |
| `name` | string | |
| `durationMinutes` | number | 单次预约时长（分钟） |
| `createdAt` / `updatedAt` | date | |

### `weekly_slots`
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `scheduleId` | string | |
| `dayOfWeek` | number | `0`=周日，`1`..`6`=周一..周六 |
| `startTime` | string | `'HH:mm'` |
| `endTime` | string | `'HH:mm'` |
| `isActive` | boolean | 缺省视为 true |
| `createdAt` / `updatedAt` | date | |

### `bookings`
| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | |
| `scheduleId` | string | |
| `scheduleName` | string | 冗余，便于列表显示 |
| `ownerOpenid` | string | 冗余自 `schedules.ownerOpenid`（写入时取），用于 Owner 查询 |
| `itemId` | string | |
| `itemName` | string | 冗余 |
| `itemDurationMinutes` | number | 冗余 |
| `bookingDate` | string | `'YYYY-MM-DD'` |
| `startTime` | string | `'HH:mm'` |
| `endTime` | string | `'HH:mm'` |
| `guestOpenid` | string | Guest 识别字段 |
| `guestName` | string | |
| `guestPhone` | string | |
| `note` | string | |
| `status` | **string** | `'pending'` / `'confirmed'` / `'cancelled'` |
| `createdAt` / `updatedAt` | date | |

## 云函数协议

所有函数返回约定：
```js
{ success: true, data: ... }    // 成功
{ success: false, error: '...' } // 失败
// 或者把业务数据直接放在顶层（兼容老函数），前端 util.js 会自动解包
```

### v4 新增 / 变更

- **`createBooking`**（已改，字段/状态全部对齐 schema）
- **`getScheduleByKey`** (沿用 v3，使用 `service_items`/`weekly_slots`/`ownerOpenid`)
- **`getMyVisitedSchedules`** (沿用 v3)
- **`unvisitSchedule`** (沿用 v3)
- **`updateBookingStatus`** (沿用 v3，状态字符串)
- **`listBookings`**（本次重写，角色过滤对齐 schema）
  - `event: { role: 'owner' | 'guest', status?: 'pending'|'confirmed'|'cancelled' }`
  - owner：按 `ownerOpenid == OPENID` 过滤
  - guest：按 `guestOpenid == OPENID` 过滤（兼容 `_openid`）
  - 返回：`{ success: true, data: Array<Booking> }`，按 `bookingDate` 倒序
- **`getOwnerCalendar`**（新增）
  - `event: { fromDate: 'YYYY-MM-DD', toDate: 'YYYY-MM-DD' }`
  - 返回 Owner 在该日期范围内所有 `status='confirmed'` 的预约
  - 返回：`{ success: true, data: Array<Booking> }`

### 不在本 patch 里（沿用你现有实现，但必须符合 schema）

- `login`：upsert `users` 文档
- `createSchedule` / `updateSchedule` / `listMySchedules` / `getScheduleDetail`
- `upsertServiceItem` / `deleteServiceItem`
- `upsertWeeklySlot` / `deleteWeeklySlot`

如果你的上述云函数里还用了老字段名（如 `isActive`/`duration`/`weekday`），请同步改成本 schema 中的字段。

## 迁移步骤

1. 数据库里把已有 `bookings` 里 `status` 是数字（0/1/2）的记录手动改成字符串（`'pending'` / `'confirmed'` / `'cancelled'`）。
2. 复制本 v4 目录下所有前端文件覆盖项目同路径文件。
3. **删除项目里的 `pages/guestView` 整个目录，并在 `app.json` 的 `pages` 数组里移除这一条。**
4. 上传并部署所有 v4 目录下的云函数（右键 → 上传并部署：云端安装依赖），包括新增的 `getOwnerCalendar`。
5. 开发者工具 → 清缓存 → 全部清除 → 重新编译。

## 文件清单

```
booking-miniapp-v4/
├── README-v4.md                     (本文件)
├── app.json                         (移除 guestView，保留 3 tab)
├── app.js                           (扫码入口统一走 schedule tab)
├── utils/util.js                    (ref-count loading)
├── pages/schedule/*                 (★ 月历 + 双子 tab 重写)
├── pages/bookings/*                 (双子 tab)
├── pages/my/*                       (简化)
├── pages/book/*                     (字段对齐)
└── cloudfunctions/
    ├── createBooking/               (★ status 字符串)
    ├── listBookings/                (★ 重写)
    ├── updateBookingStatus/
    ├── getScheduleByKey/
    ├── getMyVisitedSchedules/
    ├── unvisitSchedule/
    └── getOwnerCalendar/            (★ 新增)
```
