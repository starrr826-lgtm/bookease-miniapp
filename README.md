# 满满日程 · BookEase

> 一款基于微信云开发的预约管理小程序，让服务提供者轻松管理时间，让用户一键完成预约。
>
> A WeChat Mini Program where service providers set their weekly availability and share a booking page via QR code, link, or 6-digit code — clients pick a slot and confirm, all without leaving WeChat.

**Tech Stack:** WeChat Mini Program · WXML/WXSS/JS · WeChat Cloud Functions · Node.js · WeChat Cloud Database · NoSQL

---

## 目录 / Table of Contents

- [功能介绍 / Features](#功能介绍--features)
- [使用流程 / How It Works](#使用流程--how-it-works)
- [技术栈 / Tech Stack](#技术栈--tech-stack)
- [项目结构 / Project Structure](#项目结构--project-structure)
- [数据库结构 / Database Schema](#数据库结构--database-schema)

---

## 功能介绍 / Features

### Owner（服务提供者）

| 功能 | 说明 |
|---|---|
| 创建日程表 | 设置服务名称、描述、服务项目（名称 + 时长） |
| 配置周循环时段 | 为每周各天设置可预约时间窗口 |
| 日期自定义覆盖 | 单独调整某一天的时段（临时关闭 / 加时段） |
| 月历总览 | 查看本月所有已确认预约，点击日期看当日详情 |
| 确认 / 取消预约 | 在「预约」Tab 一键审核访客预约请求 |
| 多种分享方式 | 每张日程表生成唯一分享码、专属链接和二维码 |

| Feature | Description |
|---|---|
| Create a Schedule | Set service name, description, and offerings (name + duration) |
| Weekly Availability | Configure recurring time windows for each day of the week |
| Date Overrides | Temporarily block a day or add extra slots for specific dates |
| Monthly Calendar | View all confirmed bookings for the month; tap a date for details |
| Confirm / Cancel | Review and manage incoming booking requests in one tab |
| Multi-share Options | Each schedule generates a unique 6-digit code, shareable link, and QR code |

### Guest（预约者）

| 功能 | 说明 |
|---|---|
| 多方式进入 | 扫码、点链接、或在小程序内输入 6 位分享码 |
| 月历查看可约日期 | 绿点标注有可用时段的日期 |
| 选服务 + 选时间 | 先选服务项目，再选对应日期的时间段 |
| 提交预约 | 填写称呼和手机号后提交，带时段冲突检测 |
| 查看我的预约 | 在「预约」Tab 查看发出的所有预约及状态 |
| 取消预约 | 对未确认的预约可自行取消 |

| Feature | Description |
|---|---|
| Multiple Entry Points | Scan QR code, open a shared link, or enter the 6-digit code manually |
| Live Calendar | Month view with green dots marking dates that have available slots |
| Pick Service + Time | Select a service offering, then choose from available time slots |
| Submit Booking | Enter name and phone number; duplicate slot conflicts are auto-blocked |
| My Bookings | View all submitted bookings and their status in one tab |
| Cancel Anytime | Guests can cancel pending bookings before owner confirmation |

---

## 使用流程 / How It Works

**Owner 视角 / Owner Flow**

1. 登录小程序，创建一张日程表，填写服务名称和服务项目
2. 为每周各天配置可预约时间段；如有特殊日期，单独覆盖
3. 将分享码、链接或二维码发给需要预约的客户
4. 在「预约」Tab 查看预约请求，一键确认或取消

1. Log in and create a schedule — set service name, offerings, and duration
2. Configure weekly time slots; override specific dates as needed
3. Share the booking code, link, or QR code with clients
4. Review incoming requests in the Bookings tab and confirm or decline

**Guest 视角 / Guest Flow**

1. 扫描二维码、点击链接，或在小程序内输入 6 位分享码
2. 在月历上浏览可约日期（绿点标注），点击进入
3. 选择服务项目和时间段，填写姓名与手机号，提交预约
4. 等待 Owner 确认；可随时在「预约」Tab 查看状态或取消

1. Scan the QR code, open the shared link, or enter the 6-digit code
2. Browse the calendar — green dots indicate dates with open slots
3. Pick a service and time slot, fill in name and phone, submit
4. Wait for owner confirmation; check status or cancel anytime in My Bookings

---

## 技术栈 / Tech Stack

| 层 | 技术 |
|---|---|
| 前端 | 微信小程序原生（WXML / WXSS / JS），无第三方 UI 框架 |
| 后端 | 微信云开发云函数（Node.js），共 15 个函数 |
| 数据库 | 微信云数据库（文档型 NoSQL），共 6 个集合 |
| 部署 | 微信云开发，无需自建服务器 |

| Layer | Technology |
|---|---|
| Frontend | Native WeChat Mini Program (WXML / WXSS / JS), no third-party UI framework |
| Backend | WeChat Cloud Functions (Node.js) — 15 serverless functions |
| Database | WeChat Cloud Database (document-based NoSQL) — 6 collections |
| Hosting | WeChat Cloud Development, no self-hosted server required |

---

## 项目结构 / Project Structure

```
bookease-miniapp/
├── app.js                          # Global entry — cloud init, shared link handling
├── app.json                        # Page routing + TabBar config
├── app.wxss                        # Global styles
├── utils/util.js                   # Date utilities, cloud function wrapper, loading manager
│
├── pages/
│   ├── schedule/                   # "Schedule" tab — calendar + dual sub-tabs
│   │   ├── My Schedules            # Owner view: monthly calendar, daily booking list, slot management
│   │   └── Others' Schedules       # Guest view: visited list, schedule detail calendar, booking entry
│   ├── bookings/                   # "Bookings" tab — received (Owner) / sent (Guest)
│   ├── editSchedule/               # Create / edit a schedule (service items + weekly slots)
│   └── book/                       # Guest booking form
│
└── cloudfunctions/
    ├── login/                      # First-time login + upsert user record
    ├── createSchedule/             # Create a new schedule
    ├── updateSchedule/             # Update schedule info
    ├── deleteSchedule/             # Delete a schedule
    ├── getMySchedules/             # List owner's schedules
    ├── getScheduleDetail/          # Fetch schedule detail (service items + slots)
    ├── getMyScheduleSlots/         # Owner calendar: weekly slots + day overrides
    ├── getOwnerCalendar/           # Owner calendar: confirmed booking list
    ├── setDayOverride/             # Set custom slots for a specific date
    ├── getScheduleByKey/           # Look up a schedule by 6-digit code
    ├── createBooking/              # Guest submits booking (with conflict detection)
    ├── listBookings/               # Query bookings (dual-role: owner or guest)
    ├── updateBookingStatus/        # Confirm or cancel a booking
    ├── getMyVisitedSchedules/      # Guest's list of previously visited schedules
    └── unvisitSchedule/            # Remove a schedule from visited list
```

---

## 数据库结构 / Database Schema

### `schedules`
| Field | Type | Description |
|---|---|---|
| `ownerOpenid` | string | Owner identifier |
| `name` | string | Schedule name |
| `description` | string | Description (optional) |
| `qrCodeKey` | string | Unique 6-digit booking code |
| `status` | number | `1` active / `0` inactive |

### `service_items`
| Field | Type | Description |
|---|---|---|
| `scheduleId` | string | Parent schedule |
| `name` | string | Service name |
| `durationMinutes` | number | Duration per session (minutes) |

### `weekly_slots`
| Field | Type | Description |
|---|---|---|
| `scheduleId` | string | Parent schedule |
| `dayOfWeek` | number | `1` = Mon … `7` = Sun |
| `startTime` / `endTime` | string | `'HH:mm'` format |

### `bookings`
| Field | Type | Description |
|---|---|---|
| `scheduleId` / `ownerOpenid` | string | Ownership reference |
| `itemId` / `itemName` | string | Service item |
| `bookingDate` | string | `'YYYY-MM-DD'` |
| `startTime` / `endTime` | string | `'HH:mm'` |
| `guestOpenid` / `guestName` / `guestPhone` | string | Guest info |
| `status` | string | `'pending'` / `'confirmed'` / `'cancelled'` |

### `day_overrides`
| Field | Type | Description |
|---|---|---|
| `scheduleId` | string | Parent schedule |
| `date` | string | `'YYYY-MM-DD'` |
| `slots` | array | `[{startTime, endTime}]` — empty array blocks the day |

---
