import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const GOAT_MASCOT = "/goat-mascot.png"

const Home: React.FC = () => {
  const { user } = useAuth()
  const [idea, setIdea] = useState('')
  const [mode, setMode] = useState<'fast' | 'quality'>('fast')
  const [selectedTextStyle, setSelectedTextStyle] = useState('xiaohongshu')
  const [selectedImageStyle, setSelectedImageStyle] = useState('realistic')
  const [selectedCategory, setSelectedCategory] = useState('scenery')
  const [selectedDuration, setSelectedDuration] = useState('free')

  const textStyles = [
    { id: 'xiaohongshu', name: '小红书', icon: '📕', color: 'from-red-400 to-pink-500' },
    { id: 'douyin', name: '抖音', icon: '🎵', color: 'from-pink-400 to-purple-500' },
    { id: 'weibo', name: '微博', icon: '✉️', color: 'from-orange-400 to-yellow-500' },
  ]

  const imageStyles = [
    { id: 'realistic', name: '写实摄影', icon: '📷' },
    { id: 'illustration', name: '商业插画', icon: '🎨' },
    { id: 'anime', name: '动漫风', icon: '🌸' },
  ]

  const categories = [
    { id: 'scenery', name: '风景', icon: '🏞️' },
    { id: 'portrait', name: '人像', icon: '👤' },
    { id: 'food', name: '美食', icon: '🍜' },
  ]

  const durations = [
    { type: 'free', label: '5秒', price: '免费', desc: '每日10次', color: '#10B981' },
    { type: 'paid5', label: '10秒', price: '10积分', desc: '每增加5秒+10积分', color: '#F59E0B' },
    { type: 'paid10', label: '15秒', price: '20积分', desc: '每增加10秒+20积分', color: '#F59E0B' },
    { type: 'paid15', label: '20秒', price: '30积分', desc: '每增加15秒+30积分', color: '#EF4444' },
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={GOAT_MASCOT} alt="灵感山羊" className="w-12 h-12 rounded-2xl shadow-lg" />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">你好，创意家</h1>
                <p className="text-xs text-gray-500">一键生成创意内容</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <span className="text-sm text-gray-600">{(user as any).username || '用户'}</span>
              ) : (
                <>
                  <Link to="/login" className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all">
                    登录
                  </Link>
                  <Link to="/register" className="px-4 py-2 text-sm text-gray-600 hover:text-purple-600 font-medium transition-colors">
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center py-8">
          <h2 className="text-4xl font-bold text-gray-800 mb-2">释放创意，AI赋能</h2>
          <p className="text-gray-500 text-lg">灵感山羊致力于为创作者提供最优质的AI生成服务</p>
        </div>

        {/* Idea Input */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 你的创意想法</h3>
          <div className="relative">
            <input
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="描述你的创意..."
              className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-200 transition-all text-base"
            />
          </div>
        </section>

        {/* Mode Selection */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">⚡ 生成模式</h3>
            <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">竞品对比 →</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('fast')}
              className={`p-6 rounded-2xl border-2 transition-all ${mode === 'fast' ? 'border-green-500 bg-green-50 shadow-lg shadow-green-500/20' : 'border-gray-100 bg-gray-50 hover:border-green-200'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">⚡</span>
                {mode === 'fast' && <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">✓</span>}
              </div>
              <p className={`text-lg font-bold ${mode === 'fast' ? 'text-green-600' : 'text-gray-700'}`}>极速模式</p>
              <p className="text-sm text-gray-400 mt-1">≤60秒</p>
            </button>
            <button
              onClick={() => setMode('quality')}
              className={`p-6 rounded-2xl border-2 transition-all ${mode === 'quality' ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/20' : 'border-gray-100 bg-gray-50 hover:border-purple-200'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">💎</span>
                {mode === 'quality' && <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">✓</span>}
              </div>
              <p className={`text-lg font-bold ${mode === 'quality' ? 'text-purple-600' : 'text-gray-700'}`}>高质量模式</p>
              <p className="text-sm text-gray-400 mt-1">~120秒</p>
            </button>
          </div>
        </section>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          className="w-full py-5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white font-bold text-xl rounded-2xl shadow-xl shadow-green-500/30 hover:shadow-green-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          ✨ 一键生成全部
        </button>

        {/* Style Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Text Style */}
          <section className="bg-white rounded-3xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📝 文案风格</h3>
            <div className="grid grid-cols-3 gap-3">
              {textStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedTextStyle(style.id)}
                  className={`p-4 rounded-2xl border-2 transition-all ${selectedTextStyle === style.id ? `border-transparent bg-gradient-to-br ${style.color} text-white shadow-lg` : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                >
                  <span className="text-2xl block mb-1">{style.icon}</span>
                  <span className={`text-sm font-medium ${selectedTextStyle === style.id ? 'text-white' : 'text-gray-700'}`}>{style.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Image Style */}
          <section className="bg-white rounded-3xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🎨 图片风格</h3>
            <div className="grid grid-cols-3 gap-3">
              {imageStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedImageStyle(style.id)}
                  className={`p-4 rounded-2xl border-2 transition-all ${selectedImageStyle === style.id ? 'border-purple-500 bg-purple-50 shadow-lg' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                >
                  <span className="text-2xl block mb-1">{style.icon}</span>
                  <span className={`text-sm font-medium ${selectedImageStyle === style.id ? 'text-purple-600' : 'text-gray-700'}`}>{style.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Quick Templates */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">🚀 快速模板</h3>
            <button className="text-sm text-purple-600 font-medium">更多风格 →</button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-5 rounded-2xl border-2 transition-all ${selectedCategory === cat.id ? 'border-purple-500 bg-purple-50 shadow-lg' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
              >
                <span className="text-3xl block mb-2">{cat.icon}</span>
                <span className={`font-medium ${selectedCategory === cat.id ? 'text-purple-600' : 'text-gray-700'}`}>{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Video Duration */}
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🎬 视频时长</h3>
          <div className="grid grid-cols-4 gap-3">
            {durations.map((d) => (
              <button
                key={d.type}
                onClick={() => setSelectedDuration(d.type)}
                className={`p-4 rounded-2xl border-2 text-center transition-all ${selectedDuration === d.type ? 'border-purple-500 bg-purple-50 shadow-lg' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
              >
                <p className="text-sm font-bold mb-1 px-3 py-1 rounded-full inline-block" style={{ backgroundColor: d.color + '20', color: d.color }}>{d.label}</p>
                <p className="text-sm font-medium text-gray-700">{d.price}</p>
                <p className="text-xs text-gray-400">{d.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Usage Stats */}
        <section className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl shadow-xl p-6 text-white">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/20 rounded-2xl p-4">
              <p className="text-3xl font-bold">🖼️</p>
              <p className="text-sm mt-1">图片 20/20</p>
            </div>
            <div className="bg-white/20 rounded-2xl p-4">
              <p className="text-3xl font-bold">✍️</p>
              <p className="text-sm mt-1">文案 10/10</p>
            </div>
            <div className="bg-white/20 rounded-2xl p-4">
              <p className="text-3xl font-bold">🎬</p>
              <p className="text-sm mt-1">视频 10/10</p>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <button className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl shadow-xl p-6 text-left hover:scale-[1.02] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">👑 解锁无限创作</p>
                <p className="text-white/80 text-sm mt-1">升级会员享更多权益</p>
              </div>
              <span className="text-3xl">→</span>
            </div>
          </button>
          <button className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl shadow-xl p-6 text-left hover:scale-[1.02] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">🏆 对比全网竞品</p>
                <p className="text-white/80 text-sm mt-1">一键三连·行业首创</p>
              </div>
              <span className="text-white/80 text-sm">查看详情 →</span>
            </div>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm">
        <p>灵感山羊 - 释放创意，AI赋能</p>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 z-20">
        <div className="flex justify-around py-3">
          <Link to="/" className="flex flex-col items-center text-purple-500">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">首页</span>
          </Link>
          <Link to="/history" className="flex flex-col items-center text-gray-400">
            <span className="text-xl">📝</span>
            <span className="text-xs mt-1">历史</span>
          </Link>
          <Link to="/membership" className="flex flex-col items-center text-gray-400">
            <span className="text-xl">💎</span>
            <span className="text-xs mt-1">会员</span>
          </Link>
          <Link to={user ? "/credits" : "/login"} className="flex flex-col items-center text-gray-400">
            <span className="text-xl">⭐</span>
            <span className="text-xs mt-1">积分</span>
          </Link>
        </div>
      </nav>
      <div className="h-20 lg:hidden"></div>
    </div>
  )
}

export default Home
