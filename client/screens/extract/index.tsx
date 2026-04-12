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
  Image,
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

interface ExtractedImage {
  url: string;
  width?: number;
  height?: number;
}

export default function ExtractScreen() {
  const router = useSafeRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  
  // 提取结果
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  
  // 润色相关
  const [showPolish, setShowPolish] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("default");
  const [polishedContent, setPolishedContent] = useState("");
  const [polishing, setPolishing] = useState(false);

  const handleExtract = async () => {
    if (!url.trim()) {
      Alert.alert("提示", "请输入链接");
      return;
    }

    // 简单的 URL 格式验证
    if (!url.includes(".")) {
      Alert.alert("提示", "请输入正确的链接格式");
      return;
    }

    setLoading(true);
    setExtracting(true);
    setShowPolish(false);
    setPolishedContent("");
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/content/extract-from-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setTitle(data.title || "");
        setContent(data.content || "");
        setImages(data.images || []);
        setSourceUrl(data.sourceUrl || url);
        
        if (!data.content) {
          Alert.alert("提示", "该链接没有可提取的文本内容");
        }
      } else {
        Alert.alert("提示", data.error || "提取失败");
      }
    } catch (err) {
      Alert.alert("提示", "网络错误");
    } finally {
      setLoading(false);
      setExtracting(false);
    }
  };

  const handleExtractAndPolish = async () => {
    if (!url.trim()) {
      Alert.alert("提示", "请输入链接");
      return;
    }

    setLoading(true);
    setExtracting(true);
    setShowPolish(false);
    setPolishedContent("");
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/content/extract-and-polish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          url: url.trim(),
          polishStyle: selectedStyle,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTitle(data.title || "");
        setContent(data.original || "");
        setImages(data.images || []);
        setSourceUrl(data.sourceUrl || url);
        setPolishedContent(data.polished || "");
        setShowPolish(true);
        
        if (!data.original) {
          Alert.alert("提示", "该链接没有可提取的文本内容");
        }
      } else {
        Alert.alert("提示", data.error || "提取失败");
      }
    } catch (err) {
      Alert.alert("提示", "网络错误");
    } finally {
      setLoading(false);
      setExtracting(false);
    }
  };

  const handlePolishOnly = async () => {
    if (!content) {
      Alert.alert("提示", "请先提取链接内容");
      return;
    }

    setPolishing(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/content/polish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content,
          polishStyle: selectedStyle,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPolishedContent(data.polished);
        setShowPolish(true);
      } else {
        Alert.alert("提示", data.error || "润色失败");
      }
    } catch (err) {
      Alert.alert("提示", "网络错误");
    } finally {
      setPolishing(false);
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
            <Text style={styles.title}>链接文案提取</Text>
          </View>

          {/* URL Input */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>输入链接</Text>
            <TextInput
              style={styles.urlInput}
              placeholder="请粘贴文章或网页链接..."
              placeholderTextColor="#9CA3AF"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.extractButton, loading && styles.buttonDisabled]}
              onPress={handleExtract}
              disabled={loading}
            >
              {loading && extracting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.extractButtonText}>提取中...</Text>
                </View>
              ) : (
                <Text style={styles.extractButtonText}>提取文案</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.extractPolishButton, loading && styles.buttonDisabled]}
              onPress={handleExtractAndPolish}
              disabled={loading}
            >
              {loading && extracting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.extractButtonText}>提取润色中...</Text>
                </View>
              ) : (
                <Text style={styles.extractButtonText}>提取+润色</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Results */}
          {title || content ? (
            <>
              {/* Style Selection (for separate polish) */}
              {content && !showPolish && (
                <View style={styles.styleSection}>
                  <Text style={styles.sectionTitle}>润色风格</Text>
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
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.polishButton, polishing && styles.buttonDisabled]}
                    onPress={handlePolishOnly}
                    disabled={polishing}
                  >
                    {polishing ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#FFFFFF" />
                        <Text style={styles.polishButtonText}>润色中...</Text>
                      </View>
                    ) : (
                      <Text style={styles.polishButtonText}>润色文案</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Title */}
              {title ? (
                <View style={styles.resultSection}>
                  <Text style={styles.sectionTitle}>标题</Text>
                  <View style={styles.resultCard}>
                    <Text style={styles.resultTitle}>{title}</Text>
                  </View>
                </View>
              ) : null}

              {/* Content */}
              {content ? (
                <View style={styles.resultSection}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.sectionTitle}>提取的文案</Text>
                    <Text style={styles.charCount}>{content.length} 字</Text>
                  </View>
                  <View style={styles.resultCard}>
                    <Text style={styles.resultText}>{content}</Text>
                  </View>
                </View>
              ) : null}

              {/* Polished Content */}
              {showPolish && polishedContent ? (
                <View style={styles.resultSection}>
                  <Text style={styles.sectionTitle}>润色结果</Text>
                  <View style={styles.polishedCard}>
                    <Text style={styles.resultText}>{polishedContent}</Text>
                  </View>
                </View>
              ) : null}

              {/* Images */}
              {images.length > 0 ? (
                <View style={styles.resultSection}>
                  <Text style={styles.sectionTitle}>提取的图片 ({images.length})</Text>
                  <View style={styles.imagesGrid}>
                    {images.slice(0, 6).map((img, index) => (
                      <View key={index} style={styles.imageCard}>
                        <Image
                          source={{ uri: img.url }}
                          style={styles.image}
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </View>
                  {images.length > 6 && (
                    <Text style={styles.moreImagesText}>还有 {images.length - 6} 张图片...</Text>
                  )}
                </View>
              ) : null}

              {/* Source URL */}
              {sourceUrl ? (
                <View style={styles.sourceSection}>
                  <Text style={styles.sourceLabel}>来源：</Text>
                  <Text style={styles.sourceUrl} numberOfLines={1}>{sourceUrl}</Text>
                </View>
              ) : null}
            </>
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
  inputSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  urlInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionSection: {
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  extractButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  extractPolishButton: {
    flex: 1,
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#A5B4FC",
  },
  extractButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  styleSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  styleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  styleCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  styleCardSelected: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  styleLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
  },
  styleLabelSelected: {
    color: "#4F46E5",
  },
  polishButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  polishButtonDisabled: {
    backgroundColor: "#C4B5FD",
  },
  polishButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  resultSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    lineHeight: 24,
  },
  resultText: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 24,
  },
  polishedCard: {
    backgroundColor: "#F3E8FF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  imageCard: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  moreImagesText: {
    marginTop: 8,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  sourceSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
    flexDirection: "row",
    alignItems: "center",
  },
  sourceLabel: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  sourceUrl: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
});
