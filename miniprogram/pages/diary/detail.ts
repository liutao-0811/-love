import { api } from '../../utils/cloud'

Page({
  data: {
    diary: null as any,
    isOwner: false,
    liked: false,
    likeCount: 0,
    comments: [] as any[],
    commentText: '',
    submitting: false,
    diaryId: '',
  },

  onLoad(options: any) {
    if (options.id) {
      this.setData({ diaryId: options.id })
      this.loadDetail(options.id)
    }
  },

  async loadDetail(id: string) {
    const [detailRes, userRes, commentsRes] = await Promise.all([
      api('getDiaryDetail', { diaryId: id }),
      api('getUserInfo'),
      api('getDiaryComments', { diaryId: id }),
    ])
    if (detailRes.code === 0 && detailRes.data) {
      const myOpenid = userRes.code === 0 ? userRes.data._openid : ''
      const diary = detailRes.data
      const likes = diary.likes || []
      this.setData({
        diary,
        isOwner: diary._openid === myOpenid,
        liked: likes.includes(myOpenid),
        likeCount: likes.length,
      })
    }
    if (commentsRes.code === 0) {
      this.setData({ comments: commentsRes.data })
    }
  },

  async toggleLike() {
    const res = await api('toggleDiaryLike', { diaryId: this.data.diaryId })
    if (res.code === 0) {
      this.setData({
        liked: res.data.liked,
        likeCount: res.data.count,
      })
    }
  },

  onCommentInput(e: any) {
    this.setData({ commentText: e.detail.value })
  },

  async submitComment() {
    const content = this.data.commentText.trim()
    if (!content || this.data.submitting) return
    this.setData({ submitting: true })
    try {
      const res = await api('addDiaryComment', { diaryId: this.data.diaryId, content })
      if (res.code === 0) {
        this.setData({ commentText: '' })
        wx.showToast({ title: '评论成功', icon: 'success' })
        const commentsRes = await api('getDiaryComments', { diaryId: this.data.diaryId })
        if (commentsRes.code === 0) {
          this.setData({ comments: commentsRes.data })
        }
      }
    } finally {
      this.setData({ submitting: false })
    }
  },

  previewImage(e: any) {
    const current = e.currentTarget.dataset.current
    wx.previewImage({ urls: this.data.diary.images, current })
  },

  deleteDiary() {
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除这篇日记吗？',
      confirmColor: '#E8A598',
      success: async (res) => {
        if (res.confirm) {
          const result = await api('deleteDiary', { diaryId: this.data.diary._id })
          if (result.code === 0) {
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          }
        }
      },
    })
  },
})
