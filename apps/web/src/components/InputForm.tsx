import React, { useState } from 'react'
import { generateAll } from '../services/api'

interface InputFormProps {
  onSuccess: (result: any) => void
  onError: (error: string) => void
}

const InputForm: React.FC<InputFormProps> = ({ onSuccess, onError }) => {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState({
    generateImage: true,
    generateText: true,
    generateVideo: false,
  })
  const [selectedStyle, setSelectedStyle] = useState('general')

  const styles = [
    { key: 'general', label: '通用', emoji: '✨' },
    { key: 'creative', label: '创意', emoji: '🎨' },
    { key: 'professional', label: '专业', emoji: '💼' },
    { key: 'cute', label: '可爱', emoji: '🌸' },
    { key: 'cool', label: '酷炫', emoji: '⚡' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      onError('请输入创作灵感')
      return
    }

    // 检查是否至少选择一个生成选项
    if (!options.generateImage && !options.generateText && !options.generateVideo) {
      onError('请至少选择一个生成选项')
      return
    }

    setLoading(true)
    try {
      const result = await generateAll({
        prompt,
        deviceId: localStorage.getItem('device_id') || 'web-user',
        ...options,
      })
      onSuccess(result)
    } catch (err: any) {
      // 改进错误处理
      const errorMsg = err?.response?.data?.message || err?.message || err || '生成失败'
      onError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Style Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          <span className="flex items-center">
            <span className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center mr-2 text-sm">🎨</span>
            选择风格
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          {styles.map((style) => (
            <button
              key={style.key}
              type="button"
              onClick={() => setSelectedStyle(style.key)}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                selectedStyle === style.key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{style.emoji}</span>
              <span>{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Input */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          <span className="flex items-center">
            <span className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center mr-2 text-sm">💡</span>
            创作灵感
          </span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要生成的内容...&#10;例如：一只可爱的猫咪在草地上玩耍，阳光明媚"
          className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none text-gray-800 leading-relaxed"
          rows={5}
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-400">
            💡 描述越详细，生成效果越好
          </p>
          <p className="text-xs text-gray-400">
            {prompt.length}/500
          </p>
        </div>
      </div>

      {/* Generation Options */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          <span className="flex items-center">
            <span className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center mr-2 text-sm">⚙️</span>
            生成选项
          </span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {/* Image Option */}
          <button
            type="button"
            onClick={() => setOptions({ ...options, generateImage: !options.generateImage })}
            className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
              options.generateImage
                ? 'border-pink-500 bg-gradient-to-br from-pink-50 to-rose-50 shadow-lg scale-[1.02]'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${
              options.generateImage ? 'bg-pink-500' : 'bg-gray-200'
            }`}>
              <span className="text-2xl">🖼️</span>
            </div>
            <p className={`font-medium ${options.generateImage ? 'text-pink-600' : 'text-gray-600'}`}>
              AI 图片
            </p>
            <p className={`text-xs mt-1 ${options.generateImage ? 'text-pink-400' : 'text-gray-400'}`}>
              {options.generateImage ? '✓ 已选择' : '点击开启'}
            </p>
          </button>

          {/* Text Option */}
          <button
            type="button"
            onClick={() => setOptions({ ...options, generateText: !options.generateText })}
            className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
              options.generateText
                ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg scale-[1.02]'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${
              options.generateText ? 'bg-green-500' : 'bg-gray-200'
            }`}>
              <span className="text-2xl">📝</span>
            </div>
            <p className={`font-medium ${options.generateText ? 'text-green-600' : 'text-gray-600'}`}>
              智能文案
            </p>
            <p className={`text-xs mt-1 ${options.generateText ? 'text-green-400' : 'text-gray-400'}`}>
              {options.generateText ? '✓ 已选择' : '点击开启'}
            </p>
          </button>

          {/* Video Option */}
          <button
            type="button"
            onClick={() => setOptions({ ...options, generateVideo: !options.generateVideo })}
            className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
              options.generateVideo
                ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-violet-50 shadow-lg scale-[1.02]'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${
              options.generateVideo ? 'bg-purple-500' : 'bg-gray-200'
            }`}>
              <span className="text-2xl">🎬</span>
            </div>
            <p className={`font-medium ${options.generateVideo ? 'text-purple-600' : 'text-gray-600'}`}>
              视频生成
            </p>
            <p className={`text-xs mt-1 ${options.generateVideo ? 'text-purple-400' : 'text-gray-400'}`}>
              {options.generateVideo ? '✓ 已选择' : '点击开启'}
            </p>
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02]'
        }`}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="loading-dots">AI 创作中</span>
          </>
        ) : (
          <>
            <span className="text-2xl mr-2">✨</span>
            <span>一键创作</span>
            <span className="ml-2">→</span>
          </>
        )}
      </button>

      {/* Tips */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl">
        <p className="text-sm text-indigo-600 flex items-start">
          <span className="mr-2 mt-0.5">💡</span>
          <span>
            <strong>小技巧：</strong>描述越具体，AI 理解越准确。尝试包含主体、场景、风格、光线等细节描述。
          </span>
        </p>
      </div>
    </form>
  )
}

export default InputForm
