import { api } from '../../utils/cloud'
import { getDaysTogether } from '../../utils/date'
import { getLayout } from '../../utils/layout'

Page({
  data: {
    myOpenid: '',
    isBound: false,
    partnerName: '',
    myAvatar: '',
    partnerAvatar: '',
    daysTogether: 0,
    partnerCode: '',
    binding: false,
    headerPaddingTop: 0,
    headerPaddingRight: 0,
  },

  onLoad() {
    const layout = getLayout()
    this.setData({
      headerPaddingTop: layout.headerPaddingTop,
      headerPaddingRight: layout.headerPaddingRight,
    })
    this.loadStatus()
  },

  onShow() {
    this.loadStatus()
  },

  async loadStatus() {
    const res = await api('getCoupleInfo')
    if (res.code === 0 && res.data) {
      const couple = res.data
      this.setData({
        isBound: true,
        partnerName: couple.partner2?.nickname || 'TA',
        myAvatar: couple.partner1?.avatar || '',
        partnerAvatar: couple.partner2?.avatar || '',
        daysTogether: getDaysTogether(couple.startDate),
      })
    } else {
      const userRes = await api('getUserInfo')
      if (userRes.code === 0 && userRes.data) {
        this.setData({
          isBound: false,
          myOpenid: userRes.data._openid || '',
        })
      }
    }
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.myOpenid,
      success: () => {
        wx.showToast({ title: '已复制邀请码', icon: 'success' })
      },
    })
  },

  onCodeInput(e: any) {
    this.setData({ partnerCode: e.detail.value.trim() })
  },

  async doBind() {
    const code = this.data.partnerCode
    if (!code) return

    this.setData({ binding: true })
    try {
      const res = await api('bindCouple', { inviteCode: code })
      if (res.code === 0) {
        wx.showToast({ title: '绑定成功 💕', icon: 'success' })
        setTimeout(() => {
          this.loadStatus()
        }, 1500)
      }
    } finally {
      this.setData({ binding: false })
    }
  },

  confirmUnbind() {
    wx.showModal({
      title: '确认解除绑定',
      content: '解除后双方将无法再查看彼此的日记和纸条，确定要解除吗？',
      confirmColor: '#E8A598',
      success: async (res) => {
        if (res.confirm) {
          const result = await api('unbindCouple')
          if (result.code === 0) {
            wx.showToast({ title: '已解除绑定', icon: 'success' })
            setTimeout(() => this.loadStatus(), 1500)
          }
        }
      },
    })
  },
})
