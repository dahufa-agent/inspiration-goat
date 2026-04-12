import React, { useState, useEffect } from 'react'
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
    if (!user) return
    
    try {
      const [creditsData, recordsData] = await Promise.all([
        getCredits(user.id),
        getCreditRecords(user.id),
      ])
      setCredits(creditsData.balance)
      setRecords(recordsData)
    } catch (err) {
      console.error('Failed to load credits:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRecharge = () => {
    // TODO: 集成支付
    alert('支付功能即将上线')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">我的积分</h1>
        <p className="text-gray-600">查看积分余额和消费记录</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 mb-2">当前积分余额</p>
            <p className="text-5xl font-bold">{loading ? '-' : credits}</p>
          </div>
          <button
            onClick={handleRecharge}
            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-medium hover:bg-indigo-50 transition-colors"
          >
            充值积分
          </button>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">积分定价</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <p className="text-3xl font-bold text-gray-900">10</p>
            <p className="text-gray-600 mt-2">积分</p>
            <p className="text-indigo-600 font-medium mt-2">¥1</p>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <p className="text-3xl font-bold text-gray-900">100</p>
            <p className="text-gray-600 mt-2">积分</p>
            <p className="text-indigo-600 font-medium mt-2">¥9</p>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <p className="text-3xl font-bold text-gray-900">500</p>
            <p className="text-gray-600 mt-2">积分</p>
            <p className="text-indigo-600 font-medium mt-2">¥39</p>
          </div>
          <div className="text-center p-6 bg-indigo-50 rounded-xl border-2 border-indigo-200">
            <p className="text-3xl font-bold text-gray-900">1000</p>
            <p className="text-gray-600 mt-2">积分</p>
            <p className="text-indigo-600 font-medium mt-2">¥69</p>
            <span className="inline-block mt-2 text-xs bg-indigo-500 text-white px-2 py-1 rounded">赠送15%</span>
          </div>
        </div>
      </div>

      {/* Usage Rules */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">积分消耗规则</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">图片生成</p>
              <p className="text-sm text-gray-600">超出免费次数后</p>
            </div>
            <p className="font-semibold text-indigo-600">1积分/张</p>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">文案生成</p>
              <p className="text-sm text-gray-600">超出免费次数后</p>
            </div>
            <p className="font-semibold text-indigo-600">2积分/条</p>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">视频生成</p>
              <p className="text-sm text-gray-600">基础5秒，超出按5秒计</p>
            </div>
            <p className="font-semibold text-indigo-600">10积分/5秒</p>
          </div>
        </div>
      </div>

      {/* Records */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">积分记录</h2>
        {loading ? (
          <p className="text-center text-gray-500 py-8">加载中...</p>
        ) : records.length > 0 ? (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900">{record.description}</p>
                  <p className="text-sm text-gray-500">{new Date(record.createdAt).toLocaleString()}</p>
                </div>
                <p className={`font-semibold ${record.type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                  {record.type === 'earn' ? '+' : '-'}{record.amount}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">暂无积分记录</p>
        )}
      </div>
    </div>
  )
}

export default Credits
