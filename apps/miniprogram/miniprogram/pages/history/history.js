/**
 * 历史记录页面
 */
const api = require('../../services/api')

Page({
  data: {
    history: [],
    loading: false,
    isLoggedIn: false
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.loadHistory()
    }
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const isLoggedIn = !!userInfo
    this.setData({ isLoggedIn })
    
    if (isLoggedIn) {
      this.loadHistory()
    }
  },

  loadHistory() {
    this.setData({ loading: true })
    
    api.getHistory()
      .then(res => {
        this.setData({ 
          loading: false,
          history: res.history || []
        })
      })
      .catch(err => {
        this.setData({ loading: false })
        console.error('加载历史记录失败:', err)
      })
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({ urls: [url], current: url })
  }
})
