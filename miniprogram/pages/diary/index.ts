import { api } from '../../utils/cloud'
import { getLayout } from '../../utils/layout'

Page({
  data: {
    diaries: [] as any[],
    page: 1,
    loading: false,
    noMore: false,
    headerPaddingTop: 0,
    headerPaddingRight: 0,
    headerHeight: 0,
  },

  onLoad() {
    const layout = getLayout()
    const paddingTop = layout.headerPaddingTop
    const headerHeight = layout.navBarHeight
    this.setData({
      headerPaddingTop: paddingTop,
      headerPaddingRight: layout.headerPaddingRight,
      headerHeight,
    })
    this.loadDiaries()
  },

  onShow() {
    if (this.data.page > 1) {
      this.setData({ page: 1, diaries: [], noMore: false })
      this.loadDiaries()
    }
  },

  async loadDiaries() {
    if (this.data.loading || this.data.noMore) return

    this.setData({ loading: true })
    try {
      const res = await api('getDiaries', { page: this.data.page, pageSize: 20 })
      if (res.code === 0) {
        const newDiaries = this.data.page === 1 ? res.data : [...this.data.diaries, ...res.data]
        this.setData({
          diaries: newDiaries,
          page: this.data.page + 1,
          noMore: res.data.length < 20,
        })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  loadMore() {
    this.loadDiaries()
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/diary/create' })
  },

  goDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/diary/detail?id=${id}` })
  },

  previewImage(e: any) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({ urls, current })
  },

  onPullDownRefresh() {
    this.setData({ page: 1, diaries: [], noMore: false })
    this.loadDiaries().then(() => wx.stopPullDownRefresh())
  },
})
