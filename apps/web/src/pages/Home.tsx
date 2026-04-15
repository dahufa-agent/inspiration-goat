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
    { id: 'xiaohongshu', name: '小红书', icon: '📕' },
    { id: 'douyin', name: '抖音', icon: '🎵' },
    { id: 'weibo', name: '微博', icon: '✉️' },
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
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-4">
      <header className="bg-white sticky top-0 z-20 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={GOAT_MASCOT} alt="灵感山羊" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">你好，创意家</h1>
                <p className="text-xs text-gray-500">一键生成创意内容</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <span className="text-sm text-gray-600">{(user as any).username || '用户'}</span>
              ) : (
                <>
                  <Link to="/login" className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg font-medium">登录</Link>
                  <Link to="/register" className="px-3 py-1.5 text-sm text-gray-700 font-medium">注册</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-5 max-w-2xl mx-auto">
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">你的创意想法</h2>
          <div className="relative">
            <input type="text" value={idea} onChange={(e) => setIdea(e.target.value)}
              placeholder="例如：海边日落、可爱猫咪、产品宣传、节日祝福..."
              className="w-full px-4 py-3 pr-10 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▼</span>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-900">生成模式</h2>
            <button className="text-sm text-blue-500">竞品对比</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setMode('fast')} className={`p-3 rounded-xl border-2 transition ${mode === 'fast' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">⚡</span>
                {mode === 'fast' && <span className="text-green-500">✓</span>}
              </div>
              <p className={`text-sm font-medium ${mode === 'fast' ? 'text-green-600' : 'text-gray-700'}`}>极速模式</p>
              <p className="text-xs text-gray-400">≤60秒</p>
            </button>
            <button onClick={() => setMode('quality')} className={`p-3 rounded-xl border-2 transition ${mode === 'quality' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">💎</span>
                {mode === 'quality' && <span className="text-blue-500">✓</span>}
              </div>
              <p className={`text-sm font-medium ${mode === 'quality' ? 'text-blue-600' : 'text-gray-700'}`}>高质量模式</p>
              <p className="text-xs text-gray-400">~120秒</p>
            </button>
          </div>
        </section>

        <button onClick={handleGenerate} className="w-full py-3 bg-gradient-to-r from-green-400 to-green-500 text-white font-semibold rounded-xl shadow-md flex items-center justify-center gap-2">
          <span>✨</span><span>一键生成全部</span>
        </button>

        <section>
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">文案风格</h3>
              <div className="flex gap-2">
                {textStyles.map((style) => (
                  <button key={style.id} onClick={() => setSelectedTextStyle(style.id)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition flex items-center justify-center gap-1 ${selectedTextStyle === style.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                    <span>{style.icon}</span><span>{style.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">图片风格</h3>
              <div className="flex gap-2">
                {imageStyles.map((style) => (
                  <button key={style.id} onClick={() => setSelectedImageStyle(style.id)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition flex items-center justify-center gap-1 ${selectedImageStyle === style.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                    <span>{style.icon}</span><span>{style.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-900">快速模板</h2>
            <button className="text-sm text-blue-500">更多风格 →</button>
          </div>
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition flex items-center justify-center gap-1 ${selectedCategory === cat.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                <span>{cat.icon}</span><span>{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">视频时长</h2>
          <div className="grid grid-cols-4 gap-2">
            {durations.map((d) => (
              <button key={d.type} onClick={() => setSelectedDuration(d.type)}
                className={`p-2 rounded-lg border-2 text-center transition ${selectedDuration === d.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                <p className="text-xs font-medium px-2 py-0.5 rounded mb-1 inline-block" style={{ backgroundColor: d.color + '20', color: d.color }}>{d.label}</p>
                <p className="text-xs text-gray-500">{d.price}</p>
                <p className="text-xs text-gray-400">{d.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="flex gap-4 py-3 border-t border-b border-gray-200">
          <div className="flex items-center gap-2"><span className="text-lg">🖼️</span><span className="text-sm text-gray-600">图片 20/20</span></div>
          <div className="flex items-center gap-2"><span className="text-lg">✍️</span><span className="text-sm text-gray-600">文案 10/10</span></div>
          <div className="flex items-center gap-2"><span className="text-lg">🎬</span><span className="text-sm text-gray-600">视频 10/10</span></div>
        </section>

        <section className="space-y-3">
          <button className="w-full p-3 bg-amber-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">👑</span>
              <div className="text-left">
                <p className="text-sm font-medium text-amber-800">解锁无限创作</p>
                <p className="text-xs text-amber-600">升级会员享更多权益</p>
              </div>
            </div>
            <span className="text-amber-500">→</span>
          </button>
          <button className="w-full p-3 bg-gray-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">对比全网竞品</p>
                <p className="text-xs text-gray-500">一键三连·行业首创</p>
              </div>
            </div>
            <span className="text-blue-500 text-sm">查看详情 →</span>
          </button>
        </section>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
        <div className="flex justify-around py-3">
          <Link to="/" className="flex flex-col items-center text-pink-500"><span className="text-xl">🏠</span><span className="text-xs mt-1">首页</span></Link>
          <Link to="/history" className="flex flex-col items-center text-gray-400"><span className="text-xl">📝</span><span className="text-xs mt-1">历史</span></Link>
          <Link to="/membership" className="flex flex-col items-center text-gray-400"><span className="text-xl">💎</span><span className="text-xs mt-1">会员</span></Link>
          <Link to={user ? "/credits" : "/login"} className="flex flex-col items-center text-gray-400"><span className="text-xl">⭐</span><span className="text-xs mt-1">积分</span></Link>
        </div>
      </nav>
    </div>
  )
}

export default Home
