// pages/bookings/bookings.js
const util = require('../../utils/util.js')

const STATUS_TEXT = {
  pending: '待确认',
  confirmed: '已确认',
  cancelled: '已取消',
}

Page({
  data: {
    subTab: 'received',     // 'received'=我收到的 (Owner) | 'sent'=我发出的 (Guest)
    filter: 'all',          // 'all' | 'pending' | 'confirmed' | 'cancelled'

    receivedAll: [],
    sentAll: [],
    filteredList: [],
  },

  onLoad() {
    const app = getApp()
    const def = (app.globalData && app.globalData.defaultBookingsSubTab) || 'received'
    this.setData({ subTab: def })
  },

  onShow() {
    this.loadAll()
  },

  onPullDownRefresh() {
    this.loadAll().finally(() => wx.stopPullDownRefresh())
  },

  switchSubTab(e) {
    this.setData({ subTab: e.currentTarget.dataset.t, filter: 'all' }, () => {
      this.applyFilter()
    })
  },

  onFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.f }, () => this.applyFilter())
  },

  loadAll() {
    return Promise.all([
      util.callFn('listBookings', { role: 'owner' }, { silent: true }).catch(() => []),
      util.callFn('listBookings', { role: 'guest' }, { silent: true }).catch(() => []),
    ]).then(([ownerList, guestList]) => {
      const decorate = (list) => (list || []).map(b => ({
        ...b,
        statusText: STATUS_TEXT[b.status] || b.status || '',
      }))
      this.setData({
        receivedAll: decorate(ownerList),
        sentAll: decorate(guestList),
      }, () => this.applyFilter())
    })
  },

  applyFilter() {
    const { subTab, filter, receivedAll, sentAll } = this.data
    const src = subTab === 'received' ? receivedAll : sentAll
    const filteredList = filter === 'all' ? src : src.filter(b => b.status === filter)
    this.setData({ filteredList })
  },

  // —— 我收到的（Owner） ——
  confirmBooking(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认此预约？',
      success: (r) => {
        if (!r.confirm) return
        util.callFn('updateBookingStatus', { bookingId: id, status: 'confirmed' })
          .then(() => {
            wx.showToast({ title: '已确认' })
            this.loadAll()
          })
          .catch(() => {})
      },
    })
  },

  rejectBooking(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消此预约？',
      content: '取消后 Guest 将看到状态变为已取消',
      success: (r) => {
        if (!r.confirm) return
        util.callFn('updateBookingStatus', { bookingId: id, status: 'cancelled' })
          .then(() => {
            wx.showToast({ title: '已取消' })
            this.loadAll()
          })
          .catch(() => {})
      },
    })
  },

  // —— 我发出的（Guest，仅 pending 可取消） ——
  cancelMyBooking(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消预约？',
      content: '只能取消尚未被 Owner 确认的预约',
      success: (r) => {
        if (!r.confirm) return
        util.callFn('updateBookingStatus', { bookingId: id, status: 'cancelled' })
          .then(() => {
            wx.showToast({ title: '已取消' })
            this.loadAll()
          })
          .catch(() => {})
      },
    })
  },
})
