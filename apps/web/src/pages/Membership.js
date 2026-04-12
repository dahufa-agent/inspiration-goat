import React from 'react';
import { useAuth } from '../hooks/useAuth';
const Membership = () => {
    const { user } = useAuth();
    const plans = [
        {
            name: '月度会员',
            period: '1个月',
            price: 29,
            features: [
                '每日20张图片',
                '每日10条文案',
                '每日10次视频生成',
                '优先处理队列',
            ],
        },
        {
            name: '季度会员',
            period: '3个月',
            price: 79,
            popular: true,
            features: [
                '每日30张图片',
                '每日20条文案',
                '每日20次视频生成',
                '优先处理队列',
                '专属客服支持',
            ],
        },
        {
            name: '年度会员',
            period: '12个月',
            price: 199,
            features: [
                '每日50张图片',
                '每日50条文案',
                '每日30次视频生成',
                '优先处理队列',
                '专属客服支持',
                '新功能优先体验',
            ],
        },
    ];
    return (<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">升级会员</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          解锁更多创作次数，享受更高级的 AI 生成服务
        </p>
      </div>

      {/* Current Status */}
      {user && (<div className="bg-indigo-50 rounded-2xl p-6 mb-12 max-w-2xl mx-auto">
          <h2 className="font-semibold text-gray-900 mb-4">当前状态</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">用户名</p>
              <p className="font-medium text-gray-900">{user.username}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">会员状态</p>
              <p className="font-medium text-indigo-600">
                {user.isPermanentVip ? '永久会员' : user.isVip ? `有效期至 ${user.vipEndDate}` : '普通用户'}
              </p>
            </div>
          </div>
        </div>)}

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (<div key={plan.name} className={`bg-white rounded-2xl p-8 shadow-sm border-2 ${plan.popular ? 'border-indigo-500 relative' : 'border-gray-100'}`}>
            {plan.popular && (<div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-500 text-white text-sm px-4 py-1 rounded-full">
                  最受欢迎
                </span>
              </div>)}
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{plan.period}</p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">¥{plan.price}</span>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature) => (<li key={feature} className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                  </svg>
                  {feature}
                </li>))}
            </ul>

            <button className={`w-full py-3 rounded-xl font-medium transition-colors ${plan.popular
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              立即开通
            </button>
          </div>))}
      </div>

      {/* Permanent VIP */}
      <div className="mt-12 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-2xl p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">永久会员</h3>
            <p className="text-gray-600 mb-4">一次购买，终身享用</p>
            <p className="text-3xl font-bold text-amber-600">¥599</p>
          </div>
          <button className="px-8 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors">
            立即开通
          </button>
        </div>
      </div>
    </div>);
};
export default Membership;
