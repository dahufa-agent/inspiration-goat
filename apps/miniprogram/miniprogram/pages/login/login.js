/**
 * 登录页面
 */
const api = require('../../../services/api')

Page({
  data: {
    username: '',
    password: '',
    loading: false
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  // 登录
  handleLogin() {
    const { username, password } = this.data
    
    if (!username.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }
    
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    api.login(username, password)
      .then(res => {
        this.setData({ loading: false })
        
        // 保存用户信息
        const app = getApp()
        app.loginSuccess(res.user)
        
        wx.showToast({ title: '登录成功', icon: 'success' })
        
        // 返回上一页或跳转到首页
        setTimeout(() => {
          wx.navigateBack() || wx.switchTab({ url: '/pages/index/index' })
        }, 1500)
      })
      .catch(err => {
        this.setData({ loading: false })
        console.error('登录失败:', err)
      })
  },

  // 跳转到注册
  goToRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  }
})
