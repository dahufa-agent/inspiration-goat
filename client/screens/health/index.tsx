import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Screen } from "@/components/Screen";
import { FontAwesome6 } from "@expo/vector-icons";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

// 九种体质分类
const CONSTITUTION_TYPES = [
  { id: "pinghe", name: "平和质", icon: "heart", color: "#10B981", desc: "健康体质" },
  { id: "qixu", name: "气虚质", icon: "wind", color: "#F59E0B", desc: "疲乏无力" },
  { id: "yangxu", name: "阳虚质", icon: "snowflake", color: "#3B82F6", desc: "畏寒怕冷" },
  { id: "yinxu", name: "阴虚质", icon: "sun", color: "#EF4444", desc: "口干咽燥" },
  { id: "tanshi", name: "痰湿质", icon: "droplet", color: "#8B5CF6", desc: "体胖痰多" },
  { id: "shire", name: "湿热质", icon: "fire", color: "#DC2626", desc: "面垢油光" },
  { id: "xueyu", name: "血瘀质", icon: "tint", color: "#EC4899", desc: "肤色晦暗" },
  { id: "qiyu", name: "气郁质", icon: "cloud", color: "#6366F1", desc: "情志抑郁" },
  { id: "tebing", name: "特禀质", icon: "star", color: "#F97316", desc: "过敏体质" },
];

// 养生方案
const HEALTH_PLANS: Record<string, any> = {
  pinghe: {
    diet: ["饮食均衡", "规律作息", "适度运动"],
    tips: "保持健康生活方式，阴阳平衡",
    recipes: ["山药粥", "红枣桂圆汤", "枸杞菊花茶"],
  },
  qixu: {
    diet: ["补气食物", "山药", "黄芪", "人参"],
    tips: "多做有氧运动，避免过度劳累",
    recipes: ["黄芪炖鸡", "人参粥", "山药红枣汤"],
  },
  yangxu: {
    diet: ["温阳食物", "羊肉", "韭菜", "核桃"],
    tips: "注意保暖，避免受寒",
    recipes: ["当归生姜羊肉汤", "核桃仁粥", "桂圆红枣茶"],
  },
};

export default function HealthScreen() {
  const [selectedType, setSelectedType] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setResult({
        type: "qixu",
        match: 85,
        suggestions: ["多食用补气食物", "规律作息", "适度运动"],
      });
      setLoading(false);
    }, 2000);
  };

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    const plan = HEALTH_PLANS[typeId];
    if (plan) {
      setResult({
        type: typeId,
        match: 100,
        ...plan,
      });
    }
  };

  return (
    <Screen className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 标题区 */}
        <View className="px-4 pt-4 pb-6 bg-gradient-to-r from-green-600 to-emerald-500">
          <Text className="text-2xl font-bold text-white">中医养生</Text>
          <Text className="text-green-100 mt-1">九种体质 · 食疗方案 · 养生指导</Text>
        </View>

        <View className="px-4 py-4">
          {/* 体质自测 */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <FontAwesome6 name="clipboard-list" size={18} color="#10B981" />
              <Text className="font-bold text-gray-900 ml-2">体质自测</Text>
            </View>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 mb-3"
              placeholder="描述您的症状，如：容易疲劳、手脚冰凉"
              placeholderTextColor="#9CA3AF"
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              className="bg-gradient-to-r from-green-500 to-emerald-500 py-3 rounded-xl"
              onPress={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-bold">开始分析</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 九种体质 */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <FontAwesome6 name="heartbeat" size={18} color="#10B981" />
              <Text className="font-bold text-gray-900 ml-2">九种体质自选</Text>
            </View>
            <View className="flex-row flex-wrap -mx-2">
              {CONSTITUTION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  className="w-1/3 px-2 mb-2"
                  onPress={() => handleSelectType(type.id)}
                >
                  <View
                    className={`p-3 rounded-xl border-2 items-center ${
                      selectedType === type.id
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    <FontAwesome6 name={type.icon as any} size={20} color={type.color} />
                    <Text
                      className={`font-bold mt-1 text-sm ${
                        selectedType === type.id ? "text-green-600" : "text-gray-700"
                      }`}
                    >
                      {type.name}
                    </Text>
                    <Text className="text-xs text-gray-400">{type.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 养生方案结果 */}
          {result && (
            <View className="bg-white rounded-2xl p-4 mb-4">
              <View className="flex-row items-center mb-3">
                <FontAwesome6 name="clipboard-check" size={18} color="#10B981" />
                <Text className="font-bold text-gray-900 ml-2">养生方案</Text>
                <View className="ml-auto bg-green-100 rounded-full px-3 py-1">
                  <Text className="text-green-600 text-xs font-bold">
                    匹配度 {result.match}%
                  </Text>
                </View>
              </View>

              {/* 体质类型 */}
              <View className="bg-green-50 rounded-xl p-4 mb-3">
                <Text className="text-lg font-bold text-green-700">
                  {CONSTITUTION_TYPES.find((t) => t.id === result.type)?.name || result.type}
                </Text>
                <Text className="text-green-600 text-sm mt-1">
                  {CONSTITUTION_TYPES.find((t) => t.id === result.type)?.desc}
                </Text>
              </View>

              {/* 饮食建议 */}
              {result.diet && (
                <View className="mb-3">
                  <Text className="font-bold text-gray-900 mb-2">饮食调理</Text>
                  <View className="flex-row flex-wrap -mx-1">
                    {result.diet.map((item, idx) => (
                      <View
                        key={idx}
                        className="bg-amber-50 rounded-full px-3 py-1 m-1"
                      >
                        <Text className="text-amber-700 text-sm">{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 养生建议 */}
              {result.tips && (
                <View className="mb-3">
                  <Text className="font-bold text-gray-900 mb-2">养生建议</Text>
                  <View className="bg-blue-50 rounded-xl p-3">
                    <Text className="text-blue-700 text-sm">{result.tips}</Text>
                  </View>
                </View>
              )}

              {/* 食疗方 */}
              {result.recipes && (
                <View>
                  <Text className="font-bold text-gray-900 mb-2">推荐食疗方</Text>
                  {result.recipes.map((recipe, idx) => (
                    <View
                      key={idx}
                      className="bg-orange-50 rounded-xl p-3 mb-2 flex-row items-center"
                    >
                      <FontAwesome6 name="utensils" size={16} color="#F97316" />
                      <Text className="text-orange-700 ml-2">{recipe}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 免责声明 */}
          <View className="bg-amber-50 rounded-xl p-4">
            <Text className="text-amber-800 text-xs leading-5">
              <FontAwesome6 name="exclamation-circle" size={12} color="#F59E0B" />{" "}
              本功能仅供参考，不能替代专业医疗诊断。如有健康问题，请咨询专业中医师。
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
