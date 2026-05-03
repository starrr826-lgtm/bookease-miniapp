// pages/my/my.js
const util = require('../../utils/util.js')

Page({
  data: {
    nickname: '',
    avatarUrl: '',
    schedules: [],
    loading: true,
  },

  onLoad() {
    const info = wx.getStorageSync('userInfo') || {}
    this.setData({
      nickname: info.nickName || '',
      avatarUrl: info.avatarUrl || '',
    })
  },

  onShow() {
    this.loadMySchedules()
  },

  onPullDownRefresh() {
    this.loadMySchedules().finally(() => wx.stopPullDownRefresh())
  },

  loadMySchedules() {
    return util.callFn('getMySchedules', {}, { loading: false })
      .then(list => {
        this.setData({
          schedules: Array.isArray(list) ? list : [],
          loading: false,
        })
      })
      .catch(() => {
        this.setData({ schedules: [], loading: false })
      })
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    this.setData({ avatarUrl })
    const info = wx.getStorageSync('userInfo') || {}
    info.avatarUrl = avatarUrl
    wx.setStorageSync('userInfo', info)
    util.callFn('login', { avatarUrl }, { silent: true }).catch(() => {})
  },

  onNicknameBlur(e) {
    const nickname = (e.detail.value || '').trim()
    if (!nickname) return
    this.setData({ nickname })
    const info = wx.getStorageSync('userInfo') || {}
    info.nickName = nickname
    wx.setStorageSync('userInfo', info)
    util.callFn('login', { nickname }, { silent: true }).catch(() => {})
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/editSchedule/editSchedule' })
  },

  openSchedule(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/editSchedule/editSchedule?id=' + id })
  },

  copyShareKey(e) {
    const key = e.currentTarget.dataset.key
    wx.setClipboardData({
      data: key,
      success: () => wx.showToast({ title: '分享码已复制', icon: 'none' }),
    })
  },

  deleteSchedule(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '删除日程表',
      content: '确定删除「' + name + '」？相关时段设置也将一并删除，此操作不可恢复。',
      confirmText: '删除',
      confirmColor: '#e53935',
      success: (res) => {
        if (!res.confirm) return
        util.callFn('deleteSchedule', { scheduleId: id })
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadMySchedules()
          })
          .catch(() => {})
      },
    })
  },
})
