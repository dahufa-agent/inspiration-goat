import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Screen } from "@/components/Screen";
import { FontAwesome6 } from "@expo/vector-icons";

export default function TermsScreen() {
  return (
    <Screen className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 标题区 */}
        <View className="px-4 pt-4 pb-6 bg-gradient-to-r from-red-600 to-amber-500">
          <Text className="text-2xl font-bold text-white">用户协议</Text>
          <Text className="text-red-100 mt-1">灵感山羊AI创作平台服务协议</Text>
          <Text className="text-red-200 text-xs mt-2">更新日期：2024年1月1日</Text>
        </View>

        {/* 内容 */}
        <View className="px-4 py-4">
          <Text className="text-gray-900 text-base leading-7">
            <Text className="font-bold">一、服务说明</Text>{"\n"}
            灵感山羊AI创作平台（以下简称&quot;本平台&quot;）为用户提供AI文案生成、图片生成、视频生成等智能创作服务。用户在使用本平台服务前，应仔细阅读本协议的全部内容。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">二、账户注册</Text>{"\n"}
            1. 用户应年满18周岁，或已取得监护人同意方可注册账户。{"\n"}
            2. 用户应提供真实、准确、完整的注册信息，不得冒用他人身份。{"\n"}
            3. 用户对账户安全负责，因个人原因导致的账户被盗用由用户承担责任。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">三、服务使用</Text>{"\n"}
            1. 用户可使用本平台生成文案、图片、视频等内容。{"\n"}
            2. 用户不得利用本平台生成违法、有害、侵权、违规内容。{"\n"}
            3. 用户应遵守各社交平台的内容发布规范。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">四、知识产权</Text>{"\n"}
            1. 用户使用本平台生成的内容，用户享有署名权和使用权。{"\n"}
            2. AI生成内容可能存在相似性，用户应自行判断并承担风险。{"\n"}
            3. 本平台保留对服务优化和技术改进的权利。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">五、积分与会员</Text>{"\n"}
            1. 积分是本平台的虚拟货币，不可兑换现金。{"\n"}
            2. 会员订阅按月/年计费，支持自动续费。{"\n"}
            3. 退款政策参照各应用商店规定执行。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">六、免责声明</Text>{"\n"}
            1. 因不可抗力导致的服务中断，本平台不承担责任。{"\n"}
            2. 用户因使用生成内容导致的纠纷，由用户自行解决。{"\n"}
            3. 本平台有权随时修改服务内容和价格。
          </Text>

          <Text className="text-gray-900 text-base leading-7 mt-4">
            <Text className="font-bold">七、协议变更</Text>{"\n"}
            本平台有权随时修改本协议，修改后的协议一经公布即生效。用户继续使用服务视为接受修改后的协议。
          </Text>

          <Text className="text-gray-500 text-sm leading-6 mt-6">
            如您对本协议有任何疑问，请联系客服：support@inspiration-goat.com
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
