import { api } from '../../utils/cloud'

Page({
  data: {
    nickname: '',
    avatar: '',
    saving: false,
  },

  onLoad() {
    this.loadProfile()
  },

  async loadProfile() {
    const res = await api('getUserInfo')
    if (res.code === 0 && res.data) {
      this.setData({
        nickname: res.data.nickname || '',
        avatar: res.data.avatar || '',
      })
    }
  },

  async onChooseAvatar(e: any) {
    const tempFilePath = e.detail.avatarUrl
    wx.showLoading({ title: '上传中...' })
    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `avatars/${Date.now()}.jpg`,
        filePath: tempFilePath,
      })
      this.setData({ avatar: uploadRes.fileID })
    } catch (err) {
      wx.showToast({ title: '上传失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  onNicknameInput(e: any) {
    this.setData({ nickname: e.detail.value })
  },

  async save() {
    if (!this.data.nickname.trim()) return
    this.setData({ saving: true })
    try {
      const res = await api('updateProfile', {
        nickname: this.data.nickname.trim(),
        avatar: this.data.avatar,
      })
      if (res.code === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      }
    } finally {
      this.setData({ saving: false })
    }
  },
})
