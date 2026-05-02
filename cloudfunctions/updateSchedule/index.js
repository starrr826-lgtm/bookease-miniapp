// cloudfunctions/updateSchedule/index.js
// 更新策略：先并行软删旧 items + 删旧 slots + 更新名字，再并行插入新数据
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { scheduleId, name, items, weeklySlots } = event

  if (!scheduleId) return { success: false, message: '缺少 scheduleId' }

  const schedule = await db.collection('schedules').doc(scheduleId).get().catch(() => null)
  if (!schedule || !schedule.data) return { success: false, message: '日程表不存在' }
  if (schedule.data.ownerOpenid !== OPENID) {
    return { success: false, message: '无权限修改' }
  }

  const now = new Date()

  // 并行：更新名字 + 批量软删旧 items + 批量删旧 slots
  await Promise.all([
    db.collection('schedules').doc(scheduleId).update({ data: { name, updatedAt: now } }),
    db.collection('service_items').where({ scheduleId }).update({ data: { isActive: false, updatedAt: now } }),
    db.collection('weekly_slots').where({ scheduleId }).remove(),
  ])

  // 并行：插入新 items + 新 slots
  await Promise.all([
    ...items.map((it, i) => db.collection('service_items').add({
      data: {
        scheduleId,
        name: it.name,
        durationMinutes: it.durationMinutes,
        sortOrder: i,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    })),
    ...(weeklySlots || []).map(s => db.collection('weekly_slots').add({
      data: {
        scheduleId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      },
    })),
  ])

  return { success: true, data: { scheduleId } }
}
