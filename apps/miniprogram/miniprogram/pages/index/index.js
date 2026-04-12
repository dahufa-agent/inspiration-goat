/**
 * 首页 - 灵感创作
 */
const api = require('../../services/api')

Page({
  data: {
    prompt: '',
    loading: false,
    result: null,
    quota: null,
    userInfo: null,
    isLoggedIn: false,
    durationType: 'free'
  },

  onLoad() {
    this.checkLoginStatus()
    this.loadQuota()
  },

  onShow() {
    this.checkLoginStatus()
    this.loadQuota()
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const isLoggedIn = !!userInfo
    this.setData({ userInfo, isLoggedIn })
  },

  // 加载剩余次数
  loadQuota() {
    api.getRemainingEdits()
      .then(res => {
        this.setData({ quota: res })
      })
      .catch(err => {
        console.error('加载次数失败:', err)
      })
  },

  // 输入提示词
  onPromptInput(e) {
    this.setData({ prompt: e.detail.value })
  },

  // 选择时长
  onDurationChange(e) {
    const durations = ['free', 'paid5', 'paid10', 'paid15']
    this.setData({ durationType: durations[e.detail.value] })
  },

  // 一键生成全部
  handleGenerateAll() {
    if (!this.data.prompt.trim()) {
      wx.showToast({ title: '请输入创作灵感', icon: 'none' })
      return
    }

    this.setData({ loading: true, result: null })

    api.generateAll(this.data.prompt, this.data.durationType)
      .then(res => {
        this.setData({ loading: false, result: res })
        this.loadQuota() // 刷新次数
        wx.showToast({ title: '生成成功', icon: 'success' })
      })
      .catch(err => {
        this.setData({ loading: false })
        console.error('生成失败:', err)
      })
  },

  // 单独生成图片
  handleGenerateImages() {
    if (!this.data.prompt.trim()) {
      wx.showToast({ title: '请输入创作灵感', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    api.generateImages(this.data.prompt)
      .then(res => {
        this.setData({ 
          loading: false, 
          result: { imageUrls: res.imageUrls, texts: [], videoUrl: null }
        })
        this.loadQuota()
        wx.showToast({ title: '图片生成成功', icon: 'success' })
      })
      .catch(err => {
        this.setData({ loading: false })
      })
  },

  // 单独生成文案
  handleGenerateTexts() {
    if (!this.data.prompt.trim()) {
      wx.showToast({ title: '请输入创作灵感', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    api.generateTexts(this.data.prompt)
      .then(res => {
        this.setData({ 
          loading: false, 
          result: { imageUrls: [], texts: res.texts, videoUrl: null }
        })
        this.loadQuota()
        wx.showToast({ title: '文案生成成功', icon: 'success' })
      })
      .catch(err => {
        this.setData({ loading: false })
      })
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({ urls: [url], current: url })
  },

  // 保存图片到相册
  saveImage(e) {
    const url = e.currentTarget.dataset.url
    wx.showLoading({ title: '保存中...' })
    
    wx.downloadFile({
      url,
      success(res) {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success() {
            wx.hideLoading()
            wx.showToast({ title: '保存成功', icon: 'success' })
          },
          fail() {
            wx.hideLoading()
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        })
      },
      fail() {
        wx.hideLoading()
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  },

  // 复制文案
  copyText(e) {
    const text = e.currentTarget.dataset.text
    wx.setClipboardData({
      data: text,
      success() {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  // 跳转登录
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  // 跳转注册
  goToRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  }
})
