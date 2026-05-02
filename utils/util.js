// utils/util.js
// 带引用计数的 loading，避免并发时 showLoading / hideLoading 不配对的警告
let loadingRefCount = 0
function showGlobalLoading(title) {
  loadingRefCount += 1
  if (loadingRefCount === 1) {
    wx.showLoading({ title: title || '加载中', mask: true })
  }
}
function hideGlobalLoading() {
  loadingRefCount = Math.max(0, loadingRefCount - 1)
  if (loadingRefCount === 0) {
    wx.hideLoading()
  }
}

/**
 * 调云函数。
 *   options.loading: 默认 true。false 不展示 loading（后台刷新）。
 *   options.silent:  默认 false。true 不自动 toast 错误。
 *
 * 约定返回 { success: true, data } 或 { success: false, error }。
 * 若 success=true 含 data 字段，自动解包 data；否则返回整个 result（兼容老函数）。
 */
function callFn(name, data, options) {
  data = data || {}
  options = options || {}
  const useLoading = options.loading !== false
  const silent = options.silent === true

  if (useLoading) showGlobalLoading(options.loadingText)

  return wx.cloud.callFunction({ name, data })
    .then(res => {
      const result = res && res.result
      if (result && result.success === false) {
        const err = new Error(result.error || '操作失败')
        err._userMsg = result.error || '操作失败'
        throw err
      }
      if (result && result.success === true) {
        return result.data !== undefined ? result.data : result
      }
      return result
    })
    .catch(err => {
      const em = (err && err.errMsg) || (err && err.message) || ''
      console.error('[callFn]', name, em || err)
      if (!silent) {
        if (err && err._userMsg) {
          wx.showToast({ title: err._userMsg, icon: 'none' })
        } else if (/cloud function not found/i.test(em) || /FUNCTIONS_EXECUTE_FAIL/i.test(em)) {
          wx.showToast({ title: '云函数未部署: ' + name, icon: 'none', duration: 3000 })
        } else if (/invalid env/i.test(em) || /-404011/.test(em)) {
          wx.showToast({ title: '云环境未初始化', icon: 'none' })
        } else {
          wx.showToast({ title: '请求失败', icon: 'none' })
        }
      }
      throw err
    })
    .finally(() => {
      if (useLoading) hideGlobalLoading()
    })
}

// —— 日期 / 时间工具 ——
function pad(n) { return n < 10 ? '0' + n : '' + n }
function toDateStr(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}
function toMin(t) {
  const parts = (t || '').split(':').map(Number)
  return (parts[0] || 0) * 60 + (parts[1] || 0)
}
function minToTime(m) {
  return pad(Math.floor(m / 60)) + ':' + pad(m % 60)
}

// 当月月历网格：返回 6*7 = 42 个日期（前后补齐当月前后的日）
//   year: 4 位年；month: 1-12
//   出参每项 { date: 'YYYY-MM-DD', day: 数字, isCurrentMonth, isToday }
function buildMonthGrid(year, month) {
  const first = new Date(year, month - 1, 1)
  const firstWeekday = first.getDay() // 0=周日
  const daysInMonth = new Date(year, month, 0).getDate()
  const grid = []
  const todayStr = toDateStr(new Date())
  // 前补
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month - 2, prevMonthDays - i)
    grid.push({
      date: toDateStr(d),
      day: d.getDate(),
      isCurrentMonth: false,
      isToday: toDateStr(d) === todayStr,
    })
  }
  // 当月
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month - 1, i)
    grid.push({
      date: toDateStr(d),
      day: i,
      isCurrentMonth: true,
      isToday: toDateStr(d) === todayStr,
    })
  }
  // 后补到 42
  let next = 1
  while (grid.length < 42) {
    const d = new Date(year, month, next++)
    grid.push({
      date: toDateStr(d),
      day: d.getDate(),
      isCurrentMonth: false,
      isToday: toDateStr(d) === todayStr,
    })
  }
  return grid
}

function addMonths(year, month, delta) {
  // month 1-12，delta 可正可负
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

module.exports = {
  callFn,
  toDateStr,
  toMin,
  minToTime,
  buildMonthGrid,
  addMonths,
  showGlobalLoading,
  hideGlobalLoading,
}
