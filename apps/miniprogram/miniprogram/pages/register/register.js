/**
 * 注册页面
 */
const api = require('../../../services/api')

Page({
  data: {
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    code: '',
    countdown: 0,
    loading: false
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value })
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value })
  },

  // 发送验证码
  handleSendCode() {
    const { phone } = this.data
    
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }

    api.sendCode(phone, 'register')
      .then(res => {
        wx.showToast({ title: '验证码已发送', icon: 'success' })
        // 开发环境显示验证码
        if (res.code) {
          wx.showModal({
            title: '验证码（开发模式）',
            content: `您的验证码是：${res.code}`,
            showCancel: false
          })
        }
        
        // 开始倒计时
        this.setData({ countdown: 60 })
        const timer = setInterval(() => {
          const countdown = this.data.countdown - 1
          if (countdown <= 0) {
            clearInterval(timer)
            this.setData({ countdown: 0 })
          } else {
            this.setData({ countdown })
          }
        }, 1000)
      })
      .catch(err => {
        console.error('发送验证码失败:', err)
      })
  },

  // 注册
  handleRegister() {
    const { phone, username, password, confirmPassword, code } = this.data
    
    if (!phone || !username || !password || !confirmPassword || !code) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }
    
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      wx.showToast({ title: '用户名需3-20位字母、数字或下划线', icon: 'none' })
      return
    }
    
    if (password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }
    
    if (password !== confirmPassword) {
      wx.showToast({ title: '两次密码输入不一致', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    api.register(phone, username, password, code)
      .then(res => {
        this.setData({ loading: false })
        
        // 保存用户信息
        const app = getApp()
        app.loginSuccess(res.user)
        
        wx.showToast({ title: '注册成功', icon: 'success' })
        
        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' })
        }, 1500)
      })
      .catch(err => {
        this.setData({ loading: false })
        console.error('注册失败:', err)
      })
  },

  // 跳转到登录
  goToLogin() {
    wx.navigateBack()
  }
})
