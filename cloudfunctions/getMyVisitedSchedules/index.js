// cloudfunctions/getMyVisitedSchedules/index.js
// 返回当前用户 users.visitedSchedules 里对应的 schedules 列表
// 返回：{ success: true, data: Array<schedule> }
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  const ures = await db.collection('users').where({ openid: OPENID }).limit(1).get()
  const user = (ures.data && ures.data[0]) || null
  const ids = (user && user.visitedSchedules) || []

  if (!ids.length) return { success: true, data: [] }

  const sres = await db.collection('schedules').where({
    _id: _.in(ids),
  }).get()

  // 按 ids 里的顺序排序（最近访问的在前，前端自己维护顺序也可）
  const map = {}
  ;(sres.data || []).forEach(s => { map[s._id] = s })
  const ordered = ids.map(id => map[id]).filter(Boolean)

  return { success: true, data: ordered }
}
