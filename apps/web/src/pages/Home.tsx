import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ResultCard from '../components/ResultCard'
import { getRemainingEdits } from '../services/api'

// ==================== 配置常量 ====================
// 山羊IP形象（棕色羊角、白色胡须、深棕外套、蹲坐姿态）
const GOAT_MASCOT = "/goat-mascot.svg"
const GOAT_MASCOT_URL = "https://coze-coding-project.tos.coze.site/coze_storage_7627778343278215204/image/generate_image_b6078ad5-ea30-4a35-b64f-be3d8e2a6ce0.jpeg?sign=1807522848-177fac84ec-0-e563565f1f5d6087dc714c42d6cfa0a9202ff2202029a59ecee87677f22dd55c"

// 视频时长选项
const DURATION_OPTIONS = [
  { type: "free", duration: 5, label: "5秒", price: "免费", description: "每日10次", color: "#10B981" },
  { type: "paid5", duration: 10, label: "10秒", price: "10积分", description: "每增加5秒+10积分", color: "#F59E0B" },
  { type: "paid10", duration: 15, label: "15秒", price: "20积分", description: "每增加10秒+20积分", color: "#F59E0B" },
  { type: "paid15", duration: 20, label: "20秒", price: "30积分", description: "每增加15秒+30积分", color: "#EF4444" },
];

// 每日限制配置
const LIMITS = {
  images: { perBatch: 2, maxPerDay: 20, chargePerImage: 1 },
  texts: { perBatch: 1, maxPerDay: 10, chargePerText: 2 },
};

// 风格预设配置
const TEXT_STYLES = [
  { id: 'xiaohongshu', name: '小红书', icon: '📕', color: '#FF2442' },
  { id: 'douyin', name: '抖音', icon: '🎵', color: '#000000' },
  { id: 'gzh', name: '公众号', icon: '📧', color: '#4F46E5' },
  { id: 'zhihu', name: '知乎', icon: '💬', color: '#0084FF' },
  { id: 'general', name: '通用', icon: '✨', color: '#10B981' },
];

const IMAGE_STYLES = [
  { id: 'realistic', name: '写实摄影', icon: '📷' },
  { id: 'illustration', name: '商业插画', icon: '🎨' },
  { id: 'anime', name: '动漫风格', icon: '🌸' },
  { id: 'oil_painting', name: '油画质感', icon: '🖼️' },
  { id: 'cyberpunk', name: '赛博朋克', icon: '🤖' },
  { id: 'fantasy', name: '奇幻风格', icon: '✨' },
];

// 模板数据
const TEMPLATES = {
  scenery: ["海边日落晚霞", "森林迷雾小路", "城市璀璨夜景", "星空银河漫天"],
  portrait: ["复古港风写真", "清新森系少女", "韩系氧气美女", "欧美高级感"],
  food: ["精致法式甜点", "日式刺身料理", "意式披萨烤肠", "网红奶茶饮品"],
  animal: ["橘猫慵懒午后", "柴犬微笑卖萌", "布偶猫公主范", "柯基蜜桃臀"],
  art: ["梵高星空风格", "莫奈印象派花园", "浮世绘樱花", "赛博朋克未来城"],
  lifestyle: ["咖啡馆悠闲时光", "书房的午后", "阳台小花园", "露营星空下"],
};

// 模板分类
const CATEGORIES = [
  { id: 'scenery', name: '风景', icon: '🏔️' },
  { id: 'portrait', name: '人像', icon: '👤' },
  { id: 'food', name: '美食', icon: '🍜' },
  { id: 'animal', name: '萌宠', icon: '🐱' },
  { id: 'art', name: '艺术', icon: '🎨' },
  { id: 'lifestyle', name: '生活', icon: '☕' },
];

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

// ==================== UI组件 ====================

// 彩虹渐变背景
const RainbowBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 彩虹渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-400 via-blue-400 via-cyan-400 to-teal-400" />
      
      {/* 叠加渐变层 */}
      <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/30 via-transparent to-pink-400/20" />
      
      {/* 动态光斑 */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-pink-300/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* 装饰粒子 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/60 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
      
      {/* 内容层 */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// 玻璃态卡片
const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 ${className}`}>
      {children}
    </div>
  )
}

// 风格选择器
const StyleSelector: React.FC<{
  title: string;
  styles: typeof TEXT_STYLES;
  selected: string;
  onChange: (id: string) => void;
}> = ({ title, styles, selected, onChange }) => {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => onChange(style.id)}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
              selected === style.id
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105'
                : 'bg-white/80 hover:bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <span>{style.icon}</span>
            <span className="text-sm">{style.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// 模板网格
const TemplateGrid: React.FC<{
  categories: typeof CATEGORIES;
  templates: typeof TEMPLATES;
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  onTemplateSelect: (template: string) => void;
}> = ({ categories, templates, selectedCategory, onCategoryChange, onTemplateSelect }) => {
  const currentTemplates = templates[selectedCategory as keyof typeof templates] || templates.scenery;
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">📚 快速模板</h3>
        <button className="text-sm text-pink-500 hover:text-pink-600 font-medium">更多风格 →</button>
      </div>
      
      {/* 分类选择 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                : 'bg-white/80 hover:bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <span>{cat.icon}</span>
            <span className="text-sm">{cat.name}</span>
          </button>
        ))}
      </div>
      
      {/* 模板网格 */}
      <div className="grid grid-cols-2 gap-3">
        {currentTemplates.slice(0, 4).map((template, idx) => (
          <button
            key={idx}
            onClick={() => onTemplateSelect(template)}
            className="bg-white/80 hover:bg-white border border-gray-200 hover:border-pink-300 rounded-xl p-3 text-left transition-all duration-200 hover:shadow-md"
          >
            <span className="text-sm text-gray-700 line-clamp-2">{template}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// 时长选择卡片
const DurationCard: React.FC<{
  option: typeof DURATION_OPTIONS[0];
  selected: boolean;
  onClick: () => void;
}> = ({ option, selected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-2xl transition-all duration-300 text-left ${
        selected
          ? 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-2 border-pink-500 shadow-lg shadow-pink-500/20'
          : 'bg-white/80 border-2 border-transparent hover:border-gray-300'
      }`}
    >
      <div className={`inline-block px-3 py-1 rounded-lg mb-2 ${selected ? 'bg-pink-500/20' : 'bg-gray-100'}`}>
        <span className={`text-sm font-semibold ${selected ? 'text-pink-600' : 'text-gray-600'}`}>
          {option.label}
        </span>
      </div>
      <p className="font-semibold text-gray-800 mb-1">{option.price}</p>
      <p className="text-xs text-gray-500">{option.description}</p>
      
      {selected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
    </button>
  )
}

// 资源使用指示器
const ResourceIndicator: React.FC<{
  icon: string;
  label: string;
  used: number;
  total: number;
  colorClass: string;
  gradientClass: string;
}> = ({ icon, label, used, total, colorClass, gradientClass }) => {
  const remaining = total - used;
  const percentage = total > 0 ? (remaining / total) * 100 : 0;
  
  return (
    <div className="bg-white/80 rounded-2xl p-4 border border-gray-100 flex-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className={`font-semibold ${colorClass}`}>{label}</span>
        </div>
        <span className={`font-bold ${colorClass}`}>{remaining}/{total}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// 模式切换
const ModeToggle: React.FC<{
  mode: 'fast' | 'quality';
  onChange: (mode: 'fast' | 'quality') => void;
}> = ({ mode, onChange }) => {
  return (
    <div className="flex bg-white/80 rounded-full p-1 border border-gray-200">
      <button
        onClick={() => onChange('fast')}
        className={`px-5 py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
          mode === 'fast'
            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        <span>⚡</span>
        <span className="text-sm">极速模式</span>
      </button>
      <button
        onClick={() => onChange('quality')}
        className={`px-5 py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
          mode === 'quality'
            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        <span>💎</span>
        <span className="text-sm">高质量模式</span>
      </button>
    </div>
  )
}

// ==================== 主页面 ====================
const Home: React.FC = () => {
  const { user } = useAuth()
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [quota, setQuota] = useState<Quota>({ remainingImages: 0, remainingTexts: 0, remainingVideos: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState('free')
  const [selectedTextStyle, setSelectedTextStyle] = useState('general')
  const [selectedImageStyle, setSelectedImageStyle] = useState('realistic')
  const [selectedCategory, setSelectedCategory] = useState('scenery')
  const [mode, setMode] = useState<'fast' | 'quality'>('fast')

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

  const canGenerate = () => {
    if (!idea.trim()) return { allowed: false, reason: "请输入你的创意想法" };
    if (selectedDuration === "free" && quota.remainingVideos <= 0) return { allowed: false, reason: "今日视频编辑次数已用完" };
    if (quota.remainingImages < LIMITS.images.perBatch) return { allowed: false, reason: `今日图片生成次数已用完（每次${LIMITS.images.perBatch}张）` };
    if (quota.remainingTexts < LIMITS.texts.perBatch) return { allowed: false, reason: "今日文案生成次数已用完" };
    return { allowed: true, reason: "" };
  };

  const generateCheck = canGenerate();

  return (
    <RainbowBackground>
      <div className="min-h-screen">
        {/* ==================== Header ==================== */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3">
              {/* 山羊IP形象 - Header */}
              <div className="relative">
                <img src={GOAT_MASCOT} alt="灵感山羊" className="w-12 h-12" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  灵感山羊
                </h1>
                <p className="text-xs text-gray-500">AI一键创作神器</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-full">
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="text-gray-700 font-medium">{user.username}</span>
                    {user.isVip && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full text-xs font-bold text-white">
                        ✨ VIP
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="px-4 py-2 text-gray-600 hover:text-pink-500 font-medium transition-colors">
                    登录
                  </Link>
                  <Link to="/register" className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all">
                    立即注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ==================== Main Content ==================== */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Hero Section - 山羊IP大头像 */}
          <div className="text-center mb-8 animate-fade-in">
            {/* 山羊IP形象 - 主视觉 */}
            <div className="inline-block mb-6 relative">
              <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full p-2 shadow-2xl">
                <img 
                  src={GOAT_MASCOT} 
                  alt="灵感山羊" 
                  className="w-full h-full object-contain"
                />
              </div>
              {/* 装饰元素 */}
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <span className="text-xl">⚡</span>
              </div>
              <div className="absolute -bottom-2 -left-4 w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <span className="text-lg">✨</span>
              </div>
            </div>
            
            {/* 标题 */}
            <h1 className="text-4xl sm:text-5xl font-black mb-3">
              <span className="text-white">你好，</span>
              <span className="bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 bg-clip-text text-transparent">创意家</span>
            </h1>
            <p className="text-lg text-white/90 mb-2">一键生成图片 + 文案 + 视频</p>
            <p className="text-sm text-white/70">5分钟搞定创作</p>
            
            {/* 模式切换 */}
            <div className="flex justify-center mt-6">
              <ModeToggle mode={mode} onChange={setMode} />
            </div>
          </div>

          {/* Main Card */}
          <GlassCard className="p-6 mb-6">
            {!user ? (
              <div className="text-center py-12">
                <div className="text-7xl mb-6">🚀</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">准备好开始创作了吗？</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  加入我们，解锁 AI 创作的无限可能。一键生成图片、文案、视频，让创意触手可及。
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/register" className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all">
                    免费注册
                  </Link>
                  <Link to="/login" className="w-full sm:w-auto px-8 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all">
                    登录
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* 模板选择 */}
                <TemplateGrid
                  categories={CATEGORIES}
                  templates={TEMPLATES}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  onTemplateSelect={setIdea}
                />

                {/* 风格选择 */}
                <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-2xl p-4 mb-6">
                  <StyleSelector
                    title="📝 文案风格"
                    styles={TEXT_STYLES}
                    selected={selectedTextStyle}
                    onChange={setSelectedTextStyle}
                  />
                  <StyleSelector
                    title="🖼️ 图片风格"
                    styles={IMAGE_STYLES}
                    selected={selectedImageStyle}
                    onChange={setSelectedImageStyle}
                  />
                </div>

                {/* 输入区域 */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    💡 你的创意想法
                  </label>
                  <div className="relative">
                    <textarea
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      placeholder="描述你想要创作的内容...&#10;例如：海边日落、可爱猫咪..."
                      className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 outline-none transition-all resize-none text-gray-800 leading-relaxed"
                      rows={4}
                    />
                    {idea.length > 0 && (
                      <button
                        onClick={() => setIdea('')}
                        className="absolute right-4 top-4 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 bg-gray-100 rounded-lg transition-colors"
                      >
                        清除
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    💡 描述越详细，生成效果越好
                  </p>
                </div>

                {/* 视频时长选择 */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">🎬 视频时长</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DURATION_OPTIONS.map((option) => (
                      <DurationCard
                        key={option.type}
                        option={option}
                        selected={selectedDuration === option.type}
                        onClick={() => setSelectedDuration(option.type)}
                      />
                    ))}
                  </div>
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <p className="text-red-600 font-medium flex-1">{error}</p>
                  </div>
                )}

                {/* 生成按钮 */}
                <button
                  disabled={!generateCheck.allowed || loading}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                    !generateCheck.allowed || loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02]'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>AI 创作中...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">✨</span>
                      <span>一键生成全部</span>
                      <span>→</span>
                    </>
                  )}
                </button>

                {/* 资源使用情况 */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <ResourceIndicator
                    icon="🖼️"
                    label="图片"
                    used={quota.remainingImages}
                    total={LIMITS.images.maxPerDay}
                    colorClass="text-pink-500"
                    gradientClass="from-pink-400 to-rose-500"
                  />
                  <ResourceIndicator
                    icon="📝"
                    label="文案"
                    used={quota.remainingTexts}
                    total={LIMITS.texts.maxPerDay}
                    colorClass="text-green-500"
                    gradientClass="from-green-400 to-emerald-500"
                  />
                  <ResourceIndicator
                    icon="🎬"
                    label="视频"
                    used={quota.remainingVideos}
                    total={10}
                    colorClass="text-purple-500"
                    gradientClass="from-purple-400 to-violet-500"
                  />
                </div>

                {/* VIP Banner */}
                <div className="mt-6 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 rounded-2xl p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">👑</span>
                      <div>
                        <p className="font-bold text-lg">解锁无限创作</p>
                        <p className="text-white/90 text-sm">升级会员享更多权益</p>
                      </div>
                    </div>
                    <Link to="/membership" className="px-5 py-2 bg-white text-amber-600 rounded-xl font-bold hover:bg-amber-50 transition-colors">
                      立即升级
                    </Link>
                  </div>
                </div>
              </>
            )}
          </GlassCard>

          {/* 创作结果展示 */}
          {result && user && (
            <GlassCard className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-pink-500/30">
                  <span className="text-2xl">🎨</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">创作结果</h2>
                  <p className="text-sm text-gray-500">你的 AI 创作成果</p>
                </div>
              </div>
              
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
            </GlassCard>
          )}

          {/* Footer Tips */}
          <div className="mt-6 p-4 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50">
            <p className="text-sm text-gray-600 flex items-start">
              <span className="mr-2 mt-0.5 text-lg">💡</span>
              <span>
                <strong>小技巧：</strong>描述越具体，AI 理解越准确。尝试包含主体、场景、风格、光线等细节描述。支持小红书、抖音、公众号等多种风格适配。
              </span>
            </p>
          </div>
        </main>

        {/* ==================== Footer ==================== */}
        <footer className="bg-white/50 backdrop-blur-xl border-t border-white/50 py-6 mt-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-gray-500 text-sm">
              © 2024 灵感山羊 · AI一键创作神器 · 5分钟搞定创作
            </p>
          </div>
        </footer>
      </div>
    </RainbowBackground>
  )
}

export default Home
