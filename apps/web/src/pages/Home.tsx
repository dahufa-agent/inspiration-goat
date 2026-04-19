import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import EvolutionCard, { EvolutionStatsCard, EvolutionHistoryItem } from '../components/EvolutionCard'
import {
  initEvolution,
  getPendingEvolutionRequests,
  getEvolutionStats,
  getEvolutionHistory,
  approveEvolution,
  rejectEvolution,
  modifyAndApproveEvolution,
  rollbackEvolution,
  detectTriggerKeywords,
  analyzeUserPreference,
} from '../services/preferenceStore'

const GOAT_MASCOT = "/goat-mascot.png"

const Home: React.FC = () => {
  const { user } = useAuth()
  const [idea, setIdea] = useState('')
  const [mode, setMode] = useState<'fast' | 'quality'>('fast')
  const [selectedTextStyle, setSelectedTextStyle] = useState('xiaohongshu')
  const [selectedImageStyle, setSelectedImageStyle] = useState('realistic')
  const [selectedCategory, setSelectedCategory] = useState('scenery')
  const [selectedDuration, setSelectedDuration] = useState('free')
  
  // 进化相关状态
  const [pendingRequests, setPendingRequests] = useState(getPendingEvolutionRequests())
  const [evolutionStats, setEvolutionStats] = useState(getEvolutionStats())
  const [evolutionHistory, setEvolutionHistory] = useState(getEvolutionHistory())
  const [showEvolutionPanel, setShowEvolutionPanel] = useState(false)
  const [hasNewEvolution, setHasNewEvolution] = useState(false)

  // 初始化进化存储
  useEffect(() => {
    initEvolution()
    refreshEvolutionData()
  }, [])

  // 刷新进化数据
  const refreshEvolutionData = () => {
    setPendingRequests(getPendingEvolutionRequests())
    setEvolutionStats(getEvolutionStats())
    setEvolutionHistory(getEvolutionHistory())
  }

  // 处理用户输入中的偏好检测
  const handleIdeaChange = (value: string) => {
    setIdea(value)
    
    // 检测触发关键词
    const trigger = detectTriggerKeywords(value)
    if (trigger.hasTrigger) {
      const candidate = analyzeUserPreference(value)
      if (candidate) {
        setHasNewEvolution(true)
        refreshEvolutionData()
      }
    }
  }

  // 批准进化
  const handleApprove = (requestId: string) => {
    approveEvolution(requestId)
    refreshEvolutionData()
  }

  // 拒绝进化
  const handleReject = (requestId: string) => {
    rejectEvolution(requestId)
    refreshEvolutionData()
  }

  // 修改后批准
  const handleModify = (requestId: string, modified: string) => {
    modifyAndApproveEvolution(requestId, modified)
    refreshEvolutionData()
  }

  // 撤销进化
  const handleRollback = (evolutionId: string) => {
    rollbackEvolution(evolutionId, '用户手动撤销')
    refreshEvolutionData()
  }

  const textStyles = [
    { id: 'xiaohongshu', name: '小红书', icon: '📕', gradient: 'from-red-500 to-pink-500' },
    { id: 'douyin', name: '抖音', icon: '🎵', gradient: 'from-pink-500 to-purple-500' },
    { id: 'weibo', name: '微博', icon: '✉️', gradient: 'from-orange-500 to-yellow-500' },
  ]

  const imageStyles = [
    { id: 'realistic', name: '写实摄影', icon: '📷', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'illustration', name: '商业插画', icon: '🎨', gradient: 'from-purple-500 to-pink-500' },
    { id: 'anime', name: '动漫风', icon: '🌸', gradient: 'from-pink-500 to-rose-500' },
  ]

  const categories = [
    { id: 'scenery', name: '风景', icon: '🏞️' },
    { id: 'portrait', name: '人像', icon: '👤' },
    { id: 'food', name: '美食', icon: '🍜' },
  ]

  const durations = [
    { type: 'free', label: '5秒', price: '免费', desc: '每日10次', bg: 'bg-green-100', text: 'text-green-600' },
    { type: 'paid5', label: '10秒', price: '10积分', desc: '每+5秒+10积分', bg: 'bg-amber-100', text: 'text-amber-600' },
    { type: 'paid10', label: '15秒', price: '20积分', desc: '每+10秒+20积分', bg: 'bg-amber-100', text: 'text-amber-600' },
    { type: 'paid15', label: '20秒', price: '30积分', desc: '每+15秒+30积分', bg: 'bg-red-100', text: 'text-red-600' },
  ]

  const handleGenerate = () => {
    if (!idea.trim()) {
      alert('请输入你的创意想法')
      return
    }
    if (!user) {
      window.location.href = '/login'
    } else {
      alert('功能开发中...')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={GOAT_MASCOT} alt="灵感山羊" className="w-12 h-12 rounded-2xl shadow-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">你好，创意家</h1>
                <p className="text-xs text-gray-500">一键生成创意内容</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* 进化状态按钮 */}
              <button
                onClick={() => {
                  setShowEvolutionPanel(!showEvolutionPanel)
                  setHasNewEvolution(false)
                }}
                className={`relative p-2 rounded-xl transition-all ${
                  showEvolutionPanel 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-xl">🌱</span>
                {pendingRequests.length > 0 && (
                  <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                    hasNewEvolution 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-amber-500 text-white'
                  }`}>
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {(user as any).username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm text-gray-600 hidden sm:block">{(user as any).username || '用户'}</span>
                </div>
              ) : (
                <>
                  <Link to="/login" className="px-5 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-105">
                    登录
                  </Link>
                  <Link to="/register" className="px-5 py-2 text-sm text-purple-600 hover:text-purple-700 font-semibold transition-colors">
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 进化面板 */}
      {showEvolutionPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden">
            {/* 面板头部 */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌱</span>
                <div>
                  <h2 className="text-white font-bold text-lg">灵感山羊进化中心</h2>
                  <p className="text-white/70 text-sm">越用越懂你</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEvolutionPanel(false)}
                className="text-white/80 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            
            {/* 面板内容 */}
            <div className="p-6 overflow-y-auto max-h-[calc(70vh-80px)]">
              {/* 统计卡片 */}
              <EvolutionStatsCard
                totalLearned={evolutionStats.totalLearned}
                pendingRequests={evolutionStats.pendingRequests}
                weeklyEvolution={evolutionStats.weeklyEvolution}
                knowledgeAccuracy={evolutionStats.knowledgeAccuracy}
                userSatisfaction={evolutionStats.userSatisfaction}
              />
              
              {/* 待审批进化 */}
              {pendingRequests.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    待审批进化 ({pendingRequests.length})
                  </h3>
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <EvolutionCard
                        key={request.id}
                        request={request}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onModify={handleModify}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* 进化历史 */}
              {evolutionHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📜</span>
                    最近学习 ({evolutionHistory.length})
                  </h3>
                  <div className="space-y-2">
                    {evolutionHistory.slice(0, 5).map((evolution) => (
                      <EvolutionHistoryItem
                        key={evolution.id}
                        evolution={evolution}
                        onRollback={handleRollback}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* 空状态 */}
              {pendingRequests.length === 0 && evolutionHistory.length === 0 && (
                <div className="text-center py-12">
                  <span className="text-6xl block mb-4">🌱</span>
                  <p className="text-gray-500">还没有学习记录</p>
                  <p className="text-gray-400 text-sm mt-2">继续使用，山羊会越来越懂你</p>
                </div>
              )}
              
              {/* 提示 */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                <p className="text-blue-700 text-sm">
                  💡 <span className="font-medium">小技巧：</span>说"以后都要..."、"记住我更喜欢..."等词语，山羊会自动学习你的偏好！
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center py-10">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
            🎨 释放创意
          </h2>
          <p className="text-gray-500 text-lg">AI赋能，让你的想法变成现实</p>
        </div>

        {/* 进化通知条幅 */}
        {pendingRequests.length > 0 && !showEvolutionPanel && (
          <div 
            onClick={() => setShowEvolutionPanel(true)}
            className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌱</span>
              <div>
                <p className="text-white font-bold">灵感山羊想要学习新知识</p>
                <p className="text-white/80 text-sm">{pendingRequests.length}个新进化待你审批</p>
              </div>
            </div>
            <span className="text-white text-2xl">→</span>
          </div>
        )}

        {/* Idea Input Card */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💡</span>
            <h3 className="text-lg font-bold text-gray-800">你的创意想法</h3>
          </div>
          <div className="relative">
            <textarea
              value={idea}
              onChange={(e) => handleIdeaChange(e.target.value)}
              placeholder="描述你的创意：海边日落、可爱猫咪、产品宣传、节日祝福..."
              rows={3}
              className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-200 transition-all text-base resize-none border-2 border-transparent focus:border-purple-300"
            />
          </div>
          {/* 偏好检测提示 */}
          {detectTriggerKeywords(idea).hasTrigger && (
            <div className="mt-3 flex items-center gap-2 text-sm text-purple-600">
              <span className="animate-pulse">✨</span>
              <span>检测到偏好表达，正在分析...</span>
            </div>
          )}
        </section>

        {/* Mode Selection */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <h3 className="text-lg font-bold text-gray-800">生成模式</h3>
            </div>
            <button className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
              竞品对比 <span>→</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('fast')}
              className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                mode === 'fast' 
                  ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg shadow-green-500/20' 
                  : 'border-gray-100 bg-gray-50 hover:border-green-200 hover:bg-green-50'
              }`}
            >
              {mode === 'fast' && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg">✓</div>
              )}
              <div className="text-4xl mb-3">⚡</div>
              <p className={`text-lg font-bold ${mode === 'fast' ? 'text-green-600' : 'text-gray-700'}`}>极速模式</p>
              <p className="text-sm text-gray-400 mt-1">≤60秒</p>
            </button>
            <button
              onClick={() => setMode('quality')}
              className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                mode === 'quality' 
                  ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg shadow-purple-500/20' 
                  : 'border-gray-100 bg-gray-50 hover:border-purple-200 hover:bg-purple-50'
              }`}
            >
              {mode === 'quality' && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg">✓</div>
              )}
              <div className="text-4xl mb-3">💎</div>
              <p className={`text-lg font-bold ${mode === 'quality' ? 'text-purple-600' : 'text-gray-700'}`}>高质量模式</p>
              <p className="text-sm text-gray-400 mt-1">~120秒</p>
            </button>
          </div>
        </section>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          className="w-full py-5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white font-bold text-xl rounded-2xl shadow-xl shadow-green-500/40 hover:shadow-green-500/60 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <span className="text-2xl">✨</span>
          <span>一键生成全部</span>
          <span className="text-2xl">🚀</span>
        </button>

        {/* Style Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Text Style */}
          <section className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">📝</span>
              <h3 className="text-lg font-bold text-gray-800">文案风格</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {textStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedTextStyle(style.id)}
                  className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                    selectedTextStyle === style.id 
                      ? `border-transparent bg-gradient-to-br ${style.gradient} text-white shadow-lg transform scale-105` 
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:shadow-md'
                  }`}
                >
                  <span className="text-3xl block mb-2">{style.icon}</span>
                  <span className={`text-sm font-semibold ${selectedTextStyle === style.id ? 'text-white' : 'text-gray-700'}`}>{style.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Image Style */}
          <section className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">🎨</span>
              <h3 className="text-lg font-bold text-gray-800">图片风格</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {imageStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedImageStyle(style.id)}
                  className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                    selectedImageStyle === style.id 
                      ? `border-transparent bg-gradient-to-br ${style.gradient} text-white shadow-lg transform scale-105` 
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:shadow-md'
                  }`}
                >
                  <span className="text-3xl block mb-2">{style.icon}</span>
                  <span className={`text-sm font-semibold ${selectedImageStyle === style.id ? 'text-white' : 'text-gray-700'}`}>{style.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Quick Templates */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              <h3 className="text-lg font-bold text-gray-800">快速模板</h3>
            </div>
            <button className="text-sm text-purple-600 font-medium flex items-center gap-1">
              更多风格 <span>→</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-5 rounded-2xl border-2 transition-all duration-300 ${
                  selectedCategory === cat.id 
                    ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg shadow-purple-500/20' 
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:shadow-md'
                }`}
              >
                <span className="text-4xl block mb-2">{cat.icon}</span>
                <span className={`font-semibold ${selectedCategory === cat.id ? 'text-purple-600' : 'text-gray-700'}`}>{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Video Duration */}
        <section className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">🎬</span>
            <h3 className="text-lg font-bold text-gray-800">视频时长</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {durations.map((d) => (
              <button
                key={d.type}
                onClick={() => setSelectedDuration(d.type)}
                className={`p-4 rounded-2xl border-2 text-center transition-all duration-300 ${
                  selectedDuration === d.type 
                    ? 'border-purple-400 bg-purple-50 shadow-lg shadow-purple-500/20' 
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                }`}
              >
                <p className={`text-sm font-bold ${d.text} ${d.bg} px-3 py-1 rounded-full mb-2 inline-block`}>{d.label}</p>
                <p className="text-base font-semibold text-gray-800">{d.price}</p>
                <p className="text-xs text-gray-400 mt-1">{d.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Usage Stats */}
        <section className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-3xl shadow-xl p-6 md:p-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
              <p className="text-3xl mb-1">🖼️</p>
              <p className="text-white font-bold">20/20</p>
              <p className="text-white/70 text-xs">图片</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
              <p className="text-3xl mb-1">✍️</p>
              <p className="text-white font-bold">10/10</p>
              <p className="text-white/70 text-xs">文案</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
              <p className="text-3xl mb-1">🎬</p>
              <p className="text-white font-bold">10/10</p>
              <p className="text-white/70 text-xs">视频</p>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-shadow cursor-pointer">
            <span className="text-3xl">🎭</span>
            <p className="font-bold text-gray-800 mt-2">爆款文案</p>
            <p className="text-sm text-gray-400">小红书、抖音...</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-shadow cursor-pointer">
            <span className="text-3xl">🖼️</span>
            <p className="font-bold text-gray-800 mt-2">AI作图</p>
            <p className="text-sm text-gray-400">一键生成配图</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-shadow cursor-pointer">
            <span className="text-3xl">🎬</span>
            <p className="font-bold text-gray-800 mt-2">视频生成</p>
            <p className="text-sm text-gray-400">图文转视频</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-shadow cursor-pointer">
            <span className="text-3xl">💡</span>
            <p className="font-bold text-gray-800 mt-2">灵感库</p>
            <p className="text-sm text-gray-400">热门创意参考</p>
          </div>
        </section>

        {/* Tips Section */}
        <section className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-3xl shadow-lg p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💡</span>
            <h3 className="text-lg font-bold text-gray-800">使用技巧</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <p className="font-medium text-gray-800">表达越具体越好</p>
                <p className="text-sm text-gray-500">描述场景、情绪、风格</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="font-medium text-gray-800">选择合适的模式</p>
                <p className="text-sm text-gray-500">快速出稿选极速，追求质量选高质量</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔄</span>
              <div>
                <p className="font-medium text-gray-800">可以多次生成</p>
                <p className="text-sm text-gray-500">不满意就再来一次</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-gray-100 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={GOAT_MASCOT} alt="灵感山羊" className="w-8 h-8 rounded-lg" />
              <span className="text-gray-600 font-medium">灵感山羊</span>
            </div>
            <p className="text-gray-400 text-sm">释放创意，让AI成为你的灵感伙伴</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <Link to="/credits" className="hover:text-purple-600 transition-colors">积分说明</Link>
              <Link to="/membership" className="hover:text-purple-600 transition-colors">会员权益</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home