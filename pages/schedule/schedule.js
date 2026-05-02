// pages/schedule/schedule.js — 月历 + 双子 tab
const util = require('../../utils/util.js')

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function todayStr() { return util.toDateStr(new Date()) }

let slotKeyCounter = 0
function genSlotKey() { return 'sk' + (++slotKeyCounter) }

// JS getDay() (0=Sun,1=Mon…6=Sat) → 存储的 dayOfWeek (1=Mon…7=Sun)
function jsToStoredDow(jsDay) { return jsDay === 0 ? 7 : jsDay }

Page({
  data: {
    subTab: 'mine',       // 'mine' | 'others'
    weekLabels: WEEK_LABELS,

    // —— 月历通用 ——
    viewYear: 0,
    viewMonth: 0,
    monthLabel: '',
    monthGrid: [],
    selectedDate: '',

    // —— 我的日程表 ——
    ownerHasSchedule: null,       // null=加载中, false=无, true=有
    ownerScheduleId: '',
    ownerWeeklySlots: [],         // [{dayOfWeek,startTime,endTime}]
    ownerDayOverrides: {},        // { 'YYYY-MM-DD': [{startTime,endTime}] }

    businessDotsByDate: {},       // 有营业时段的日期
    bookingDotsByDate: {},        // 有已确认预约的日期

    ownerBookingsByDate: {},
    ownerSelectedList: [],        // 当日已确认预约列表

    daySlots: [],                 // 当日生效时段（覆盖 or 周循环）
    dayHasOverride: false,        // 当日是否有自定义覆盖

    editingDaySlots: null,        // null=非编辑态; array=编辑中的时段

    // —— 他人的日程表 ——
    othersState: 'list',          // 'list' | 'detail'
    visitedList: [],

    detailSchedule: null,
    detailItems: [],
    detailSlots: [],
    selectedItemId: '',
    detailDotsByDate: {},
    detailSlotsForDate: [],

    loading: true,
    inputKey: '',
  },

  onLoad() {
    const app = getApp()
    const def = (app.globalData && app.globalData.defaultScheduleSubTab) || 'mine'
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const today = util.toDateStr(now)
    const grid = util.buildMonthGrid(year, month).map(cell => ({
      ...cell,
      isSelected: cell.date === today,
      isToday: cell.date === today,
      hasBusiness: false,
      hasBooking: false,
      hasAvailable: false,
      hasDot: false,
    }))
    this.setData({
      subTab: def,
      viewYear: year,
      viewMonth: month,
      selectedDate: today,
      monthGrid: grid,
      monthLabel: year + '年' + month + '月',
    })
  },

  onShow() {
    wx.nextTick(() => {
      const app = getApp()
      const pendingKey = (app && app.globalData && app.globalData.pendingShareKey) || ''
      if (pendingKey) {
        app.globalData.pendingShareKey = ''
        this.setData({ subTab: 'others' })
        this.openScheduleByKey(pendingKey)
        return
      }
      this.refresh()
    })
  },

  onPullDownRefresh() {
    this.refresh().finally(() => wx.stopPullDownRefresh())
  },

  refresh() {
    const { subTab, othersState } = this.data
    if (subTab === 'mine') return this.loadOwnerData()
    if (othersState === 'list') return this.loadVisited()
    if (othersState === 'detail' && this.data.detailSchedule) {
      return this.openScheduleByKey(this.data.detailSchedule.qrCodeKey)
    }
    return Promise.resolve()
  },

  switchSubTab(e) {
    const t = e.currentTarget.dataset.t
    this.setData({ subTab: t, othersState: 'list' }, () => {
      this.rebuildMonthGrid()
      if (t === 'mine') this.loadOwnerData()
      else this.loadVisited()
    })
  },

  // ========== 月历通用 ==========
  rebuildMonthGrid() {
    const { viewYear, viewMonth, selectedDate, subTab, othersState,
            businessDotsByDate, bookingDotsByDate, detailDotsByDate } = this.data
    const todayS = todayStr()
    const grid = util.buildMonthGrid(viewYear, viewMonth).map(cell => {
      let hasBusiness = false
      let hasBooking = false
      let hasAvailable = false
      if (subTab === 'mine') {
        hasBusiness = !!businessDotsByDate[cell.date]
        hasBooking = !!bookingDotsByDate[cell.date]
      } else if (othersState === 'detail') {
        hasAvailable = !!detailDotsByDate[cell.date]
      }
      return {
        ...cell,
        isSelected: cell.date === selectedDate,
        isToday: cell.date === todayS,
        hasBusiness,
        hasBooking,
        hasAvailable,
        hasDot: hasBusiness || hasBooking || hasAvailable,
      }
    })
    this.setData({
      monthGrid: grid,
      monthLabel: viewYear + '年' + viewMonth + '月',
    })
  },

  prevMonth() {
    const { viewYear, viewMonth } = this.data
    const n = util.addMonths(viewYear, viewMonth, -1)
    this.setData({ viewYear: n.year, viewMonth: n.month }, () => {
      if (this.data.subTab === 'mine') {
        this.loadOwnerData()
      } else if (this.data.othersState === 'detail') {
        this.rebuildMonthGrid()
        this.rebuildDetailDots()
      } else {
        this.rebuildMonthGrid()
      }
    })
  },

  nextMonth() {
    const { viewYear, viewMonth } = this.data
    const n = util.addMonths(viewYear, viewMonth, 1)
    this.setData({ viewYear: n.year, viewMonth: n.month }, () => {
      if (this.data.subTab === 'mine') {
        this.loadOwnerData()
      } else if (this.data.othersState === 'detail') {
        this.rebuildMonthGrid()
        this.rebuildDetailDots()
      } else {
        this.rebuildMonthGrid()
      }
    })
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    this.setData({ selectedDate: date, editingDaySlots: null }, () => {
      this.rebuildMonthGrid()
      if (this.data.subTab === 'mine') {
        this.refreshOwnerSelected()
        this.refreshDaySlots()
      } else if (this.data.othersState === 'detail') {
        this.rebuildDetailSlotsForDate()
      }
    })
  },

  // ========== 我的日程表 ==========
  loadOwnerData() {
    const { viewYear, viewMonth } = this.data
    const fromDate = util.toDateStr(new Date(viewYear, viewMonth - 1, 1))
    const lastDay = new Date(viewYear, viewMonth, 0).getDate()
    const toDate = util.toDateStr(new Date(viewYear, viewMonth - 1, lastDay))

    return Promise.all([
      util.callFn('getOwnerCalendar', { fromDate, toDate }, { silent: true }).catch(() => []),
      util.callFn('getMyScheduleSlots', { fromDate, toDate }, { silent: true }).catch(() => null),
    ]).then(([bookingList, scheduleInfo]) => {
      // 处理预约数据
      const bookingArr = Array.isArray(bookingList) ? bookingList : []
      const byDate = {}
      const bookingDots = {}
      bookingArr.forEach(b => {
        const d = b.bookingDate
        if (!d) return
        if (!byDate[d]) byDate[d] = []
        byDate[d].push(b)
        bookingDots[d] = true
      })
      Object.keys(byDate).forEach(d => {
        byDate[d].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      })

      // 处理日程表/时段数据
      let ownerHasSchedule = this.data.ownerHasSchedule
      let ownerScheduleId = this.data.ownerScheduleId
      let ownerWeeklySlots = this.data.ownerWeeklySlots
      let ownerDayOverrides = this.data.ownerDayOverrides

      if (scheduleInfo !== null) {
        ownerHasSchedule = !!(scheduleInfo.hasSchedule)
        const schedules = scheduleInfo.schedules || []
        ownerScheduleId = schedules.length > 0 ? schedules[0]._id : ''
        ownerWeeklySlots = scheduleInfo.weeklySlots || []

        const overrideArr = scheduleInfo.dayOverrides || []
        ownerDayOverrides = {}
        overrideArr.forEach(o => { ownerDayOverrides[o.date] = o.slots || [] })
      }

      // 计算营业日点标（周循环 + 覆盖）
      const businessDots = {}
      const grid = util.buildMonthGrid(viewYear, viewMonth)
      grid.forEach(cell => {
        if (!cell.isCurrentMonth) return
        if (ownerDayOverrides[cell.date] !== undefined) {
          // 该日有自定义覆盖
          if (ownerDayOverrides[cell.date].length > 0) businessDots[cell.date] = true
          return
        }
        const d = new Date(cell.date + 'T00:00:00')
        const storedDow = jsToStoredDow(d.getDay())
        if (ownerWeeklySlots.some(s => s.dayOfWeek === storedDow)) {
          businessDots[cell.date] = true
        }
      })

      this.setData({
        ownerBookingsByDate: byDate,
        bookingDotsByDate: bookingDots,
        ownerHasSchedule,
        ownerScheduleId,
        ownerWeeklySlots,
        ownerDayOverrides,
        businessDotsByDate: businessDots,
        loading: false,
      }, () => {
        this.rebuildMonthGrid()
        this.refreshOwnerSelected()
        this.refreshDaySlots()
      })
    })
  },

  refreshOwnerSelected() {
    const list = (this.data.ownerBookingsByDate[this.data.selectedDate]) || []
    this.setData({ ownerSelectedList: list })
  },

  // 计算当前选中日期的生效时段（覆盖 or 周循环）
  refreshDaySlots() {
    const { selectedDate, ownerWeeklySlots, ownerDayOverrides } = this.data
    if (!selectedDate) return

    let slots = []
    let dayHasOverride = false

    if (ownerDayOverrides[selectedDate] !== undefined) {
      slots = ownerDayOverrides[selectedDate]
      dayHasOverride = true
    } else {
      const d = new Date(selectedDate + 'T00:00:00')
      const storedDow = jsToStoredDow(d.getDay())
      slots = ownerWeeklySlots
        .filter(s => s.dayOfWeek === storedDow)
        .map(s => ({ startTime: s.startTime, endTime: s.endTime }))
    }

    this.setData({ daySlots: slots, dayHasOverride })
  },

  // 取消预约（需求6）
  cancelBooking(e) {
    const bookingId = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消预约',
      content: '确认取消该预约？',
      confirmText: '确认取消',
      confirmColor: '#e74c3c',
      success: (r) => {
        if (!r.confirm) return
        util.callFn('updateBookingStatus', { bookingId, status: 'cancelled' })
          .then(() => {
            wx.showToast({ title: '已取消', icon: 'success' })
            this.loadOwnerData()
          })
          .catch(() => {})
      },
    })
  },

  // —— 当日时段编辑（需求5）——
  startEditDaySlots() {
    const slots = this.data.daySlots.map(s => ({ ...s, key: genSlotKey() }))
    this.setData({ editingDaySlots: slots })
  },

  cancelEditDaySlots() {
    this.setData({ editingDaySlots: null })
  },

  addEditSlot() {
    const slots = [...this.data.editingDaySlots, { key: genSlotKey(), startTime: '09:00', endTime: '18:00' }]
    this.setData({ editingDaySlots: slots })
  },

  removeEditSlot(e) {
    const idx = e.currentTarget.dataset.idx
    const slots = this.data.editingDaySlots.filter((_, i) => i !== idx)
    this.setData({ editingDaySlots: slots })
  },

  onEditSlotTimeChange(e) {
    const { idx, field } = e.currentTarget.dataset
    const slots = this.data.editingDaySlots.map((s, i) =>
      i === idx ? { ...s, [field]: e.detail.value } : s
    )
    this.setData({ editingDaySlots: slots })
  },

  saveDaySlots() {
    const { editingDaySlots, ownerScheduleId, selectedDate } = this.data
    for (const s of editingDaySlots) {
      if (s.startTime >= s.endTime) {
        wx.showToast({ title: '开始时间必须早于结束时间', icon: 'none' })
        return
      }
    }
    const slots = editingDaySlots.map(s => ({ startTime: s.startTime, endTime: s.endTime }))
    util.callFn('setDayOverride', { scheduleId: ownerScheduleId, date: selectedDate, slots })
      .then(() => {
        wx.showToast({ title: '已保存', icon: 'success' })
        this.setData({ editingDaySlots: null })
        this.loadOwnerData()
      })
      .catch(() => {})
  },

  resetDaySlots() {
    const { ownerScheduleId, selectedDate } = this.data
    wx.showModal({
      title: '恢复默认',
      content: '将该日期恢复为周循环时段？',
      success: (r) => {
        if (!r.confirm) return
        util.callFn('setDayOverride', { scheduleId: ownerScheduleId, date: selectedDate, slots: [] })
          .then(() => {
            wx.showToast({ title: '已恢复', icon: 'success' })
            this.setData({ editingDaySlots: null })
            this.loadOwnerData()
          })
          .catch(() => {})
      },
    })
  },

  goCreateSchedule() {
    wx.navigateTo({ url: '/pages/editSchedule/editSchedule' })
  },

  // ========== 他人的日程表 ==========
  loadVisited() {
    return util.callFn('getMyVisitedSchedules', {}, { silent: true })
      .then(list => {
        this.setData({
          visitedList: Array.isArray(list) ? list : [],
          loading: false,
        })
      })
      .catch(() => {
        this.setData({ visitedList: [], loading: false })
      })
  },

  onInputKey(e) {
    this.setData({ inputKey: e.detail.value.trim() })
  },

  goByKey() {
    const key = this.data.inputKey
    if (!key) {
      wx.showToast({ title: '请输入分享码', icon: 'none' })
      return
    }
    this.openScheduleByKey(key)
  },

  tapVisited(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    this.openScheduleByKey(key)
  },

  unvisit(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '从列表中移除？',
      content: '不会删除对方的日程表，只是从"他人的日程表"里隐藏',
      success: (r) => {
        if (!r.confirm) return
        util.callFn('unvisitSchedule', { scheduleId: id })
          .then(() => this.loadVisited())
          .catch(() => {})
      },
    })
  },

  openScheduleByKey(key) {
    return util.callFn('getScheduleByKey', { key })
      .then(res => {
        const data = res || {}
        const schedule = data.schedule || null
        if (!schedule) {
          wx.showToast({ title: '日程表不存在或已停用', icon: 'none' })
          this.setData({ othersState: 'list' })
          return
        }
        const items = data.items || []
        const slots = data.slots || []
        this.setData({
          othersState: 'detail',
          detailSchedule: schedule,
          detailItems: items,
          detailSlots: slots,
          selectedItemId: (items[0] && items[0]._id) || '',
          loading: false,
        }, () => {
          this.rebuildDetailDots()
          this.rebuildDetailSlotsForDate()
        })
      })
      .catch(() => {})
  },

  backToVisitedList() {
    this.setData({
      othersState: 'list',
      detailSchedule: null,
      detailItems: [],
      detailSlots: [],
      selectedItemId: '',
      detailDotsByDate: {},
      detailSlotsForDate: [],
    }, () => {
      this.rebuildMonthGrid()
      this.loadVisited()
    })
  },

  selectItem(e) {
    this.setData({ selectedItemId: e.currentTarget.dataset.id }, () => {
      this.rebuildDetailDots()
      this.rebuildDetailSlotsForDate()
    })
  },

  rebuildDetailDots() {
    const { detailSlots, detailItems, selectedItemId, monthGrid } = this.data
    const item = (detailItems || []).find(i => i._id === selectedItemId)
    const dots = {}
    if (!item) {
      this.setData({ detailDotsByDate: dots }, () => this.rebuildMonthGrid())
      return
    }
    const today = todayStr()
    ;(monthGrid || []).forEach(cell => {
      if (cell.date < today) return
      const d = new Date(cell.date + 'T00:00:00')
      const storedDow = jsToStoredDow(d.getDay())
      const daySlots = (detailSlots || []).filter(s => s.dayOfWeek === storedDow && s.isActive !== false)
      const ok = daySlots.some(s => (util.toMin(s.endTime) - util.toMin(s.startTime)) >= item.durationMinutes)
      if (ok) dots[cell.date] = true
    })
    this.setData({ detailDotsByDate: dots }, () => this.rebuildMonthGrid())
  },

  rebuildDetailSlotsForDate() {
    const { detailSlots, detailItems, selectedItemId, selectedDate } = this.data
    const item = (detailItems || []).find(i => i._id === selectedItemId)
    if (!item || !selectedDate) {
      this.setData({ detailSlotsForDate: [] })
      return
    }
    if (selectedDate < todayStr()) {
      this.setData({ detailSlotsForDate: [] })
      return
    }
    const d = new Date(selectedDate + 'T00:00:00')
    const storedDow = jsToStoredDow(d.getDay())
    const daySlots = (detailSlots || []).filter(s => s.dayOfWeek === storedDow && s.isActive !== false)
    const options = []
    daySlots.forEach(slot => {
      let cursor = util.toMin(slot.startTime)
      const end = util.toMin(slot.endTime)
      while (cursor + item.durationMinutes <= end) {
        const st = util.minToTime(cursor)
        const et = util.minToTime(cursor + item.durationMinutes)
        options.push({ startTime: st, endTime: et, label: st + '-' + et })
        cursor += item.durationMinutes
      }
    })
    this.setData({ detailSlotsForDate: options })
  },

  pickTime(e) {
    const { start, end } = e.currentTarget.dataset
    const { detailSchedule, detailItems, selectedItemId, selectedDate } = this.data
    const item = (detailItems || []).find(i => i._id === selectedItemId)
    if (!item || !detailSchedule) return
    const q =
      '?scheduleId=' + detailSchedule._id +
      '&scheduleName=' + encodeURIComponent(detailSchedule.name || '') +
      '&itemId=' + item._id +
      '&itemName=' + encodeURIComponent(item.name || '') +
      '&itemDurationMinutes=' + item.durationMinutes +
      '&bookingDate=' + selectedDate +
      '&startTime=' + start +
      '&endTime=' + end
    wx.navigateTo({ url: '/pages/book/book' + q })
  },
})
