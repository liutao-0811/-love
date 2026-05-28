const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const TEMPLATE = {
  ANNIVERSARY: '9hK7Dy_nMKS2as_1urpPj4RAbGmWwWq_2riYc786Eyc',
  CHECKIN:     'aP1eWbhxe2yy0d8C143lx6A9A2KXQ_bMzm6Zhr1xdcM',
  COUNTDOWN:   '4HVD4mDYqtGVgBZw-nfdh-8-jRQ_QYp3NklmW_qTv8k',
}

async function sendAnniversary(openid, name, date, daysLeft) {
  return cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId: TEMPLATE.ANNIVERSARY,
    page: 'pages/countdown/index',
    data: {
      thing1: { value: name.slice(0, 20) },
      date2: { value: date },
      thing3: { value: daysLeft === 0 ? '就是今天！' : `还有 ${daysLeft} 天` },
    },
  })
}

async function sendCheckin(openid, time, remark) {
  return cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId: TEMPLATE.CHECKIN,
    page: 'pages/checkin/index',
    data: {
      time2: { value: time },
      thing3: { value: remark.slice(0, 20) },
    },
  })
}

async function sendCountdown(openid, remindTime, content, remark) {
  return cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId: TEMPLATE.COUNTDOWN,
    page: 'pages/countdown/index',
    data: {
      time1: { value: remindTime },
      thing2: { value: remark.slice(0, 20) },
      thing3: { value: content.slice(0, 20) },
    },
  })
}

exports.main = async (event) => {
  const { type, openid, params } = event
  try {
    if (type === 'anniversary') {
      await sendAnniversary(openid, params.name, params.date, params.daysLeft)
    } else if (type === 'checkin') {
      await sendCheckin(openid, params.time, params.remark || '别忘了今天打卡哦~')
    } else if (type === 'countdown') {
      await sendCountdown(openid, params.remindTime, params.content, params.remark || '即将到来')
    }
    return { code: 0, msg: '发送成功' }
  } catch (e) {
    return { code: -1, msg: e.message || '发送失败' }
  }
}
