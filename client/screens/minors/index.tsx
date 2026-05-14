import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Screen } from "@/components/Screen";
import { FontAwesome6 } from "@expo/vector-icons";

export default function MinorsScreen() {
  return (
    <Screen className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 标题区 */}
        <View className="px-4 pt-4 pb-6 bg-gradient-to-r from-green-600 to-emerald-500">
          <Text className="text-2xl font-bold text-white">未成年人保护条款</Text>
          <Text className="text-green-100 mt-1">关于未成年用户使用本服务的特别说明</Text>
          <Text className="text-green-200 text-xs mt-2">依据：《未成年人保护法》《个人信息保护法》</Text>
        </View>

        {/* 内容 */}
        <View className="px-4 py-4">
          <Text className="text-gray-900 text-base leading-7">
            <Text className="font-bold">一、年龄限制</Text>{"\n"}
            1. 本服务面向18周岁及以上用户。{"\n"}
            2. 未满18周岁的用户应在监护人同意和指导下使用。{"\n"}
            3. 监护人有责任监督未成年人的使用行为。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">二、监护人须知</Text>{"\n"}
            1. 请了解子女使用本服务的内容和目的。{"\n"}
            2. 建议与子女讨论AI创作工具的正确使用方法。{"\n"}
            3. 关注子女使用时长，保护视力和身心健康。{"\n"}
            4. 如发现不当使用，请及时联系我们。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">三、内容保护</Text>{"\n"}
            1. 本平台不会收集不满14周岁儿童的个人信息。{"\n"}
            2. 未成年人注册时需提供真实年龄信息。{"\n"}
            3. 发现未成年人信息将被立即删除。{"\n"}
            4. 不得利用本服务诱导或欺骗未成年人。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">四、消费保护</Text>{"\n"}
            1. 未成年人购买会员需经监护人同意。{"\n"}
            2. 如发现未成年人未经授权消费，可申请退款。{"\n"}
            3. 积分购买设有单次消费上限。{"\n"}
            4. 客服有权要求验证监护人身份。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">五、举报机制</Text>{"\n"}
            如发现任何针对未成年人的不当内容或行为，请通过以下方式举报：{"\n"}
            举报邮箱：report@inspiration-goat.com{"\n"}
            我们将在24小时内进行处理。
          </Text>

          {/* 家长指引 */}
          <View className="bg-green-50 rounded-xl p-4 mt-4">
            <Text className="text-green-800 text-sm leading-6">
              <FontAwesome6 name="heart" size={14} color="#10B981" />{" "}
              <Text className="font-bold">给家长的建议：</Text>{"\n"}
              请与您的孩子共同探索AI工具，帮助他们理解AI的特点和局限性，培养批判性思维能力。AI是创作辅助工具，而非替代思考的手段。
            </Text>
          </View>

          <Text className="text-gray-500 text-sm leading-6 mt-6">
            联系我们：support@inspiration-goat.com
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
