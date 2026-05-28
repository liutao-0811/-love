import { api } from '../../utils/cloud'
import { getLayout } from '../../utils/layout'

const TYPE_MAP: Record<string, string> = {
  anniversary: '纪念日',
  birthday: '生日',
  travel: '旅行',
  custom: '自定义',
}

Page({
  data: {
    countdowns: [] as any[],
    headerPaddingTop: 0,
    showModal: false,
    newName: '',
    newDate: '',
    newType: 'anniversary',
    today: new Date().toISOString().slice(0, 10),
    submitting: false,
    headerHeight: 0,
    headerPaddingRight: 0,
    newCustomLabel: '',
    types: [
      { label: '纪念日', value: 'anniversary' },
      { label: '生日', value: 'birthday' },
      { label: '旅行', value: 'travel' },
      { label: '自定义', value: 'custom' },
    ],
  },

  onLoad() {
    const layout = getLayout()
    const headerPaddingTop = layout.headerPaddingTop
    this.setData({
      headerPaddingTop,
      headerHeight: layout.navBarHeight,
      headerPaddingRight: layout.headerPaddingRight,
    })
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    const res = await api('getCountdowns')
    if (res.code === 0) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const countdowns = res.data.map((c: any) => {
        const target = new Date(c.targetDate)
        target.setHours(0, 0, 0, 0)
        const diff = target.getTime() - now.getTime()
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))
        return { ...c, daysLeft, typeLabel: TYPE_MAP[c.type] || '自定义', customLabel: c.customLabel || '' }
      })
      this.setData({ countdowns })
    }
  },

  noop() {},

  showCreate() {
    this.setData({ showModal: true, newName: '', newDate: '', newType: 'anniversary', newCustomLabel: '' })
  },

  hideCreate() {
    this.setData({ showModal: false })
  },

  onNameInput(e: any) {
    this.setData({ newName: e.detail.value })
  },

  onDateChange(e: any) {
    this.setData({ newDate: e.detail.value })
  },

  selectType(e: any) {
    const val = e.currentTarget.dataset.val
    this.setData({ newType: val, newCustomLabel: '' })
  },

  onCustomLabelInput(e: any) {
    this.setData({ newCustomLabel: e.detail.value })
  },

  async createCountdown() {
    if (!this.data.newName.trim() || !this.data.newDate) return
    this.setData({ submitting: true })
    try {
      const res = await api('createCountdown', {
        name: this.data.newName,
        targetDate: this.data.newDate,
        type: this.data.newType,
        customLabel: this.data.newType === 'custom' ? this.data.newCustomLabel : '',
      })
      if (res.code === 0) {
        wx.showToast({ title: '创建成功', icon: 'success' })
        this.hideCreate()
        this.loadData()
        try {
          await wx.requestSubscribeMessage({
            tmplIds: [
              '4HVD4mDYqtGVgBZw-nfdh-8-jRQ_QYp3NklmW_qTv8k',
              '9hK7Dy_nMKS2as_1urpPj4RAbGmWwWq_2riYc786Eyc',
            ],
          }).then((subRes: any) => {
            const accepted = subRes['4HVD4mDYqtGVgBZw-nfdh-8-jRQ_QYp3NklmW_qTv8k'] === 'accept'
              || subRes['9hK7Dy_nMKS2as_1urpPj4RAbGmWwWq_2riYc786Eyc'] === 'accept'
            if (accepted) {
              api('saveSubscription', { type: 'countdown', enabled: true })
            }
          }).catch(() => {})
        } catch {}
      }
    } finally {
      this.setData({ submitting: false })
    }
  },

  deleteCountdown(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个倒计时吗？',
      confirmColor: '#E8A598',
      success: async (res) => {
        if (res.confirm) {
          const result = await api('deleteCountdown', { countdownId: id })
          if (result.code === 0) {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadData()
          }
        }
      },
    })
  },
})
