// app.js
const api = require('./services/api')

App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    apiBaseUrl: 'http://localhost:9091/api/v1'
  },

  onLaunch() {
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
    }
    
    // 获取设备ID
    let deviceId = wx.getStorageSync('deviceId')
    if (!deviceId) {
      deviceId = 'wx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      wx.setStorageSync('deviceId', deviceId)
    }
    this.globalData.deviceId = deviceId
  },

  // 登录成功回调
  loginSuccess(userInfo) {
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = true
    wx.setStorageSync('userInfo', userInfo)
  },

  // 登出
  logout() {
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
    wx.removeStorageSync('userInfo')
  }
})
