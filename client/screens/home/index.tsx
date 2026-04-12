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

export default function HomeScreen() {
  const router = useSafeRouter();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("free");
  const [remainingEdits, setRemainingEdits] = useState(3);
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
        
        // 获取剩余编辑次数
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/user/remaining-edits`, {
          headers: { "x-device-id": id },
        });
        const data = await response.json();
        if (data.remainingFreeEdits !== undefined) {
          setRemainingEdits(data.remainingFreeEdits);
        }
      } catch (err) {
        console.error("Device ID error:", err);
      }
    };
    getDeviceId();
  }, []);

  const handleGenerate = async () => {
    if (!idea.trim()) {
      setError("请输入你的创意想法");
      return;
    }

    // 检查免费视频编辑次数
    if (selectedDuration === "free" && remainingEdits <= 0) {
      setError("今日免费编辑次数已用完，请选择更长时长或明天再来");
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
        // 更新剩余编辑次数
        if (data.remainingFreeEdits !== undefined) {
          setRemainingEdits(data.remainingFreeEdits);
        }

        // 跳转到编辑页面，传递生成的数组
        router.push("/edit", {
          idea: idea.trim(),
          imageUrls: JSON.stringify(data.imageUrls || []),
          texts: JSON.stringify(data.texts || []),
          videoUrl: data.videoUrl || "",
          lastFrameUrl: data.lastFrameUrl || "",
          durationType: data.durationType || "free",
          remainingFreeEdits: data.remainingFreeEdits ?? remainingEdits,
        });
      } else {
        setError(data.message || data.error || "生成失败，请重试");
        if (data.remainingEdits !== undefined) {
          setRemainingEdits(data.remainingEdits);
        }
      }
    } catch (err) {
      setError("网络错误，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

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
              <Text style={styles.subtitle}>一键生成20张图片+10条文案</Text>
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

            {/* Video Duration Selection */}
            <View style={styles.durationCard}>
              <View style={styles.durationHeader}>
                <Text style={styles.cardTitle}>选择视频时长</Text>
                {selectedDuration === "free" && (
                  <View style={styles.quotaBadge}>
                    <Text style={styles.quotaText}>今日剩余 {remainingEdits} 次</Text>
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
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {selectedDuration === "free" && remainingEdits <= 0 && (
                <Text style={styles.quotaWarning}>
                  今日免费次数已用完，请明天再来或选择付费时长
                </Text>
              )}
            </View>

            {/* Content Preview Card */}
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>一键生成内容</Text>
              <View style={styles.previewItems}>
                <View style={styles.previewItem}>
                  <View style={[styles.previewIcon, { backgroundColor: "#FEF3C7" }]}>
                    <Text style={styles.previewIconText}>IMG</Text>
                  </View>
                  <View>
                    <Text style={styles.previewItemTitle}>20张图片</Text>
                    <Text style={styles.previewItemDesc}>多种风格可选</Text>
                  </View>
                </View>
                <View style={styles.previewItem}>
                  <View style={[styles.previewIcon, { backgroundColor: "#DBEAFE" }]}>
                    <Text style={styles.previewIconText}>TXT</Text>
                  </View>
                  <View>
                    <Text style={styles.previewItemTitle}>10条文案</Text>
                    <Text style={styles.previewItemDesc}>多种表达方式</Text>
                  </View>
                </View>
                <View style={styles.previewItem}>
                  <View style={[styles.previewIcon, { backgroundColor: "#FCE7F3" }]}>
                    <Text style={styles.previewIconText}>VID</Text>
                  </View>
                  <View>
                    <Text style={styles.previewItemTitle}>视频</Text>
                    <Text style={styles.previewItemDesc}>配套生成</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={[
                styles.generateButton,
                (!idea.trim() || loading || (selectedDuration === "free" && remainingEdits <= 0)) &&
                  styles.generateButtonDisabled,
              ]}
              onPress={handleGenerate}
              disabled={loading || (selectedDuration === "free" && remainingEdits <= 0)}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.loadingText}>生成中，请稍候...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.generateButtonText}>一键生成全部</Text>
                  <Text style={styles.generateButtonSubtext}>
                    {selectedDuration === "free"
                      ? `20张图片 + 10条文案 + ${DURATION_OPTIONS[0].duration}秒视频`
                      : `20张图片 + 10条文案 + ${DURATION_OPTIONS.find((o) => o.type === selectedDuration)?.duration}秒视频`}
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
            <Text style={styles.tipsTitle}>功能说明</Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: "#10B981" }]} />
                <Text style={styles.tipText}>5秒内：每日免费编辑3次</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={styles.tipText}>6-8秒：标准时长，不限次数</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: "#8B5CF6" }]} />
                <Text style={styles.tipText}>9-12秒：超长时长，不限次数</Text>
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
  quotaText: {
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
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  quotaWarning: {
    color: "#EF4444",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 8,
  },
  previewCard: {
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
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  previewItems: {
    gap: 12,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  previewIconText: {
    fontSize: 20,
  },
  previewItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  previewItemDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
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
