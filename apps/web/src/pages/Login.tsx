import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Login: React.FC = () => {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      await login(username, password)
      window.location.href = '/'
    } catch (err: any) {
      // 改进错误处理
      const errorMsg = err?.response?.data?.message || err?.message || err || '登录失败'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-float delay-200"></div>
        <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-float delay-400"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="relative max-w-md w-full mx-4">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <Link to="/" className="inline-flex items-center space-x-3">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
              <span className="text-white font-bold text-2xl">灵</span>
            </div>
            <span className="text-3xl font-bold text-white">灵感山羊</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-scale-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">欢迎回来</h1>
            <p className="text-gray-500">登录到你的创作空间</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="animate-fade-in-up delay-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-gray-800"
                  placeholder="请输入用户名"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="animate-fade-in-up delay-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-gray-800"
                  placeholder="请输入密码"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl animate-shake">
                <div className="flex items-center">
                  <span className="text-xl mr-2">⚠️</span>
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  登录中...
                </>
              ) : (
                <>
                  登录
                  <span className="ml-2">→</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">或其他方式</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4 animate-fade-in-up delay-300">
            <button className="flex items-center justify-center py-3 px-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <span className="text-xl mr-2">📱</span>
              <span className="text-sm font-medium text-gray-600">手机登录</span>
            </button>
            <button className="flex items-center justify-center py-3 px-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <span className="text-xl mr-2">✉️</span>
              <span className="text-sm font-medium text-gray-600">邮箱登录</span>
            </button>
          </div>

          {/* Register Link */}
          <p className="mt-8 text-center text-gray-600 animate-fade-in-up delay-400">
            还没有账号？{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline">
              立即注册
            </Link>
            <span className="mx-2">|</span>
            <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              返回首页
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-white/60 text-sm animate-fade-in-up delay-500">
          登录即表示同意我们的{' '}
          <a href="#" className="text-white/80 hover:underline">服务条款</a>
          {' '}和{' '}
          <a href="#" className="text-white/80 hover:underline">隐私政策</a>
        </p>
      </div>
    </div>
  )
}

export default Login
