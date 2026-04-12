/**
 * 会员中心页面
 */
const api = require('../../services/api')

Page({
  data: {
    membership: null,
    isLoggedIn: false,
    userInfo: null
  },

  onLoad() {
    this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      this.loadMembership()
    }
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      this.loadMembership()
    }
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const isLoggedIn = !!userInfo
    this.setData({ userInfo, isLoggedIn })
    
    if (!isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录查看会员信息',
        success(res) {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' })
          } else {
            wx.navigateBack()
          }
        }
      })
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

  // 购买会员
  handleBuyMember(e) {
    const type = e.currentTarget.dataset.type
    const prices = {
      '1_month': 29,
      '3_months': 79,
      '1_year': 199
    }
    
    wx.showModal({
      title: '开通会员',
      content: `确定开通 ${type === '1_month' ? '月度' : type === '3_months' ? '季度' : '年度'} 会员？价格 ¥${prices[type]}`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '支付功能即将上线', icon: 'none' })
        }
      }
    })
  },

  // 购买永久会员
  handleBuyPermanent() {
    wx.showModal({
      title: '开通永久会员',
      content: '确定开通永久会员？价格 ¥599',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '支付功能即将上线', icon: 'none' })
        }
      }
    })
  }
})
