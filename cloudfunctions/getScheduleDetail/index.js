// cloudfunctions/getScheduleDetail/index.js
// 同时被 Owner（编辑）和 Guest（查看）调用
// 传 scheduleId 或 qrCodeKey 二选一
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { scheduleId, qrCodeKey } = event

  let scheduleDoc
  if (scheduleId) {
    const res = await db.collection('schedules').doc(scheduleId).get().catch(() => null)
    scheduleDoc = res && res.data
  } else if (qrCodeKey) {
    const res = await db.collection('schedules').where({ qrCodeKey, status: 1 }).limit(1).get()
    scheduleDoc = res.data[0]
  }

  if (!scheduleDoc) {
    return { success: false, message: '日程表不存在' }
  }

  const sid = scheduleDoc._id

  const [itemsRes, slotsRes] = await Promise.all([
    db.collection('service_items').where({ scheduleId: sid, isActive: true }).orderBy('sortOrder', 'asc').get(),
    db.collection('weekly_slots').where({ scheduleId: sid }).get(),
  ])

  return {
    success: true,
    data: {
      schedule: scheduleDoc,
      items: itemsRes.data,
      weeklySlots: slotsRes.data,
    }
  }
}
