import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal } from "react-native";
import { Screen } from "@/components/Screen";
import { FontAwesome6 } from "@expo/vector-icons";
import { Link } from "expo-router";

// 会员档次配置
const MEMBERSHIP_TIERS = [
  {
    id: "trial",
    name: "体验版",
    price: "免费",
    color: "bg-gray-100",
    borderColor: "border-gray-300",
    textColor: "text-gray-700",
    icon: "gift",
    features: [
      { text: "每日100积分", included: true },
      { text: "基础文案生成", included: true },
      { text: "基础图片生成", included: true },
      { text: "480P视频生成", included: true },
      { text: "水印标识", included: true },
      { text: "普通处理速度", included: false },
      { text: "高清无水印", included: false },
      { text: "优先队列", included: false },
    ],
  },
  {
    id: "creator",
    name: "创作者版",
    price: "19",
    period: "元/月",
    color: "bg-blue-50",
    borderColor: "border-blue-400",
    textColor: "text-blue-700",
    icon: "pen-nib",
    popular: false,
    features: [
      { text: "每日500积分", included: true },
      { text: "高级文案生成", included: true },
      { text: "13种国风风格", included: true },
      { text: "720P视频生成", included: true },
      { text: "去水印", included: true },
      { text: "2倍处理速度", included: false },
      { text: "1080P高清", included: false },
      { text: "优先队列", included: false },
    ],
  },
  {
    id: "professional",
    name: "专业版",
    price: "49",
    period: "元/月",
    color: "bg-gradient-to-br from-red-50 to-amber-50",
    borderColor: "border-red-500",
    textColor: "text-red-700",
    icon: "crown",
    popular: true,
    features: [
      { text: "每日2000积分", included: true },
      { text: "全部文案模板", included: true },
      { text: "13种国风+风格迁移", included: true },
      { text: "1080P高清视频", included: true },
      { text: "去水印+商用授权", included: true },
      { text: "3倍处理速度", included: true },
      { text: "4倍速优先队列", included: true },
      { text: "专属客服支持", included: true },
    ],
  },
  {
    id: "flagship",
    name: "旗舰版",
    price: "99",
    period: "元/月",
    color: "bg-gradient-to-br from-purple-50 to-pink-50",
    borderColor: "border-purple-500",
    textColor: "text-purple-700",
    icon: "gem",
    popular: false,
    features: [
      { text: "无限积分（每月10000）", included: true },
      { text: "全部高级功能", included: true },
      { text: "4K超清视频", included: true },
      { text: "一键三连不限次", included: true },
      { text: "全平台商用授权", included: true },
      { text: "5倍极速处理", included: true },
      { text: "8倍速优先队列", included: true },
      { text: "1对1专属顾问", included: true },
    ],
  },
];

// 积分档位配置
const POINTS_PACKAGES = [
  { id: "p1", points: 500, price: 9.9, bonus: 0 },
  { id: "p2", points: 2000, price: 29, bonus: 100 },
  { id: "p3", points: 5000, price: 59, bonus: 300 },
  { id: "p4", points: 10000, price: 99, bonus: 800 },
];

export default function MemberScreen() {
  const [activeTab, setActiveTab] = useState<"member" | "points">("member");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);

  const handleSubscribe = (tierId: string) => {
    setSelectedPackage(tierId);
    setShowPayModal(true);
  };

  const handlePay = () => {
    // 调用支付接口
    setShowPayModal(false);
  };

  return (
    <Screen className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 顶部标题 */}
        <View className="px-4 pt-4 pb-6 bg-gradient-to-r from-red-600 via-amber-500 to-red-600">
          <Text className="text-2xl font-bold text-white text-center">会员中心</Text>
          <Text className="text-red-100 text-center mt-1">解锁全部高级功能，创作无限可能</Text>
          <View className="flex-row justify-center mt-3">
            <View className="bg-white/20 rounded-full px-3 py-1 mr-2">
              <Text className="text-white text-xs">13种国风</Text>
            </View>
            <View className="bg-white/20 rounded-full px-3 py-1 mr-2">
              <Text className="text-white text-xs">一键三连</Text>
            </View>
            <View className="bg-white/20 rounded-full px-3 py-1">
              <Text className="text-white text-xs">全网最低价</Text>
            </View>
          </View>
        </View>

        {/* Tab切换 */}
        <View className="flex-row mx-4 mt-4 bg-gray-200 rounded-xl p-1">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg ${activeTab === "member" ? "bg-white shadow-sm" : ""}`}
            onPress={() => setActiveTab("member")}
          >
            <Text className={`text-center font-medium ${activeTab === "member" ? "text-red-600" : "text-gray-500"}`}>
              会员订阅
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-lg ${activeTab === "points" ? "bg-white shadow-sm" : ""}`}
            onPress={() => setActiveTab("points")}
          >
            <Text className={`text-center font-medium ${activeTab === "points" ? "text-red-600" : "text-gray-500"}`}>
              积分充值
            </Text>
          </TouchableOpacity>
        </View>

        {/* 会员订阅 */}
        {activeTab === "member" && (
          <View className="px-4 py-4">
            {MEMBERSHIP_TIERS.map((tier) => (
              <View
                key={tier.id}
                className={`${tier.color} rounded-2xl border-2 ${tier.borderColor} mb-4 ${tier.popular ? "mt-0" : ""}`}
              >
                {tier.popular && (
                  <View className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <View className="bg-gradient-to-r from-red-500 to-amber-500 rounded-full px-4 py-1">
                      <Text className="text-white text-xs font-bold">限时特惠</Text>
                    </View>
                  </View>
                )}
                <View className="p-4">
                  <View className="flex-row items-center mb-3">
                    <View className={`w-10 h-10 rounded-xl ${tier.color} items-center justify-center`}>
                      <FontAwesome6 name={tier.icon as any} size={20} color={tier.textColor} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="font-bold text-gray-900">{tier.name}</Text>
                      <Text className={`text-2xl font-bold ${tier.textColor}`}>
                        {tier.price}
                        {tier.period && <Text className="text-sm font-normal"> {tier.period}</Text>}
                      </Text>
                    </View>
                    {tier.popular && (
                      <View className="bg-gradient-to-r from-red-500 to-amber-500 rounded-full px-3 py-1">
                        <Text className="text-white text-xs font-bold">推荐</Text>
                      </View>
                    )}
                  </View>
                  <View className="space-y-2">
                    {tier.features.map((feature, idx) => (
                      <View key={idx} className="flex-row items-center">
                        <FontAwesome6
                          name={feature.included ? "check-circle" : "times-circle"}
                          size={14}
                          color={feature.included ? "#10B981" : "#D1D5DB"}
                        />
                        <Text className={`ml-2 text-sm ${feature.included ? "text-gray-700" : "text-gray-400"}`}>
                          {feature.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    className={`mt-4 py-3 rounded-xl ${tier.popular ? "bg-gradient-to-r from-red-500 to-amber-500" : "bg-gray-800"}`}
                    onPress={() => handleSubscribe(tier.id)}
                  >
                    <Text className="text-white text-center font-bold">
                      {tier.id === "trial" ? "当前方案" : "立即开通"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 积分充值 */}
        {activeTab === "points" && (
          <View className="px-4 py-4">
            <View className="bg-gradient-to-r from-amber-100 to-red-100 rounded-xl p-4 mb-4">
              <Text className="text-gray-700 text-sm">当前积分</Text>
              <Text className="text-3xl font-bold text-red-600">1,280</Text>
              <Text className="text-gray-500 text-xs mt-1">会员期间每日赠送，专属特权</Text>
            </View>

            <Text className="text-lg font-bold text-gray-900 mb-3">选择充值档位</Text>
            <View className="flex-row flex-wrap -mx-2">
              {POINTS_PACKAGES.map((pkg) => (
                <TouchableOpacity
                  key={pkg.id}
                  className={`w-1/2 px-2 mb-3`}
                  onPress={() => handleSubscribe(pkg.id)}
                >
                  <View className="bg-white rounded-xl border-2 border-gray-200 p-4 h-full">
                    {pkg.bonus > 0 && (
                      <View className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-amber-500 rounded-full px-2 py-0.5">
                        <Text className="text-white text-xs">送{pkg.bonus}</Text>
                      </View>
                    )}
                    <Text className="text-2xl font-bold text-gray-900">{pkg.points}</Text>
                    <Text className="text-gray-500 text-sm">积分</Text>
                    <Text className="text-lg font-bold text-red-600 mt-2">¥{pkg.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View className="bg-gray-100 rounded-xl p-4 mt-4">
              <Text className="font-bold text-gray-900 mb-2">积分使用说明</Text>
              <Text className="text-gray-600 text-sm leading-5">
                • 文案生成：10积分/次{"\n"}
                • 图片生成：50积分/张{"\n"}
                • 视频生成：200积分/个（5秒）{"\n"}
                • 一键三连：300积分/次{"\n"}
                • 积分有效期：购买后30天
              </Text>
            </View>

            {/* 合规提示 */}
            <View className="bg-amber-50 rounded-xl p-4 mt-4">
              <Text className="text-amber-800 text-xs leading-5">
                <FontAwesome6 name="info-circle" size={12} color="#F59E0B" />{" "}
                积分为虚拟货币，不可兑换现金，购买前请确认需求。退款政策参照各应用商店规定执行。
              </Text>
            </View>
          </View>
        )}

        {/* 底部合规链接 */}
        <View className="px-4 pb-8">
          <View className="flex-row justify-center flex-wrap">
            <Link href="/terms">
              <Text className="text-gray-400 text-xs mx-2">用户协议</Text>
            </Link>
            <Link href="/privacy">
              <Text className="text-gray-400 text-xs mx-2">隐私政策</Text>
            </Link>
            <Link href="/copyright">
              <Text className="text-gray-400 text-xs mx-2">版权声明</Text>
            </Link>
            <Link href="/minors">
              <Text className="text-gray-400 text-xs mx-2">未成年人保护</Text>
            </Link>
            <Link href="/guidelines">
              <Text className="text-gray-400 text-xs mx-2">内容规范</Text>
            </Link>
          </View>
        </View>
      </ScrollView>

      {/* 支付弹窗 */}
      <Modal visible={showPayModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-900">确认支付</Text>
              <TouchableOpacity onPress={() => setShowPayModal(false)}>
                <FontAwesome6 name="times" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text className="text-gray-600 mb-6">即将跳转到支付页面完成购买</Text>
            <TouchableOpacity
              className="bg-gradient-to-r from-red-500 to-amber-500 py-4 rounded-xl"
              onPress={handlePay}
            >
              <Text className="text-white text-center font-bold">确认支付</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
