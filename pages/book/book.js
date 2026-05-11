// pages/book/book.js - Guest 提交预约
const util = require('../../utils/util.js')
const SUBSCRIBE_TMPL_ID = '6LgsGebD5UWIAnD1zdF0YZUlJ03imzGf4_qxNlOgSbY'

Page({
  data: {
    scheduleId: '',
    scheduleName: '',
    itemIds: [],
    itemsDisplay: [],             // [{name}] 用于展示
    totalDurationMinutes: 0,
    bookingDate: '',
    startTime: '',
    endTime: '',
    guestName: '',
    guestPhone: '',
    note: '',
    submitting: false,
  },

  onLoad(options) {
    const itemIds = decodeURIComponent(options.itemIds || '').split(',').filter(Boolean)
    const itemNames = decodeURIComponent(options.itemNames || '').split(',').filter(Boolean)
    const totalDurationMinutes = Number(options.totalDurationMinutes) || 0
    const itemsDisplay = itemIds.map((id, i) => ({ id, name: itemNames[i] || '' }))
    this.setData({
      scheduleId: options.scheduleId || '',
      scheduleName: decodeURIComponent(options.scheduleName || ''),
      itemIds,
      itemsDisplay,
      totalDurationMinutes,
      bookingDate: options.bookingDate || '',
      startTime: options.startTime || '',
      endTime: options.endTime || '',
    })
    const userInfo = wx.getStorageSync('userInfo') || {}
    if (userInfo.nickName) {
      this.setData({ guestName: userInfo.nickName })
    }
  },

  onInput(e) {
    const f = e.currentTarget.dataset.f
    this.setData({ [f]: e.detail.value })
  },

  submit() {
    const { scheduleId, itemIds, bookingDate, startTime, endTime, guestName, guestPhone, note } = this.data
    if (!guestName || !guestName.trim()) {
      wx.showToast({ title: '请填写称呼', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(String(guestPhone || '').trim())) {
      wx.showToast({ title: '请填写正确手机号', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    // 必须在用户点击事件同步栈中调用，complete 后再提交
    wx.requestSubscribeMessage({
      tmplIds: [SUBSCRIBE_TMPL_ID],
      complete: () => this._doSubmit(),
    })
  },

  _doSubmit() {
    const { scheduleId, itemIds, bookingDate, startTime, endTime, guestName, guestPhone, note } = this.data
    util.callFn('createBooking', {
      scheduleId,
      itemIds,
      bookingDate,
      startTime,
      endTime,
      guestName: guestName.trim(),
      guestPhone: String(guestPhone).trim(),
      note: (note || '').trim(),
    })
      .then(() => {
        wx.showToast({ title: '预约已提交', icon: 'success' })
        // 跳到"预约 tab → 我发出的"
        const app = getApp()
        if (app && app.globalData) app.globalData.defaultBookingsSubTab = 'sent'
        setTimeout(() => {
          wx.switchTab({ url: '/pages/bookings/bookings' })
        }, 800)
      })
      .catch(() => {
        this.setData({ submitting: false })
      })
  },
})
