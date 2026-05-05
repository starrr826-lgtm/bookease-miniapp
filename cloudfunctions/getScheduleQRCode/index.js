// cloudfunctions/getScheduleQRCode/index.js
// 生成指定日程表的小程序二维码，上传云存储并缓存 fileID
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { scheduleId } = event
  if (!scheduleId) return { success: false, error: '缺少 scheduleId' }

  const sRes = await db.collection('schedules').doc(scheduleId).get().catch(() => null)
  const schedule = sRes && sRes.data
  if (!schedule) return { success: false, error: '日程表不存在' }

  // 有缓存直接返回临时 URL
  if (schedule.qrFileID) {
    try {
      const tmp = await cloud.getTempFileURL({ fileList: [schedule.qrFileID] })
      const url = tmp.fileList[0] && tmp.fileList[0].tempFileURL
      if (url) return { success: true, url }
    } catch (e) {
      // 缓存 URL 已过期，重新生成
    }
  }

  // 调微信 API 生成二维码
  const qrRes = await cloud.openapi.wxacode.getUnlimited({
    scene: `key=${schedule.qrCodeKey}`,
    page: 'pages/schedule/schedule',
    width: 280,
    isHyaline: true,
  })

  // 上传到云存储
  const uploadRes = await cloud.uploadFile({
    cloudPath: `qrcodes/${scheduleId}.png`,
    fileContent: qrRes.buffer,
  })

  // 写回 fileID 缓存
  await db.collection('schedules').doc(scheduleId).update({
    data: { qrFileID: uploadRes.fileID },
  }).catch(() => {})

  const tmpRes = await cloud.getTempFileURL({ fileList: [uploadRes.fileID] })
  const url = tmpRes.fileList[0] && tmpRes.fileList[0].tempFileURL
  return { success: true, url }
}
