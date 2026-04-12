import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">灵</span>
            </div>
            <span className="text-gray-600 text-sm">灵感山羊 © 2024</span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-500">
            <a href="#" className="hover:text-indigo-600 transition-colors">用户协议</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">隐私政策</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">联系我们</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
