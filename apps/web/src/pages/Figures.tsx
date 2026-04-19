import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://112.124.105.236:8080'

interface HistoricalFigure {
  id: number
  name: string
  era: string
  title: string
  description: string
  achievements: string[]
}

const FiguresPage: React.FC = () => {
  const [figures, setFigures] = useState<HistoricalFigure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFigure, setSelectedFigure] = useState<HistoricalFigure | null>(null)

  useEffect(() => {
    fetchFigures()
  }, [])

  const fetchFigures = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${BACKEND_URL}/api/v1/guoxue/figures/all`)
      if (!response.ok) throw new Error('获取人物失败')
      const data = await response.json()
      setFigures(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取时代分组
  const eraGroups = figures.reduce((acc, figure) => {
    const era = figure.era.split('-')[0]
    if (!acc[era]) acc[era] = []
    acc[era].push(figure)
    return acc
  }, {} as Record<string, HistoricalFigure[]>)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="text-5xl">👑</span>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              历史人物
            </h1>
            <span className="text-5xl">📚</span>
          </div>
          <p className="text-gray-600 text-lg">了解千古风流人物，感悟历史智慧</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={fetchFigures}
              className="px-6 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition"
            >
              重试
            </button>
          </div>
        )}

        {/* Figures Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {figures.map(figure => (
              <div 
                key={figure.id}
                onClick={() => setSelectedFigure(figure)}
                className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar Placeholder */}
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {figure.name.charAt(0)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-gray-800">{figure.name}</h3>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        {figure.era}
                      </span>
                    </div>
                    <p className="text-indigo-600 text-sm font-medium mb-2">{figure.title}</p>
                    <p className="text-gray-600 text-sm line-clamp-2">{figure.description}</p>
                    
                    {/* Achievements Preview */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {figure.achievements.slice(0, 3).map((ach, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {ach}
                        </span>
                      ))}
                      {figure.achievements.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                          +{figure.achievements.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedFigure && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedFigure(null)}
          >
            <div 
              className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-3xl relative">
                <button 
                  onClick={() => setSelectedFigure(null)}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
                >
                  ✕
                </button>
                
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-purple-600 text-3xl font-bold">
                    {selectedFigure.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedFigure.name}</h2>
                    <p className="text-purple-200">{selectedFigure.era}</p>
                    <p className="text-amber-300 font-medium">{selectedFigure.title}</p>
                  </div>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">人物简介</h3>
                <p className="text-gray-600 leading-relaxed mb-6">{selectedFigure.description}</p>
                
                <h3 className="text-lg font-bold text-gray-800 mb-3">主要成就</h3>
                <div className="space-y-2">
                  {selectedFigure.achievements.map((ach, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl"
                    >
                      <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700">{ach}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && figures.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无人物数据</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default FiguresPage
