// cloudfunctions/deleteSchedule/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { scheduleId } = event

  if (!scheduleId) return { success: false, error: '参数缺失' }

  try {
    // 校验归属（.doc().get() 在文档不存在时会抛异常，需捕获）
    const snap = await db.collection('schedules').doc(scheduleId).get().catch(() => null)
    const schedule = snap && snap.data
    if (!schedule) return { success: false, error: '日程表不存在' }
    if (schedule.ownerOpenid !== OPENID) return { success: false, error: '无权操作' }

    // 将所有未终态预约标记为 cancelled
    await db.collection('bookings').where({
      scheduleId,
      status: _.in(['pending', 'confirmed']),
    }).update({
      data: { status: 'cancelled', updatedAt: db.serverDate() },
    }).catch(() => {})

    // 并行删除日程表及其 items / slots
    await Promise.all([
      db.collection('schedules').doc(scheduleId).remove(),
      db.collection('service_items').where({ scheduleId }).remove().catch(() => {}),
      db.collection('weekly_slots').where({ scheduleId }).remove().catch(() => {}),
    ])

    return { success: true }
  } catch (e) {
    console.error('[deleteSchedule]', e)
    return { success: false, error: (e && e.errMsg) || '删除失败' }
  }
}
