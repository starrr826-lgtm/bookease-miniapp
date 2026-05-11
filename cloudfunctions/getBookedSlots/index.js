// cloudfunctions/getBookedSlots/index.js
// 返回某日程表某天所有 pending/confirmed 预约的占用时段（不含个人信息）
// event: { scheduleId, bookingDate }
// 返回: { success: true, data: [{startTime, endTime}] }
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { scheduleId, bookingDate } = event || {}
  if (!scheduleId || !bookingDate) return { success: false, error: '参数缺失' }

  try {
    const res = await db.collection('bookings').where({
      scheduleId,
      bookingDate,
      status: _.in(['pending', 'confirmed']),
    }).field({ startTime: true, endTime: true }).limit(200).get()

    const data = (res.data || []).map(b => ({ startTime: b.startTime, endTime: b.endTime }))
    return { success: true, data }
  } catch (e) {
    console.error('[getBookedSlots]', e)
    return { success: false, error: (e && e.errMsg) || '查询失败' }
  }
}
