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

export default function ExtractScreen() {
  const router = useSafeRouter();
  const [url, setUrl] = useState("");
  const [extractedContent, setExtractedContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExtract = async () => {
    if (!url.trim()) {
      Alert.alert("提示", "请输入要提取的链接");
      return;
    }

    // 简单URL验证
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      Alert.alert("提示", "请输入有效的链接");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/api/v1/content/extract-from-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setExtractedContent(data.data.content);
      } else {
        Alert.alert("提取失败", data.message || "请稍后重试");
      }
    } catch (error) {
      Alert.alert("错误", "网络请求失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (extractedContent) {
      await Clipboard.setStringAsync(extractedContent);
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
            <Text style={styles.title}>链接提取</Text>
            <View style={{ width: 60 }} />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>输入链接</Text>
            <TextInput
              style={styles.urlInput}
              placeholder="请输入文章或网页链接..."
              placeholderTextColor="#9CA3AF"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </Animated.View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleExtract}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? "提取中..." : "提取文案"}
            </Text>
          </TouchableOpacity>

          {extractedContent ? (
            <Animated.View
              entering={FadeInDown.delay(200).duration(300)}
              layout={Layout.springify()}
              style={styles.resultSection}
            >
              <View style={styles.resultHeader}>
                <Text style={styles.sectionTitle}>提取结果</Text>
                <TouchableOpacity onPress={handleCopy}>
                  <Text style={styles.copyBtn}>复制</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.resultCard}>
                <ScrollView style={styles.resultContent}>
                  <Text style={styles.resultText}>{extractedContent}</Text>
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
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  backBtnText: {
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  urlInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  submitBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0.1,
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
    fontWeight: "600",
  },
  resultCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  resultContent: {
    maxHeight: 400,
  },
  resultText: {
    fontSize: 15,
    color: "#166534",
    lineHeight: 24,
  },
});
