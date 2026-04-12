/**
 * API 服务层
 * 对接后端 Express API
 */

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
          const error = res.data?.error || '请求失败'
          wx.showToast({ title: error, icon: 'none', duration: 2000 })
          reject({ code: res.statusCode, message: error })
        }
      },
      fail(err) {
        wx.showToast({ title: '网络请求失败', icon: 'none', duration: 2000 })
        reject(err)
      }
    })
  })
}

// ==================== 认证接口 ====================

export function sendCode(phone, purpose = 'register') {
  return request('/auth/send-code', 'POST', { phone, purpose })
}

export function register(phone, username, password, code) {
  return request('/auth/register', 'POST', { phone, username, password, code })
}

export function login(username, password) {
  return request('/auth/login', 'POST', { username, password })
}

// ==================== 内容生成接口 ====================

export function generateAll(prompt, durationType = 'free') {
  return request('/generate/all', 'POST', { prompt, durationType })
}

export function generateImages(prompt, count = 2) {
  return request('/generate/images', 'POST', { prompt, count })
}

export function generateTexts(prompt) {
  return request('/generate/texts', 'POST', { prompt })
}

export function generateVideo(prompt, imageUrl, durationType = 'free') {
  return request('/generate/video', 'POST', { prompt, imageUrl, durationType })
}

// ==================== 用户接口 ====================

export function getRemainingEdits() {
  return request('/user/remaining-edits', 'GET')
}

export function getMembership() {
  return request('/user/membership', 'GET')
}

export function getPoints() {
  return request('/user/points', 'GET')
}

export function dailyCheckin() {
  return request('/user/daily-checkin', 'POST')
}

// ==================== 免费码接口 ====================

export function activateFreeCode(code) {
  return request('/free-codes/activate', 'POST', { code })
}

export function getFreeCodeOptions() {
  return request('/free-codes/options', 'GET')
}

// ==================== 历史记录接口 ====================

export function getHistory() {
  const deviceId = wx.getStorageSync('deviceId') || 'unknown'
  return request(`/history?deviceId=${deviceId}`, 'GET')
}

// ==================== 内容处理接口 ====================

export function polishContent(content, style) {
  return request('/content/polish', 'POST', { content, polishStyle: style })
}

export function extractFromUrl(url) {
  return request('/content/extract-from-url', 'POST', { url })
}
