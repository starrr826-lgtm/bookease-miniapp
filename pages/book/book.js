// pages/book/book.js - Guest 提交预约
const util = require('../../utils/util.js')

Page({
  data: {
    scheduleId: '',
    scheduleName: '',
    itemId: '',
    itemName: '',
    itemDurationMinutes: 0,
    bookingDate: '',
    startTime: '',
    endTime: '',
    guestName: '',
    guestPhone: '',
    note: '',
    submitting: false,
  },

  onLoad(options) {
    this.setData({
      scheduleId: options.scheduleId || '',
      scheduleName: decodeURIComponent(options.scheduleName || ''),
      itemId: options.itemId || '',
      itemName: decodeURIComponent(options.itemName || ''),
      itemDurationMinutes: Number(options.itemDurationMinutes) || 0,
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
    const { scheduleId, itemId, bookingDate, startTime, endTime, guestName, guestPhone, note } = this.data
    if (!guestName || !guestName.trim()) {
      wx.showToast({ title: '请填写称呼', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(String(guestPhone || '').trim())) {
      wx.showToast({ title: '请填写正确手机号', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    util.callFn('createBooking', {
      scheduleId,
      itemId,
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
