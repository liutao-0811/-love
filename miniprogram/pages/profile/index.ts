import { api } from '../../utils/cloud'
import { getDaysTogether } from '../../utils/date'
import { getLayout } from '../../utils/layout'

Page({
  data: {
    statusBarHeight: 0,
    userInfo: {} as any,
    coupleInfo: null as any,
    myPoints: 0,
    daysTogether: 0,
    diaryCount: 0,
  },

  onLoad() {
    const layout = getLayout()
    this.setData({ statusBarHeight: layout.statusBarHeight })
    this.loadProfile()
  },

  onShow() {
    this.loadProfile()
  },

  async loadProfile() {
    const res = await api('getCoupleInfo')
    if (res.code === 0 && res.data) {
      const couple = res.data
      this.setData({
        userInfo: couple.partner1,
        coupleInfo: couple,
        myPoints: couple.partner1?.points || 0,
        daysTogether: getDaysTogether(couple.startDate),
      })
    }
  },

  goBind() {
    wx.navigateTo({ url: '/pages/bind/index' })
  },

  goEditProfile() {
    wx.navigateTo({ url: '/pages/profile/edit' })
  },

  goBadges() {
    wx.navigateTo({ url: '/pages/profile/badges' })
  },

  goPointsLog() {
    wx.navigateTo({ url: '/pages/profile/points' })
  },

  goTheme() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  goPrivacy() {
    wx.navigateTo({ url: '/pages/profile/privacy' })
  },

  goAbout() {
    wx.showModal({
      title: '关于我们',
      content: 'Me Love v1.0.0\n用爱记录每一天 💕\n仅供情侣个人使用',
      showCancel: false,
    })
  },
})
