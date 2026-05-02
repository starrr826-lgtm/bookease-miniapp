// cloudfunctions/createSchedule/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { name, items, weeklySlots } = event

  if (!name || !items || items.length === 0) {
    return { success: false, message: '参数缺失' }
  }

  const now = new Date()

  // 生成唯一 key（32^6 ≈ 10 亿种，单次碰撞概率可忽略；保留一次校验兜底）
  let qrCodeKey = genKey()
  const exists = await db.collection('schedules').where({ qrCodeKey }).count()
  if (exists.total > 0) qrCodeKey = genKey()

  const scheduleRes = await db.collection('schedules').add({
    data: {
      ownerOpenid: OPENID,
      name,
      qrCodeKey,
      status: 1,
      createdAt: now,
      updatedAt: now,
    },
  })
  const scheduleId = scheduleRes._id

  // 并行插入 items + weeklySlots
  await Promise.all([
    ...items.map((it, i) => db.collection('service_items').add({
      data: {
        scheduleId,
        name: it.name,
        durationMinutes: it.durationMinutes,
        sortOrder: i,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    })),
    ...(weeklySlots || []).map(s => db.collection('weekly_slots').add({
      data: {
        scheduleId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      },
    })),
  ])

  return {
    success: true,
    data: { scheduleId, qrCodeKey },
  }
}
