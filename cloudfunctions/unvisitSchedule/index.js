// cloudfunctions/unvisitSchedule/index.js
// 从当前用户 users.visitedSchedules 里移除一个 scheduleId
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const scheduleId = event && event.scheduleId
  if (!scheduleId) return { success: false, error: '参数缺失' }

  await db.collection('users').where({ _openid: OPENID }).update({
    data: {
      visitedSchedules: _.pull(scheduleId),
      updatedAt: db.serverDate(),
    },
  })

  return { success: true }
}
