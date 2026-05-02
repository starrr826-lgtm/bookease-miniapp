// app.js
App({
  globalData: {
    userInfo: null,
    // 子 tab 默认值（给 schedule / bookings 页读）
    defaultScheduleSubTab: 'mine',   // 'mine' | 'others'
    defaultBookingsSubTab: 'received', // 'received' | 'sent'
    // 扫码 / 分享链接带来的 key：schedule 页 onShow 消费后清空，并自动打开"他人的日程表"详情态
    pendingShareKey: '',
  },

  onLaunch(options) {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // TODO: 替换为你自己的云环境 ID
        env: 'cloud1-d4gsp83yxfd4145fe',
        traceUser: true,
      })
    }

    this.consumeEntryOptions(options)

    // 登录 / upsert 用户
    wx.cloud.callFunction({ name: 'login' }).catch(e => console.warn('login fail', e))
  },

  onShow(options) {
    // 冷启动 onLaunch 已处理过，onShow 处理热启动（从分享、扫码再次唤起）
    this.consumeEntryOptions(options)
  },

  /**
   * 从启动 options 中解析分享链接中的 key
   *   常见来源：公众号/朋友圈链接、小程序码、分享消息卡
   *   约定分享链接路径是 "pages/schedule/schedule?key=xxx"
   */
  consumeEntryOptions(options) {
    if (!options) return
    const q = options.query || {}
    const key = (q.key || '').trim()
    const shareScenes = [1007, 1008, 1011, 1012, 1013, 1014, 1044, 1047, 1048, 1049]
    const fromShareScene = shareScenes.indexOf(options.scene) !== -1

    if (key) {
      this.globalData.pendingShareKey = key
      this.globalData.defaultScheduleSubTab = 'others'
    } else if (fromShareScene) {
      this.globalData.defaultScheduleSubTab = 'others'
    }
  },
})
