import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { Screen } from "@/components/Screen";
import { FontAwesome6 } from "@expo/vector-icons";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

// 视频时长选项（符合行业真实水平）
const DURATION_OPTIONS = [
  { duration: 5, label: "5秒", price: "免费", color: "#10B981" },
  { duration: 10, label: "10秒", price: "10积分", color: "#F59E0B" },
  { duration: 12, label: "12秒", price: "20积分", color: "#EF4444" },
];

// 风格选择
const STYLE_OPTIONS = [
  { id: "auto", name: "自动风格", icon: "wand-magic-sparkles", color: "#6C63FF" },
  { id: "cinematic", name: "电影感", icon: "film", color: "#10B981" },
  { id: "vivid", name: "生动鲜活", icon: "sparkles", color: "#F59E0B" },
  { id: "chinese", name: "国风", icon: "torii-gate", color: "#EF4444" },
];

interface GenerationResult {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  success: boolean;
  error?: string;
}

interface ProgressStage {
  stage: "text" | "image" | "video" | "complete";
  progress: number;
  message: string;
}

export default function OneClickScreen() {
  const [topic, setTopic] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [selectedStyle, setSelectedStyle] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressStage | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      Alert.alert("提示", "请输入创作主题");
      return;
    }

    setLoading(true);
    setShowProgressModal(true);
    setResult(null);

    // 模拟生成进度
    const stages = [
      { stage: "text" as const, progress: 10, message: "正在生成文案..." },
      { stage: "text" as const, progress: 30, message: "文案生成完成" },
      { stage: "image" as const, progress: 40, message: "正在生成图片..." },
      { stage: "image" as const, progress: 60, message: "图片生成完成" },
      { stage: "video" as const, progress: 70, message: "正在生成视频..." },
      { stage: "video" as const, progress: 90, message: "视频生成完成" },
      { stage: "complete" as const, progress: 100, message: "一键三连完成！" },
    ];

    for (const stage of stages) {
      setProgress(stage);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // 模拟生成结果
    setResult({
      text: `✨ ${topic}\n\n这是一段由灵感山羊AI生成的创意文案，结合了最新的热点元素和国风美学，让你的内容更具吸引力和传播力。\n\n#创意 #国风 #灵感山羊`,
      imageUrl: `https://picsum.photos/800/1200?random=${Date.now()}`,
      videoUrl: `https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4`,
      success: true,
    });

    setLoading(false);
  };

  const handleReset = () => {
    setTopic("");
    setResult(null);
    setProgress(null);
  };

  return (
    <Screen className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 顶部标题 */}
        <View className="px-4 pt-4 pb-6 bg-gradient-to-r from-red-600 via-amber-500 to-red-600">
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
              <FontAwesome6 name="wand-magic-sparkles" size={24} color="white" />
            </View>
            <View className="ml-3">
              <Text className="text-2xl font-bold text-white">一键三连</Text>
              <Text className="text-red-100 text-sm">文案 + 图片 + 视频 一键生成</Text>
            </View>
          </View>
          <View className="flex-row mt-3">
            <View className="bg-white/20 rounded-full px-3 py-1 mr-2">
              <Text className="text-white text-xs">行业首创</Text>
            </View>
            <View className="bg-white/20 rounded-full px-3 py-1 mr-2">
              <Text className="text-white text-xs">全网唯一</Text>
            </View>
            <View className="bg-white/20 rounded-full px-3 py-1">
              <Text className="text-white text-xs">独家功能</Text>
            </View>
          </View>
        </View>

        {/* 核心优势展示 */}
        <View className="px-4 py-4">
          <View className="bg-gradient-to-r from-amber-50 to-red-50 rounded-2xl p-4 mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-2">
              <FontAwesome6 name="crown" size={16} color="#F59E0B" /> 全网独家功能
            </Text>
            <Text className="text-gray-600 text-sm leading-5">
              输入一个主题，自动生成：文案 + 图片 + 视频{"\n"}
              竞品全部只能单一功能，我们是唯一能做到的平台
            </Text>
          </View>
        </View>

        {/* 输入区域 */}
        {!result && (
          <Animated.View entering={FadeIn} className="px-4">
            {/* 主题输入 */}
            <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <Text className="font-bold text-gray-900 mb-2">创作主题</Text>
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
                placeholder="例如：春日汉服踏青、端午粽子美食..."
                placeholderTextColor="#9CA3AF"
                value={topic}
                onChangeText={setTopic}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text className="text-gray-400 text-xs mt-2">
                描述越详细，生成效果越好
              </Text>
            </View>

            {/* 时长选择 */}
            <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <Text className="font-bold text-gray-900 mb-3">视频时长</Text>
              <View className="flex-row -mx-1">
                {DURATION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.duration}
                    className={`flex-1 mx-1 p-3 rounded-xl border-2 ${
                      selectedDuration === option.duration
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200"
                    }`}
                    onPress={() => setSelectedDuration(option.duration)}
                  >
                    <Text
                      className={`text-center font-bold ${
                        selectedDuration === option.duration ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      {option.label}
                    </Text>
                    <Text
                      className={`text-center text-xs mt-1 ${
                        selectedDuration === option.duration ? "text-red-500" : "text-gray-400"
                      }`}
                    >
                      {option.price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="text-gray-400 text-xs mt-2 text-center">
                5/10/12秒 符合行业真实水平，不虚标
              </Text>
            </View>

            {/* 风格选择 */}
            <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <Text className="font-bold text-gray-900 mb-3">视频风格</Text>
              <View className="flex-row flex-wrap -mx-2">
                {STYLE_OPTIONS.map((style) => (
                  <TouchableOpacity
                    key={style.id}
                    className={`w-1/2 px-2 mb-2`}
                    onPress={() => setSelectedStyle(style.id)}
                  >
                    <View
                      className={`p-3 rounded-xl border-2 flex-row items-center ${
                        selectedStyle === style.id
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200"
                      }`}
                    >
                      <FontAwesome6 name={style.icon as any} size={18} color={style.color} />
                      <Text
                        className={`ml-2 font-medium ${
                          selectedStyle === style.id ? "text-red-600" : "text-gray-700"
                        }`}
                      >
                        {style.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 一键生成按钮 */}
            <TouchableOpacity
              className="bg-gradient-to-r from-red-500 via-amber-500 to-red-500 py-4 rounded-2xl shadow-lg"
              onPress={handleGenerate}
              disabled={loading}
            >
              <View className="flex-row items-center justify-center">
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <FontAwesome6 name="wand-magic-sparkles" size={20} color="white" />
                    <Text className="text-white text-lg font-bold ml-2">
                      立即生成 · 一键三连
                    </Text>
                  </>
                )}
              </View>
              <Text className="text-white/80 text-xs text-center mt-1">
                预计耗时 30-60 秒
              </Text>
            </TouchableOpacity>

            {/* 积分消耗说明 */}
            <View className="bg-amber-50 rounded-xl p-3 mt-4">
              <Text className="text-amber-800 text-xs text-center">
                <FontAwesome6 name="info-circle" size={10} color="#F59E0B" />{" "}
                本次预计消耗：300积分（文案50 + 图片100 + 视频150）
              </Text>
            </View>
          </Animated.View>
        )}

        {/* 结果展示 */}
        {result && (
          <Animated.View entering={FadeInUp} className="px-4 pb-6">
            {/* 文案结果 */}
            <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 bg-green-100 rounded-lg items-center justify-center">
                  <FontAwesome6 name="pen-nib" size={16} color="#10B981" />
                </View>
                <Text className="font-bold text-gray-900 ml-2">文案</Text>
                <View className="ml-auto bg-green-100 rounded-full px-2 py-0.5">
                  <Text className="text-green-600 text-xs">已完成</Text>
                </View>
              </View>
              <Text className="text-gray-700 leading-6">{result.text}</Text>
            </View>

            {/* 图片结果 */}
            <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 bg-blue-100 rounded-lg items-center justify-center">
                  <FontAwesome6 name="image" size={16} color="#3B82F6" />
                </View>
                <Text className="font-bold text-gray-900 ml-2">图片</Text>
                <View className="ml-auto bg-green-100 rounded-full px-2 py-0.5">
                  <Text className="text-green-600 text-xs">已完成</Text>
                </View>
              </View>
              {result.imageUrl && (
                <View className="bg-gray-100 rounded-xl h-48 items-center justify-center overflow-hidden">
                  <FontAwesome6 name="image" size={48} color="#D1D5DB" />
                  <Text className="text-gray-400 text-sm mt-2">图片预览</Text>
                </View>
              )}
            </View>

            {/* 视频结果 */}
            <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 bg-red-100 rounded-lg items-center justify-center">
                  <FontAwesome6 name="video" size={16} color="#EF4444" />
                </View>
                <Text className="font-bold text-gray-900 ml-2">视频</Text>
                <View className="ml-auto bg-green-100 rounded-full px-2 py-0.5">
                  <Text className="text-green-600 text-xs">已完成</Text>
                </View>
              </View>
              <View className="bg-gray-900 rounded-xl h-48 items-center justify-center">
                <FontAwesome6 name="play-circle" size={48} color="white" />
                <Text className="text-white text-sm mt-2">点击播放视频</Text>
              </View>
            </View>

            {/* 操作按钮 */}
            <View className="flex-row -mx-2">
              <TouchableOpacity
                className="flex-1 mx-2 py-3 bg-gray-100 rounded-xl"
                onPress={handleReset}
              >
                <Text className="text-gray-700 text-center font-medium">重新生成</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 mx-2 py-3 bg-gradient-to-r from-red-500 to-amber-500 rounded-xl">
                <Text className="text-white text-center font-medium">一键发布</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* 底部说明 */}
        <View className="px-4 pb-8">
          <View className="bg-gray-100 rounded-xl p-4">
            <Text className="font-bold text-gray-700 mb-2">使用说明</Text>
            <Text className="text-gray-500 text-sm leading-5">
              1. 输入创作主题，描述越详细效果越好{"\n"}
              2. 选择视频时长（5-12秒，符合行业真实水平）{"\n"}
              3. 选择视频风格（支持国风、电影感等）{"\n"}
              4. 点击生成，等待30-60秒完成{"\n"}
              5. 生成后可一键发布到各大平台
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 生成进度弹窗 */}
      <Modal visible={showProgressModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center">
          <View className="bg-white rounded-2xl p-6 mx-8 w-72">
            <View className="items-center mb-4">
              <FontAwesome6 name="wand-magic-sparkles" size={40} color="#EF4444" />
              <Text className="text-lg font-bold text-gray-900 mt-2">一键三连生成中</Text>
            </View>
            {progress && (
              <>
                <View className="bg-gray-100 rounded-full h-3 mb-2">
                  <View
                    className="bg-gradient-to-r from-red-500 to-amber-500 h-3 rounded-full"
                    style={{ width: `${progress.progress}%` }}
                  />
                </View>
                <Text className="text-center text-gray-600 text-sm">{progress.message}</Text>
                <View className="flex-row justify-center mt-4">
                  <View className="flex-row items-center mr-4">
                    <FontAwesome6
                      name="check-circle"
                      size={16}
                      color={progress.progress >= 30 ? "#10B981" : "#D1D5DB"}
                    />
                    <Text className="text-xs ml-1 text-gray-500">文案</Text>
                  </View>
                  <View className="flex-row items-center mr-4">
                    <FontAwesome6
                      name="check-circle"
                      size={16}
                      color={progress.progress >= 60 ? "#10B981" : "#D1D5DB"}
                    />
                    <Text className="text-xs ml-1 text-gray-500">图片</Text>
                  </View>
                  <View className="flex-row items-center">
                    <FontAwesome6
                      name="check-circle"
                      size={16}
                      color={progress.progress >= 90 ? "#10B981" : "#D1D5DB"}
                    />
                    <Text className="text-xs ml-1 text-gray-500">视频</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
