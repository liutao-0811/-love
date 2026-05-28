import { api } from '../../utils/cloud'
import { formatDate } from '../../utils/date'

Page({
  data: {
    logs: [] as any[],
    myPoints: 0,
    page: 1,
    loading: false,
    noMore: false,
  },

  onLoad() {
    this.loadPoints()
    this.loadLogs()
  },

  async loadPoints() {
    const res = await api('getUserInfo')
    if (res.code === 0 && res.data) {
      this.setData({ myPoints: res.data.points || 0 })
    }
  },

  async loadLogs() {
    if (this.data.loading || this.data.noMore) return
    this.setData({ loading: true })
    try {
      const res = await api('getPointsLog', { page: this.data.page, pageSize: 20 })
      if (res.code === 0) {
        const now = Date.now()
        const newLogs = res.data.map((l: any) => ({
          ...l,
          timeStr: formatDate(l.createdAt, 'MM-DD HH:mm'),
        }))
        const logs = this.data.page === 1 ? newLogs : [...this.data.logs, ...newLogs]
        this.setData({
          logs,
          page: this.data.page + 1,
          noMore: res.data.length < 20,
        })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  loadMore() {
    this.loadLogs()
  },
})
