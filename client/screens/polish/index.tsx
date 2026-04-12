import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Screen } from "@/components/Screen";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
} from "react-native-reanimated";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

// 润色风格选项
const POLISH_STYLES = [
  { type: "default", label: "智能润色", desc: "自动优化表达" },
  { type: "formal", label: "正式商务", desc: "专业规范" },
  { type: "casual", label: "轻松活泼", desc: "亲切自然" },
  { type: "creative", label: "创意优化", desc: "生动有感染力" },
  { type: "short", label: "精简压缩", desc: "简洁有力" },
];

export default function PolishScreen() {
  const router = useSafeRouter();
  const [originalText, setOriginalText] = useState("");
  const [polishedText, setPolishedText] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("default");
  const [loading, setLoading] = useState(false);

  const handlePolish = async () => {
    if (!originalText.trim()) {
      Alert.alert("提示", "请输入要润色的内容");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/content/polish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: originalText,
          polishStyle: selectedStyle,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setPolishedText(data.data.polished_content);
      } else {
        Alert.alert("润色失败", data.message || "请稍后重试");
      }
    } catch (error) {
      Alert.alert("错误", "网络请求失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (polishedText) {
      await Clipboard.setStringAsync(polishedText);
      Alert.alert("复制成功", "已复制到剪贴板");
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Text style={styles.backBtnText}>← 返回</Text>
            </TouchableOpacity>
            <Text style={styles.title}>内容润色</Text>
            <View style={{ width: 60 }} />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>选择润色风格</Text>
            <View style={styles.styleGrid}>
              {POLISH_STYLES.map((style, index) => (
                <TouchableOpacity
                  key={style.type}
                  style={[
                    styles.styleCard,
                    selectedStyle === style.type && styles.styleCardActive,
                  ]}
                  onPress={() => setSelectedStyle(style.type)}
                >
                  <Text
                    style={[
                      styles.styleLabel,
                      selectedStyle === style.type && styles.styleLabelActive,
                    ]}
                  >
                    {style.label}
                  </Text>
                  <Text style={styles.styleDesc}>{style.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).duration(300)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>输入内容</Text>
            <TextInput
              style={styles.textInput}
              placeholder="请输入需要润色的文案..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={originalText}
              onChangeText={setOriginalText}
            />
          </Animated.View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handlePolish}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? "润色中..." : "开始润色"}
            </Text>
          </TouchableOpacity>

          {polishedText ? (
            <Animated.View
              entering={FadeInDown.delay(300).duration(300)}
              layout={Layout.springify()}
              style={styles.resultSection}
            >
              <View style={styles.resultHeader}>
                <Text style={styles.sectionTitle}>润色结果</Text>
                <TouchableOpacity onPress={handleCopy}>
                  <Text style={styles.copyBtn}>复制</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.resultCard}>
                <ScrollView style={styles.resultContent}>
                  <Text style={styles.resultText}>{polishedText}</Text>
                </ScrollView>
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    color: "#4F46E5",
    fontSize: 16,
    fontWeight: "500",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  styleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  styleCard: {
    width: "30%",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  styleCardActive: {
    backgroundColor: "#EEF2FF",
    borderWidth: 2,
    borderColor: "#4F46E5",
  },
  styleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  styleLabelActive: {
    color: "#4F46E5",
  },
  styleDesc: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    fontSize: 15,
    color: "#1F2937",
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  submitBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  resultSection: {
    marginBottom: 24,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  copyBtn: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "500",
  },
  resultCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  resultContent: {
    maxHeight: 300,
  },
  resultText: {
    fontSize: 15,
    color: "#166534",
    lineHeight: 24,
  },
});
