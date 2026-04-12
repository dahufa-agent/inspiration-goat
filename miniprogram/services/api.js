/**
 * API 服务层
 * 对接后端 Express API
 */

const app = getApp()

const API_BASE_URL = 'http://localhost:9091/api/v1'

/**
 * 发送请求
 */
function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    const userInfo = wx.getStorageSync('userInfo') || {}
    const deviceId = wx.getStorageSync('deviceId') || 'unknown'
    
    const header = {
      'Content-Type': 'application/json'
    }
    
    // 添加用户标识
    if (userInfo.id) {
      header['x-user-id'] = userInfo.id
    }
    header['x-device-id'] = deviceId

    wx.request({
      url: API_BASE_URL + url,
      method,
      data,
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          // 处理业务错误
          const error = res.data?.error || '请求失败'
          wx.showToast({
            title: error,
            icon: 'none',
            duration: 2000
          })
          reject({ code: res.statusCode, message: error })
        }
      },
      fail(err) {
        wx.showToast({
          title: '网络请求失败',
          icon: 'none',
          duration: 2000
        })
        reject(err)
      }
    })
  })
}

// ==================== 认证接口 ====================

/**
 * 发送验证码
 */
export function sendCode(phone, purpose = 'register') {
  return request('/auth/send-code', 'POST', { phone, purpose })
}

/**
 * 注册
 */
export function register(phone, username, password, code) {
  return request('/auth/register', 'POST', { phone, username, password, code })
}

/**
 * 登录
 */
export function login(username, password) {
  return request('/auth/login', 'POST', { username, password })
}

// ==================== 内容生成接口 ====================

/**
 * 一键生成全部
 */
export function generateAll(prompt, durationType = 'free') {
  return request('/generate/all', 'POST', { prompt, durationType })
}

/**
 * 单独生成图片
 */
export function generateImages(prompt, count = 2) {
  return request('/generate/images', 'POST', { prompt, count })
}

/**
 * 单独生成文案
 */
export function generateTexts(prompt) {
  return request('/generate/texts', 'POST', { prompt })
}

/**
 * 单独生成视频
 */
export function generateVideo(prompt, imageUrl, durationType = 'free') {
  return request('/generate/video', 'POST', { prompt, imageUrl, durationType })
}

// ==================== 用户接口 ====================

/**
 * 获取剩余次数
 */
export function getRemainingEdits() {
  return request('/user/remaining-edits', 'GET')
}

/**
 * 获取会员状态
 */
export function getMembership() {
  return request('/user/membership', 'GET')
}

/**
 * 获取积分
 */
export function getPoints() {
  return request('/user/points', 'GET')
}

/**
 * 每日签到
 */
export function dailyCheckin() {
  return request('/user/daily-checkin', 'POST')
}

// ==================== 免费码接口 ====================

/**
 * 激活免费码
 */
export function activateFreeCode(code) {
  return request('/free-codes/activate', 'POST', { code })
}

/**
 * 获取免费码选项
 */
export function getFreeCodeOptions() {
  return request('/free-codes/options', 'GET')
}

// ==================== 历史记录接口 ====================

/**
 * 获取历史记录
 */
export function getHistory() {
  const deviceId = wx.getStorageSync('deviceId') || 'unknown'
  return request(`/history?deviceId=${deviceId}`, 'GET')
}

// ==================== 内容处理接口 ====================

/**
 * 文案润色
 */
export function polishContent(content, style) {
  return request('/content/polish', 'POST', { content, polishStyle: style })
}

/**
 * 从链接提取文案
 */
export function extractFromUrl(url) {
  return request('/content/extract-from-url', 'POST', { url })
}

module.exports = {
  sendCode,
  register,
  login,
  generateAll,
  generateImages,
  generateTexts,
  generateVideo,
  getRemainingEdits,
  getMembership,
  getPoints,
  dailyCheckin,
  activateFreeCode,
  getFreeCodeOptions,
  getHistory,
  polishContent,
  extractFromUrl
}
