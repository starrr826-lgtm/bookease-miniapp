// cloudfunctions/getOwnerCalendar/index.js
// 返回当前 Owner 在 [fromDate, toDate] 范围内所有 status='confirmed' 的预约
// event: { fromDate: 'YYYY-MM-DD', toDate: 'YYYY-MM-DD' }
// 返回：{ success: true, data: Array<Booking> }
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { fromDate, toDate } = event || {}
  if (!fromDate || !toDate) return { success: false, error: '缺少日期范围' }

  try {
    const res = await db.collection('bookings').where({
      ownerOpenid: OPENID,
      status: 'confirmed',
      bookingDate: _.gte(fromDate).and(_.lte(toDate)),
    }).orderBy('bookingDate', 'asc').orderBy('startTime', 'asc').limit(500).get()

    return { success: true, data: res.data || [] }
  } catch (e) {
    console.error('[getOwnerCalendar]', e)
    return { success: false, error: (e && e.errMsg) || '查询失败' }
  }
}
