// cloudfunctions/getScheduleByKey/index.js
// 通过 qrCodeKey 查询一个 schedule，并把它记进当前用户的 visitedSchedules
// 返回：{ success: true, schedule, items, slots }
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const key = (event && event.key || '').trim()
  if (!key) return { success: false, error: '缺少 key' }

  const sres = await db.collection('schedules').where({
    qrCodeKey: key,
    status: _.neq(0), // 1 或 未设置都当启用
  }).limit(1).get()

  if (!sres.data || sres.data.length === 0) {
    return { success: false, error: '日程表不存在或已停用' }
  }
  const schedule = sres.data[0]

  const [itemsRes, slotsRes] = await Promise.all([
    db.collection('service_items').where({ scheduleId: schedule._id, isActive: true }).get(),
    db.collection('weekly_slots').where({ scheduleId: schedule._id }).get(),
  ])

  // 把这个 scheduleId 加进当前用户（非 Owner 本人）的 visitedSchedules
  if (OPENID && OPENID !== schedule.ownerOpenid) {
    try {
      await db.collection('users').where({ openid: OPENID }).update({
        data: {
          visitedSchedules: _.addToSet(schedule._id),
          updatedAt: db.serverDate(),
        },
      })
    } catch (e) {
      console.warn('[getScheduleByKey] addToSet visitedSchedules failed', e && e.message)
    }
  }

  return {
    success: true,
    schedule,
    items: itemsRes.data || [],
    slots: slotsRes.data || [],
  }
}
