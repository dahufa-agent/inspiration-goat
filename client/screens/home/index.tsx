import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { Screen } from "@/components/Screen";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

// 山羊老师头像
const GOAT_TEACHER_AVATAR = "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=200&h=200&fit=crop";

// 视频时长选项
const DURATION_OPTIONS = [
  { type: "free", duration: 5, label: "5秒内", price: "免费", description: "每日3次", color: "#10B981" },
  { type: "standard", duration: 8, label: "6-8秒", price: "标准收费", description: "不限次数", color: "#F59E0B" },
  { type: "premium", duration: 12, label: "9-12秒", price: "高级收费", description: "不限次数", color: "#8B5CF6" },
];

// 每日限制配置
const LIMITS = {
  images: { perBatch: 2, maxPerDay: 20 },
  texts: { perBatch: 1, maxPerDay: 10 },
};

export default function HomeScreen() {
  const router = useSafeRouter();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("free");
  const [remainingVideoEdits, setRemainingVideoEdits] = useState(3);
  const [remainingImages, setRemainingImages] = useState(20);
  const [remainingTexts, setRemainingTexts] = useState(10);
  const [deviceId, setDeviceId] = useState("");

  // 获取或生成设备ID
  useEffect(() => {
    const getDeviceId = async () => {
      try {
        let id = await SecureStore.getItemAsync("deviceId");
        if (!id) {
          id = Crypto.randomUUID();
          await SecureStore.setItemAsync("deviceId", id);
        }
        setDeviceId(id);
        
        // 获取剩余次数
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/user/remaining-edits`, {
          headers: { "x-device-id": id },
        });
        const data = await response.json();
        if (data.remainingFreeEdits !== undefined) {
          setRemainingVideoEdits(data.remainingFreeEdits);
          setRemainingImages(data.remainingImages);
          setRemainingTexts(data.remainingTexts);
        }
      } catch (err) {
        console.error("Device ID error:", err);
      }
    };
    getDeviceId();
  }, []);

  const canGenerate = () => {
    if (!idea.trim()) return { allowed: false, reason: "请输入你的创意想法" };
    if (selectedDuration === "free" && remainingVideoEdits <= 0) {
      return { allowed: false, reason: "今日视频编辑次数已用完" };
    }
    if (remainingImages < LIMITS.images.perBatch) {
      return { allowed: false, reason: `今日图片生成次数已用完（每次${LIMITS.images.perBatch}张）` };
    }
    if (remainingTexts < LIMITS.texts.perBatch) {
      return { allowed: false, reason: "今日文案生成次数已用完" };
    }
    return { allowed: true, reason: "" };
  };

  const handleGenerate = async () => {
    const check = canGenerate();
    if (!check.allowed) {
      setError(check.reason);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/generate/all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": deviceId,
        },
        body: JSON.stringify({
          prompt: idea.trim(),
          durationType: selectedDuration,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 更新剩余次数
        setRemainingVideoEdits(data.remainingFreeEdits ?? remainingVideoEdits);
        setRemainingImages(data.remainingImages ?? remainingImages);
        setRemainingTexts(data.remainingTexts ?? remainingTexts);

        // 跳转到编辑页面
        router.push("/edit", {
          idea: idea.trim(),
          imageUrls: JSON.stringify(data.imageUrls || []),
          texts: JSON.stringify(data.texts || []),
          videoUrl: data.videoUrl || "",
          lastFrameUrl: data.lastFrameUrl || "",
          durationType: data.durationType || "free",
          remainingFreeEdits: data.remainingFreeEdits ?? remainingVideoEdits,
          remainingImages: data.remainingImages ?? remainingImages,
          remainingTexts: data.remainingTexts ?? remainingTexts,
        });
      } else {
        setError(data.message || data.error || "生成失败，请重试");
        if (data.remainingImages !== undefined) setRemainingImages(data.remainingImages);
        if (data.remainingTexts !== undefined) setRemainingTexts(data.remainingTexts);
        if (data.remainingFreeEdits !== undefined) setRemainingVideoEdits(data.remainingFreeEdits);
      }
    } catch (err) {
      setError("网络错误，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  const generateCheck = canGenerate();

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header with Goat Teacher Avatar */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: GOAT_TEACHER_AVATAR }} style={styles.avatar} />
              <View style={styles.avatarBadge}>
                <Text style={styles.badgeText}>AI</Text>
              </View>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>你好，我是山羊老师</Text>
              <Text style={styles.subtitle}>一键生成创意内容</Text>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Idea Input Card */}
            <View style={styles.inputCard}>
              <Text style={styles.cardTitle}>输入你的创意想法</Text>
              <TextInput
                style={styles.input}
                placeholder="例如：海边日落的浪漫场景，温暖治愈风格..."
                placeholderTextColor="#9CA3AF"
                value={idea}
                onChangeText={(text) => {
                  setIdea(text);
                  setError("");
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            {/* Daily Quota Card */}
            <View style={styles.quotaCard}>
              <Text style={styles.quotaTitle}>今日剩余次数</Text>
              <View style={styles.quotaList}>
                <View style={styles.quotaItem}>
                  <View style={[styles.quotaIcon, { backgroundColor: "#FEF3C7" }]}>
                    <Text style={styles.quotaIconText}>IMG</Text>
                  </View>
                  <View style={styles.quotaInfo}>
                    <Text style={styles.quotaLabel}>图片</Text>
                    <Text style={styles.quotaValue}>
                      {remainingImages} / {LIMITS.images.maxPerDay}
                    </Text>
                  </View>
                  <Text style={styles.quotaBatch}>每次{LIMITS.images.perBatch}张</Text>
                </View>
                <View style={styles.quotaItem}>
                  <View style={[styles.quotaIcon, { backgroundColor: "#DBEAFE" }]}>
                    <Text style={styles.quotaIconText}>TXT</Text>
                  </View>
                  <View style={styles.quotaInfo}>
                    <Text style={styles.quotaLabel}>文案</Text>
                    <Text style={styles.quotaValue}>
                      {remainingTexts} / {LIMITS.texts.maxPerDay}
                    </Text>
                  </View>
                  <Text style={styles.quotaBatch}>每次{LIMITS.texts.perBatch}条</Text>
                </View>
                <View style={styles.quotaItem}>
                  <View style={[styles.quotaIcon, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={styles.quotaIconText}>VID</Text>
                  </View>
                  <View style={styles.quotaInfo}>
                    <Text style={styles.quotaLabel}>视频编辑</Text>
                    <Text style={styles.quotaValue}>
                      {remainingVideoEdits} / 3
                    </Text>
                  </View>
                  <Text style={styles.quotaBatch}>仅5秒内免费</Text>
                </View>
              </View>
            </View>

            {/* Video Duration Selection */}
            <View style={styles.durationCard}>
              <View style={styles.durationHeader}>
                <Text style={styles.cardTitle}>选择视频时长</Text>
                {selectedDuration === "free" && (
                  <View style={styles.quotaBadge}>
                    <Text style={styles.quotaBadgeText}>今日剩余 {remainingVideoEdits} 次</Text>
                  </View>
                )}
              </View>
              <View style={styles.durationOptions}>
                {DURATION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.durationOption,
                      selectedDuration === option.type && styles.durationOptionSelected,
                      { borderColor: option.color },
                    ]}
                    onPress={() => setSelectedDuration(option.type)}
                  >
                    <View style={[styles.durationDot, { backgroundColor: option.color }]} />
                    <View style={styles.durationInfo}>
                      <Text style={styles.durationLabel}>{option.label}</Text>
                      <Text style={styles.durationPrice}>{option.price}</Text>
                    </View>
                    <Text style={[
                      styles.durationDesc,
                      selectedDuration === option.type && { color: option.color }
                    ]}>
                      {option.description}
                    </Text>
                    {selectedDuration === option.type && (
                      <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                        <Text style={styles.checkmarkText}>OK</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={[
                styles.generateButton,
                (!generateCheck.allowed || loading) && styles.generateButtonDisabled,
              ]}
              onPress={handleGenerate}
              disabled={!generateCheck.allowed || loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.loadingText}>生成中，请稍候...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.generateButtonText}>一键生成</Text>
                  <Text style={styles.generateButtonSubtext}>
                    {LIMITS.images.perBatch}张图片 + {LIMITS.texts.perBatch}条文案 + 视频
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Quick Ideas */}
            <View style={styles.quickIdeas}>
              <Text style={styles.quickIdeasTitle}>试试这些灵感</Text>
              <View style={styles.quickIdeasList}>
                {["海边日落", "森林小路", "城市夜景", "星空银河"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.quickIdeaChip}
                    onPress={() => setIdea(item)}
                  >
                    <Text style={styles.quickIdeaText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Bottom Tips */}
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>生成规则</Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: "#10B981" }]} />
                <Text style={styles.tipText}>图片：每次{LIMITS.images.perBatch}张，每日最多{LIMITS.images.maxPerDay}张</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: "#3B82F6" }]} />
                <Text style={styles.tipText}>文案：每次{LIMITS.texts.perBatch}条，每日最多{LIMITS.texts.maxPerDay}条</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={styles.tipText}>5秒内视频免费编辑每日3次</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#4F46E5",
  },
  avatarBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#4F46E5",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  mainContent: {
    paddingHorizontal: 20,
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 8,
  },
  quotaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  quotaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  quotaList: {
    gap: 12,
  },
  quotaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  quotaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  quotaIconText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },
  quotaInfo: {
    flex: 1,
  },
  quotaLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  quotaValue: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  quotaBatch: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  durationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  durationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  quotaBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quotaBadgeText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },
  durationOptions: {
    gap: 12,
  },
  durationOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  durationOptionSelected: {
    backgroundColor: "#FFFFFF",
  },
  durationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  durationInfo: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  durationPrice: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  durationDesc: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 8,
  },
  checkmark: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  generateButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0.1,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  generateButtonSubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  quickIdeas: {
    marginBottom: 20,
  },
  quickIdeasTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  quickIdeasList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickIdeaChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickIdeaText: {
    color: "#4B5563",
    fontSize: 14,
  },
  tips: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  tipText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
});
