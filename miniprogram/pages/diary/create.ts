import { api } from '../../utils/cloud'

Page({
  data: {
    date: new Date().toISOString().slice(0, 10),
    content: '',
    mood: '',
    images: [] as string[],
    location: null as { name: string; latitude: number; longitude: number } | null,
    moods: ['😊', '🥰', '😘', '🥺', '😢', '😤', '🤗', '😴'],
    submitting: false,
  },

  onDateChange(e: any) {
    this.setData({ date: e.detail.value })
  },

  selectMood(e: any) {
    this.setData({ mood: e.currentTarget.dataset.mood })
  },

  onContentInput(e: any) {
    this.setData({ content: e.detail.value })
  },

  async chooseImage() {
    try {
      const res = await wx.chooseMedia({
        count: 9 - this.data.images.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
      })
      wx.showLoading({ title: '上传中...' })
      const uploads = res.tempFiles.map(async (f, i) => {
        const ext = f.tempFilePath.split('.').pop() || 'jpg'
        const cloudPath = `diaries/${Date.now()}_${i}_${Math.random().toString(36).slice(2)}.${ext}`
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: f.tempFilePath,
        })
        return uploadRes.fileID
      })
      const results = await Promise.allSettled(uploads)
      const fileIDs = results
        .filter(r => r.status === 'fulfilled')
        .map((r: any) => r.value)
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) {
        wx.showToast({ title: `${failed}张上传失败`, icon: 'none' })
      }
      this.setData({ images: [...this.data.images, ...fileIDs] })
    } catch {
    } finally {
      wx.hideLoading()
    }
  },

  removeImage(e: any) {
    const idx = e.currentTarget.dataset.index
    const images = [...this.data.images]
    images.splice(idx, 1)
    this.setData({ images })
  },

  async chooseLocation() {
    try {
      const res = await wx.chooseLocation()
      this.setData({
        location: { name: res.name, latitude: res.latitude, longitude: res.longitude },
      })
    } catch {}
  },

  async submit() {
    if (!this.data.content.trim()) return
    this.setData({ submitting: true })
    try {
      const res = await api('createDiary', {
        content: this.data.content,
        date: this.data.date,
        mood: this.data.mood,
        images: this.data.images,
        location: this.data.location,
      })
      if (res.code === 0) {
        wx.showToast({ title: '发布成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      }
    } finally {
      this.setData({ submitting: false })
    }
  },
})
