import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9091/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 用户认证
export const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password })
  return response.data
}

export const register = async (phone: string, username: string, password: string, code: string) => {
  const response = await api.post('/auth/register', { phone, username, password, code })
  return response.data
}

export const sendCode = async (phone: string, purpose: string) => {
  const response = await api.post('/auth/send-code', { phone, purpose })
  return response.data
}

// 一键生成全部
export const generateAll = async (params: {
  prompt: string
  deviceId: string
  generateImage?: boolean
  generateText?: boolean
  generateVideo?: boolean
}) => {
  const response = await api.post('/generate/all', params)
  return response.data
}

// 单独生成图片
export const generateImages = async (params: {
  prompt: string
  deviceId: string
  count?: number
}) => {
  const response = await api.post('/generate/images', params)
  return response.data
}

// 单独生成文案
export const generateTexts = async (params: {
  prompt: string
  deviceId: string
}) => {
  const response = await api.post('/generate/texts', params)
  return response.data
}

// 单独生成视频
export const generateVideo = async (params: {
  prompt: string
  deviceId: string
  imageUrl?: string
  duration?: number
}) => {
  const response = await api.post('/generate/video', params)
  return response.data
}

// 获取用户信息
export const getUserInfo = async () => {
  const response = await api.get('/user/info')
  return response.data
}

// 获取会员信息
export const getMembership = async (deviceId: string) => {
  const response = await api.get(`/user/membership?deviceId=${deviceId}`)
  return response.data
}

// 获取剩余次数
export const getRemainingEdits = async (deviceId: string) => {
  const response = await api.get(`/user/remaining-edits?deviceId=${deviceId}`)
  return response.data
}

// 文案润色
export const polishContent = async (content: string, style: string) => {
  const response = await api.post('/content/polish', { content, style })
  return response.data
}

// 内容提取
export const extractFromUrl = async (url: string) => {
  const response = await api.post('/content/extract-from-url', { url })
  return response.data
}

// 获取历史记录
export const getHistory = async (deviceId: string) => {
  const response = await api.get(`/history?deviceId=${deviceId}`)
  return response.data
}

// 获取积分余额
export const getCredits = async (userId: string) => {
  const response = await api.get(`/user/points`, {
    headers: { 'x-user-id': userId }
  })
  return response.data
}

// 获取积分记录
export const getCreditRecords = async (userId: string) => {
  const response = await api.get(`/user/points`, {
    headers: { 'x-user-id': userId }
  })
  return response.data.transactions || []
}

// 获取用户会员状态
export const getMembershipStatus = async (userId: string) => {
  const response = await api.get(`/user/membership`, {
    headers: { 'x-user-id': userId }
  })
  return response.data
}

// 每日签到
export const dailyCheckin = async (userId: string) => {
  const response = await api.post(`/user/daily-checkin`, {}, {
    headers: { 'x-user-id': userId }
  })
  return response.data
}

// 激活免费码
export const activateFreeCode = async (userId: string, code: string) => {
  const response = await api.post(`/free-codes/activate`, { userId, code })
  return response.data
}

export default api
