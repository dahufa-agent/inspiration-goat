/**
 * API 服务层 v2.0
 * 对接后端 Express API
 * 支持风格选择和热点话题
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

// ==================== 内容生成接口 v2.0 ====================

/**
 * 一键生成全部内容
 * @param {string} prompt - 创意想法
 * @param {string} durationType - 视频时长类型
 * @param {string} textStyle - 文案风格 (xiaohongshu/douyin/gzh/zhihu/general)
 * @param {string} imageStyle - 图片风格 (realistic/illustration/anime/oil_painting/cyberpunk/fantasy)
 */
export function generateAll(prompt, durationType = 'free', textStyle = 'general', imageStyle = 'realistic') {
  return request('/generate/all', 'POST', { prompt, durationType, textStyle, imageStyle })
}

/**
 * 生成图片
 * @param {string} prompt - 提示词
 * @param {string} style - 图片风格
 */
export function generateImage(prompt, style = 'realistic') {
  return request('/generate/image', 'POST', { prompt, style })
}

/**
 * 批量生成图片
 * @param {string} prompt - 提示词
 * @param {string} style - 图片风格
 */
export function generateImages(prompt, style = 'realistic') {
  return request('/generate/images', 'POST', { prompt, style })
}

/**
 * 生成文案
 * @param {string} prompt - 提示词
 * @param {string} style - 文案风格
 * @param {string} platform - 目标平台
 */
export function generateText(prompt, style = 'general', platform = 'general') {
  return request('/generate/text', 'POST', { prompt, style, platform })
}

/**
 * 批量生成文案
 * @param {string} prompt - 提示词
 * @param {string} style - 文案风格
 * @param {string} platform - 目标平台
 */
export function generateTexts(prompt, style = 'general', platform = 'general') {
  return request('/generate/texts', 'POST', { prompt, style, platform })
}

/**
 * 生成视频
 * @param {string} prompt - 提示词
 * @param {string} imageUrl - 首帧图片URL
 * @param {string} durationType - 视频时长类型
 */
export function generateVideo(prompt, imageUrl, durationType = 'free') {
  return request('/generate/video', 'POST', { prompt, imageUrl, durationType })
}

/**
 * 重新生成视频
 */
export function regenerateVideo(prompt, imageUrl, durationType = 'free') {
  return request('/generate/video-regenerate', 'POST', { prompt, imageUrl, durationType })
}

/**
 * 生成文案变体
 * @param {string} prompt - 提示词
 * @param {number} count - 变体数量(1-5)
 */
export function generateTextVariants(prompt, count = 3) {
  return request('/generate/text-variants', 'POST', { prompt, count })
}

/**
 * 智能推荐
 * @param {string} topic - 主题
 * @param {string} type - 推荐类型
 */
export function recommend(topic, type = 'all') {
  return request('/recommend', 'POST', { topic, type })
}

// ==================== 模板接口 ====================

/**
 * 获取风格模板
 */
export function getStyleTemplates() {
  return request('/templates/styles', 'GET')
}

// ==================== 热点话题接口 ====================

/**
 * 获取热点话题
 */
export function getHotTopics() {
  return request('/hot-topics', 'GET')
}

// ==================== 任务状态接口 ====================

/**
 * 获取任务状态
 * @param {string} taskId - 任务ID
 */
export function getTaskStatus(taskId) {
  return request(`/task/${taskId}`, 'GET')
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

// ==================== 内容处理接口 ====================

/**
 * 内容润色
 * @param {string} content - 内容
 * @param {string} polishStyle - 润色风格
 */
export function polishContent(content, polishStyle = 'general') {
  return request('/content/polish', 'POST', { content, polishStyle })
}

/**
 * 从URL提取内容
 */
export function extractFromUrl(url) {
  return request('/content/extract-from-url', 'POST', { url })
}

/**
 * 从URL提取并润色
 * @param {string} url - URL
 * @param {string} polishStyle - 润色风格
 */
export function extractAndPolish(url, polishStyle = 'general') {
  return request('/content/extract-and-polish', 'POST', { url, polishStyle })
}

// ==================== 免费码接口 ====================

export function activateFreeCode(code, phone) {
  return request('/auth/activate-free-code', 'POST', { freeCode: code, phone })
}

export function generateFreeCode(days = 30, isGift = false, recipientPhone = '') {
  return request('/auth/generate-free-code', 'POST', { days, isGift, recipientPhone })
}

// ==================== 管理员接口 ====================

/**
 * 清理缓存
 */
export function clearCache() {
  return request('/admin/clear-cache', 'POST')
}

// ==================== 导出常量 ====================

export const TEXT_STYLES = [
  { id: 'xiaohongshu', name: '小红书', icon: '📕', color: '#FF2442' },
  { id: 'douyin', name: '抖音', icon: '🎵', color: '#000000' },
  { id: 'gzh', name: '公众号', icon: '📧', color: '#4F46E5' },
  { id: 'zhihu', name: '知乎', icon: '💬', color: '#0084FF' },
  { id: 'general', name: '通用', icon: '✨', color: '#10B981' },
]

export const IMAGE_STYLES = [
  { id: 'realistic', name: '写实摄影', keywords: 'photorealistic, high detail' },
  { id: 'illustration', name: '商业插画', keywords: 'digital illustration, vector art' },
  { id: 'anime', name: '动漫风格', keywords: 'anime style, vibrant colors' },
  { id: 'oil_painting', name: '油画质感', keywords: 'oil painting style, impressionist' },
  { id: 'cyberpunk', name: '赛博朋克', keywords: 'cyberpunk, neon lights' },
  { id: 'fantasy', name: '奇幻风格', keywords: 'fantasy art, magical' },
]

export const VIDEO_DURATIONS = {
  free: { duration: 5, label: '5秒', price: '免费', description: '每日10次' },
  paid5: { duration: 10, label: '10秒', price: '10积分' },
  paid10: { duration: 15, label: '15秒', price: '20积分' },
  paid15: { duration: 20, label: '20秒', price: '30积分' },
}

export const LIMITS = {
  images: { perBatch: 2, maxPerDay: 20, chargePerImage: 1 },
  texts: { perBatch: 1, maxPerDay: 10, chargePerText: 2 },
}
