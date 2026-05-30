App({
  onLaunch() {
    const items = wx.getStorageSync('items')
    if (!items) {
      wx.setStorageSync('items', [])
    }
  }
})
