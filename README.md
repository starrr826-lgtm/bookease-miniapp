# 明天有空吗 · BookEase

> 一款基于微信云开发的预约管理小程序，让服务提供者轻松管理时间，让用户一键完成预约。
>
> A WeChat Mini Program for appointment scheduling — letting service providers manage availability and clients book in seconds.

---

## 目录 / Table of Contents

- [产品简介 / Overview](#产品简介--overview)
- [核心功能 / Features](#核心功能--features)
- [技术栈 / Tech Stack](#技术栈--tech-stack)
- [快速开始 / Getting Started](#快速开始--getting-started)
- [项目结构 / Project Structure](#项目结构--project-structure)
- [数据库结构 / Database Schema](#数据库结构--database-schema)
- [常见问题 / FAQ](#常见问题--faq)

---

## 产品简介 / Overview

**明天有空吗**是一款面向个人服务提供者（顾问、导师、自由职业者等）的微信小程序。Owner（服务提供者）设置每周可预约时段，生成专属分享码，Guest（预约者）扫码或输入分享码即可查看日历、选时段、完成预约。全程无需第三方平台，基于微信云开发，开箱即用。

**BookEase** is a WeChat Mini Program for individual service providers (consultants, tutors, freelancers, etc.). Owners configure weekly availability and share a unique booking link or 6-digit code. Guests view a live calendar, pick a slot, and submit a booking — all within WeChat, powered by WeChat Cloud Development with zero backend setup.

---

## 核心功能 / Features

### Owner（服务提供者）

| 功能 | 说明 |
|---|---|
| 创建日程表 | 设置服务名称、描述、服务项目（名称 + 时长） |
| 配置周循环时段 | 为每周各天设置可预约时间窗口 |
| 日期自定义覆盖 | 单独调整某一天的时段（放假 / 临时加班）|
| 月历总览 | 查看本月所有已确认预约，点击日期看当日详情 |
| 确认 / 取消预约 | 在「预约」Tab 一键审核访客预约请求 |
| 分享码 | 每张日程表生成唯一 6 位分享码，便于分发 |

### Guest（预约者）

| 功能 | 说明 |
|---|---|
| 输入分享码进入 | 在小程序内直接输入分享码，无需扫码 |
| 月历查看可约日期 | 绿点标注有可用时段的日期 |
| 选服务 + 选时间 | 先选服务项目，再选对应日期的时间段 |
| 提交预约 | 填写称呼和手机号后提交，带时段冲突检测 |
| 查看我的预约 | 在「预约」Tab 查看发出的所有预约及状态 |
| 取消预约 | 对未确认的预约可自行取消 |

---

## 技术栈 / Tech Stack

| 层 | 技术 |
|---|---|
| 前端 | 微信小程序原生（WXML / WXSS / JS） |
| 后端 | 微信云开发云函数（Node.js） |
| 数据库 | 微信云数据库（文档型 NoSQL） |
| 部署 | 微信云开发（无需自建服务器） |

| Layer | Technology |
|---|---|
| Frontend | WeChat Mini Program (WXML / WXSS / JS) |
| Backend | WeChat Cloud Functions (Node.js) |
| Database | WeChat Cloud Database (document-based NoSQL) |
| Hosting | WeChat Cloud Development (no server required) |

---

## 快速开始 / Getting Started

### 前置条件 / Prerequisites

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（最新稳定版）
- 一个微信小程序账号（[注册地址](https://mp.weixin.qq.com)）
- 已开通**微信云开发**并获取**环境 ID**

### Step 1 — 获取 AppID 和云开发环境 ID

1. 前往 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 「开发管理」→「开发设置」→ 复制 **AppID**
2. 左侧「云开发」→ 开通并创建环境 → 复制**环境 ID**（形如 `booking-dev-1abc23def`）

### Step 2 — 替换配置占位符

**`project.config.json`** 中替换 AppID：
```json
"appid": "你的AppID"
```

**`app.js`** 中替换云环境 ID：
```js
wx.cloud.init({
  env: '你的云环境ID',
  traceUser: true,
})
```

### Step 3 — 导入项目

打开微信开发者工具 → 左上角「+」→「导入项目」→ 选择本项目目录 → 确定

### Step 4 — 创建数据库集合

开发者工具 → 云开发面板 → 数据库 → 依次创建以下集合（名称必须完全一致）：

```
users
schedules
service_items
weekly_slots
bookings
day_overrides
```

> 所有读写均通过云函数完成，集合权限保持默认即可。

### Step 5 — 部署云函数

在开发者工具左侧资源管理器中，对 `cloudfunctions/` 下每个文件夹右键 →「上传并部署：云端安装依赖」：

```
login               createSchedule      updateSchedule
getMySchedules      getScheduleDetail   deleteSchedule
getMyScheduleSlots  getOwnerCalendar    setDayOverride
createBooking       listBookings        updateBookingStatus
getScheduleByKey    getMyVisitedSchedules  unvisitSchedule
```

### Step 6 — 编译运行

点击工具栏「编译」（或 `Ctrl/Cmd + B`），模拟器即可运行。

---

**Getting Started (English Summary)**

1. Register a WeChat Mini Program account and enable Cloud Development to obtain an **AppID** and **Cloud Env ID**.
2. Replace the two placeholders in `project.config.json` (`appid`) and `app.js` (`env`).
3. Import the project folder into WeChat DevTools.
4. Create the 6 database collections listed above via the Cloud Development console.
5. Right-click each cloud function folder → **Upload and Deploy** (all 15 functions).
6. Hit **Compile** — the app runs in the simulator.

---

## 项目结构 / Project Structure

```
bookease-miniapp/
├── app.js                          # 全局入口，处理分享链接 / Cloud init
├── app.json                        # 页面路由 + TabBar 配置
├── app.wxss                        # 全局样式
├── utils/util.js                   # 日期工具 + 云函数封装 + loading 管理
│
├── pages/
│   ├── schedule/                   # 「日程表」Tab：月历 + 双子 Tab
│   │   ├── 我的日程表              # Owner 视角：月历 + 当日预约列表 + 时段管理
│   │   └── 他人的日程表            # Guest 视角：已访问列表 / 详情月历 / 预约入口
│   ├── bookings/                   # 「预约」Tab：收到的(Owner) / 发出的(Guest)
│   ├── editSchedule/               # 创建 / 编辑日程表（服务项 + 周时段）
│   └── book/                       # Guest 填写预约表单
│
└── cloudfunctions/
    ├── login/                      # 首次登录 + upsert 用户
    ├── createSchedule/             # 创建日程表
    ├── updateSchedule/             # 更新日程表
    ├── deleteSchedule/             # 删除日程表
    ├── getMySchedules/             # 获取 Owner 的日程表列表
    ├── getScheduleDetail/          # 获取日程表详情（含服务项 + 时段）
    ├── getMyScheduleSlots/         # Owner 月历：周时段 + 日期覆盖
    ├── getOwnerCalendar/           # Owner 月历：已确认预约列表
    ├── setDayOverride/             # 设置某日的自定义时段
    ├── getScheduleByKey/           # 通过分享码查询日程表
    ├── createBooking/              # Guest 提交预约（含冲突检测）
    ├── listBookings/               # 查询预约列表（Owner/Guest 双角色）
    ├── updateBookingStatus/        # 确认 / 取消预约
    ├── getMyVisitedSchedules/      # Guest 已访问的日程表列表
    └── unvisitSchedule/            # 从已访问列表中移除
```

---

## 数据库结构 / Database Schema

### `schedules`
| 字段 | 类型 | 说明 |
|---|---|---|
| `ownerOpenid` | string | Owner 标识 |
| `name` | string | 日程表名称 |
| `description` | string | 描述（可空） |
| `qrCodeKey` | string | 6 位分享码 |
| `status` | number | `1` 启用 / `0` 停用 |

### `service_items`
| 字段 | 类型 | 说明 |
|---|---|---|
| `scheduleId` | string | 所属日程表 |
| `name` | string | 服务名称 |
| `durationMinutes` | number | 单次时长（分钟） |

### `weekly_slots`
| 字段 | 类型 | 说明 |
|---|---|---|
| `scheduleId` | string | 所属日程表 |
| `dayOfWeek` | number | `1`=周一 … `7`=周日 |
| `startTime` / `endTime` | string | `'HH:mm'` 格式 |

### `bookings`
| 字段 | 类型 | 说明 |
|---|---|---|
| `scheduleId` / `ownerOpenid` | string | 归属 |
| `itemId` / `itemName` | string | 服务项 |
| `bookingDate` | string | `'YYYY-MM-DD'` |
| `startTime` / `endTime` | string | `'HH:mm'` |
| `guestOpenid` / `guestName` / `guestPhone` | string | 访客信息 |
| `status` | string | `'pending'` / `'confirmed'` / `'cancelled'` |

### `day_overrides`
| 字段 | 类型 | 说明 |
|---|---|---|
| `scheduleId` | string | 所属日程表 |
| `date` | string | `'YYYY-MM-DD'` |
| `slots` | array | `[{startTime, endTime}]`，空数组表示该日不可约 |

---

## 常见问题 / FAQ

**Q: 云函数调用失败 / Cloud function call failed**  
检查 `app.js` 中的 `env` 是否填写正确，并确认对应云函数已部署成功。  
Check that the `env` value in `app.js` matches your Cloud Development environment ID, and that all functions are deployed.

**Q: 日历上没有绿点 / No dots on the calendar**  
确认已创建日程表，且为对应星期设置了每周时段。  
Make sure a schedule exists and weekly slots have been configured for the relevant days.

**Q: 输入分享码提示"日程表不存在" / "Schedule not found" when entering a code**  
确认日程表状态为启用（`status: 1`），分享码区分大小写。  
Verify the schedule is active (`status: 1`) and the code is entered with correct casing.

**Q: 预约提交后 Owner 看不到 / Owner cannot see submitted bookings**  
检查 `listBookings` 云函数是否部署；打开云开发控制台 → 云函数 → 查看函数日志排查。  
Check that `listBookings` is deployed; use the Cloud Development console → Functions → Logs to debug.

---