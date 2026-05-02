// cloudfunctions/setDayOverride/index.js
// 为某一具体日期设置或删除时段覆盖（覆盖周循环默认值）
// event: { scheduleId, date: 'YYYY-MM-DD', slots: [{startTime, endTime}] }
//   slots 为空数组 [] 表示删除覆盖（恢复周循环默认）
// 返回: { success: true }
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { scheduleId, date, slots } = event || {}

  if (!scheduleId || !date) return { success: false, error: '参数缺失' }

  // 校验归属权
  const schSnap = await db.collection('schedules').doc(scheduleId).get().catch(() => null)
  if (!schSnap || !schSnap.data) return { success: false, error: '日程表不存在' }
  if (schSnap.data.ownerOpenid !== OPENID) return { success: false, error: '无权限' }

  const existing = await db.collection('day_overrides')
    .where({ scheduleId, date })
    .limit(1)
    .get()

  if (!slots || slots.length === 0) {
    // 空 slots = 删除覆盖，恢复周循环默认
    if (existing.data && existing.data.length > 0) {
      await db.collection('day_overrides').doc(existing.data[0]._id).remove()
    }
    return { success: true }
  }

  if (existing.data && existing.data.length > 0) {
    await db.collection('day_overrides').doc(existing.data[0]._id).update({
      data: { slots, updatedAt: db.serverDate() },
    })
  } else {
    await db.collection('day_overrides').add({
      data: {
        scheduleId,
        ownerOpenid: OPENID,
        date,
        slots,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  }

  return { success: true }
}
