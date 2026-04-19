import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://112.124.105.236:8080'

interface Poem {
  id: number
  title: string
  author: string
  content: string
  tag: string
}

const PoetryPage: React.FC = () => {
  const [poems, setPoems] = useState<Poem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('全部')
  const [expandedPoem, setExpandedPoem] = useState<number | null>(null)

  useEffect(() => {
    fetchPoems()
  }, [])

  const fetchPoems = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${BACKEND_URL}/api/v1/guoxue/poems/all`)
      if (!response.ok) throw new Error('获取诗词失败')
      const data = await response.json()
      setPoems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取所有标签
  const allTags = ['全部', ...new Set(poems.map(p => p.tag))]

  // 筛选诗词
  const filteredPoems = selectedTag === '全部' 
    ? poems 
    : poems.filter(p => p.tag === selectedTag)

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="text-5xl">📜</span>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              经典诗词
            </h1>
            <span className="text-5xl">🖌️</span>
          </div>
          <p className="text-gray-600 text-lg">品味中华诗词之美，传承千年文化精髓</p>
        </div>

        {/* Tags Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTag === tag
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-amber-100 shadow'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={fetchPoems}
              className="px-6 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition"
            >
              重试
            </button>
          </div>
        )}

        {/* Poems Grid */}
        {!loading && !error && (
          <div className="grid gap-6">
            {filteredPoems.map(poem => (
              <div 
                key={poem.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedPoem(expandedPoem === poem.id ? null : poem.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{poem.title}</h3>
                      <p className="text-amber-600 text-sm">— {poem.author}</p>
                    </div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      {poem.tag}
                    </span>
                  </div>
                  
                  {/* Preview */}
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {expandedPoem === poem.id ? poem.content : poem.content.split('\n')[0]}
                  </p>
                  
                  {/* Expand Button */}
                  <div className="mt-3 flex items-center gap-2 text-amber-600">
                    <span className="text-sm">
                      {expandedPoem === poem.id ? '收起' : '展开全文'}
                    </span>
                    <span className="transform transition-transform">
                      {expandedPoem === poem.id ? '▲' : '▼'}
                    </span>
                  </div>
                </div>
                
                {/* Expanded Content */}
                {expandedPoem === poem.id && (
                  <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4">
                      <p className="text-gray-700 leading-loose whitespace-pre-line font-medium">
                        {poem.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPoems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无诗词</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default PoetryPage
