Page({
  clearCache() {
    wx.showModal({
      title: '确认清除',
      content: '将清除本地缓存数据，不影响云端数据',
      confirmColor: '#E8A598',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.showToast({ title: '已清除', icon: 'success' })
        }
      },
    })
  },
})
