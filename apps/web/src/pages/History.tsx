import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { getHistory } from '../services/api'
import { useState, useEffect } from 'react'

const History: React.FC = () => {
  const { user } = useAuth()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [user])

  const loadHistory = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const deviceId = localStorage.getItem('device_id') || 'web-user'
      const data = await getHistory(deviceId)
      setHistory(data.history || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">历史记录</h1>
        <p className="text-gray-600">查看您的创作历史</p>
      </div>

      {!user ? (
        <div className="text-center py-12">
          <p className="text-gray-600">请先登录查看历史记录</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-6">
          {history.map((item, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {item.type || '创作'}
                </span>
              </div>
              <p className="text-gray-700 mb-4">{item.prompt || item.content || '无内容'}</p>
              {item.imageUrls && item.imageUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {item.imageUrls.map((url: string, i: number) => (
                    <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded-lg" />
                  ))}
                </div>
              )}
              {item.texts && item.texts.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 text-sm">{item.texts[0]}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无历史记录</p>
        </div>
      )}
    </div>
  )
}

export default History
