import { api } from '../../utils/cloud'
import { getLayout } from '../../utils/layout'

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

Page({
  data: {
    headerPaddingTop: 0,
    headerPaddingRight: 0,
    myPoints: 0,

    partnerName: 'TA',
    partnerAvatar: '',
    selectedDate: '',
    isToday: true,
    weekDays: [] as any[],
    weekLabel: '',
    isCurrentWeek: true,
    currentWeekMonday: null as any,

    tasks: [] as any[],
    completedCount: 0,
    partnerTasks: [] as any[],
    partnerCompletedCount: 0,

    dayRecords: { myRecords: [] as any[], partnerRecords: [] as any[], partnerName: 'TA' },

    rewards: [] as any[],

    showTaskModal: false,
    newTaskTitle: '',
    newTaskPoints: 3,
    newTaskDuration: 'daily' as any,
    taskSubmitting: false,
    showRewardModal: false,
    newRewardTitle: '',
    newRewardCost: '',
    rewardSubmitting: false,
  },

  onLoad() {
    const layout = getLayout()
    const today = new Date()
    this.setData({
      headerPaddingTop: layout.headerPaddingTop,
      headerPaddingRight: layout.headerPaddingRight,
      selectedDate: toDateStr(today),
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth() + 1,
      isCurrentMonth: true,
    })
  },

  onShow() {
    const today = new Date()
    const monday = getMondayOfWeek(today)
    this.loadWeek(monday, true)
    this.loadRewardsAndPoints()
  },

  onDayTap(e: any) {
    const { date, future, empty } = e.currentTarget.dataset
    if (empty || future || !date) return
    this.loadTasksForDate(date)
    this.loadDayRecords(date)
  },

  async loadWeek(monday: Date, jumpToToday = false) {
    const today = toDateStr(new Date())
    const currentMonday = getMondayOfWeek(new Date())
    const isCurrentWeek = toDateStr(monday) === toDateStr(currentMonday)
    const days: any[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dateStr = toDateStr(d)
      days.push({ dateStr, day: d.getDate(), weekLabel: WEEK_LABELS[d.getDay()], isToday: dateStr === today, isFuture: dateStr > today, hasCheckin: false })
    }
    const startDate = toDateStr(monday)
    const endDay = new Date(monday); endDay.setDate(monday.getDate() + 6)
    const endDate = toDateStr(endDay)
    const monthStart = monday.getMonth() + 1
    const monthEnd = endDay.getMonth() + 1
    const weekLabel = monthStart === monthEnd
      ? `${monday.getFullYear()}年${monthStart}月`
      : `${monday.getFullYear()}年${monthStart}月 - ${monthEnd}月`
    this.setData({ weekDays: days, weekLabel, isCurrentWeek, currentWeekMonday: monday })
    const selectedDate = jumpToToday ? today : (this.data.selectedDate < startDate ? startDate : this.data.selectedDate > endDate ? endDate : this.data.selectedDate)
    await this.loadCheckinDots(startDate, endDate, days)
    await this.loadTasksForDate(selectedDate)
    await this.loadDayRecords(selectedDate)
  },

  async loadCheckinDots(startDate: string, endDate: string, days: any[]) {
    const res = await api('getCheckinDates', { startDate, endDate })
    if (res.code === 0 && res.data) {
      const checkinSet = new Set<string>(res.data)
      const updatedDays = days.map(d => ({ ...d, hasCheckin: checkinSet.has(d.dateStr) }))
      this.setData({ weekDays: updatedDays })
    }
  },

  async loadTasksForDate(dateStr: string) {
    const today = toDateStr(new Date())
    const [myRes, partnerRes] = await Promise.all([
      api('getTasksByDate', { date: dateStr }),
      api('getPartnerTasksByDate', { date: dateStr }),
    ])
    if (myRes.code === 0) {
      const tasks = myRes.data
      this.setData({ tasks, completedCount: tasks.filter((t: any) => t.myCompleted).length, selectedDate: dateStr, isToday: dateStr === today })
    }
    if (partnerRes.code === 0) {
      const partnerTasks = partnerRes.data
      this.setData({ partnerTasks, partnerCompletedCount: partnerTasks.filter((t: any) => t.myCompleted).length })
    }
  },

  async loadDayRecords(dateStr: string) {
    const res = await api('getDayTaskRecords', { date: dateStr })
    if (res.code === 0 && res.data) {
      this.setData({
        dayRecords: {
          myRecords: Array.isArray(res.data.myRecords) ? res.data.myRecords : [],
          partnerRecords: Array.isArray(res.data.partnerRecords) ? res.data.partnerRecords : [],
          partnerName: res.data.partnerName || this.data.partnerName,
        },
      })
    } else {
      this.setData({ dayRecords: { myRecords: [], partnerRecords: [] } })
    }
  },

  async loadRewardsAndPoints() {
    const [rewardsRes, userRes] = await Promise.all([api('getRewards'), api('getUserInfo')])
    if (rewardsRes.code === 0) this.setData({ rewards: rewardsRes.data })
    if (userRes.code === 0 && userRes.data) this.setData({ myPoints: userRes.data.points || 0 })
  },

  selectDay(e: any) {
    const { date, future } = e.currentTarget.dataset
    if (future) { wx.showToast({ title: '还没到这一天哦', icon: 'none' }); return }
    this.loadTasksForDate(date)
    this.loadDayRecords(date)
  },

  prevWeek() {
    const monday = new Date(this.data.currentWeekMonday)
    monday.setDate(monday.getDate() - 7)
    this.loadWeek(monday)
  },

  nextWeek() {
    if (this.data.isCurrentWeek) return
    const monday = new Date(this.data.currentWeekMonday)
    monday.setDate(monday.getDate() + 7)
    this.loadWeek(monday)
  },

  async checkIn(e: any) {
    if (!this.data.isToday) return
    const id = e.currentTarget.dataset.id
    const task = this.data.tasks.find((t: any) => t._id === id)
    if (task?.myCompleted) return
    const res = await api('checkInTask', { taskId: id })
    if (res.code === 0) {
      const points = task?.points || 0
      wx.showToast({ title: `打卡成功 +${points}积分 🩷`, icon: 'success' })
      const today = toDateStr(new Date())
      await this.loadTasksForDate(today)
      await this.loadDayRecords(today)
      await this.loadRewardsAndPoints()
      const monday = getMondayOfWeek(new Date())
      const endDay = new Date(monday); endDay.setDate(monday.getDate() + 6)
      await this.loadCheckinDots(toDateStr(monday), toDateStr(endDay), this.data.weekDays)
    }
  },

  noop() {},

  showAddTask() { this.setData({ showTaskModal: true, newTaskTitle: '', newTaskPoints: 3, newTaskDuration: 'daily' }) },
  hideAddTask() { this.setData({ showTaskModal: false }) },
  onTaskTitleInput(e: any) { this.setData({ newTaskTitle: e.detail.value }) },
  selectPoints(e: any) { this.setData({ newTaskPoints: e.currentTarget.dataset.val }) },
  selectDuration(e: any) { this.setData({ newTaskDuration: e.currentTarget.dataset.val }) },

  async addTask() {
    const title = this.data.newTaskTitle.trim()
    if (!title) return
    this.setData({ taskSubmitting: true })
    try {
      const res = await api('createTask', { title, points: this.data.newTaskPoints, duration: this.data.newTaskDuration })
      if (res.code === 0) {
        wx.showToast({ title: '任务创建成功', icon: 'success' })
        this.hideAddTask()
        await this.loadTasksForDate(toDateStr(new Date()))
      }
    } finally { this.setData({ taskSubmitting: false }) }
  },

  showAddReward() { this.setData({ showRewardModal: true, newRewardTitle: '', newRewardCost: '' }) },
  hideAddReward() { this.setData({ showRewardModal: false }) },
  onRewardTitleInput(e: any) { this.setData({ newRewardTitle: e.detail.value }) },
  onRewardCostInput(e: any) { this.setData({ newRewardCost: e.detail.value }) },

  async addReward() {
    const title = this.data.newRewardTitle.trim()
    const cost = Number(this.data.newRewardCost)
    if (!title || !cost || cost <= 0) return
    this.setData({ rewardSubmitting: true })
    try {
      const res = await api('createReward', { title, cost })
      if (res.code === 0) {
        wx.showToast({ title: '奖励添加成功', icon: 'success' })
        this.hideAddReward()
        this.loadRewardsAndPoints()
      }
    } finally { this.setData({ rewardSubmitting: false }) }
  },

  exchange(e: any) {
    const { id, cost } = e.currentTarget.dataset
    if (this.data.myPoints < cost) { wx.showToast({ title: '积分不足', icon: 'none' }); return }
    wx.showModal({
      title: '确认兑换', content: `消耗 ${cost} 积分兑换此奖励？`, confirmColor: '#E8A598',
      success: async (res) => {
        if (res.confirm) {
          const result = await api('exchangeReward', { rewardId: id })
          if (result.code === 0) { wx.showToast({ title: '兑换成功 🎉', icon: 'success' }); this.loadRewardsAndPoints() }
        }
      },
    })
  },
})
