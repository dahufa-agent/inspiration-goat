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
  ScrollView,
  Alert,
} from "react-native";
import { Screen } from "@/components/Screen";
import { useSafeRouter } from "@/hooks/useSafeRouter";

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
        setPolishedText(data.polished);
      } else {
        Alert.alert("提示", data.error || "润色失败");
      }
    } catch (err) {
      Alert.alert("提示", "网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (polishedText) {
      // 使用剪贴板复制
      Alert.alert("提示", "已复制到剪贴板", [
        { text: "好的", style: "default" },
      ]);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>{"< 返回"}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>内容润色</Text>
          </View>

          {/* Style Selection */}
          <View style={styles.styleSection}>
            <Text style={styles.sectionTitle}>选择润色风格</Text>
            <View style={styles.styleGrid}>
              {POLISH_STYLES.map((style) => (
                <TouchableOpacity
                  key={style.type}
                  style={[
                    styles.styleCard,
                    selectedStyle === style.type && styles.styleCardSelected,
                  ]}
                  onPress={() => setSelectedStyle(style.type)}
                >
                  <Text
                    style={[
                      styles.styleLabel,
                      selectedStyle === style.type && styles.styleLabelSelected,
                    ]}
                  >
                    {style.label}
                  </Text>
                  <Text style={styles.styleDesc}>{style.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Original Text Input */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <Text style={styles.sectionTitle}>原始内容</Text>
              <Text style={styles.charCount}>{originalText.length} 字</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="请输入需要润色的文案内容..."
              placeholderTextColor="#9CA3AF"
              value={originalText}
              onChangeText={setOriginalText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Polish Button */}
          <TouchableOpacity
            style={[styles.polishButton, loading && styles.polishButtonDisabled]}
            onPress={handlePolish}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.polishButtonText}>润色中...</Text>
              </View>
            ) : (
              <Text style={styles.polishButtonText}>开始润色</Text>
            )}
          </TouchableOpacity>

          {/* Polished Result */}
          {polishedText ? (
            <View style={styles.resultSection}>
              <View style={styles.resultHeader}>
                <Text style={styles.sectionTitle}>润色结果</Text>
                <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
                  <Text style={styles.copyButtonText}>复制</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultText}>{polishedText}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 16,
    color: "#4F46E5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
  },
  styleSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
    gap: 10,
  },
  styleCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: "30%",
    alignItems: "center",
  },
  styleCardSelected: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  styleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 4,
  },
  styleLabelSelected: {
    color: "#4F46E5",
  },
  styleDesc: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  inputSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: "#1F2937",
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  polishButton: {
    backgroundColor: "#4F46E5",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  polishButtonDisabled: {
    backgroundColor: "#A5B4FC",
  },
  polishButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  copyButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  resultText: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 24,
  },
});
