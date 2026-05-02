// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 查找是否已有用户记录
  const userColl = db.collection('users')
  const existing = await userColl.where({ openid: OPENID }).get()

  let user
  if (existing.data.length === 0) {
    const now = new Date()
    const res = await userColl.add({
      data: {
        openid: OPENID,
        nickname: '',
        phone: '',
        createdAt: now,
        updatedAt: now,
      }
    })
    user = { _id: res._id, openid: OPENID, nickname: '', phone: '' }
  } else {
    user = existing.data[0]
  }

  return {
    success: true,
    data: { openid: OPENID, user },
    openid: OPENID,
    user,
  }
}
