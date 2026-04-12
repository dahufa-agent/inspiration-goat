import React from 'react'

interface ResultCardProps {
  type: 'image' | 'text' | 'video'
  url?: string
  content?: string
}

const ResultCard: React.FC<ResultCardProps> = ({ type, url, content }) => {
  const handleDownload = () => {
    if (url) {
      const link = document.createElement('a')
      link.href = url
      link.download = `inspiration-goat-${type}-${Date.now()}`
      link.click()
    }
  }

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content)
      alert('已复制到剪贴板')
    }
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
      {type === 'image' && url && (
        <>
          <img src={url} alt="Generated" className="w-full h-auto" />
          <div className="p-4 flex justify-end">
            <button
              onClick={handleDownload}
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              保存图片
            </button>
          </div>
        </>
      )}
      
      {type === 'text' && content && (
        <div className="p-4">
          <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCopy}
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制文案
            </button>
          </div>
        </div>
      )}
      
      {type === 'video' && url && (
        <div className="p-4">
          <video src={url} controls className="w-full rounded-lg" />
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleDownload}
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              保存视频
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResultCard
