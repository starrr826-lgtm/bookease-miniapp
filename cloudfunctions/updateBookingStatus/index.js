// cloudfunctions/updateBookingStatus/index.js
// 权限规则：
//   pending  → confirmed ：仅 Owner
//   pending  → cancelled ：Owner 或 Guest
//   confirmed→ cancelled ：仅 Owner（Guest 无权取消已确认）
//   cancelled→ *         ：终态，任何人不可再改
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { bookingId, status } = event || {}

  if (!bookingId || !status) return { success: false, error: '参数缺失' }
  if (!['confirmed', 'cancelled'].includes(status)) {
    return { success: false, error: '非法状态' }
  }

  const snap = await db.collection('bookings').doc(bookingId).get().catch(() => null)
  if (!snap || !snap.data) return { success: false, error: '预约不存在' }
  const booking = snap.data

  if (booking.status === 'cancelled') {
    return { success: false, error: '该预约已取消，无法再修改' }
  }

  // 确定 owner / guest 身份
  let ownerOpenid = booking.ownerOpenid
  if (!ownerOpenid && booking.scheduleId) {
    const schSnap = await db.collection('schedules').doc(booking.scheduleId).get().catch(() => null)
    ownerOpenid = schSnap && schSnap.data ? schSnap.data.ownerOpenid : null
  }
  const guestOpenid = booking.guestOpenid || booking._openid || null

  const isOwner = ownerOpenid && ownerOpenid === OPENID
  const isGuest = guestOpenid && guestOpenid === OPENID

  if (!isOwner && !isGuest) {
    return { success: false, error: '无权限操作该预约' }
  }
  if (status === 'confirmed' && !isOwner) {
    return { success: false, error: '只有 Owner 可以确认预约' }
  }
  if (status === 'cancelled' && booking.status === 'confirmed' && !isOwner) {
    return { success: false, error: '已确认的预约只能由 Owner 取消' }
  }

  await db.collection('bookings').doc(bookingId).update({
    data: { status, updatedAt: db.serverDate() },
  })

  return { success: true }
}
