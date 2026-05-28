import { api } from '../../utils/cloud'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

Page({
  data: {
    currentYear: 0,
    currentMonth: 0,
    isCurrentMonth: true,
    calendarDays: [] as any[],
    myCheckinCount: 0,
    partnerCheckinCount: 0,
    partnerName: 'TA',
    todayCheckedIn: false,
  },

  onLoad() {
    const today = new Date()
    this.setData({
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth() + 1,
      isCurrentMonth: true,
    })
  },

  onShow() {
    this.loadMonth()
  },

  async loadMonth() {
    const { currentYear, currentMonth } = this.data
    const res = await api('getMonthCheckin', { year: currentYear, month: currentMonth })
    if (res.code !== 0 || !res.data) return

    const rawMyDates = Array.isArray(res.data.myDates) ? res.data.myDates : []
    const rawPartnerDates = Array.isArray(res.data.partnerDates) ? res.data.partnerDates : []
    const { partnerName, myCheckinCount, partnerCheckinCount } = res.data
    const mySet = new Set<string>(rawMyDates)
    const partnerSet = new Set<string>(rawPartnerDates)
    const today = toDateStr(new Date())
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()

    const calendarDays: any[] = []
    for (let i = 0; i < firstDay; i++) calendarDays.push({ empty: true })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      calendarDays.push({
        day: d,
        dateStr,
        isToday: dateStr === today,
        isFuture: dateStr > today,
        myCheckin: mySet.has(dateStr),
        partnerCheckin: partnerSet.has(dateStr),
      })
    }

    this.setData({
      calendarDays,
      myCheckinCount,
      partnerCheckinCount,
      partnerName: partnerName || 'TA',
      todayCheckedIn: mySet.has(today),
    })
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data
    if (currentMonth === 1) { currentYear--; currentMonth = 12 }
    else currentMonth--
    const today = new Date()
    const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1
    this.setData({ currentYear, currentMonth, isCurrentMonth })
    this.loadMonth()
  },

  nextMonth() {
    if (this.data.isCurrentMonth) return
    let { currentYear, currentMonth } = this.data
    if (currentMonth === 12) { currentYear++; currentMonth = 1 }
    else currentMonth++
    const today = new Date()
    const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1
    this.setData({ currentYear, currentMonth, isCurrentMonth })
    this.loadMonth()
  },

  async doCheckin() {
    if (this.data.todayCheckedIn) {
      wx.showToast({ title: '今天已签到啦 🩷', icon: 'none' })
      return
    }
    const res = await api('dailyCheckIn')
    if (res.code === 0) {
      wx.showToast({ title: '签到成功 +1积分 🩷', icon: 'success' })
      this.setData({ todayCheckedIn: true })
      this.loadMonth()
      try {
        wx.requestSubscribeMessage({
          tmplIds: ['aP1eWbhxe2yy0d8C143lx6A9A2KXQ_bMzm6Zhr1xdcM'],
        }).then((subRes: any) => {
          if (subRes['aP1eWbhxe2yy0d8C143lx6A9A2KXQ_bMzm6Zhr1xdcM'] === 'accept') {
            api('saveSubscription', { type: 'checkin', enabled: true })
          }
        }).catch(() => {})
      } catch {}
    } else {
      wx.showToast({ title: res.msg || '签到失败', icon: 'none' })
    }
  },
})
