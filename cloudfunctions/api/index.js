const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const handlers = {
  async getUserInfo(event, openid) {
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length) {
      const newUser = {
        _openid: openid,
        nickname: '',
        avatar: '',
        coupleId: null,
        points: 0,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }
      const addRes = await db.collection('users').add({ data: newUser })
      return { code: 0, data: { ...newUser, _id: addRes._id } }
    }
    return { code: 0, data: user.data[0] }
  },

  async getCoupleInfo(event, openid) {
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) {
      return { code: 0, data: null }
    }
    const couple = await db.collection('couples').doc(user.data[0].coupleId).get()
    const partnerOpenid = couple.data.partner1Openid === openid
      ? couple.data.partner2Openid
      : couple.data.partner1Openid
    const partner = await db.collection('users').where({ _openid: partnerOpenid }).get()
    return {
      code: 0,
      data: {
        ...couple.data,
        partner1: user.data[0],
        partner2: partner.data[0] || {},
      },
    }
  },

  async createDiary(event, openid) {
    const { content, images, location, mood, date } = event
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) {
      return { code: -1, msg: '请先绑定情侣关系' }
    }
    const diary = {
      _openid: openid,
      coupleId: user.data[0].coupleId,
      content,
      images: images || [],
      location: location || null,
      mood: mood || '',
      date: date || new Date().toISOString().slice(0, 10),
      isFavorite: false,
      createdAt: db.serverDate(),
    }
    const res = await db.collection('diaries').add({ data: diary })
    await db.collection('users').where({ _openid: openid }).update({
      data: { points: _.inc(5), updatedAt: db.serverDate() },
    })
    return { code: 0, data: { _id: res._id }, msg: '日记发布成功' }
  },

  async getDiaries(event, openid) {
    const { page = 1, pageSize = 20 } = event
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) {
      return { code: 0, data: [] }
    }
    const res = await db.collection('diaries')
      .where({ coupleId: user.data[0].coupleId })
      .orderBy('date', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    return { code: 0, data: res.data }
  },

  async createNote(event, openid) {
    const { content, bgColor } = event
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) {
      return { code: -1, msg: '请先绑定情侣关系' }
    }
    const note = {
      _openid: openid,
      coupleId: user.data[0].coupleId,
      content,
      bgColor: bgColor || '#FFF8E7',
      isPinned: false,
      createdAt: db.serverDate(),
    }
    const res = await db.collection('notes').add({ data: note })
    return { code: 0, data: { _id: res._id } }
  },

  async getNotes(event, openid) {
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) {
      return { code: 0, data: [] }
    }
    const res = await db.collection('notes')
      .where({ coupleId: user.data[0].coupleId })
      .orderBy('isPinned', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()
    return { code: 0, data: res.data }
  },

  async getTasks(event, openid) {
    return handlers.getTasksByDate({ ...event, date: new Date().toISOString().slice(0, 10) }, openid)
  },

  async getCheckinDates(event, openid) {
    const { startDate, endDate } = event
    const start = new Date(startDate + 'T00:00:00.000Z')
    const end = new Date(endDate + 'T23:59:59.999Z')
    const records = await db.collection('task_records')
      .where({
        _openid: openid,
        completedAt: _.and(_.gte(start), _.lte(end)),
      })
      .get()
    const dates = new Set()
    records.data.forEach(r => {
      const d = new Date(r.completedAt)
      const str = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
      dates.add(str)
    })
    return { code: 0, data: Array.from(dates) }
  },

  async getMonthCheckin(event, openid) {
    const { year, month } = event
    const start = new Date(`${year}-${String(month).padStart(2,'0')}-01T00:00:00.000Z`)
    const end = new Date(year, month, 0)
    end.setHours(23, 59, 59, 999)
    const toDateKey = (d) => {
      const bjt = new Date(new Date(d).getTime() + 8 * 3600000)
      return `${bjt.getUTCFullYear()}-${String(bjt.getUTCMonth()+1).padStart(2,'0')}-${String(bjt.getUTCDate()).padStart(2,'0')}`
    }
    const [myCheckins, coupleInfo] = await Promise.all([
      db.collection('daily_checkins')
        .where({ _openid: openid, checkedAt: _.and(_.gte(start), _.lte(end)) })
        .get(),
      handlers.getCoupleInfo({}, openid),
    ])
    const myDates = new Set()
    myCheckins.data.forEach(r => myDates.add(toDateKey(r.checkedAt)))
    let partnerDates = []
    let partnerName = ''
    let partnerAvatar = ''
    if (coupleInfo.code === 0 && coupleInfo.data) {
      const couple = coupleInfo.data
      const partnerOpenid = couple.partner1Openid === openid ? couple.partner2Openid : couple.partner1Openid
      const partnerInfo = couple.partner1Openid === openid ? couple.partner2 : couple.partner1
      partnerName = partnerInfo?.nickname || 'TA'
      partnerAvatar = partnerInfo?.avatar || ''
      if (partnerOpenid) {
        const pCheckins = await db.collection('daily_checkins')
          .where({ _openid: partnerOpenid, checkedAt: _.and(_.gte(start), _.lte(end)) })
          .get()
        const pDates = new Set()
        pCheckins.data.forEach(r => pDates.add(toDateKey(r.checkedAt)))
        partnerDates = Array.from(pDates)
      }
    }
    return {
      code: 0,
      data: {
        myDates: Array.from(myDates),
        partnerDates,
        partnerName,
        partnerAvatar,
        myCheckinCount: myDates.size,
        partnerCheckinCount: partnerDates.length,
      }
    }
  },

  async dailyCheckIn(event, openid) {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 86400000)
    const existing = await db.collection('daily_checkins')
      .where({ _openid: openid, checkedAt: _.and(_.gte(todayStart), _.lt(todayEnd)) })
      .get()
    if (existing.data.length > 0) return { code: -1, msg: '今天已签到' }
    await db.collection('daily_checkins').add({
      data: { _openid: openid, checkedAt: db.serverDate() }
    })
    await db.collection('users').where({ _openid: openid }).update({
      data: { points: _.inc(1), updatedAt: db.serverDate() }
    })
    return { code: 0, msg: '签到成功 +1积分' }
  },

  async getDayTaskRecords(event, openid) {
    const { date } = event
    const dayStart = new Date(date + 'T00:00:00.000Z')
    const dayEnd = new Date(date + 'T23:59:59.999Z')
    const coupleInfo = await handlers.getCoupleInfo({}, openid)
    let partnerOpenid = ''
    let partnerName = 'TA'
    if (coupleInfo.code === 0 && coupleInfo.data) {
      const couple = coupleInfo.data
      partnerOpenid = couple.partner1Openid === openid ? couple.partner2Openid : couple.partner1Openid
      const partnerInfo = couple.partner1Openid === openid ? couple.partner2 : couple.partner1
      partnerName = partnerInfo?.nickname || 'TA'
    }
    const myRecords = await db.collection('task_records')
      .where({ _openid: openid, completedAt: _.and(_.gte(dayStart), _.lte(dayEnd)) })
      .orderBy('completedAt', 'desc')
      .limit(1)
      .get()
    let partnerRecords = { data: [] }
    if (partnerOpenid) {
      partnerRecords = await db.collection('task_records')
        .where({ _openid: partnerOpenid, completedAt: _.and(_.gte(dayStart), _.lte(dayEnd)) })
        .orderBy('completedAt', 'desc')
        .limit(1)
        .get()
    }
    const fmt = (r) => {
      const d = new Date(new Date(r.completedAt).getTime() + 8 * 3600000)
      const hh = String(d.getUTCHours()).padStart(2,'0')
      const mm = String(d.getUTCMinutes()).padStart(2,'0')
      return { ...r, timeStr: `${hh}:${mm}` }
    }
    return {
      code: 0,
      data: {
        myRecords: myRecords.data.map(fmt),
        partnerRecords: partnerRecords.data.map(fmt),
        partnerName,
      }
    }
  },

  async getPartnerTasksByDate(event, openid) {
    const { date } = event
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) return { code: 0, data: [] }
    const couple = await db.collection('couples').doc(user.data[0].coupleId).get()
    if (!couple.data) return { code: 0, data: [] }
    const partnerOpenid = couple.data.partner1Openid === openid ? couple.data.partner2Openid : couple.data.partner1Openid
    if (!partnerOpenid) return { code: 0, data: [] }
    return handlers.getTasksByDate({ date }, partnerOpenid)
  },

  async getTasksByDate(event, openid) {
    const { date } = event
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) return { code: 0, data: [] }
    const allTasks = await db.collection('tasks')
      .where({ coupleId: user.data[0].coupleId })
      .orderBy('createdAt', 'asc')
      .get()
    if (!allTasks.data.length) return { code: 0, data: [] }
    const visibleTasks = allTasks.data.filter(t => {
      const createdDate = t.createdDate || t.createdAt?.toISOString?.()?.slice(0, 10) || date
      if (t.duration === 'once') {
        return createdDate === date
      }
      return createdDate <= date
    })
    if (!visibleTasks.length) return { code: 0, data: [] }
    const taskIds = visibleTasks.map(t => t._id)
    const dayStart = new Date(date + 'T00:00:00.000Z')
    const dayEnd = new Date(date + 'T23:59:59.999Z')
    const records = await db.collection('task_records')
      .where({
        taskId: _.in(taskIds),
        _openid: openid,
        completedAt: _.and(_.gte(dayStart), _.lte(dayEnd)),
      })
      .get()
    const completedSet = new Set(records.data.map(r => r.taskId))
    return {
      code: 0,
      data: visibleTasks.map(t => ({
        ...t,
        myCompleted: completedSet.has(t._id),
      })),
    }
  },

  async checkInTask(event, openid) {
    const { taskId } = event
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 86400000)
    const existing = await db.collection('task_records')
      .where({
        taskId,
        _openid: openid,
        completedAt: _.and(_.gte(todayStart), _.lt(todayEnd)),
      })
      .get()
    if (existing.data.length > 0) {
      return { code: -1, msg: '今日已打卡' }
    }
    const task = await db.collection('tasks').doc(taskId).get()
    if (!task.data) return { code: -1, msg: '任务不存在' }
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || user.data[0].coupleId !== task.data.coupleId) {
      return { code: -1, msg: '无权操作此任务' }
    }
    await db.collection('task_records').add({
      data: { taskId, _openid: openid, completedAt: db.serverDate(), streak: 1 },
    })
    await db.collection('users').where({ _openid: openid }).update({
      data: { points: _.inc(task.data.points || 1), updatedAt: db.serverDate() },
    })
    return { code: 0, msg: '打卡成功' }
  },

  async bindCouple(event, openid) {
    const { inviteCode } = event
    if (inviteCode === openid) {
      return { code: -1, msg: '不能和自己绑定' }
    }
    const selfUser = await db.collection('users').where({ _openid: openid }).get()
    if (selfUser.data.length && selfUser.data[0].coupleId) {
      return { code: -1, msg: '你已有绑定关系，请先解除' }
    }
    const targetUser = await db.collection('users')
      .where({ _openid: inviteCode })
      .get()
    if (!targetUser.data.length) {
      return { code: -1, msg: '邀请码无效' }
    }
    if (targetUser.data[0].coupleId) {
      return { code: -1, msg: '对方已有绑定关系' }
    }
    const coupleRes = await db.collection('couples').add({
      data: {
        partner1Openid: openid,
        partner2Openid: inviteCode,
        startDate: new Date().toISOString().slice(0, 10),
        bondValue: 0,
        createdAt: db.serverDate(),
      },
    })
    await db.collection('users').where({ _openid: openid }).update({
      data: { coupleId: coupleRes._id, updatedAt: db.serverDate() },
    })
    await db.collection('users').where({ _openid: inviteCode }).update({
      data: { coupleId: coupleRes._id, updatedAt: db.serverDate() },
    })
    return { code: 0, msg: '绑定成功' }
  },

  async createTask(event, openid) {
    const { title, points, duration } = event
    if (!title || !title.trim()) {
      return { code: -1, msg: '任务名称不能为空' }
    }
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) {
      return { code: -1, msg: '请先绑定情侣关系' }
    }
    const today = new Date().toISOString().slice(0, 10)
    const task = {
      coupleId: user.data[0].coupleId,
      title: title.trim(),
      points: points || 3,
      duration: duration || 'daily',
      createdDate: today,
      createdBy: openid,
      createdAt: db.serverDate(),
    }
    const res = await db.collection('tasks').add({ data: task })
    return { code: 0, data: { _id: res._id }, msg: '任务创建成功' }
  },

  async getRewards(event, openid) {
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) {
      return { code: 0, data: [] }
    }
    const res = await db.collection('rewards')
      .where({ coupleId: user.data[0].coupleId })
      .orderBy('createdAt', 'desc')
      .get()
    return { code: 0, data: res.data }
  },

  async createReward(event, openid) {
    const { title, cost, description } = event
    if (!title || !title.trim()) {
      return { code: -1, msg: '奖励名称不能为空' }
    }
    if (!cost || cost <= 0) {
      return { code: -1, msg: '积分必须大于0' }
    }
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) {
      return { code: -1, msg: '请先绑定情侣关系' }
    }
    const reward = {
      coupleId: user.data[0].coupleId,
      title: title.trim(),
      cost: Number(cost),
      description: description || '',
      createdBy: openid,
      createdAt: db.serverDate(),
    }
    const res = await db.collection('rewards').add({ data: reward })
    return { code: 0, data: { _id: res._id }, msg: '奖励创建成功' }
  },

  async exchangeReward(event, openid) {
    const { rewardId } = event
    const reward = await db.collection('rewards').doc(rewardId).get()
    if (!reward.data) {
      return { code: -1, msg: '奖励不存在' }
    }
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length) {
      return { code: -1, msg: '用户不存在' }
    }
    if (user.data[0].points < reward.data.cost) {
      return { code: -1, msg: '积分不足' }
    }
    const updateRes = await db.collection('users')
      .where({ _openid: openid, points: _.gte(reward.data.cost) })
      .update({
        data: { points: _.inc(-reward.data.cost), updatedAt: db.serverDate() },
      })
    if (updateRes.stats.updated === 0) {
      return { code: -1, msg: '积分不足，请刷新后重试' }
    }
    await db.collection('points_logs').add({
      data: {
        _openid: openid,
        amount: -reward.data.cost,
        type: 'spend',
        source: `兑换奖励：${reward.data.title}`,
        createdAt: db.serverDate(),
      },
    })
    return { code: 0, msg: '兑换成功' }
  },

  async toggleDiaryLike(event, openid) {
    const { diaryId } = event
    const diary = await db.collection('diaries').doc(diaryId).get()
    if (!diary.data) return { code: -1, msg: '日记不存在' }
    const likes = diary.data.likes || []
    const liked = likes.includes(openid)
    await db.collection('diaries').doc(diaryId).update({
      data: { likes: liked ? _.pull(openid) : _.push(openid) },
    })
    return { code: 0, data: { liked: !liked, count: liked ? likes.length - 1 : likes.length + 1 } }
  },

  async addDiaryComment(event, openid) {
    const { diaryId, content } = event
    if (!content || !content.trim()) return { code: -1, msg: '评论内容不能为空' }
    const diary = await db.collection('diaries').doc(diaryId).get()
    if (!diary.data) return { code: -1, msg: '日记不存在' }
    const user = await db.collection('users').where({ _openid: openid }).get()
    const nickname = user.data[0]?.nickname || '我'
    const avatar = user.data[0]?.avatar || ''
    const comment = {
      diaryId,
      _openid: openid,
      nickname,
      avatar,
      content: content.trim(),
      createdAt: db.serverDate(),
    }
    const res = await db.collection('diary_comments').add({ data: comment })
    return { code: 0, data: { _id: res._id, nickname, avatar, content: content.trim() }, msg: '评论成功' }
  },

  async getDiaryComments(event, openid) {
    const { diaryId } = event
    const res = await db.collection('diary_comments')
      .where({ diaryId })
      .orderBy('createdAt', 'asc')
      .get()
    const now = Date.now()
    const comments = res.data.map(c => {
      const d = new Date(new Date(c.createdAt).getTime() + 8 * 3600000)
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(d.getUTCDate()).padStart(2, '0')
      const hh = String(d.getUTCHours()).padStart(2, '0')
      const mn = String(d.getUTCMinutes()).padStart(2, '0')
      return { ...c, timeStr: `${mm}-${dd} ${hh}:${mn}`, isOwner: c._openid === openid }
    })
    return { code: 0, data: comments }
  },

  async getDiaryDetail(event, openid) {
    const { diaryId } = event
    const diary = await db.collection('diaries').doc(diaryId).get()
    if (!diary.data) return { code: -1, msg: '日记不存在' }
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || user.data[0].coupleId !== diary.data.coupleId) {
      return { code: -1, msg: '无权查看此日记' }
    }
    return { code: 0, data: diary.data }
  },

  async deleteDiary(event, openid) {
    const { diaryId } = event
    const diary = await db.collection('diaries').doc(diaryId).get()
    if (!diary.data) return { code: -1, msg: '日记不存在' }
    if (diary.data._openid !== openid) return { code: -1, msg: '只能删除自己的日记' }
    await db.collection('diaries').doc(diaryId).remove()
    return { code: 0, msg: '删除成功' }
  },

  async getCountdowns(event, openid) {
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) return { code: 0, data: [] }
    const res = await db.collection('countdowns')
      .where({ coupleId: user.data[0].coupleId })
      .orderBy('targetDate', 'asc')
      .get()
    return { code: 0, data: res.data }
  },

  async createCountdown(event, openid) {
    const { name, targetDate, type, customLabel } = event
    if (!name || !targetDate) return { code: -1, msg: '名称和日期不能为空' }
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) return { code: -1, msg: '请先绑定情侣关系' }
    const countdown = {
      coupleId: user.data[0].coupleId,
      name: name.trim(),
      targetDate,
      type: type || 'custom',
      customLabel: customLabel || '',
      createdBy: openid,
      createdAt: db.serverDate(),
    }
    const res = await db.collection('countdowns').add({ data: countdown })
    return { code: 0, data: { _id: res._id }, msg: '创建成功' }
  },

  async deleteCountdown(event, openid) {
    const { countdownId } = event
    const cd = await db.collection('countdowns').doc(countdownId).get()
    if (!cd.data) return { code: -1, msg: '事件不存在' }
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || user.data[0].coupleId !== cd.data.coupleId) {
      return { code: -1, msg: '无权删除' }
    }
    await db.collection('countdowns').doc(countdownId).remove()
    return { code: 0, msg: '删除成功' }
  },

  async updateProfile(event, openid) {
    const { nickname, avatar } = event
    const updateData = { updatedAt: db.serverDate() }
    if (nickname !== undefined) updateData.nickname = nickname
    if (avatar !== undefined) updateData.avatar = avatar
    await db.collection('users').where({ _openid: openid }).update({ data: updateData })
    return { code: 0, msg: '更新成功' }
  },

  async getPointsLog(event, openid) {
    const { page = 1, pageSize = 20 } = event
    const res = await db.collection('points_logs')
      .where({ _openid: openid })
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    return { code: 0, data: res.data }
  },

  async getRecentActivities(event, openid) {
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) return { code: 0, data: [] }
    const coupleId = user.data[0].coupleId
    const diaries = await db.collection('diaries')
      .where({ coupleId })
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
    const notes = await db.collection('notes')
      .where({ coupleId })
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
    const records = await db.collection('task_records')
      .where({ _openid: openid })
      .orderBy('completedAt', 'desc')
      .limit(5)
      .get()
    const activities = []
    diaries.data.forEach(d => {
      const preview = d.content.length > 15 ? d.content.slice(0, 15) + '...' : d.content
      activities.push({ id: d._id, type: 'diary', content: `新增了一篇日记：${preview}`, createdAt: d.createdAt })
    })
    notes.data.forEach(n => {
      const preview = n.content.length > 15 ? n.content.slice(0, 15) + '...' : n.content
      activities.push({ id: n._id, type: 'note', content: `写了一张小纸条：${preview}`, createdAt: n.createdAt })
    })
    records.data.forEach(r => activities.push({ id: r._id, type: 'task', content: '完成了一次任务打卡', createdAt: r.completedAt }))
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return { code: 0, data: activities.slice(0, 5) }
  },

  async getUserStats(event, openid) {
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length) return { code: -1, msg: '用户不存在' }
    const coupleId = user.data[0].coupleId
    let diaryCount = 0, noteCount = 0, checkinCount = 0, exchangeCount = 0
    if (coupleId) {
      const dRes = await db.collection('diaries').where({ coupleId }).count()
      diaryCount = dRes.total
      const nRes = await db.collection('notes').where({ coupleId }).count()
      noteCount = nRes.total
    }
    const cRes = await db.collection('task_records').where({ _openid: openid }).count()
    checkinCount = cRes.total
    const eRes = await db.collection('points_logs').where({ _openid: openid, type: 'spend' }).count()
    exchangeCount = eRes.total
    return {
      code: 0,
      data: {
        diaryCount,
        noteCount,
        checkinCount,
        totalPoints: user.data[0].points || 0,
        hasExchange: exchangeCount > 0,
      },
    }
  },

  async toggleNotePin(event, openid) {
    const { noteId } = event
    const note = await db.collection('notes').doc(noteId).get()
    if (!note.data) return { code: -1, msg: '纸条不存在' }
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || user.data[0].coupleId !== note.data.coupleId) {
      return { code: -1, msg: '无权操作' }
    }
    await db.collection('notes').doc(noteId).update({
      data: { isPinned: !note.data.isPinned },
    })
    return { code: 0, msg: note.data.isPinned ? '已取消置顶' : '已置顶' }
  },

  async deleteNote(event, openid) {
    const { noteId } = event
    const note = await db.collection('notes').doc(noteId).get()
    if (!note.data) return { code: -1, msg: '纸条不存在' }
    if (note.data._openid !== openid) return { code: -1, msg: '只能删除自己的纸条' }
    await db.collection('notes').doc(noteId).remove()
    return { code: 0, msg: '已删除' }
  },

  async saveSubscription(event, openid) {
    const { type, enabled } = event
    if (!['checkin', 'countdown'].includes(type)) {
      return { code: -1, msg: '无效的订阅类型' }
    }
    const existing = await db.collection('subscriptions')
      .where({ _openid: openid, type })
      .get()
    if (existing.data.length > 0) {
      await db.collection('subscriptions').doc(existing.data[0]._id).update({
        data: { enabled: enabled !== false, openid, updatedAt: db.serverDate() },
      })
    } else {
      await db.collection('subscriptions').add({
        data: { _openid: openid, openid, type, enabled: enabled !== false, createdAt: db.serverDate(), updatedAt: db.serverDate() },
      })
    }
    return { code: 0, msg: '订阅保存成功' }
  },

  async unbindCouple(event, openid) {
    const user = await db.collection('users').where({ _openid: openid }).get()
    if (!user.data.length || !user.data[0].coupleId) {
      return { code: -1, msg: '当前未绑定' }
    }
    const coupleId = user.data[0].coupleId
    const couple = await db.collection('couples').doc(coupleId).get()
    if (!couple.data) return { code: -1, msg: '关系不存在' }
    const partnerOpenid = couple.data.partner1Openid === openid
      ? couple.data.partner2Openid
      : couple.data.partner1Openid
    await db.collection('users').where({ _openid: openid }).update({
      data: { coupleId: null, updatedAt: db.serverDate() },
    })
    await db.collection('users').where({ _openid: partnerOpenid }).update({
      data: { coupleId: null, updatedAt: db.serverDate() },
    })
    await db.collection('couples').doc(coupleId).remove()
    return { code: 0, msg: '已解除绑定' }
  },
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event.action

  if (!handlers[action]) {
    return { code: -1, msg: `未知操作: ${action}` }
  }

  try {
    return await handlers[action](event, openid)
  } catch (err) {
    console.error(`[API] ${action} error:`, err)
    return { code: -1, msg: err.message || '服务器错误' }
  }
}
