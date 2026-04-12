/**
 * 积分中心页面
 */
const api = require('../../services/api')

Page({
  data: {
    points: 0,
    transactions: [],
    loading: false
  },

  onLoad() {
    this.loadPoints()
  },

  onShow() {
    this.loadPoints()
  },

  loadPoints() {
    api.getPoints()
      .then(res => {
        this.setData({ 
          points: res.points || 0,
          transactions: res.transactions || []
        })
      })
      .catch(err => {
        console.error('加载积分失败:', err)
      })
  },

  // 签到
  handleCheckin() {
    this.setData({ loading: true })
    
    api.dailyCheckin()
      .then(res => {
        this.setData({ loading: false })
        wx.showToast({ title: res.message, icon: 'success' })
        this.loadPoints() // 刷新
      })
      .catch(err => {
        this.setData({ loading: false })
      })
  },

  // 充值
  handleRecharge() {
    wx.showToast({ title: '支付功能即将上线', icon: 'none' })
  }
})
