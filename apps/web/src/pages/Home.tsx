import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import InputForm from '../components/InputForm'
import ResultCard from '../components/ResultCard'
import { getRemainingEdits } from '../services/api'

interface Quota {
  remainingImages: number
  remainingTexts: number
  remainingVideos: number
}

interface Result {
  imageUrls?: string[]
  texts?: string[]
  videoUrl?: string
}

// 数字动画 Hook
const useCountUp = (end: number, duration: number = 2000, start: number = 0) => {
  const [count, setCount] = useState(start)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return

    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * (end - start) + start))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [isVisible, end, start, duration])

  return { count, ref }
}

// 粒子背景组件
const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []
    const particleCount = 80

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      })
    }

    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        // 绘制粒子
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(167, 139, 250, ${p.opacity})`
        ctx.fill()

        // 粒子连线
        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(167, 139, 250, ${0.15 * (1 - dist / 150)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  )
}

// 统计数据组件
const StatCounter: React.FC<{ value: number; suffix: string; label: string; icon: string }> = ({ value, suffix, label, icon }) => {
  const { count, ref } = useCountUp(value, 2500)
  
  return (
    <div ref={ref} className="text-center group cursor-default">
      <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <div className="text-3xl sm:text-4xl lg:text-5xl font-black">
        <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
          {count.toLocaleString()}
        </span>
        <span className="text-2xl sm:text-3xl text-yellow-400">{suffix}</span>
      </div>
      <div className="text-sm sm:text-base text-white/60 mt-2 font-medium">{label}</div>
    </div>
  )
}

// 功能卡片组件
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  gradient: string;
  glowColor: string;
  delay: string;
}> = ({ icon, title, desc, gradient, glowColor, delay }) => {
  
  return (
    <div
      className={`relative group cursor-pointer transition-all duration-500 ${delay}`}
    >
      {/* 发光背景 */}
      <div 
        className={`absolute -inset-1 bg-gradient-to-br ${gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${glowColor}`}
      />
      
      {/* 卡片主体 */}
      <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-8 border border-white/10 overflow-hidden">
        {/* 顶部装饰线 */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
        
        {/* 图标 */}
        <div className={`relative w-20 h-20 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg ${glowColor}`}>
          <div className="text-4xl">{icon}</div>
        </div>
        
        {/* 标题 */}
        <h3 className="relative text-xl sm:text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:${gradient} group-hover:bg-clip-text transition-all duration-300">
          {title}
        </h3>
        
        {/* 描述 */}
        <p className="relative text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
          {desc}
        </p>
        
        {/* 悬停时的光效 */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity duration-500 pointer-events-none`} />
      </div>
    </div>
  )
}

// 步骤卡片组件
const StepCard: React.FC<{ step: string; icon: string; title: string; desc: string; isLast: boolean }> = ({ step, icon, title, desc, isLast }) => (
  <div className="relative flex flex-col items-center text-center group">
    {/* 连接线 */}
    {!isLast && (
      <div className="hidden md:block absolute top-10 left-[calc(50%+50px)] w-[calc(100%-100px)] h-0.5 bg-gradient-to-r from-purple-500/50 to-pink-500/50 group-hover:from-yellow-400/50 group-hover:to-orange-400/50 transition-all duration-500" />
    )}
    
    {/* 圆形数字 */}
    <div className="relative w-20 h-20 bg-gradient-to-br from-gray-900 to-gray-800 rounded-full flex items-center justify-center border-2 border-purple-500/50 group-hover:border-yellow-400/50 transition-colors duration-300 shadow-2xl z-10">
      <span className="text-4xl">{icon}</span>
      <span className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-black group-hover:from-yellow-400 group-hover:to-orange-400 transition-all duration-300">
        {step}
      </span>
    </div>
    
    <h3 className="mt-6 text-xl font-bold text-white group-hover:text-yellow-400 transition-colors duration-300">{title}</h3>
    <p className="mt-2 text-gray-400 max-w-xs group-hover:text-gray-300 transition-colors duration-300">{desc}</p>
  </div>
)

const Home: React.FC = () => {
  const { user } = useAuth()
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [quota, setQuota] = useState<Quota>({ remainingImages: 0, remainingTexts: 0, remainingVideos: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadQuota()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const loadQuota = async () => {
    const deviceId = localStorage.getItem('device_id') || 'web-user'
    try {
      const remaining = await getRemainingEdits(deviceId)
      setQuota(remaining)
    } catch (err) {
      console.error('Failed to load quota:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccess = (data: Result) => {
    setResult(data)
    loadQuota()
  }

  const handleError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 5000)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ==================== HERO SECTION ==================== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* 动态粒子背景 */}
        <ParticleBackground />
        
        {/* 渐变光晕 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* 主光晕 - 紫色 */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-violet-600/30 via-purple-600/20 to-fuchsia-600/10 rounded-full blur-3xl animate-pulse" />
          {/* 次光晕 - 蓝色 */}
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-600/20 via-indigo-600/15 to-violet-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          {/* 顶部光晕 - 粉色 */}
          <div className="absolute top-0 right-1/3 w-[400px] h-[400px] bg-gradient-to-b from-pink-600/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          
          {/* 网格背景 */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_40%,transparent_100%)]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            {/* 山羊教授头像 - 品牌主视觉 */}
            <div className="relative inline-block mb-8 animate-fade-in">
              <div className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 mx-auto relative">
                {/* 发光背景 */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 to-orange-500/30 rounded-full blur-2xl animate-pulse" />
                {/* 头像 */}
                <img 
                  src="/goat-professor.svg" 
                  alt="灵感山羊教授" 
                  className="relative w-full h-full object-contain drop-shadow-2xl"
                />
              </div>
              {/* 浮动装饰 */}
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-float">
                <span className="text-2xl">⚡</span>
              </div>
              <div className="absolute -bottom-2 -left-6 w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg animate-float-slow">
                <span className="text-xl">✨</span>
              </div>
            </div>

            {/* 徽章 - 超级发光效果 */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 mb-8 animate-fade-in shadow-lg shadow-yellow-500/20">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-yellow-300 text-sm font-bold tracking-wide">🚀 全网最强AI创作平台</span>
            </div>

            {/* 主标题 - 超大渐变文字 */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black mb-6 animate-fade-in leading-tight">
              <span className="block text-white mb-2">一键生成</span>
              <span className="block relative">
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent drop-shadow-2xl">
                  创意内容
                </span>
                {/* 文字光晕 */}
                <span className="absolute inset-0 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent blur-xl opacity-50 -z-10">
                  创意内容
                </span>
              </span>
            </h1>

            {/* 副标题 - 金色高亮 */}
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 animate-fade-in leading-relaxed">
              输入你的灵感，让 <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 font-bold">AI</span> 为你生成精美的图片、优质的文案和震撼的视频
              <br className="hidden sm:block" />
              <span className="inline-block mt-3 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400 font-semibold">
                ✨ 告别创作瓶颈，释放无限创意
              </span>
            </p>

            {/* CTA 按钮 - 超级醒目 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-in">
              {!user ? (
                <>
                  {/* 主按钮 - 金色渐变大按钮 */}
                  <Link
                    to="/register"
                    className="group relative overflow-hidden bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-gray-900 px-10 py-5 rounded-2xl font-black text-xl shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/60 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                  >
                    {/* 按钮光效 */}
                    <span className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* 闪光效果 */}
                    <span className="absolute -inset-x-full top-0 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:animate-shimmer" />
                    
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <span>⚡ 立即开始创作</span>
                      <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </Link>
                  
                  {/* 次按钮 - 玻璃态 */}
                  <Link
                    to="/login"
                    className="group relative overflow-hidden bg-white/10 backdrop-blur-xl text-white px-10 py-5 rounded-2xl font-bold text-xl border-2 border-white/20 hover:border-white/40 hover:bg-white/20 transition-all duration-300"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      已有账号登录
                      <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-xl rounded-full border border-yellow-500/30 shadow-lg shadow-amber-500/10">
                  <span className="text-2xl">🎉</span>
                  <span className="text-white/80 text-lg">欢迎回来，</span>
                  <span className="text-white font-bold text-xl">{user.username}</span>
                  {user.isVip && (
                    <span className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full text-sm font-black text-gray-900 animate-pulse">
                      ✨ VIP
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 统计数据 - 超级震撼 */}
            <div className="mt-20 grid grid-cols-3 gap-8 lg:gap-16 max-w-4xl mx-auto animate-fade-in">
              <StatCounter value={50000} suffix="+" label="活跃创作者" icon="👥" />
              <StatCounter value={2000000} suffix="+" label="生成内容" icon="✨" />
              <StatCounter value={99} suffix=".9%" label="满意度" icon="❤️" />
            </div>
          </div>
        </div>

        {/* 底部波浪 */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 52.5C480 45 600 60 720 67.5C840 75 960 75 1080 67.5C1200 60 1320 45 1380 37.5L1440 30V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#09090b"/>
          </svg>
        </div>
      </section>

      {/* ==================== QUOTA SECTION ==================== */}
      {user && !isLoading && (
        <section className="py-8 bg-gray-900">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">📊</span> 今日剩余次数
                </h3>
                <Link to="/credits" className="text-sm text-yellow-400 hover:text-amber-400 font-semibold flex items-center gap-1 transition-colors">
                  充值积分 <span>→</span>
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-2xl p-5 text-center border border-pink-500/30 hover:border-pink-500/50 transition-colors">
                  <div className="text-4xl font-black text-pink-400">{quota.remainingImages}</div>
                  <div className="text-sm text-pink-400/70 mt-2 font-medium">🖼️ 图片生成</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-5 text-center border border-green-500/30 hover:border-green-500/50 transition-colors">
                  <div className="text-4xl font-black text-green-400">{quota.remainingTexts}</div>
                  <div className="text-sm text-green-400/70 mt-2 font-medium">📝 智能文案</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-2xl p-5 text-center border border-purple-500/30 hover:border-purple-500/50 transition-colors">
                  <div className="text-4xl font-black text-purple-400">{quota.remainingVideos}</div>
                  <div className="text-sm text-purple-400/70 mt-2 font-medium">🎬 视频生成</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== MAIN CONTENT SECTION ==================== */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Input Form */}
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl hover:border-purple-500/30 transition-all duration-300">
              {!user ? (
                <div className="text-center py-12">
                  <div className="text-7xl mb-6">🚀</div>
                  <h3 className="text-2xl font-bold text-white mb-4">准备好开始创作了吗？</h3>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                    加入我们，解锁 AI 创作的无限可能。一键生成图片、文案、视频，让创意触手可及。
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      to="/register"
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all"
                    >
                      免费注册
                    </Link>
                    <Link
                      to="/login"
                      className="w-full sm:w-auto px-8 py-3.5 border-2 border-white/20 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
                    >
                      登录
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-amber-500/30">
                      <span className="text-2xl">✨</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">开始创作</h2>
                      <p className="text-sm text-gray-400">描述你的灵感，AI 帮你实现</p>
                    </div>
                  </div>
                  <InputForm onSuccess={handleSuccess} onError={handleError} />
                </>
              )}
              
              {error && (
                <div className="mt-6 p-4 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <p className="text-red-400 font-medium">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-pink-500/30">
                  <span className="text-2xl">🎨</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">创作结果</h2>
                  <p className="text-sm text-gray-400">你的 AI 创作成果</p>
                </div>
              </div>
              
              {result ? (
                <div className="space-y-4">
                  {result.imageUrls?.map((url: string, i: number) => (
                    <div key={`img-${i}`} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                      <ResultCard type="image" url={url} />
                    </div>
                  ))}
                  {result.texts?.map((text: string, i: number) => (
                    <div key={`text-${i}`} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                      <ResultCard type="text" content={text} />
                    </div>
                  ))}
                  {result.videoUrl && (
                    <ResultCard type="video" url={result.videoUrl} />
                  )}
                </div>
              ) : (
                <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-12 text-center border-2 border-dashed border-white/10">
                  <div className="text-7xl mb-4">💭</div>
                  <p className="text-gray-400 text-lg">暂无创作结果</p>
                  <p className="text-gray-500 text-sm mt-2">输入灵感，开始你的第一次创作</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES SECTION ==================== */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        {/* 背景光效 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-violet-600/10 via-purple-600/5 to-pink-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 标题区 */}
          <div className="text-center mb-20">
            <span className="inline-block px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 text-sm font-bold mb-6">
              ⚡ 核心功能
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
              为什么选择<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400">灵感山羊</span>？
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              我们提供最先进的人工智能技术，让你的创意变成现实
            </p>
          </div>

          {/* 功能卡片 */}
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🎨"
              title="AI 图片生成"
              desc="输入描述词，快速生成精美图片。支持多种风格，让创意可视化。支持文生图、图生图等高级功能。"
              gradient="from-pink-500 via-rose-500 to-red-500"
              glowColor="shadow-pink-500/50"
              delay="animate-fade-in"
            />
            <FeatureCard
              icon="✍️"
              title="智能文案"
              desc="AI 帮你撰写优质文案内容。适用于社交媒体、广告、产品描述等场景，一键生成高质量内容。"
              gradient="from-green-500 via-emerald-500 to-teal-500"
              glowColor="shadow-green-500/50"
              delay="animate-fade-in"
            />
            <FeatureCard
              icon="🎬"
              title="视频生成"
              desc="一键生成动态视频内容。从图片到视频，AI 帮你轻松搞定。支持多种视频风格和特效。"
              gradient="from-purple-500 via-violet-500 to-indigo-500"
              glowColor="shadow-purple-500/50"
              delay="animate-fade-in"
            />
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS SECTION ==================== */}
      <section className="py-24 bg-gradient-to-b from-gray-900 via-gray-950 to-gray-900 relative overflow-hidden">
        {/* 背景渐变 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="inline-block px-5 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-bold mb-6">
              🚀 快速上手
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
              三步完成<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">创作</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
            <StepCard step="01" icon="📝" title="描述你的灵感" desc="用文字描述你想要的内容，AI 理解你的创意需求" isLast={false} />
            <StepCard step="02" icon="⚡" title="AI 智能生成" desc="我们的 AI 算法立即创作，自动优化细节" isLast={false} />
            <StepCard step="03" icon="🎉" title="获取完美结果" desc="下载或复制你的创作成果，分享到任意平台" isLast={true} />
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA SECTION ==================== */}
      <section className="py-24 relative overflow-hidden">
        {/* 动态背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-8 leading-tight">
            准备好释放你的
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400">
              创意了吗？
            </span>
          </h2>
          <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto">
            加入 <span className="text-yellow-400 font-bold">50,000+</span> 创作者，开始你的 AI 创作之旅
          </p>
          {!user && (
            <Link
              to="/register"
              className="group inline-flex items-center gap-4 px-12 py-5 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-gray-900 rounded-2xl font-black text-xl shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/60 hover:scale-105 transition-all duration-300"
            >
              <span>⚡ 立即免费注册</span>
              <svg className="w-7 h-7 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}

export default Home
