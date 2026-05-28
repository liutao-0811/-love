const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function toBJT(date) {
  return new Date(date.getTime() + 8 * 3600000)
}

function todayStr() {
  const d = toBJT(new Date())
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function tomorrowStr() {
  const d = toBJT(new Date())
  d.setUTCDate(d.getUTCDate() + 1)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function nowTimeStr() {
  const d = toBJT(new Date())
  const h = String(d.getUTCHours()).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${h}:${m}`
}

async function send(type, openid, params) {
  try {
    await cloud.callFunction({
      name: 'notify',
      data: { type, openid, params },
    })
  } catch (e) {}
}

async function processCheckinReminders() {
  const subs = await db.collection('subscriptions')
    .where({ type: 'checkin', enabled: true })
    .get()
  const today = todayStr()
  for (const sub of subs.data) {
    const existing = await db.collection('daily_checkins')
      .where({ _openid: sub.openid })
      .orderBy('checkedAt', 'desc')
      .limit(1)
      .get()
    let alreadyCheckin = false
    if (existing.data.length > 0) {
      const last = toBJT(new Date(existing.data[0].checkedAt))
      const lastStr = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, '0')}-${String(last.getUTCDate()).padStart(2, '0')}`
      if (lastStr === today) alreadyCheckin = true
    }
    if (!alreadyCheckin) {
      await send('checkin', sub.openid, {
        time: nowTimeStr(),
        remark: '今天还没签到，快来和 TA 打个卡吧 🩷',
      })
    }
  }
}

async function processCountdownReminders() {
  const today = todayStr()
  const tomorrow = tomorrowStr()
  const subs = await db.collection('subscriptions')
    .where({ type: 'countdown', enabled: true })
    .get()
  const openids = [...new Set(subs.data.map(s => s.openid))]
  for (const openid of openids) {
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) continue
    const countdowns = await db.collection('countdowns')
      .where({ coupleId: user.data[0].coupleId })
      .get()
    for (const cd of countdowns.data) {
      if (cd.targetDate === tomorrow || cd.targetDate === today) {
        const daysLeft = cd.targetDate === today ? 0 : 1
        await send('countdown', openid, {
          remindTime: nowTimeStr(),
          content: cd.name,
          remark: daysLeft === 0 ? '就是今天！' : '明天就到啦！',
        })
        await send('anniversary', openid, {
          name: cd.name,
          date: cd.targetDate,
          daysLeft,
        })
      }
    }
  }
}

exports.main = async () => {
  try {
    await Promise.all([
      processCheckinReminders(),
      processCountdownReminders(),
    ])
    return { code: 0, msg: '推送完成' }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}
