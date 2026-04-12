import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getHistory } from '../services/api'

interface HistoryItem {
  id: string
  type: 'image' | 'text' | 'video'
  prompt: string
  result: any
  createdAt: string
}

const History: React.FC = () => {
  const { user } = useAuth()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'image' | 'text' | 'video'>('all')

  useEffect(() => {
    loadHistory()
  }, [user])

  const loadHistory = async () => {
    if (!user) return
    
    const deviceId = localStorage.getItem('device_id') || 'web-user'
    try {
      const data = await getHistory(deviceId)
      setHistory(data.items || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter(item => item.type === filter)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">请先登录</h2>
          <p className="text-gray-600 mb-6">登录后即可查看您的创作历史</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">📝 历史记录</h1>
              <p className="text-white/80">查看和管理你的所有创作</p>
            </div>
            <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
              <span className="text-white">共</span>
              <span className="text-white font-bold text-xl">{history.length}</span>
              <span className="text-white">条记录</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-8 flex flex-wrap gap-2">
          {[
            { key: 'all', label: '全部', emoji: '📋' },
            { key: 'image', label: '图片', emoji: '🖼️' },
            { key: 'text', label: '文案', emoji: '📝' },
            { key: 'video', label: '视频', emoji: '🎬' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key as any)}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                filter === item.key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* History List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="grid gap-6">
            {filteredHistory.map((item, index) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-lg p-6 card-hover animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      item.type === 'image' ? 'bg-pink-100' :
                      item.type === 'text' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      <span className="text-2xl">
                        {item.type === 'image' ? '🖼️' : item.type === 'text' ? '📝' : '🎬'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 capitalize">{item.type} - #{item.id.slice(-6)}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="text-xl">⋮</span>
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-500 mb-1">创作灵感</p>
                  <p className="text-gray-800">{item.prompt}</p>
                </div>

                {item.type === 'image' && item.result?.imageUrls && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {item.result.imageUrls.map((url: string, i: number) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={url} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                )}

                {item.type === 'text' && item.result?.texts && (
                  <div className="space-y-2">
                    {item.result.texts.map((text: string, i: number) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 whitespace-pre-wrap">{text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {item.type === 'video' && item.result?.videoUrl && (
                  <video src={item.result.videoUrl} controls className="w-full rounded-lg" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">暂无记录</h3>
            <p className="text-gray-500 mb-6">开始你的第一次创作吧！</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              去创作
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default History
