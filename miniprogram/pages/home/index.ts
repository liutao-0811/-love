import { getDaysTogether, getBondLevel } from '../../utils/date'
import { api } from '../../utils/cloud'
import { getLayout } from '../../utils/layout'

interface Activity {
  id: string
  content: string
  timeStr: string
}

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    daysTogether: 0,
    displayDays: 0,
    bondLevel: { title: '初遇', progress: 0, nextThreshold: 30 },
    coupleInfo: {
      partner1: { avatar: '', nickname: '' },
      partner2: { avatar: '', nickname: '' },
    },
    weather: { icon: '☀️', temp: 24, city: '加载中' },
    nextAnniversary: { name: '羁绊纪念日', daysLeft: 0 },
    recentActivities: [] as Activity[],
    isBound: false,
    _loaded: false,
  },

  onLoad() {
    const layout = getLayout()
    this.setData({
      statusBarHeight: layout.statusBarHeight,
      navBarHeight: layout.navBarHeight,
    })
  },

  onShow() {
    this.loadRealData()
  },

  async loadRealData() {
    try {
      const [coupleRes, activitiesRes] = await Promise.all([
        api('getCoupleInfo'),
        api('getRecentActivities'),
      ])

      if (coupleRes.code === 0 && coupleRes.data) {
        const couple = coupleRes.data
        const days = getDaysTogether(couple.startDate)
        const level = getBondLevel(days)

        this.setData({
          isBound: true,
          coupleInfo: {
            partner1: couple.partner1 || {},
            partner2: couple.partner2 || {},
          },
          daysTogether: days,
          bondLevel: level,
          nextAnniversary: {
            name: '羁绊纪念日',
            daysLeft: Math.max(0, 365 - days),
          },
        })
        if (!this.data._loaded) {
          this.animateDaysCounter()
          this.setData({ _loaded: true })
        } else {
          this.setData({ displayDays: days })
        }
      } else {
        this.setData({ isBound: false })
      }

      if (activitiesRes.code === 0 && activitiesRes.data.length > 0) {
        const now = Date.now()
        const recentActivities = activitiesRes.data.map((a: any) => {
          const created = new Date(a.createdAt).getTime()
          const diffMin = Math.floor((now - created) / 60000)
          let timeStr = ''
          if (diffMin < 1) timeStr = '刚刚'
          else if (diffMin < 60) timeStr = `${diffMin}分钟前`
          else if (diffMin < 1440) timeStr = `${Math.floor(diffMin / 60)}小时前`
          else timeStr = `${Math.floor(diffMin / 1440)}天前`
          return { id: a.id, content: a.content, timeStr }
        })
        this.setData({ recentActivities })
      }
    } catch {
      this.setData({ isBound: false })
    }
  },

  animateDaysCounter() {
    const target = this.data.daysTogether
    if (target <= 0) {
      this.setData({ displayDays: 0 })
      return
    }
    let current = 0
    const duration = 1500
    const step = Math.ceil(target / (duration / 16))

    const timer = setInterval(() => {
      current += step
      if (current >= target) {
        current = target
        clearInterval(timer)
      }
      this.setData({ displayDays: current })
    }, 16)
  },

  goToDiary() {
    wx.switchTab({ url: '/pages/diary/index' })
  },

  goToNotes() {
    wx.navigateTo({ url: '/pages/notes/index' })
  },

  goToCheckin() {
    wx.navigateTo({ url: '/pages/checkin/index' })
  },

  goToCountdown() {
    wx.navigateTo({ url: '/pages/countdown/index' })
  },

  goToBind() {
    wx.navigateTo({ url: '/pages/bind/index' })
  },
})
