/**
 * 用户偏好存储模块 - 基于localStorage的持久化存储
 * 实现灵感山羊自进化机制的核心存储功能
 */

import {
  UserPreference,
  EvolutionRequest,
  Evolution,
  KnowledgeQualityScore,
  EvolutionCandidate,
  LocalEvolutionStore,
  PreferenceType,
  PREFERENCE_KEYWORDS,
  TRIGGER_KEYWORDS,
  HIGH_VALUE_TRIGGERS,
  MemoryFiles,
  EvolutionStats,
} from './UserEvolution'

const STORAGE_KEY = 'inspiration_goat_evolution'
const MEMORY_DIR_KEY = 'inspiration_goat_memory'

// 默认存储结构
const defaultStore = (): LocalEvolutionStore => ({
  preferences: [],
  evolutionRequests: [],
  appliedEvolutions: [],
  knowledgeQualityScores: {},
  memoryFiles: {
    SOUL: `# 灵感山羊 AI 分身人格定义
    
## 核心定位
国学智慧传承者，创意内容生成专家

## 回答风格
- 语言：优雅、简洁、有文化底蕴
- 语气：温和、专业、有亲和力
- 表达：善用国学典故，融入现代生活

## 能力边界
- 擅长：国学文化、创意文案、图片生成指导
- 谨慎：命理预测、医疗建议
- 禁止：政治敏感、宗教极端

## 进化原则
- 宁缺毋滥：每周保留1-3次高质量进化
- 用户掌控：所有进化必须用户审批
- 质量优先：过滤噪音，保持准确性`,
    USER: `# 用户画像档案

## 创建时间
{createdAt}

## 偏好记录
（通过对话自动学习更新）

## 使用习惯
（通过行为分析积累）`,
    PREFERENCES: `# 用户偏好记忆

（待批准的进化内容）`,
    KNOWLEDGE: `# 知识补充

（用户提供的冷门典故或纠正）`,
    LESSONS: `# 踩坑记录

## 生成错误
（每次错误都是学习机会）

## 引用失当
（易经解读偏差、典故错误等）`,
    MEMORY: `# 长期记忆精华

（从日志中提炼的永久性知识）`,
  },
  lastSyncAt: new Date().toISOString(),
  evolutionSensitivity: 'standard',
})

// ==================== 基础存储操作 ====================

function getStore(): LocalEvolutionStore {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load evolution store:', e)
  }
  return defaultStore()
}

function saveStore(store: LocalEvolutionStore): void {
  try {
    store.lastSyncAt = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (e) {
    console.error('Failed to save evolution store:', e)
  }
}

// ==================== 偏好管理 ====================

/**
 * 添加或更新用户偏好
 */
export function addOrUpdatePreference(
  type: PreferenceType,
  key: string,
  value: string,
  source: 'explicit' | 'implicit' | 'feedback' = 'implicit'
): UserPreference {
  const store = getStore()
  const existing = store.preferences.find(p => p.type === type && p.key === key)
  
  if (existing) {
    existing.value = value
    existing.frequency += 1
    existing.confidence = Math.min(1, existing.confidence + 0.1)
    existing.updatedAt = new Date().toISOString()
    saveStore(store)
    return existing
  }
  
  const newPref: UserPreference = {
    id: `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    key,
    value,
    source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    frequency: 1,
    confidence: source === 'explicit' ? 0.9 : 0.5,
  }
  
  store.preferences.push(newPref)
  saveStore(store)
  return newPref
}

/**
 * 获取所有偏好
 */
export function getAllPreferences(): UserPreference[] {
  return getStore().preferences
}

/**
 * 获取特定类型的偏好
 */
export function getPreferencesByType(type: PreferenceType): UserPreference[] {
  return getStore().preferences.filter(p => p.type === type)
}

/**
 * 删除偏好
 */
export function removePreference(id: string): boolean {
  const store = getStore()
  const index = store.preferences.findIndex(p => p.id === id)
  if (index > -1) {
    store.preferences.splice(index, 1)
    saveStore(store)
    return true
  }
  return false
}

/**
 * 清空所有偏好
 */
export function clearAllPreferences(): void {
  const store = getStore()
  store.preferences = []
  saveStore(store)
}

// ==================== 进化候选收集 ====================

/**
 * 生成唯一ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 检测输入中的触发关键词
 */
export function detectTriggerKeywords(input: string): {
  hasTrigger: boolean
  triggers: string[]
  isHighValue: boolean
} {
  const lowerInput = input.toLowerCase()
  const triggers: string[] = []
  
  for (const keyword of TRIGGER_KEYWORDS) {
    if (lowerInput.includes(keyword)) {
      triggers.push(keyword)
    }
  }
  
  const highValueTriggers: string[] = []
  for (const keyword of HIGH_VALUE_TRIGGERS) {
    if (lowerInput.includes(keyword)) {
      highValueTriggers.push(keyword)
    }
  }
  
  return {
    hasTrigger: triggers.length > 0,
    triggers: [...triggers, ...highValueTriggers],
    isHighValue: highValueTriggers.length > 0,
  }
}

/**
 * 分析用户输入是否包含偏好表达
 */
export function analyzeUserPreference(
  input: string,
  context?: { previousOutput?: string; userFeedback?: 'positive' | 'negative' | null }
): EvolutionCandidate | null {
  const trigger = detectTriggerKeywords(input)
  const lowerInput = input.toLowerCase()
  
  // 优先检测明确的触发词
  if (trigger.hasTrigger) {
    let category: PreferenceType = 'custom'
    let key = ''
    let value = ''
    let reason = ''
    
    // 检测文案风格偏好
    for (const style of PREFERENCE_KEYWORDS.text_style) {
      if (lowerInput.includes(style)) {
        category = 'text_style'
        key = 'preferred_text_style'
        value = style.replace('风格', '')
        reason = `用户在输入中表达了文案风格偏好：${style}`
        break
      }
    }
    
    // 检测图片风格偏好
    if (category === 'custom') {
      for (const style of PREFERENCE_KEYWORDS.image_style) {
        if (lowerInput.includes(style)) {
          category = 'image_style'
          key = 'preferred_image_style'
          value = style
          reason = `用户在输入中表达了图片风格偏好：${style}`
          break
        }
      }
    }
    
    // 检测长度偏好
    if (category === 'custom') {
      for (const keyword of ['长一点', '详细', '多一些']) {
        if (lowerInput.includes(keyword)) {
          category = 'content_length'
          key = 'preferred_length'
          value = 'long'
          reason = '用户希望内容更详细'
          break
        }
      }
      for (const keyword of ['短一点', '简洁', '少一些']) {
        if (lowerInput.includes(keyword)) {
          category = 'content_length'
          key = 'preferred_length'
          value = 'short'
          reason = '用户希望内容更简洁'
          break
        }
      }
    }
    
    // 检测语气偏好
    if (category === 'custom') {
      for (const tone of ['正式', '活泼', '严肃', '轻松', '幽默', '专业']) {
        if (lowerInput.includes(tone)) {
          category = 'tone'
          key = 'preferred_tone'
          value = tone
          reason = `用户偏好${tone}的语气`
          break
        }
      }
    }
    
    // 检测国学元素偏好
    if (category === 'custom') {
      for (const element of PREFERENCE_KEYWORDS.cultural_element) {
        if (lowerInput.includes(element)) {
          category = 'cultural_element'
          key = 'preferred_culture'
          value = element
          reason = `用户对${element}内容感兴趣`
          break
        }
      }
    }
    
    // 通用偏好检测（"以后"、"记住"等）
    if (category === 'custom' && trigger.hasTrigger) {
      // 提取用户表达的核心需求
      const patterns = [
        /(?:以后|记住|喜欢|不要)\s*(.+?)(?:\s|$)/gi,
        /请?\s*(?:以后|记住)\s*(.+?)(?:\s|$)/gi,
      ]
      
      for (const pattern of patterns) {
        const match = pattern.exec(input)
        if (match && match[1]) {
          category = 'custom'
          key = 'custom_preference'
          value = match[1].trim()
          reason = `用户表达了偏好：${match[1].trim()}`
          break
        }
      }
    }
    
    if (key) {
      return {
        id: generateId('candidate'),
        type: 'user_preference',
        trigger: trigger.isHighValue ? 'keyword' : 'frequency',
        triggerKeywords: trigger.triggers,
        content: JSON.stringify({ category, key, value }),
        reason,
        suggestedAction: `建议记忆为用户${category}偏好：${value}`,
        source: 'user_input',
        confidence: trigger.isHighValue ? 0.9 : 0.7,
        createdAt: new Date().toISOString(),
      }
    }
  }
  
  // 检测生成质量反馈
  if (context?.userFeedback) {
    return {
      id: generateId('candidate'),
      type: 'generation_quality',
      trigger: 'feedback',
      content: context.userFeedback === 'positive' 
        ? '用户对生成结果满意' 
        : '用户对生成结果不满意',
      reason: `用户反馈：${context.userFeedback === 'positive' ? '👍 满意' : '👎 不满意'}`,
      suggestedAction: context.userFeedback === 'negative'
        ? '建议分析不满意原因，优化生成策略'
        : '记录本次成功的生成参数',
      source: 'user_feedback',
      confidence: 0.95,
      qualityScore: context.userFeedback === 'positive' ? 8 : 4,
      createdAt: new Date().toISOString(),
    }
  }
  
  return null
}

/**
 * 收集进化候选
 */
export function collectEvolutionCandidate(
  type: EvolutionCandidate['type'],
  content: string,
  source: string,
  options?: Partial<EvolutionCandidate>
): EvolutionCandidate {
  const candidate: EvolutionCandidate = {
    id: generateId('candidate'),
    type,
    trigger: options?.trigger || 'auto',
    triggerKeywords: options?.triggerKeywords,
    content,
    reason: options?.reason || '',
    suggestedAction: options?.suggestedAction || '',
    source,
    confidence: options?.confidence || 0.7,
    qualityScore: options?.qualityScore,
    createdAt: new Date().toISOString(),
    expiresAt: options?.expiresAt,
  }
  
  const store = getStore()
  // 检查是否已存在相似的候选
  const existing = store.evolutionRequests.find(
    req => req.candidate.type === type && 
           req.candidate.content === content &&
           req.status === 'pending'
  )
  
  if (!existing) {
    const request: EvolutionRequest = {
      id: generateId('request'),
      candidate,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    store.evolutionRequests.push(request)
    saveStore(store)
  }
  
  return candidate
}

/**
 * 获取待处理的进化请求
 */
export function getPendingEvolutionRequests(): EvolutionRequest[] {
  return getStore().evolutionRequests.filter(req => req.status === 'pending')
}

// ==================== 进化审批流程 ====================

/**
 * 批准进化请求
 */
export function approveEvolution(requestId: string): Evolution | null {
  const store = getStore()
  const request = store.evolutionRequests.find(r => r.id === requestId)
  
  if (!request || request.status !== 'pending') {
    return null
  }
  
  // 解析候选内容
  let parsed = { category: '', key: '', value: '' }
  try {
    parsed = JSON.parse(request.candidate.content)
  } catch {
    parsed = { category: request.candidate.type, key: 'custom', value: request.candidate.content }
  }
  
  // 创建进化记录
  const evolution: Evolution = {
    id: generateId('evolution'),
    type: request.candidate.type === 'user_preference' ? 'preference' : 
          request.candidate.type === 'knowledge_feedback' ? 'knowledge' : 'memory',
    category: parsed.category,
    key: parsed.key,
    value: parsed.value,
    reason: request.candidate.reason,
    source: request.candidate.source,
    appliedAt: new Date().toISOString(),
    rollbackable: true,
  }
  
  // 应用偏好
  if (request.candidate.type === 'user_preference') {
    const prefType = parsed.category as PreferenceType
    addOrUpdatePreference(prefType, parsed.key, parsed.value, 'implicit')
  }
  
  // 更新请求状态
  request.status = 'approved'
  request.userResponse = 'approved'
  request.approvedAt = new Date().toISOString()
  request.suggestedEvolution = evolution
  
  // 保存进化记录
  store.appliedEvolutions.push(evolution)
  
  // 更新记忆文件
  updateMemoryFile(evolution)
  
  saveStore(store)
  return evolution
}

/**
 * 拒绝进化请求
 */
export function rejectEvolution(requestId: string): boolean {
  const store = getStore()
  const request = store.evolutionRequests.find(r => r.id === requestId)
  
  if (!request || request.status !== 'pending') {
    return false
  }
  
  request.status = 'rejected'
  request.userResponse = 'rejected'
  request.rejectedAt = new Date().toISOString()
  
  saveStore(store)
  return true
}

/**
 * 修改后批准进化请求
 */
export function modifyAndApproveEvolution(
  requestId: string,
  modifiedContent: string
): Evolution | null {
  const store = getStore()
  const request = store.evolutionRequests.find(r => r.id === requestId)
  
  if (!request || request.status !== 'pending') {
    return null
  }
  
  // 创建修改后的进化
  const evolution: Evolution = {
    id: generateId('evolution'),
    type: 'preference',
    category: 'custom',
    key: 'modified_preference',
    value: modifiedContent,
    reason: `用户修改后批准：${modifiedContent}`,
    source: 'user_modified',
    appliedAt: new Date().toISOString(),
    rollbackable: true,
  }
  
  // 应用修改后的偏好
  addOrUpdatePreference('custom', 'modified', modifiedContent, 'explicit')
  
  // 更新请求状态
  request.status = 'modified'
  request.userResponse = 'modified'
  request.modifiedContent = modifiedContent
  request.approvedAt = new Date().toISOString()
  request.suggestedEvolution = evolution
  
  // 保存进化记录
  store.appliedEvolutions.push(evolution)
  
  // 更新记忆文件
  updateMemoryFile(evolution)
  
  saveStore(store)
  return evolution
}

/**
 * 回滚进化
 */
export function rollbackEvolution(evolutionId: string, reason: string): boolean {
  const store = getStore()
  const evolution = store.appliedEvolutions.find(e => e.id === evolutionId)
  
  if (!evolution || !evolution.rollbackable) {
    return false
  }
  
  // 保存回滚信息
  const rollbackInfo = {
    rolledBackAt: new Date().toISOString(),
    reason,
    restoredValue: evolution.value,
  }
  
  evolution.rollbacks = evolution.rollbacks || []
  evolution.rollbacks.push(rollbackInfo)
  
  // 如果是偏好，回滚到之前的状态
  if (evolution.type === 'preference') {
    const prefs = store.preferences.filter(p => p.key === evolution.key)
    prefs.forEach(p => store.preferences.splice(store.preferences.indexOf(p), 1))
  }
  
  saveStore(store)
  return true
}

// ==================== 记忆文件管理 ====================

/**
 * 获取记忆文件内容
 */
export function getMemoryFile(name: keyof MemoryFiles): string {
  const store = getStore()
  return store.memoryFiles[name] || ''
}

/**
 * 更新记忆文件
 */
function updateMemoryFile(evolution: Evolution): void {
  const store = getStore()
  
  switch (evolution.type) {
    case 'preference':
      store.memoryFiles.PREFERENCES = (store.memoryFiles.PREFERENCES || '') + 
        `\n- ${evolution.reason}：${evolution.value}（${evolution.appliedAt}）`
      break
    case 'knowledge':
      store.memoryFiles.KNOWLEDGE = (store.memoryFiles.KNOWLEDGE || '') + 
        `\n- ${evolution.reason}：${evolution.value}（${evolution.appliedAt}）`
      break
    case 'memory':
      store.memoryFiles.MEMORY = (store.memoryFiles.MEMORY || '') + 
        `\n- ${evolution.reason}（${evolution.appliedAt}）`
      break
  }
  
  saveStore(store)
}

/**
 * 获取所有记忆文件
 */
export function getAllMemoryFiles(): MemoryFiles {
  return getStore().memoryFiles
}

// ==================== 知识库质量跟踪 ====================

/**
 * 记录知识元素使用情况
 */
export function recordKnowledgeUsage(
  elementId: string,
  elementType: 'strategy' | 'idiom' | 'figure' | 'image' | 'visual_style',
  feedback?: 'positive' | 'negative',
  score?: number
): void {
  const store = getStore()
  
  if (!store.knowledgeQualityScores[elementId]) {
    store.knowledgeQualityScores[elementId] = {
      elementId,
      elementType,
      usageCount: 0,
      positiveFeedback: 0,
      negativeFeedback: 0,
      averageScore: 0,
      lastUsedAt: new Date().toISOString(),
      status: 'active',
    }
  }
  
  const record = store.knowledgeQualityScores[elementId]
  record.usageCount++
  record.lastUsedAt = new Date().toISOString()
  
  if (feedback === 'positive') {
    record.positiveFeedback++
  } else if (feedback === 'negative') {
    record.negativeFeedback++
  }
  
  if (score !== undefined) {
    const total = record.positiveFeedback + record.negativeFeedback
    record.averageScore = total > 0 
      ? (record.averageScore * (total - 1) + score) / total
      : score
  }
  
  // 评估状态
  if (record.negativeFeedback > 3 || record.averageScore < 5) {
    record.status = 'pending_review'
  }
  
  saveStore(store)
}

/**
 * 获取低评分知识元素
 */
export function getLowQualityKnowledge(limit: number = 10): KnowledgeQualityScore[] {
  const scores = Object.values(getStore().knowledgeQualityScores)
  return scores
    .filter(s => s.status === 'pending_review' || s.averageScore < 6)
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, limit)
}

/**
 * 生成知识库优化提案
 */
export function generateKnowledgeProposal(): string {
  const lowQuality = getLowQualityKnowledge()
  const store = getStore()
  
  const proposals: string[] = []
  const date = new Date().toISOString().split('T')[0]
  
  proposals.push(`# 知识库优化提案\n`)
  proposals.push(`生成日期：${date}\n`)
  proposals.push(`待优化元素数量：${lowQuality.length}\n\n`)
  
  if (lowQuality.length > 0) {
    proposals.push(`## 待优化元素\n\n`)
    lowQuality.forEach((item, index) => {
      proposals.push(`${index + 1}. **${item.elementId}** (${item.elementType})\n`)
      proposals.push(`   - 使用次数：${item.usageCount}\n`)
      proposals.push(`   - 好评：${item.positiveFeedback} | 差评：${item.negativeFeedback}\n`)
      proposals.push(`   - 平均评分：${item.averageScore.toFixed(1)}\n`)
      proposals.push(`   - 最后使用：${item.lastUsedAt}\n`)
    })
  } else {
    proposals.push(`## 状态\n\n知识库质量良好，无需优化。\n`)
  }
  
  return proposals.join('')
}

// ==================== 统计与报告 ====================

/**
 * 获取进化统计
 */
export function getEvolutionStats(): EvolutionStats {
  const store = getStore()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const weeklyEvolution = store.appliedEvolutions.filter(
    e => new Date(e.appliedAt) > weekAgo
  ).length
  
  const knowledgeScores = Object.values(store.knowledgeQualityScores)
  const avgKnowledgeAccuracy = knowledgeScores.length > 0
    ? knowledgeScores.reduce((sum, s) => sum + s.averageScore, 0) / knowledgeScores.length
    : 100
  
  return {
    totalLearned: store.appliedEvolutions.length,
    pendingRequests: store.evolutionRequests.filter(r => r.status === 'pending').length,
    weeklyEvolution,
    knowledgeAccuracy: avgKnowledgeAccuracy,
    userSatisfaction: store.preferences.length > 0 
      ? (store.preferences.reduce((sum, p) => sum + p.confidence, 0) / store.preferences.length) * 100
      : 100,
  }
}

/**
 * 获取进化历史
 */
export function getEvolutionHistory(limit: number = 20): Evolution[] {
  return getStore().appliedEvolutions
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    .slice(0, limit)
}

/**
 * 清除所有进化数据
 */
export function clearAllEvolutionData(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(MEMORY_DIR_KEY)
}

/**
 * 导出进化数据（用于备份或迁移）
 */
export function exportEvolutionData(): string {
  const store = getStore()
  return JSON.stringify(store, null, 2)
}

/**
 * 导入进化数据
 */
export function importEvolutionData(data: string): boolean {
  try {
    const parsed = JSON.parse(data) as LocalEvolutionStore
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    return true
  } catch {
    return false
  }
}

// ==================== 初始化 ====================

/**
 * 初始化存储（如果不存在）
 */
export function initializeStore(): void {
  const store = getStore()
  if (!store.memoryFiles.SOUL) {
    const defaultData = defaultStore()
    store.memoryFiles = defaultData.memoryFiles
    store.lastSyncAt = new Date().toISOString()
    saveStore(store)
  }
}

// 导出单例初始化
export const initEvolution = initializeStore
