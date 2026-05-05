// pages/editSchedule/editSchedule.js
const util = require('../../utils/util.js')

const DAYS = [
  { dayOfWeek: 1, name: '周一' },
  { dayOfWeek: 2, name: '周二' },
  { dayOfWeek: 3, name: '周三' },
  { dayOfWeek: 4, name: '周四' },
  { dayOfWeek: 5, name: '周五' },
  { dayOfWeek: 6, name: '周六' },
  { dayOfWeek: 7, name: '周日' },
]

let rowKeyCounter = 0
function genKey() { return 'k' + (++rowKeyCounter) }

Page({
  data: {
    scheduleId: '',
    qrCodeKey: '',
    name: '',
    items: [],
    weeklySlots: [],
    qrVisible: false,
    qrLoading: false,
    qrUrl: '',
  },

  onLoad(options) {
    const emptyWeekly = DAYS.map(d => ({ ...d, slots: [] }))

    if (options && options.id) {
      this.setData({ scheduleId: options.id, weeklySlots: emptyWeekly })
      this.loadExisting(options.id)
    } else {
      // 新建模式：默认给项目1个空项目，周一到周五默认 9:00-18:00
      const defaultWeekly = emptyWeekly.map(d => ({
        ...d,
        slots: d.dayOfWeek <= 5 ? [{ key: genKey(), startTime: '09:00', endTime: '18:00' }] : [],
      }))
      this.setData({
        items: [{ key: genKey(), name: '', durationMinutes: 60 }],
        weeklySlots: defaultWeekly,
      })
    }
  },

  loadExisting(id) {
    util.callFn('getScheduleDetail', { scheduleId: id })
      .then(({ schedule, items, weeklySlots }) => {
        const weeklyMap = {}
        weeklySlots.forEach(s => {
          if (!weeklyMap[s.dayOfWeek]) weeklyMap[s.dayOfWeek] = []
          weeklyMap[s.dayOfWeek].push({
            key: genKey(),
            startTime: s.startTime,
            endTime: s.endTime,
          })
        })
        this.setData({
          name: schedule.name,
          qrCodeKey: schedule.qrCodeKey,
          items: items.map(i => ({
            key: genKey(),
            name: i.name,
            durationMinutes: i.durationMinutes,
            _id: i._id,
          })),
          weeklySlots: DAYS.map(d => ({
            ...d,
            slots: weeklyMap[d.dayOfWeek] || [],
          })),
        })
      }).catch(() => {})
  },

  onInputName(e) {
    this.setData({ name: e.detail.value })
  },

  onInputItemName(e) {
    const idx = e.currentTarget.dataset.idx
    const items = [...this.data.items]
    items[idx].name = e.detail.value
    this.setData({ items })
  },

  onInputItemDuration(e) {
    const idx = e.currentTarget.dataset.idx
    const items = [...this.data.items]
    items[idx].durationMinutes = Number(e.detail.value) || 0
    this.setData({ items })
  },

  addItem() {
    const items = [...this.data.items, { key: genKey(), name: '', durationMinutes: 60 }]
    this.setData({ items })
  },

  removeItem(e) {
    const idx = e.currentTarget.dataset.idx
    const items = this.data.items.filter((_, i) => i !== idx)
    this.setData({ items })
  },

  onTimeChange(e) {
    const { dow, sidx, field } = e.currentTarget.dataset
    const weeklySlots = this.data.weeklySlots.map(day => {
      if (day.dayOfWeek !== dow) return day
      const slots = day.slots.map((s, i) => i === sidx ? { ...s, [field]: e.detail.value } : s)
      return { ...day, slots }
    })
    this.setData({ weeklySlots })
  },

  addSlot(e) {
    const dow = e.currentTarget.dataset.dow
    const weeklySlots = this.data.weeklySlots.map(day => {
      if (day.dayOfWeek !== dow) return day
      return {
        ...day,
        slots: [...day.slots, { key: genKey(), startTime: '09:00', endTime: '12:00' }],
      }
    })
    this.setData({ weeklySlots })
  },

  removeSlot(e) {
    const { dow, sidx } = e.currentTarget.dataset
    const weeklySlots = this.data.weeklySlots.map(day => {
      if (day.dayOfWeek !== dow) return day
      return { ...day, slots: day.slots.filter((_, i) => i !== sidx) }
    })
    this.setData({ weeklySlots })
  },

  validate() {
    const { name, items, weeklySlots } = this.data
    if (!name.trim()) return '请填写日程表名称'
    if (items.length === 0) return '至少添加一个项目'
    for (const it of items) {
      if (!it.name.trim()) return '项目名不能为空'
      if (!it.durationMinutes || it.durationMinutes < 1) return '项目时长必须大于 0'
    }
    let hasSlot = false
    for (const day of weeklySlots) {
      for (const s of day.slots) {
        if (s.startTime >= s.endTime) return day.name + '的时段开始时间必须早于结束时间'
        hasSlot = true
      }
    }
    if (!hasSlot) return '至少设置一个可预约时段'
    return null
  },

  showQRCode() {
    const { scheduleId, qrUrl } = this.data
    if (!scheduleId) return
    this.setData({ qrVisible: true, qrLoading: !qrUrl })
    if (qrUrl) return
    util.callFn('getScheduleQRCode', { scheduleId }, { silent: true })
      .then(res => {
        if (res && res.success && res.url) {
          this.setData({ qrLoading: false, qrUrl: res.url })
        } else {
          this.setData({ qrLoading: false })
          wx.showToast({ title: '二维码生成失败', icon: 'none' })
        }
      })
      .catch(() => {
        this.setData({ qrLoading: false })
        wx.showToast({ title: '二维码生成失败', icon: 'none' })
      })
  },

  closeQR() {
    this.setData({ qrVisible: false })
  },

  stopPropagation() {},

  onShareAppMessage(options) {
    const ds = (options && options.target && options.target.dataset) || {}
    const key = ds.key || this.data.qrCodeKey
    const name = ds.name || this.data.name || '营业日程'
    return {
      title: `查看「${name}」，在线预约`,
      path: `/pages/schedule/schedule?key=${key}`,
    }
  },

  onSave() {
    const err = this.validate()
    if (err) {
      wx.showToast({ title: err, icon: 'none' })
      return
    }
    const { scheduleId, name, items, weeklySlots } = this.data
    const payload = {
      scheduleId,
      name,
      items: items.map(i => ({
        _id: i._id,
        name: i.name,
        durationMinutes: i.durationMinutes,
      })),
      weeklySlots: weeklySlots.flatMap(d => d.slots.map(s => ({
        dayOfWeek: d.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }))),
    }

    const fn = scheduleId ? 'updateSchedule' : 'createSchedule'
    util.callFn(fn, payload)
      .then(() => {
        wx.showToast({ title: '已保存' })
        setTimeout(() => wx.navigateBack(), 800)
      }).catch(() => {})
  },
})
