// cloudfunctions/listBookings/index.js
// event: { role: 'owner' | 'guest', status?: 'pending'|'confirmed'|'cancelled' }
// owner: 按 ownerOpenid === OPENID 过滤
// guest: 按 guestOpenid === OPENID 过滤（兼容老数据 _openid）
// 返回按 bookingDate 倒序 + startTime 倒序
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const role = event && event.role
  const statusFilter = event && event.status

  if (role !== 'owner' && role !== 'guest') {
    return { success: false, error: 'role 必须为 owner 或 guest' }
  }

  const where = {}
  if (role === 'owner') {
    where.ownerOpenid = OPENID
  } else {
    where.guestOpenid = _.eq(OPENID)
    // 如果老数据用 _openid 写入，可以通过 or 条件兼容：
    // 这里用两次查询合并更稳定。
  }
  if (statusFilter) {
    where.status = statusFilter
  }

  try {
    let list = []
    if (role === 'guest') {
      const [r1, r2] = await Promise.all([
        db.collection('bookings').where({
          ...(statusFilter ? { status: statusFilter } : {}),
          guestOpenid: OPENID,
        }).orderBy('bookingDate', 'desc').orderBy('startTime', 'desc').limit(100).get(),
        db.collection('bookings').where({
          ...(statusFilter ? { status: statusFilter } : {}),
          _openid: OPENID,
          guestOpenid: _.exists(false),
        }).orderBy('bookingDate', 'desc').orderBy('startTime', 'desc').limit(100).get(),
      ])
      list = [].concat(r1.data || [], r2.data || [])
      // 去重 + 排序
      const seen = {}
      list = list.filter(b => {
        if (seen[b._id]) return false
        seen[b._id] = 1
        return true
      })
      list.sort((a, b) => {
        if (a.bookingDate !== b.bookingDate) return a.bookingDate < b.bookingDate ? 1 : -1
        return (a.startTime || '') < (b.startTime || '') ? 1 : -1
      })
    } else {
      const res = await db.collection('bookings')
        .where(where)
        .orderBy('bookingDate', 'desc')
        .orderBy('startTime', 'desc')
        .limit(100)
        .get()
      list = res.data || []
    }

    return { success: true, data: list }
  } catch (e) {
    console.error('[listBookings]', e)
    return { success: false, error: (e && e.errMsg) || '查询失败' }
  }
}
