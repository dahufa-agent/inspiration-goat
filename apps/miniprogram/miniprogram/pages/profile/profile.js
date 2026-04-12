/**
 * 个人中心页面
 */
const api = require('../../services/api')

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    membership: null
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const isLoggedIn = !!userInfo
    this.setData({ userInfo, isLoggedIn })
    
    if (isLoggedIn) {
      this.loadMembership()
    }
  },

  loadMembership() {
    api.getMembership()
      .then(res => {
        this.setData({ membership: res })
      })
      .catch(err => {
        console.error('加载会员信息失败:', err)
      })
  },

  // 每日签到
  handleCheckin() {
    api.dailyCheckin()
      .then(res => {
        wx.showToast({ title: res.message, icon: 'success' })
      })
      .catch(err => {
        // 错误已在 api 层处理
      })
  },

  // 激活免费码
  handleActivateCode() {
    wx.showModal({
      title: '激活免费码',
      editable: true,
      placeholderText: '请输入免费码',
      success: (res) => {
        if (res.confirm && res.content) {
          const code = res.content.trim().toUpperCase()
          if (!code) {
            wx.showToast({ title: '请输入免费码', icon: 'none' })
            return
          }
          
          api.activateFreeCode(code)
            .then(result => {
              wx.showToast({ title: '激活成功', icon: 'success' })
              this.loadMembership()
            })
            .catch(err => {
              // 错误已在 api 层处理
            })
        }
      }
    })
  },

  // 跳转页面
  goToPage(e) {
    const url = e.currentTarget.dataset.url
    if (url) {
      wx.navigateTo({ url })
    }
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.logout()
          this.setData({ userInfo: null, isLoggedIn: false, membership: null })
          wx.showToast({ title: '已退出登录', icon: 'success' })
        }
      }
    })
  }
})
