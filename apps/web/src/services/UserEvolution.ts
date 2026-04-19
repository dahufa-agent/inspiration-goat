/**
 * 用户进化机制 - 数据结构定义
 * 参考智谱AutoClaw自进化机制设计
 */

// 用户偏好类型
export interface UserPreference {
  id: string
  type: PreferenceType
  key: string
  value: string
  source: 'explicit' | 'implicit' | 'feedback'
  createdAt: string
  updatedAt: string
  frequency: number
  confidence: number
}

// 偏好类型枚举
export type PreferenceType = 
  | 'text_style'      // 文案风格偏好
  | 'image_style'      // 图片风格偏好
  | 'content_length'   // 内容长度偏好
  | 'tone'             // 语气偏好
  | 'topic'            // 话题偏好
  | 'cultural_element' // 国学元素偏好
  | 'generation_quality' // 生成质量偏好
  | 'custom'           // 自定义偏好

// 进化候选类型
export interface EvolutionCandidate {
  id: string
  type: 'user_preference' | 'knowledge_feedback' | 'generation_quality' | 'lessons_learned'
  trigger: 'keyword' | 'frequency' | 'feedback' | 'auto'
  triggerKeywords?: string[]
  content: string
  reason: string
  suggestedAction: string
  source: string
  confidence: number
  qualityScore?: number
  createdAt: string
  expiresAt?: string
}

// 进化请求（待审批）
export interface EvolutionRequest {
  id: string
  candidate: EvolutionCandidate
  status: 'pending' | 'approved' | 'rejected' | 'modified'
  suggestedEvolution?: Evolution
  userResponse?: 'approved' | 'rejected' | 'modified' | null
  modifiedContent?: string
  approvedAt?: string
  rejectedAt?: string
  createdAt: string
}

// 已应用的进化
export interface Evolution {
  id: string
  type: 'preference' | 'knowledge' | 'memory' | 'soul'
  category: string
  key: string
  value: string
  reason: string
  source: string
  appliedAt: string
  rollbackable: boolean
  rollbacks?: RollbackInfo[]
}

// 回滚信息
export interface RollbackInfo {
  rolledBackAt: string
  reason: string
  restoredValue?: string
}

// 记忆文件结构（类比AutoClaw的MD文件驱动）
export interface MemoryFiles {
  SOUL?: string      // Agent人格定义
  USER?: string      // 用户画像档案
  PREFERENCES?: string // 用户偏好记忆
  KNOWLEDGE?: string   // 知识补充
  LESSONS?: string     // 踩坑记录
  MEMORY?: string      // 长期记忆精华
}

// 知识库质量评分
export interface KnowledgeQualityScore {
  elementId: string
  elementType: 'strategy' | 'idiom' | 'figure' | 'image' | 'visual_style'
  usageCount: number
  positiveFeedback: number
  negativeFeedback: number
  averageScore: number
  lastUsedAt: string
  status: 'active' | 'pending_review' | 'deprecated'
  improvement?: string
}

// 本地存储结构
export interface LocalEvolutionStore {
  preferences: UserPreference[]
  evolutionRequests: EvolutionRequest[]
  appliedEvolutions: Evolution[]
  knowledgeQualityScores: Record<string, KnowledgeQualityScore>
  memoryFiles: MemoryFiles
  lastSyncAt: string
  evolutionSensitivity: 'strict' | 'standard' | 'loose'
}

// 进化统计
export interface EvolutionStats {
  totalLearned: number
  pendingRequests: number
  weeklyEvolution: number
  knowledgeAccuracy: number
  userSatisfaction: number
}

// 偏好关键词映射（用于自动识别用户偏好）
export const PREFERENCE_KEYWORDS: Record<PreferenceType, string[]> = {
  text_style: ['小红书风格', '抖音风格', '微博风格', '文案风格', '更简洁', '更详细'],
  image_style: ['写实摄影', '插画', '动漫', '水墨', '敦煌', '工笔'],
  content_length: ['长一点', '短一点', '详细', '简洁', '控制在', '字数'],
  tone: ['正式', '活泼', '严肃', '轻松', '幽默', '专业'],
  topic: ['国学', '风水', '养生', '命理', '易经', '诗词'],
  cultural_element: ['三十六计', '易经', '诗词', '典故', '成语'],
  generation_quality: ['不满意', '很好', '一般', '优化', '改进'],
  custom: ['以后', '记住', '喜欢', '不要', '一直', '永远'],
}

// 触发关键词
export const TRIGGER_KEYWORDS = [
  '以后', '记住', '喜欢', '不要', '一直', '永远',
  '能不能', '可否', '能不能', '下次', '每次',
  '请记住', '以后都', '以后要', '记得要'
]

// 高价值触发词（自动检测）
export const HIGH_VALUE_TRIGGERS = [
  '我想要', '我需要', '我习惯', '我偏好',
  '最好能', '麻烦', '请务必', '重要'
]
