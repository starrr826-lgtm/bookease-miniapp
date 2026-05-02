// cloudfunctions/getMyScheduleSlots/index.js
// 返回 Owner 的日程表基本信息 + 每周时段 + 指定月份的日期覆盖
// event: { fromDate, toDate }  (可选，用于拉取 day_overrides)
// 返回: { success, data: { hasSchedule, schedules, weeklySlots, dayOverrides } }
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext()
    const { fromDate, toDate } = event || {}

    const schRes = await db.collection('schedules')
      .where({ ownerOpenid: OPENID, status: 1 })
      .orderBy('createdAt', 'desc')
      .get()

    const schedules = schRes.data || []
    if (!schedules.length) {
      return { success: true, data: { hasSchedule: false, schedules: [], weeklySlots: [], dayOverrides: [] } }
    }

    const scheduleIds = schedules.map(s => s._id)

    const queries = [
      db.collection('weekly_slots').where({ scheduleId: _.in(scheduleIds) }).get(),
    ]
    if (fromDate && toDate) {
      queries.push(
        db.collection('day_overrides').where({
          scheduleId: _.in(scheduleIds),
          date: _.gte(fromDate).and(_.lte(toDate)),
        }).get()
      )
    }

    const results = await Promise.all(queries)
    const weeklySlots = results[0].data || []
    const dayOverrides = (results[1] && results[1].data) || []

    return { success: true, data: { hasSchedule: true, schedules, weeklySlots, dayOverrides } }
  } catch (e) {
    console.error('[getMyScheduleSlots]', e)
    return { success: false, error: (e && e.errMsg) || '查询失败' }
  }
}
