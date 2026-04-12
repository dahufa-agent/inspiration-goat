import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { sendCode } from '../services/api'

const Register: React.FC = () => {
  const { register } = useAuth()
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [countdown])

  const validatePhone = (phone: string) => {
    return /^1[3-9]\d{9}$/.test(phone)
  }

  const validateUsername = (username: string) => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username)
  }

  const handleSendCode = async () => {
    if (!phone) {
      setError('请输入手机号')
      return
    }
    
    if (!validatePhone(phone)) {
      setError('请输入正确的手机号')
      return
    }
    
    try {
      await sendCode(phone, 'register')
      setCountdown(60)
      setError('')
    } catch (err: any) {
      // 改进错误处理
      const errorMsg = err?.response?.data?.message || err?.message || err || '发送验证码失败'
      setError(errorMsg)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!agreed) {
      setError('请同意服务条款和隐私政策')
      return
    }
    
    if (!validatePhone(phone)) {
      setError('请输入正确的手机号')
      return
    }
    
    if (!validateUsername(username)) {
      setError('用户名需为3-20位字母、数字或下划线')
      return
    }
    
    if (password !== confirmPassword) {
      setError('两次密码输入不一致')
      return
    }
    
    if (password.length < 6) {
      setError('密码至少6位')
      return
    }
    
    if (!code || code.length !== 6) {
      setError('请输入6位验证码')
      return
    }

    setLoading(true)
    
    try {
      await register(phone, username, password, code)
      window.location.href = '/'
    } catch (err: any) {
      // 改进错误处理
      const errorMsg = err?.response?.data?.message || err?.message || err || '注册失败'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-float delay-200"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-float delay-400"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="relative max-w-lg w-full mx-4">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <Link to="/" className="inline-flex items-center space-x-3">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
              <span className="text-white font-bold text-2xl">灵</span>
            </div>
            <span className="text-3xl font-bold text-white">灵感山羊</span>
          </Link>
        </div>

        {/* Register Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-scale-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">创建账号</h1>
            <p className="text-gray-500">开启你的 AI 创作之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone */}
            <div className="animate-fade-in-up delay-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                手机号 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📱</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-gray-800"
                  placeholder="请输入手机号"
                  maxLength={11}
                  required
                />
              </div>
            </div>

            {/* Username */}
            <div className="animate-fade-in-up delay-150">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                用户名 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-gray-800"
                  placeholder="3-20位字母、数字或下划线"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">登录时使用此用户名</p>
            </div>

            {/* Password */}
            <div className="animate-fade-in-up delay-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-gray-800"
                  placeholder="至少6位"
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

            {/* Confirm Password */}
            <div className="animate-fade-in-up delay-250">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔐</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-gray-800"
                  placeholder="请再次输入密码"
                  required
                />
                {confirmPassword && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2">
                    {password === confirmPassword ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-red-500">✗</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Verification Code */}
            <div className="animate-fade-in-up delay-300">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                验证码 <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔢</span>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-gray-800"
                    placeholder="请输入验证码"
                    maxLength={6}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || !validatePhone(phone)}
                  className={`px-5 py-4 rounded-2xl font-semibold transition-all duration-300 whitespace-nowrap ${
                    countdown > 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : !validatePhone(phone)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105'
                  }`}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">验证码将发送至您的手机</p>
            </div>

            {/* Agreement */}
            <div className="animate-fade-in-up delay-350">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm text-gray-600">
                  我已阅读并同意{' '}
                  <a href="#" className="text-indigo-600 hover:underline">服务条款</a>
                  {' '}和{' '}
                  <a href="#" className="text-indigo-600 hover:underline">隐私政策</a>
                </span>
              </label>
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
                  注册中...
                </>
              ) : (
                <>
                  立即注册
                  <span className="ml-2">✨</span>
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-8 text-center text-gray-600 animate-fade-in-up delay-400">
            已有账号？{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline">
              立即登录
            </Link>
            <span className="mx-2">|</span>
            <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              返回首页
            </Link>
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center animate-fade-in-up delay-500">
          {[
            { emoji: '🎁', text: '免费试用' },
            { emoji: '🔒', text: '数据安全' },
            { emoji: '💫', text: '持续更新' },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl py-3 px-2">
              <span className="text-xl">{item.emoji}</span>
              <p className="text-white/90 text-sm font-medium mt-1">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Register
