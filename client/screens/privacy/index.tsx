import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Screen } from "@/components/Screen";
import { FontAwesome6 } from "@expo/vector-icons";

export default function PrivacyScreen() {
  return (
    <Screen className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 标题区 */}
        <View className="px-4 pt-4 pb-6 bg-gradient-to-r from-blue-600 to-indigo-500">
          <Text className="text-2xl font-bold text-white">隐私政策</Text>
          <Text className="text-blue-100 mt-1">灵感山羊AI创作平台隐私保护说明</Text>
          <Text className="text-blue-200 text-xs mt-2">更新日期：2024年1月1日</Text>
        </View>

        {/* 内容 */}
        <View className="px-4 py-4">
          <Text className="text-gray-900 text-base leading-7">
            <Text className="font-bold">一、信息收集</Text>{"\n"}
            1. 账户信息：手机号码、昵称、头像等注册信息。{"\n"}
            2. 使用数据：生成内容记录、功能使用偏好。{"\n"}
            3. 设备信息：设备型号、操作系统版本等用于优化服务。{"\n"}
            4. 日志信息：IP地址、访问时间、浏览记录等。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">二、信息使用</Text>{"\n"}
            1. 提供和改进AI创作服务。{"\n"}
            2. 账户安全与身份验证。{"\n"}
            3. 发送服务通知和会员到期提醒。{"\n"}
            4. 数据分析与产品优化。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">三、信息共享</Text>{"\n"}
            1. 未经用户同意，不向第三方出售或泄露用户信息。{"\n"}
            2. 为提供服务和功能，可能与合作伙伴共享必要信息。{"\n"}
            3. 法律法规要求时，配合相关部门提供信息。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">四、信息存储</Text>{"\n"}
            1. 用户信息存储于中国大陆地区的服务器。{"\n"}
            2. 采取加密等技术手段保护用户信息安全。{"\n"}
            3. 用户注销账户后，信息将在合理期限内删除。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">五、用户权利</Text>{"\n"}
            1. 访问和查看个人信息的权利。{"\n"}
            2. 更正不准确信息的权利。{"\n"}
            3. 删除个人信息的权利。{"\n"}
            4. 注销账户的权利。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">六、Cookie使用</Text>{"\n"}
            本平台可能使用Cookie和类似技术改善用户体验，用户可在浏览器设置中关闭Cookie功能。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">七、未成年人保护</Text>{"\n"}
            我们重视未成年人隐私保护，未满18周岁用户请在监护人指导下使用本服务。
          </Text>

          <Text className="text-gray-500 text-sm leading-6 mt-6">
            如您对隐私政策有任何疑问，请联系：privacy@inspiration-goat.com
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
