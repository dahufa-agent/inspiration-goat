import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getCredits, getCreditRecords } from '../services/api'

const Credits: React.FC = () => {
  const { user } = useAuth()
  const [credits, setCredits] = useState(0)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) {
      setLoading(false)
      return
    }
    
    try {
      const [creditsData, recordsData] = await Promise.all([
        getCredits(user.id),
        getCreditRecords(user.id),
      ])
      setCredits(creditsData?.balance || 0)
      setRecords(recordsData || [])
    } catch (err) {
      console.error('Failed to load credits:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRecharge = () => {
    alert('支付功能即将上线，敬请期待！')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">请先登录</h2>
          <p className="text-gray-600 mb-6">登录后即可查看积分</p>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">💎 我的积分</h1>
          <p className="text-white/80">查看积分余额和消费记录</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 md:p-12 text-white mb-8 relative overflow-hidden shadow-2xl">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p className="text-indigo-200 mb-2 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                当前积分余额
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-6xl md:text-7xl font-bold">
                  {loading ? '-' : credits.toLocaleString()}
                </span>
                <span className="text-2xl text-indigo-200">积分</span>
              </div>
              <p className="mt-4 text-indigo-200 text-sm">
                💡 积分可用于兑换额外的创作次数
              </p>
            </div>
            <button
              onClick={handleRecharge}
              className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105 whitespace-nowrap"
            >
              ⚡ 充值积分
            </button>
          </div>
        </div>

        {/* Pricing Table */}
        <div className="bg-white rounded-3xl p-8 shadow-xl mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-2">💰</span>
            积分定价
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { amount: 10, price: 1, bonus: 0 },
              { amount: 100, price: 9, bonus: 0 },
              { amount: 500, price: 39, bonus: 0 },
              { amount: 1000, price: 69, bonus: 150, popular: true },
            ].map((pkg, i) => (
              <div
                key={i}
                className={`relative p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-105 ${
                  pkg.popular 
                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50' 
                    : 'border-gray-100 hover:border-indigo-200'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-full">
                    最划算
                  </span>
                )}
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{pkg.amount}</div>
                  <div className="text-sm text-gray-500 mb-2">积分</div>
                  <div className="text-2xl font-bold text-indigo-600">¥{pkg.price}</div>
                  {pkg.bonus > 0 && (
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-600 text-xs font-bold rounded-full">
                      +{pkg.bonus} 赠送
                    </span>
                  )}
                  <button
                    onClick={handleRecharge}
                    className={`w-full mt-4 py-2 rounded-xl font-medium transition-all ${
                      pkg.popular
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    购买
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Rules */}
        <div className="bg-white rounded-3xl p-8 shadow-xl mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-2">📊</span>
            积分消耗规则
          </h2>
          <div className="space-y-4">
            {[
              { emoji: '🖼️', name: '图片生成', desc: '超出免费次数后', cost: '1积分/张', color: 'pink' },
              { emoji: '📝', name: '文案生成', desc: '超出免费次数后', cost: '2积分/条', color: 'green' },
              { emoji: '🎬', name: '视频生成', desc: '基础5秒，超出按5秒计', cost: '10积分/5秒', color: 'purple' },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-5 bg-${item.color}-50 rounded-2xl border border-${item.color}-100`}
                style={{
                  background: item.color === 'pink' ? '#fdf2f8' : item.color === 'green' ? '#f0fdf4' : '#faf5ff',
                  borderColor: item.color === 'pink' ? '#fbcfe8' : item.color === 'green' ? '#bbf7d0' : '#e9d5ff'
                }}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">{item.emoji}</span>
                  <div>
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
                <div className={`text-xl font-bold ${
                  item.color === 'pink' ? 'text-pink-600' : 
                  item.color === 'green' ? 'text-green-600' : 'text-purple-600'
                }`}>
                  {item.cost}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Records */}
        <div className="bg-white rounded-3xl p-8 shadow-xl">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-2">📜</span>
            积分记录
          </h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : records.length > 0 ? (
            <div className="space-y-4">
              {records.map((record, i) => (
                <div
                  key={record.id || i}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      record.type === 'earn' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <span>{record.type === 'earn' ? '📈' : '📉'}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{record.description || '积分变动'}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(record.createdAt || Date.now()).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold text-lg ${
                    record.type === 'earn' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {record.type === 'earn' ? '+' : '-'}{record.amount}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-500">暂无积分记录</p>
              <p className="text-sm text-gray-400 mt-2">开始充值或使用服务后将显示记录</p>
            </div>
          )}
        </div>

        {/* Daily Check-in */}
        <div className="mt-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl p-8 text-white text-center shadow-xl">
          <span className="text-5xl mb-4 block">🎁</span>
          <h3 className="text-2xl font-bold mb-2">每日签到</h3>
          <p className="text-white/80 mb-4">每天签到可获得随机积分奖励</p>
          <button className="px-8 py-3 bg-white text-green-600 rounded-xl font-bold hover:shadow-lg transition-all">
            立即签到
          </button>
        </div>
      </div>
    </div>
  )
}

export default Credits
