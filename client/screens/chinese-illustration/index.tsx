import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { Screen } from "@/components/Screen";
import { FontAwesome6 } from "@expo/vector-icons";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

// 国风插画风格分类
const ILLUSTRATION_CATEGORIES = [
  { id: "traditional", name: "传统国风", icon: "torii-gate", color: "#DC2626" },
  { id: "landscape", name: "山水意境", icon: "mountain-sun", color: "#059669" },
  { id: "character", name: "人物古风", icon: "user", color: "#7C3AED" },
  { id: "pattern", name: "纹样图案", icon: "shapes", color: "#0891B2" },
];

// 画面比例选项
const ASPECT_RATIOS = [
  { id: "square", name: "方图", size: "1:1", desc: "小红书/朋友圈" },
  { id: "portrait", name: "竖图", size: "3:4", desc: "抖音/小红书" },
  { id: "landscape", name: "横图", size: "16:9", desc: "微博/视频封面" },
];

export default function ChineseIllustrationScreen() {
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("traditional");
  const [selectedRatio, setSelectedRatio] = useState("square");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    // 模拟生成
    setTimeout(() => {
      setResult(`https://picsum.photos/800/800?random=${Date.now()}`);
      setLoading(false);
    }, 2000);
  };

  return (
    <Screen className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 标题区 */}
        <View className="px-4 pt-4 pb-6 bg-gradient-to-r from-red-600 to-amber-500">
          <Text className="text-2xl font-bold text-white">国风插画师</Text>
          <Text className="text-red-100 mt-1">AI生成专属国风插画</Text>
        </View>

        <View className="px-4 py-4">
          {/* 描述输入 */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-900 mb-2">插画描述</Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
              placeholder="例如：仙鹤立于梅花枝头，水墨风格"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* 风格选择 */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-900 mb-3">风格分类</Text>
            <View className="flex-row flex-wrap -mx-2">
              {ILLUSTRATION_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  className={`w-1/2 px-2 mb-2`}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <View
                    className={`p-3 rounded-xl border-2 flex-row items-center ${
                      selectedCategory === cat.id
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200"
                    }`}
                  >
                    <FontAwesome6 name={cat.icon as any} size={18} color={cat.color} />
                    <Text
                      className={`ml-2 font-medium ${
                        selectedCategory === cat.id ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 比例选择 */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-900 mb-3">画面比例</Text>
            <View className="flex-row -mx-2">
              {ASPECT_RATIOS.map((ratio) => (
                <TouchableOpacity
                  key={ratio.id}
                  className={`flex-1 mx-2 p-3 rounded-xl border-2 ${
                    selectedRatio === ratio.id
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200"
                  }`}
                  onPress={() => setSelectedRatio(ratio.id)}
                >
                  <Text
                    className={`text-center font-bold ${
                      selectedRatio === ratio.id ? "text-red-600" : "text-gray-700"
                    }`}
                  >
                    {ratio.name}
                  </Text>
                  <Text
                    className={`text-center text-xs mt-1 ${
                      selectedRatio === ratio.id ? "text-red-500" : "text-gray-400"
                    }`}
                  >
                    {ratio.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 生成按钮 */}
          <TouchableOpacity
            className="bg-gradient-to-r from-red-500 to-amber-500 py-4 rounded-2xl shadow-lg"
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold">生成国风插画</Text>
            )}
          </TouchableOpacity>

          {/* 结果展示 */}
          {result && (
            <Animated.View entering={FadeInUp} className="mt-4">
              <View className="bg-gray-200 rounded-2xl h-64 items-center justify-center">
                <FontAwesome6 name="image" size={48} color="#D1D5DB" />
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
