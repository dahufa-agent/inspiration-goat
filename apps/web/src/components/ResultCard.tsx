import React, { useState } from 'react'

interface ResultCardProps {
  type: 'image' | 'text' | 'video'
  url?: string
  content?: string
}

const ResultCard: React.FC<ResultCardProps> = ({ type, url, content }) => {
  const [copied, setCopied] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const handleDownload = () => {
    if (url) {
      const link = document.createElement('a')
      link.href = url
      link.download = `inspiration-goat-${type}-${Date.now()}`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleCopy = async () => {
    if (content) {
      try {
        await navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = content
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '灵感山羊 - AI创作',
          text: content || '查看我的AI创作',
          url: url || window.location.href,
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    }
  }

  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 card-hover"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Image Result */}
      {type === 'image' && url && (
        <div className="relative group">
          <img 
            src={url} 
            alt="Generated" 
            className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105" 
          />
          
          {/* Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
            showActions ? 'opacity-100' : ''
          }`}>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-white text-gray-800 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors flex items-center space-x-2 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>保存图片</span>
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium text-sm hover:bg-white/30 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>分享</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Text Result */}
      {type === 'text' && content && (
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">📝</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900">AI 文案</h4>
                <p className="text-xs text-gray-400">智能生成</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 mb-4">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopy}
              className={`flex-1 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>复制文案</span>
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Video Result */}
      {type === 'video' && url && (
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-violet-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🎬</span>
            </div>
            <div>
              <h4 className="font-bold text-gray-900">AI 视频</h4>
              <p className="text-xs text-gray-400">智能生成</p>
            </div>
          </div>
          
          <div className="relative rounded-xl overflow-hidden bg-gray-900 mb-4">
            <video 
              src={url} 
              controls 
              className="w-full rounded-xl" 
              poster=""
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>下载视频</span>
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResultCard
