// cloudfunctions/createBooking/index.js — Guest 提交预约
// Schema: 见 README-v4.md
// status 字段为字符串 'pending' | 'confirmed' | 'cancelled'
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function toMin(t) {
  const parts = (t || '').split(':').map(Number)
  return (parts[0] || 0) * 60 + (parts[1] || 0)
}
function err(msg) { return { success: false, error: msg } }

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const {
    scheduleId, itemIds, bookingDate, startTime, endTime,
    guestName, guestPhone, note,
  } = event || {}

  const ids = Array.isArray(itemIds) && itemIds.length ? itemIds : []
  if (!scheduleId || !ids.length) return err('参数缺失: scheduleId/itemIds')
  if (!bookingDate || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) return err('日期格式错误')
  if (!startTime || !endTime) return err('时间缺失')
  if (toMin(endTime) <= toMin(startTime)) return err('结束时间必须晚于开始时间')
  if (!guestName || !String(guestName).trim()) return err('请填写称呼')
  if (!/^1\d{10}$/.test(String(guestPhone || '').trim())) return err('手机号格式错误')

  try {
    // schedule 必须存在且启用
    const schDoc = await db.collection('schedules').doc(scheduleId).get().catch(() => null)
    const schedule = schDoc && schDoc.data
    if (!schedule) return err('日程表不存在')
    if (schedule.status === 0) return err('日程表已停用')

    // 批量校验所有服务项
    const itemDocs = await Promise.all(
      ids.map(id => db.collection('service_items').doc(id).get().catch(() => null))
    )
    const items = itemDocs.map(doc => doc && doc.data)
    if (items.some(i => !i)) return err('服务项不存在')
    if (items.some(i => i.scheduleId && i.scheduleId !== scheduleId)) return err('服务项与日程表不匹配')

    // 冲突检查：同一 schedule + 同一天 + 同一 startTime 若已有 pending/confirmed 预约，拦截
    const conflictRes = await db.collection('bookings').where({
      scheduleId,
      bookingDate,
      startTime,
      status: _.in(['pending', 'confirmed']),
    }).count()
    if (conflictRes.total > 0) return err('该时段已被预约')

    const totalDurationMinutes = items.reduce((s, i) => s + (Number(i.durationMinutes) || 0), 0)
    const itemName = items.map(i => i.name || '').join('、')

    const now = db.serverDate()
    const addRes = await db.collection('bookings').add({
      data: {
        scheduleId,
        scheduleName: schedule.name || '',
        ownerOpenid: schedule.ownerOpenid || '',
        items: items.map(i => ({ _id: i._id, name: i.name || '', durationMinutes: Number(i.durationMinutes) || 0 })),
        itemId: ids[0],
        itemName,
        itemDurationMinutes: totalDurationMinutes,
        bookingDate,
        startTime,
        endTime,
        guestOpenid: OPENID,
        guestName: String(guestName).trim(),
        guestPhone: String(guestPhone).trim(),
        note: String(note || '').trim(),
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      },
    })

    return { success: true, data: { bookingId: addRes._id } }
  } catch (e) {
    console.error('[createBooking]', e)
    return err((e && e.errMsg) || (e && e.message) || '创建预约失败')
  }
}
