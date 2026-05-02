# Patch v3 —— 统一三 tab + sub-tab 架构

## 变化一览

1. **所有用户看到一样的底 tab：`日程表` / `预约` / `我的`**，不再做 Owner/Guest 模式切换。用回系统 tabBar，v2 的 `custom-tab-bar/` 目录可以整体删除。
2. **`日程表` tab 分 2 个 sub-tab**：
   - `他人的日程表`：列表展示当前用户访问过的所有他人日程表（去重、按访问顺序）。点击进入对应 `guestView` 可继续预约。长按/右侧的"移除"可从列表中删掉。
   - `我的日程表`：展示"我创建的日程表" + "近期行程"（双向合并：我被别人约 + 我约别人的，排除已取消，按日期分组）。没创建过日程表时，展示一个创建入口。
3. **`预约` tab（原 `待确认`）分 2 个 sub-tab**：
   - `我收到的`：作为 Owner 的预约，可确认 / 取消。
   - `我发出的`：作为 Guest 的预约，只能取消 `pending` 的；`confirmed` 的展示"已确认，需取消请联系 Owner"。
   - 每个 sub-tab 内部还有状态筛选（全部 / 待确认 / 已确认 / 已取消）。
4. **`我的` tab**：头像 + 昵称（`wx.getUserProfile` 授权），我的日程表 list（复制链接 / 编辑），底部"创建新的日程表"按钮。
5. **入口识别**：`app.js onLaunch(options)` 根据 `scene` 和 `query.key` 判断：通过扫码/转发进入 → 默认打开"他人的日程表"和"我发出的"；普通入口 → 默认"我的日程表"和"我收到的"。用户可随时手动切 sub-tab。
6. **权限规则**（`updateBookingStatus` 云函数）：
   - `pending → confirmed`：仅 Owner
   - `pending → cancelled`：Owner 或 Guest
   - `confirmed → cancelled`：仅 Owner（Guest 被服务端挡掉）
   - `cancelled`：终态
7. **`visitedSchedules` 机制**：`users` 表新增 `visitedSchedules: [scheduleId]` 数组。`getScheduleByKey` 每次被调用时，若访客不是 Owner 本人，就把 scheduleId 用 `$addToSet` 写入当前用户的 `visitedSchedules`；`getMyVisitedSchedules` 批量读取后返回给"他人的日程表"sub-tab；`unvisitSchedule` 用 `$pull` 从数组中移除。

## 文件清单

覆盖到 `booking-miniapp/` 对应位置：

```
app.json                                           # tab 重命名，移除 pending，注册 bookings
app.js                                             # 入口 scene 检测 + globalData
pages/schedule/schedule.{js,wxml,wxss,json}        # 完全重写
pages/my/my.{js,wxml,wxss,json}                    # 简化
pages/guestView/guestView.js                       # onLoad 依赖的 getScheduleByKey 已自动记录访问
pages/book/book.js                                 # 提交后跳 /pages/bookings/bookings 并默认 sent sub-tab
cloudfunctions/getScheduleByKey/index.js           # 新增 visitedSchedules 写入
cloudfunctions/updateBookingStatus/index.js        # 权限规则
```

新建：

```
pages/bookings/bookings.{js,wxml,wxss,json}        # 替代原 pages/pending/
cloudfunctions/getMyVisitedSchedules/              # 新云函数
cloudfunctions/unvisitSchedule/                    # 新云函数
```

**需要删除**：

```
pages/pending/                                     # 旧页整个目录删掉
custom-tab-bar/                                    # v2 留下的自定义 tabBar 整个目录删掉
```

## 应用步骤

1. 先用上面的"需要删除"清单，在开发者工具里把旧的 `pages/pending/` 和 `custom-tab-bar/` 两个目录整体删除。
2. 把本补丁包里所有文件按相同路径覆盖或新建到 `booking-miniapp/`。
3. 右键 `cloudfunctions/` 下这 4 个函数，逐个"上传并部署：云端安装依赖"：
   - `getScheduleByKey`（覆盖旧版）
   - `updateBookingStatus`（覆盖旧版）
   - `getMyVisitedSchedules`（新建）
   - `unvisitSchedule`（新建）
4. 数据库迁移：老用户的 `users` 文档没有 `visitedSchedules` 字段，无需手动迁移——`$addToSet` 对不存在字段会自动创建数组。
5. 编译预览：
   - 从首页入 app：日程表 tab 默认在"我的日程表"。
   - 换个小号扫分享码入 app（或手动在自定义编译里把启动页面设为 `pages/guestView/guestView?key=XXXXXX`）：提交预约后跳到"预约" tab 的"我发出的"；回到"日程表" tab 切"他人的日程表"能看到 A 的表在 list 里。
   - 同一小号再重进 app：此时日程表 tab 默认仍是"我的日程表"，但切到"他人的日程表"sub-tab 里 A 的表一直在。

## 交互说明

### 切 sub-tab 的默认值
- `app.js onLaunch(options)` 在这次启动时把 `globalData.defaultScheduleSubTab` 和 `defaultBookingsSubTab` 设好。
- `schedule.onLoad` 和 `bookings.onLoad` 里读取这两个默认值来决定本次进入 tab 时显示哪个 sub-tab。
- 用户手动切换 sub-tab 之后本次 session 内不再被覆盖（因为 `onLoad` 只跑一次，下一次 `switchTab` 会走 `onShow` 不重置）。

### 日历 vs 列表
"近期行程"按日期分组展示，等价于"按天的日历视图"。如果后续想升级为真正的月视图日历（`wx-calendar` 或自建 grid），只要替换 `schedule.wxml` 里 `.day-group` 部分的 UI，数据源 `upcoming` 可直接复用。

### 兼容性
- 如果旧的 `pages/pending/` 还在项目里但已从 `app.json` 移除，一般无害，但建议清理干净以防微信开发者工具报路径警告。
- 如果你曾手动给 `users` 表加过索引，注意 `visitedSchedules` 没有索引，当前 `$addToSet` 和 `$pull` 都是按文档更新，不需要索引。
