import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Membership: React.FC = () => {
  const { user } = useAuth()

  const plans = [
    {
      name: '月度会员',
      period: '1个月',
      price: 29,
      emoji: '🌟',
      gradient: 'from-blue-500 to-cyan-500',
      features: [
        '每日20张图片',
        '每日10条文案',
        '每日10次视频生成',
        '优先处理队列',
      ],
    },
    {
      name: '季度会员',
      period: '3个月',
      price: 79,
      emoji: '💎',
      popular: true,
      gradient: 'from-purple-500 to-pink-500',
      features: [
        '每日30张图片',
        '每日20条文案',
        '每日20次视频生成',
        '优先处理队列',
        '专属客服支持',
      ],
    },
    {
      name: '年度会员',
      period: '12个月',
      price: 199,
      emoji: '👑',
      gradient: 'from-amber-500 to-orange-500',
      features: [
        '每日50张图片',
        '每日50条文案',
        '每日30次视频生成',
        '优先处理队列',
        '专属客服支持',
        '新功能优先体验',
      ],
    },
  ]

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">请先登录</h2>
          <p className="text-gray-600 mb-6">登录后即可开通会员</p>
          <Link
            to="/login"
            className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            立即登录
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1 rounded-full bg-white/20 text-white text-sm mb-4">
            ✨ 升级会员
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">解锁更多创作可能</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            升级会员，享受更多创作次数和高级功能，让你的创意无限释放
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Current Status */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-12 border border-indigo-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{user.username}</h2>
                <p className="text-gray-500">
                  {user.isPermanentVip ? '🏆 永久会员' : 
                   user.isVip ? `👑 VIP会员 (有效期至 ${user.vipEndDate})` : 
                   '🌱 普通用户'}
                </p>
              </div>
            </div>
            {!user.isVip && (
              <Link
                to="/register"
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                立即开通会员
              </Link>
            )}
          </div>
        </div>

        {/* Membership Tiers */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-3xl p-8 shadow-xl border-2 transition-all duration-300 hover:scale-105 ${
                plan.popular ? 'border-purple-500 shadow-2xl' : 'border-gray-100 hover:border-indigo-200'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm px-6 py-2 rounded-full font-bold shadow-lg">
                    ⭐ 最受欢迎
                  </span>
                </div>
              )}
              
              <div className={`w-16 h-16 bg-gradient-to-br ${plan.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                <span className="text-3xl">{plan.emoji}</span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{plan.period}</p>
              
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">¥{plan.price}</span>
                <span className="text-gray-400">/ {plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-gray-600">
                    <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-4 rounded-2xl font-bold transition-all duration-300 ${
                  plan.popular
                    ? `bg-gradient-to-r ${plan.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {plan.popular ? '立即开通' : '选择此方案'}
              </button>
            </div>
          ))}
        </div>

        {/* Permanent VIP */}
        <div className="bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl"></div>
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-sm mb-4">
                🏆 终极尊享
              </span>
              <h3 className="text-3xl font-bold mb-2">永久会员</h3>
              <p className="text-white/70 mb-4">一次购买，终身享用所有功能</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-yellow-400">¥599</span>
                <span className="text-white/50 line-through text-xl">¥999</span>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-yellow-200">✓ 无限次数图片生成</p>
                <p className="text-sm text-yellow-200">✓ 无限次数文案生成</p>
                <p className="text-sm text-yellow-200">✓ 无限次数视频生成</p>
                <p className="text-sm text-yellow-200">✓ 所有高级功能</p>
                <p className="text-sm text-yellow-200">✓ 专属客服支持</p>
              </div>
            </div>
            <button className="px-10 py-5 bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105 whitespace-nowrap">
              立即开通永久会员
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 bg-white rounded-3xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">常见问题</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { q: '会员到期后怎么办？', a: '会员到期后，未使用的次数将清零，但您的历史创作记录会保留。' },
              { q: '可以退款吗？', a: '7天内如对服务不满意，可申请全额退款。' },
              { q: '如何升级会员？', a: '选择您需要的会员方案，点击开通按钮即可完成升级。' },
              { q: '积分和会员有什么区别？', a: '会员是按日获取免费次数，积分可额外兑换更多创作次数。' },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-2xl">
                <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                  <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-2 text-sm">?</span>
                  {item.q}
                </h4>
                <p className="text-gray-600 text-sm ml-8">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Membership
