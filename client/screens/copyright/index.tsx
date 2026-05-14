import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Screen } from "@/components/Screen";
import { FontAwesome6 } from "@expo/vector-icons";

export default function CopyrightScreen() {
  return (
    <Screen className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 标题区 */}
        <View className="px-4 pt-4 pb-6 bg-gradient-to-r from-purple-600 to-pink-500">
          <Text className="text-2xl font-bold text-white">AI内容版权声明</Text>
          <Text className="text-purple-100 mt-1">关于AI生成内容的版权归属与使用规范</Text>
          <Text className="text-purple-200 text-xs mt-2">生效日期：2024年1月1日</Text>
        </View>

        {/* 内容 */}
        <View className="px-4 py-4">
          <Text className="text-gray-900 text-base leading-7">
            <Text className="font-bold">一、版权归属原则</Text>{"\n"}
            AI生成内容的版权归属较为复杂，我们遵循以下原则：{"\n"}
            1. 用户通过本平台付费生成的内容，用户享有署名权和使用权。{"\n"}
            2. 免费生成或公开分享的内容，平台保留展示和优化权利。{"\n"}
            3. AI生成内容不构成作品，不受传统著作权法完整保护。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">二、使用风险提示</Text>{"\n"}
            1. AI生成内容可能与现有作品存在相似性。{"\n"}
            2. 用户应自行审核生成内容的原创性。{"\n"}
            3. 商业使用前建议进行版权查重。{"\n"}
            4. 因内容相似性导致的纠纷由用户自行承担责任。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">三、商用授权说明</Text>{"\n"}
            1. 专业版及以上会员生成的内容可商用。{"\n"}
            2. 商用时请标注&quot;AI辅助创作&quot;。{"\n"}
            3. 不得将AI生成内容进行二次销售。{"\n"}
            4. 不得用于商标、专利等需要严格原创性的场景。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">四、平台权利保留</Text>{"\n"}
            1. 平台有权使用匿名化数据进行AI模型优化。{"\n"}
            2. 平台有权展示AI生成案例（经用户同意）。{"\n"}
            3. 违规内容导致平台损失，平台保留追诉权利。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">五、合规使用建议</Text>{"\n"}
            1. 重要商业文案请进行人工审核。{"\n"}
            2. 涉及医疗、法律等专业领域请咨询专业人士。{"\n"}
            3. 发布前检查各平台的内容规范。{"\n"}
            4. 保留生成记录作为权属证明。
          </Text>

          {/* 免责声明 */}
          <View className="bg-amber-50 rounded-xl p-4 mt-4">
            <Text className="text-amber-800 text-sm leading-6">
              <FontAwesome6 name="exclamation-triangle" size={14} color="#F59E0B" />{" "}
              <Text className="font-bold">免责声明：</Text>{"\n"}
              本平台不对AI生成内容的版权归属做任何保证，因使用AI生成内容导致的任何法律纠纷由用户自行承担。请您在使用前充分了解相关风险。
            </Text>
          </View>

          <Text className="text-gray-500 text-sm leading-6 mt-6">
            如有版权疑问，请联系：copyright@inspiration-goat.com
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
