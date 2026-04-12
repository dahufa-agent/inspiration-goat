import React from 'react'
import { Link } from 'react-router-dom'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">灵</span>
              </div>
              <div>
                <span className="text-xl font-bold">灵感山羊</span>
                <p className="text-xs text-gray-400">全网最强AI创作平台</p>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              释放创意，AI 赋能。灵感山羊致力于为创作者提供最优质的 AI 生成服务，让你的想法变成现实。
            </p>
            <div className="flex space-x-4">
              {['📧', '📱', '💬'].map((emoji, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-indigo-500 transition-colors duration-300"
                >
                  <span>{emoji}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center">
              <span className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center mr-2 text-sm">🔗</span>
              快速链接
            </h3>
            <ul className="space-y-4">
              {[
                { to: '/', label: '首页' },
                { to: '/history', label: '历史记录' },
                { to: '/membership', label: '会员中心' },
                { to: '/credits', label: '我的积分' },
              ].map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-indigo-500 mr-0 group-hover:mr-2 transition-all duration-200"></span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center">
              <span className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-2 text-sm">⚡</span>
              服务内容
            </h3>
            <ul className="space-y-4">
              {[
                { emoji: '🎨', label: 'AI 图片生成' },
                { emoji: '✍️', label: '智能文案撰写' },
                { emoji: '🎬', label: '视频内容生成' },
                { emoji: '✨', label: '内容润色优化' },
              ].map((item) => (
                <li key={item.label} className="text-gray-400 flex items-center group cursor-pointer hover:text-white transition-colors duration-200">
                  <span className="mr-2">{item.emoji}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center mr-2 text-sm">💬</span>
              帮助与支持
            </h3>
            <ul className="space-y-4">
              {[
                { label: '用户协议', emoji: '📄' },
                { label: '隐私政策', emoji: '🔒' },
                { label: '联系我们', emoji: '📞' },
                { label: '常见问题', emoji: '❓' },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center group"
                  >
                    <span className="mr-2">{item.emoji}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '10,000+', label: '活跃用户' },
              { value: '100,000+', label: '生成内容' },
              { value: '99.9%', label: '服务可用性' },
              { value: '24/7', label: '客户支持' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">
                © 2024 灵感山羊. 保留所有权利.
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">用户协议</a>
              <a href="#" className="hover:text-white transition-colors">隐私政策</a>
              <a href="#" className="hover:text-white transition-colors">联系我们</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
