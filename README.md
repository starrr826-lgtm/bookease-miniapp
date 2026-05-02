# 预约管家 小程序 MVP

一个基于**微信云开发**的预约管理小程序 MVP，包含 Owner（服务提供者）和 Guest（预约者）两端的核心闭环。

> ⚠️ **第一次做小程序必看**：从零到跑起来大约需要 1 小时，请按本文档顺序执行。

---

## 目录结构

```
booking-miniapp/
├── app.js / app.json / app.wxss       # 小程序入口和全局配置
├── sitemap.json
├── project.config.json                # 项目配置（AppID 在这里）
├── utils/util.js                      # 日期/调用云函数工具
├── pages/
│   ├── my/                            # "我的" Tab：用户资料 + 自己的日程表列表
│   ├── schedule/                      # "日程表" Tab：日历视图看预约
│   ├── pending/                       # "待确认" Tab：审核/查看预约
│   ├── editSchedule/                  # 创建/编辑日程表
│   ├── guestView/                     # Guest 扫码/点分享进来看到的页面
│   └── book/                          # Guest 填表提交预约
└── cloudfunctions/
    ├── login/                         # 首次打开时拿 openid 并注册用户
    ├── createSchedule/                # 创建日程表
    ├── getMySchedules/                # 列出我的日程表
    ├── getScheduleDetail/             # 获取日程表详情（Owner 编辑/Guest 查看复用）
    ├── updateSchedule/                # 更新日程表
    ├── createBooking/                 # Guest 提交预约（带冲突检测）
    ├── listBookings/                  # 列出预约（按 Owner/Guest 视角过滤）
    └── updateBookingStatus/           # 确认/取消预约
```

---

## 📋 跑起来的完整步骤

### Step 1. 注册小程序账号拿到 AppID（10 分钟）

1. 打开 ://mp.weixin.qq.com
2. 点右上角「立https即注册」→ 选「小程序」
3. 填邮箱（**必须是没注册过公众号/小程序的邮箱**）→ 设密码 → 邮箱激活
4. 填主体信息（个人：微信扫码 + 身份证号即可，免费）
5. 进入管理后台 → 左侧「开发管理」→「开发设置」→ 复制 **AppID**，类似 `wx1234567890abcdef`

### Step 2. 在管理后台开通云开发（5 分钟）

1. 在管理后台左侧点「**云开发**」
2. 第一次会弹「开通云开发」→ 点同意
3. 创建环境（填个名字随意，如 `booking-dev`）→ 选「**按量付费**」
   - 个人学习够用免费额度（每月几万次调用），不会扣钱
4. 创建后复制**环境 ID**（形如 `booking-dev-1abc23def`）

### Step 3. 替换代码里的两个占位符

项目里有**两处**你必须改：

1. **`project.config.json` 里的 `appid`**
   ```json
   "appid": "wxXXXXXXXXXXXXXXXX"  ←  换成你的 AppID
   ```

2. **`app.js` 里的 `env`**
   ```js
   wx.cloud.init({
     env: 'YOUR-CLOUD-ENV-ID',    ←  换成你的环境 ID
     traceUser: true,
   })
   ```

### Step 4. 用开发者工具导入项目

1. 把整个 `booking-miniapp` 文件夹从 Claude 的 outputs 文件夹**复制到你电脑上**（比如 `~/Documents/booking-miniapp/`）
2. 打开「微信开发者工具」
3. 左上角点「+」→「导入项目」
4. 「目录」选刚才那个文件夹 → AppID 会自动从 `project.config.json` 读到 → 点「**确定**」

进入后你会看到代码+模拟器双栏界面。

### Step 5. 创建数据库集合（2 分钟）

这个项目用了 6 个数据库集合，需要手动创建（只要第一次）：

1. 开发者工具顶部点「**云开发**」按钮 → 打开云开发面板
2. 点「**数据库**」标签页
3. 点「+」新建集合，依次创建这 6 个（名字必须一样）：
   - `users`
   - `schedules`
   - `service_items`
   - `weekly_slots`
   - `bookings`

> 提示：每个集合默认权限是「仅创建者可读写」。但本项目所有读写都经过云函数，云函数有**管理员权限**，所以无需额外改。

### Step 6. 部署 8 个云函数（5 分钟）

在开发者工具左侧**资源管理器**（类似 VSCode 侧边栏）里：

1. 展开 `cloudfunctions` 目录
2. 右键 `login` 文件夹 → 选「**上传并部署：云端安装依赖（不上传 node_modules）**」
3. 等待提示「上传成功」
4. 对 **剩下 7 个云函数** 重复同样操作：
   - createSchedule
   - getMySchedules
   - getScheduleDetail
   - updateSchedule
   - createBooking
   - listBookings
   - updateBookingStatus

> 💡 每个云函数第一次部署大约 20–40 秒（因为要装 `wx-server-sdk`）

### Step 7. 跑起来！

1. 点工具栏的「**编译**」按钮（或按 Ctrl/Cmd+B）
2. 左侧模拟器会刷新，进入小程序
3. 可以在三个 Tab 之间切换：日程表 / 待确认 / 我的

---

## 🧪 完整跑一遍核心流程（自测）

**作为 Owner：**
1. 打开小程序 → 进「我的」Tab
2. 点「+ 创建新日程表」→ 填名字「测试日程」→ 添加一个项目「咨询」时长 60 分钟 → 保存
3. 回到「我的」Tab → 可以看到刚创建的日程表，右下角有个 6 位分享码（如 `AB3CDE`）
4. 点日程表卡片的「分享」按钮 → 按提示点右上角「···」→「转发」 → 发给自己（通过文件传输助手或另一个微信号）

**作为 Guest（在另一个微信号/测试号上）：**
5. 点收到的分享卡片 → 进入 guestView 页
6. 点日历上有绿点的日期 → 下方出现可预约时段 → 点「预约」
7. 选项目、时间、填手机号 → 提交
8. 跳到「待确认」Tab → 看到自己的预约处于「待确认」

**切回 Owner：**
9. 打开「待确认」Tab（作为 Owner 视角） → 看到 Guest 的请求
10. 点「确认」→ 状态变为「已确认」
11. 回「日程表」Tab → 选那一天 → 看到这条预约

## 🐛 常见问题

**Q: 模拟器报错 "云函数 login 调用失败"**
A: 检查云开发环境 ID 是否填对；检查 `login` 云函数是否部署成功。

**Q: 创建日程表后看不到**
A: 检查 `schedules` 集合是否建了；打开云开发面板 → 数据库 → schedules 看看有没有数据。

**Q: 分享链接打开是"日程表不存在"**
A: 别直接手改 URL。正规流程：从「我的」→ 分享按钮 → 右上角转发。

**Q: 想看云函数日志**
A: 云开发面板 → 云函数 → 选中对应函数 → 点「日志」标签。

---

## 🎯 MVP 范围说明

**已实现：**
- 用户首次打开自动登录（拿 openid）
- Owner：创建/编辑日程表（名字、项目、周循环时段）、分享给 Guest、日历视图看预约、确认/拒绝预约
- Guest：通过分享链接进入、查看日历、提交预约（含时段冲突检测）、查看自己的预约、取消

**暂未实现（你可以后面自己加）：**
- 特定日期临时调整可预约时段（`date_override` 表）
- 微信订阅消息（预约确认后通知 Guest）
- Owner 端的个人信息编辑
- 生成实体二维码图片（目前用分享卡片，体验更好）
- 数据库索引优化（用户多起来前不急）

## 📞 帮助

按步骤走如果卡住了，来找我，把报错信息贴给我就好。
