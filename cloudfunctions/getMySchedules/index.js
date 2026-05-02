// cloudfunctions/getMySchedules/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  const res = await db.collection('schedules')
    .where({ ownerOpenid: OPENID, status: 1 })
    .orderBy('createdAt', 'desc')
    .get()

  return {
    success: true,
    data: res.data,
  }
}
