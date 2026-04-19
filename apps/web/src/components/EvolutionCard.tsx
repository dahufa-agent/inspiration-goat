/**
 * 进化请求卡片组件
 * 展示待批准的进化内容，提供批准/拒绝/修改按钮
 */

import React, { useState, useEffect } from 'react'
import { EvolutionRequest } from '../services/UserEvolution'

interface EvolutionCardProps {
  request: EvolutionRequest
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onModify: (id: string, modified: string) => void
  onDismiss?: (id: string) => void
}

const EvolutionCard: React.FC<EvolutionCardProps> = ({
  request,
  onApprove,
  onReject,
  onModify,
  onDismiss,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [modifiedContent, setModifiedContent] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  
  const { candidate } = request
  
  // 获取类型对应的图标和颜色
  const getTypeConfig = () => {
    switch (candidate.type) {
      case 'user_preference':
        return { icon: '🎯', color: 'from-blue-500 to-cyan-500', label: '用户偏好' }
      case 'knowledge_feedback':
        return { icon: '📚', color: 'from-purple-500 to-pink-500', label: '知识反馈' }
      case 'generation_quality':
        return { icon: '✨', color: 'from-amber-500 to-orange-500', label: '生成质量' }
      case 'lessons_learned':
        return { icon: '💡', color: 'from-green-500 to-emerald-500', label: '经验总结' }
      default:
        return { icon: '🌱', color: 'from-gray-500 to-gray-600', label: '其他' }
    }
  }
  
  const typeConfig = getTypeConfig()
  
  // 解析内容
  const parseContent = (): { display: string; details?: string } => {
    try {
      const parsed = JSON.parse(candidate.content)
      return { 
        display: parsed.value || candidate.content,
        details: parsed.reason || candidate.reason
      }
    } catch {
      return { display: candidate.content }
    }
  }
  
  const content = parseContent()
  
  const handleModify = () => {
    if (modifiedContent.trim()) {
      onModify(request.id, modifiedContent.trim())
      setIsEditing(false)
    }
  }
  
  const triggerLabel = candidate.triggerKeywords?.length 
    ? `触发词：${candidate.triggerKeywords.join('、')}`
    : `触发方式：${candidate.trigger}`
  
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
      {/* 头部 */}
      <div className={`bg-gradient-to-r ${typeConfig.color} px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeConfig.icon}</span>
          <div>
            <span className="text-white font-bold">{typeConfig.label}</span>
            <span className="text-white/80 text-sm ml-2">· {candidate.confidence.toFixed(0)}% 置信度</span>
          </div>
        </div>
        <button 
          onClick={() => onDismiss?.(request.id)}
          className="text-white/80 hover:text-white transition-colors p-1"
        >
          ✕
        </button>
      </div>
      
      {/* 内容区 */}
      <div className="p-5">
        {/* 主要内容 */}
        <div className="mb-4">
          <p className="text-gray-800 font-medium text-lg mb-2">
            💭 {content.display}
          </p>
          {content.details && (
            <p className="text-gray-500 text-sm">
              原因：{content.details}
            </p>
          )}
        </div>
        
        {/* 触发信息 */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <span className="px-2 py-1 bg-gray-100 rounded-full">{triggerLabel}</span>
          <span>|</span>
          <span>{candidate.source}</span>
          <span>|</span>
          <span>{new Date(request.createdAt).toLocaleString('zh-CN')}</span>
        </div>
        
        {/* 建议操作 */}
        {candidate.suggestedAction && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 mb-4">
            <p className="text-amber-700 text-sm">
              💡 <span className="font-medium">建议：</span>{candidate.suggestedAction}
            </p>
          </div>
        )}
        
        {/* 质量评分 */}
        {candidate.qualityScore !== undefined && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">质量评分：</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star}
                  className={`text-lg ${star <= Math.round(candidate.qualityScore! / 2) ? 'text-amber-400' : 'text-gray-300'}`}
                >
                  ★
                </span>
              ))}
              <span className="text-sm text-gray-500 ml-1">({candidate.qualityScore}/10)</span>
            </div>
          </div>
        )}
        
        {/* 修改输入框 */}
        {isEditing ? (
          <div className="mb-4">
            <textarea
              value={modifiedContent}
              onChange={(e) => setModifiedContent(e.target.value)}
              placeholder="输入你想要的内容..."
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-purple-200 focus:border-purple-400 focus:outline-none resize-none text-gray-700"
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleModify}
                className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                确认修改
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-300 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onApprove(request.id)}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg">✓</span>
              <span>批准学习</span>
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg">✎</span>
              <span>修改后学习</span>
            </button>
            <button
              onClick={() => onReject(request.id)}
              className="px-4 py-3 bg-gray-100 text-gray-500 rounded-xl font-medium hover:bg-gray-200 transition-all"
            >
              忽略
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// 进化统计卡片
interface EvolutionStatsCardProps {
  totalLearned: number
  pendingRequests: number
  weeklyEvolution: number
  knowledgeAccuracy: number
  userSatisfaction: number
}

export const EvolutionStatsCard: React.FC<EvolutionStatsCardProps> = ({
  totalLearned,
  pendingRequests,
  weeklyEvolution,
  knowledgeAccuracy,
  userSatisfaction,
}) => {
  return (
    <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🌱</span>
        <div>
          <h3 className="font-bold text-lg">灵感山羊进化中</h3>
          <p className="text-white/70 text-sm">越用越懂你</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{totalLearned}</p>
          <p className="text-xs text-white/80">已学习</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{pendingRequests}</p>
          <p className="text-xs text-white/80">待审批</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{weeklyEvolution}</p>
          <p className="text-xs text-white/80">本周进化</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{knowledgeAccuracy.toFixed(0)}%</p>
          <p className="text-xs text-white/80">知识准确</p>
        </div>
      </div>
    </div>
  )
}

// 进化历史项
interface EvolutionHistoryItemProps {
  evolution: {
    id: string
    reason: string
    value: string
    appliedAt: string
    category: string
  }
  onRollback?: (id: string) => void
}

export const EvolutionHistoryItem: React.FC<EvolutionHistoryItemProps> = ({
  evolution,
  onRollback,
}) => {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">✅</span>
          <div>
            <p className="text-gray-800 font-medium text-sm">{evolution.reason}</p>
            <p className="text-gray-400 text-xs">{evolution.value}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {new Date(evolution.appliedAt).toLocaleDateString('zh-CN')}
          </span>
          <span className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </div>
      
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-50">
          <div className="flex gap-2 mt-3">
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
              {evolution.category}
            </span>
            <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-full text-xs">
              {evolution.value}
            </span>
          </div>
          {onRollback && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRollback(evolution.id)
              }}
              className="mt-3 text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              撤销这次学习
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default EvolutionCard
