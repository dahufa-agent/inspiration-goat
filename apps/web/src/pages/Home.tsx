import { useState, useEffect } from 'react'
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

const Home: React.FC = () => {
  const { user } = useAuth()
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [quota, setQuota] = useState<Quota>({ remainingImages: 0, remainingTexts: 0, remainingVideos: 0 })

  useEffect(() => {
    if (user) {
      loadQuota()
    }
  }, [user])

  const loadQuota = async () => {
    const deviceId = localStorage.getItem('device_id') || 'web-user'
    try {
      const remaining = await getRemainingEdits(deviceId)
      setQuota(remaining)
    } catch (err) {
      console.error('Failed to load quota:', err)
    }
  }

  const handleSuccess = (data: any) => {
    setResult(data)
    loadQuota()
  }

  const handleError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 3000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          一键生成创意内容
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          输入你的灵感，让 AI 为你生成图片、文案和视频
        </p>
      </div>

      {/* Quota Cards */}
      {user && (
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-indigo-600">{quota.remainingImages}</div>
            <div className="text-sm text-gray-500">图片次数</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-green-600">{quota.remainingTexts}</div>
            <div className="text-sm text-gray-500">文案次数</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-purple-600">{quota.remainingVideos}</div>
            <div className="text-sm text-gray-500">视频次数</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          {!user ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">登录后即可开始创作</p>
              <div className="flex justify-center space-x-4">
                <Link
                  to="/login"
                  className="px-6 py-2 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  注册
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">开始创作</h2>
              <InputForm onSuccess={handleSuccess} onError={handleError} />
            </>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">创作结果</h2>
          {result ? (
            <div className="space-y-4">
              {result.imageUrls?.map((url: string, i: number) => (
                <ResultCard key={`img-${i}`} type="image" url={url} />
              ))}
              {result.texts?.map((text: string, i: number) => (
                <ResultCard key={`text-${i}`} type="text" content={text} />
              ))}
              {result.videoUrl && (
                <ResultCard type="video" url={result.videoUrl} />
              )}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-8 text-center text-gray-500">
              暂无创作结果
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="mt-16 grid md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">AI 图片生成</h3>
          <p className="text-sm text-gray-600">输入描述，快速生成精美图片</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">智能文案</h3>
          <p className="text-sm text-gray-600">AI 帮你撰写优质文案内容</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">视频生成</h3>
          <p className="text-sm text-gray-600">一键生成动态视频内容</p>
        </div>
      </div>
    </div>
  )
}

export default Home
