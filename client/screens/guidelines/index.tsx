import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Screen } from "@/components/Screen";
import { FontAwesome6 } from "@expo/vector-icons";

export default function GuidelinesScreen() {
  return (
    <Screen className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 标题区 */}
        <View className="px-4 pt-4 pb-6 bg-gradient-to-r from-orange-600 to-red-500">
          <Text className="text-2xl font-bold text-white">内容合规使用提示</Text>
          <Text className="text-orange-100 mt-1">AI创作内容规范与各平台要求</Text>
          <Text className="text-orange-200 text-xs mt-2">请务必遵守，否则后果自负</Text>
        </View>

        {/* 禁止内容 */}
        <View className="px-4 py-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            <FontAwesome6 name="ban" size={18} color="#EF4444" /> 禁止生成内容
          </Text>
          <View className="bg-red-50 rounded-xl p-4 mb-4">
            <Text className="text-red-800 text-sm leading-6">
              1. 违法内容：涉黄、涉毒、涉赌、涉暴等{"\n"}
              2. 政治敏感：领导人负面、政党丑闻、分裂国家等{"\n"}
              3. 虚假信息：谣言、欺诈、误导性内容{"\n"}
              4. 侵权内容：抄袭、盗用他人作品{"\n"}
              5. 歧视内容：种族歧视、性别歧视、地域歧视{"\n"}
              6. 隐私内容：个人隐私、人肉搜索
            </Text>
          </View>

          {/* 各平台规范 */}
          <Text className="text-lg font-bold text-gray-900 mb-3 mt-4">
            <FontAwesome6 name="globe" size={18} color="#3B82F6" /> 各平台内容规范
          </Text>

          {/* 抖音 */}
          <View className="bg-gray-50 rounded-xl p-4 mb-3">
            <Text className="font-bold text-gray-900">抖音</Text>
            <Text className="text-gray-600 text-sm mt-1">- 不得含有垃圾广告、联系方式{"\n"}
            - 不得搬运、抄袭他人作品{"\n"}
            - 医疗、金融类内容需资质认证{"\n"}
            - 不得诱导未成年人行为</Text>
          </View>

          {/* 小红书 */}
          <View className="bg-gray-50 rounded-xl p-4 mb-3">
            <Text className="font-bold text-gray-900">小红书</Text>
            <Text className="text-gray-600 text-sm mt-1">- 不得含有外链、二维码{"\n"}
            - 不得虚假种草、刷单炒信{"\n"}
            - 医疗美妆类需资质审核{"\n"}
            - 不得过度美颜、虚假宣传</Text>
          </View>

          {/* 快手 */}
          <View className="bg-gray-50 rounded-xl p-4 mb-3">
            <Text className="font-bold text-gray-900">快手</Text>
            <Text className="text-gray-600 text-sm mt-1">- 不得含有联系方式、微信号{"\n"}
            - 不得进行虚假宣传{"\n"}
            - 直播带货需资质认证{"\n"}
            - 不得传播封建迷信</Text>
          </View>

          {/* B站 */}
          <View className="bg-gray-50 rounded-xl p-4 mb-3">
            <Text className="font-bold text-gray-900">B站</Text>
            <Text className="text-gray-600 text-sm mt-1">- 不得含有引战、ky内容{"\n"}
            - 不得搬运未授权内容{"\n"}
            - 视频原创度需≥70%{"\n"}
            - 不得传播不良价值观</Text>
          </View>

          {/* 微博 */}
          <View className="bg-gray-50 rounded-xl p-4 mb-3">
            <Text className="font-bold text-gray-900">微博</Text>
            <Text className="text-gray-600 text-sm mt-1">- 不得传播谣言、虚假信息{"\n"}
            - 不得刷量、买粉{"\n"}
            - 不得人身攻击、侵犯隐私{"\n"}
            - 热搜话题需遵守平台规则</Text>
          </View>

          {/* 视频号 */}
          <View className="bg-gray-50 rounded-xl p-4 mb-4">
            <Text className="font-bold text-gray-900">视频号</Text>
            <Text className="text-gray-600 text-sm mt-1">- 不得含有导流、引流内容{"\n"}
            - 不得进行虚假宣传{"\n"}
            - 不得传播未经证实信息{"\n"}
            - 需遵守微信生态规则</Text>
          </View>

          {/* 免责声明 */}
          <View className="bg-amber-50 rounded-xl p-4">
            <Text className="text-amber-800 text-sm leading-6">
              <FontAwesome6 name="exclamation-circle" size={14} color="#F59E0B" />{" "}
              <Text className="font-bold">重要提示：</Text>{"\n"}
              用户使用本平台生成的内容需遵守上述规范，因违规内容导致的账号处罚、法律责任由用户自行承担。本平台有权对违规内容进行拦截和删除。
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
