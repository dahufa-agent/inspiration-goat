import React, { useState } from "react";
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
} from "react-native";
import { Screen } from "@/components/Screen";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { Link } from "expo-router";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

// 山羊老师头像（使用网络图片）
const GOAT_TEACHER_AVATAR = "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=200&h=200&fit=crop";

export default function HomeScreen() {
  const router = useSafeRouter();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!idea.trim()) {
      setError("请输入你的创意想法");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 调用一键生成API
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/generate/all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: idea.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        // 跳转到编辑页面，传递生成的内容
        router.push("/edit", {
          idea: idea.trim(),
          imageUrl: data.imageUrl || "",
          text: data.text || "",
          videoUrl: data.videoUrl || "",
          lastFrameUrl: data.lastFrameUrl || "",
        });
      } else {
        setError(data.error || "生成失败，请重试");
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
        {/* Header with Goat Teacher Avatar */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: GOAT_TEACHER_AVATAR }}
              style={styles.avatar}
            />
            <View style={styles.avatarBadge}>
              <Text style={styles.badgeText}>AI</Text>
            </View>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>你好，我是山羊老师</Text>
            <Text style={styles.subtitle}>一键帮你生成创意内容</Text>
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

          {/* Generate Button */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              (!idea.trim() || loading) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.generateButtonText}>一键生成</Text>
                <Text style={styles.generateButtonSubtext}>
                  图片 + 文案 + 视频
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Quick Ideas */}
          <View style={styles.quickIdeas}>
            <Text style={styles.quickIdeasTitle}>试试这些灵感</Text>
            <View style={styles.quickIdeasList}>
              {["海边日落", "森林小路", "城市夜景", "星空银河"].map(
                (item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.quickIdeaChip}
                    onPress={() => setIdea(item)}
                  >
                    <Text style={styles.quickIdeaText}>{item}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </View>

        {/* Bottom Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsText}>
            生成后可实时编辑文案{'\n'}
            图片和视频支持重新生成
          </Text>
        </View>
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
    flex: 1,
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
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 8,
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
    alignItems: "center",
  },
  tipsText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
});
