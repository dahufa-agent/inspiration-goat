import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
} from "react-native";
import { Screen } from "@/components/Screen";
import { useSafeRouter, useSafeSearchParams } from "@/hooks/useSafeRouter";
import { Video, ResizeMode } from "expo-av";
import * as SecureStore from "expo-secure-store";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";
const { width } = Dimensions.get("window");
const IMAGE_ITEM_WIDTH = (width - 48) / 3;

// 每日限制配置
const LIMITS = {
  images: { perBatch: 2, maxPerDay: 20 },
  texts: { perBatch: 1, maxPerDay: 10 },
};

// 视频时长选项
const DURATION_OPTIONS = [
  { type: "free", duration: 5, label: "5秒", price: "免费", color: "#10B981" },
  { type: "paid5", duration: 10, label: "10秒", price: "10积分", color: "#F59E0B" },
  { type: "paid10", duration: 15, label: "15秒", price: "20积分", color: "#F59E0B" },
  { type: "paid15", duration: 20, label: "20秒", price: "30积分", color: "#EF4444" },
];

export default function EditScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{
    idea: string;
    imageUrls: string;
    texts: string;
    videoUrl: string;
    lastFrameUrl: string;
    durationType: string;
    remainingFreeEdits: number;
    remainingImages: number;
    remainingTexts: number;
  }>();

  // 解析传递的数组
  const initialImageUrls = params.imageUrls ? JSON.parse(params.imageUrls) : [];
  const initialTexts = params.texts ? JSON.parse(params.texts) : [];

  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls);
  const [texts, setTexts] = useState<string[]>(initialTexts);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedTextIndex, setSelectedTextIndex] = useState(0);
  const [text, setText] = useState(initialTexts[0] || "");
  
  const [videoUrl, setVideoUrl] = useState(params.videoUrl || "");
  const [lastFrameUrl, setLastFrameUrl] = useState(params.lastFrameUrl || "");
  const [selectedDuration, setSelectedDuration] = useState(params.durationType || "free");
  const [remainingVideoEdits, setRemainingVideoEdits] = useState(params.remainingFreeEdits ?? 3);
  const [remainingImages, setRemainingImages] = useState(params.remainingImages ?? 20);
  const [remainingTexts, setRemainingTexts] = useState(params.remainingTexts ?? 10);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingText, setLoadingText] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  
  const videoRef = useRef<Video>(null);

  // 获取设备ID
  useEffect(() => {
    const getDeviceId = async () => {
      try {
        const id = await SecureStore.getItemAsync("deviceId");
        if (id) setDeviceId(id);
      } catch (err) {
        console.error("Device ID error:", err);
      }
    };
    getDeviceId();
  }, []);

  // 选择图片
  const handleSelectImage = (index: number) => {
    setSelectedImageIndex(index);
  };

  // 选择文案
  const handleSelectText = (index: number) => {
    setSelectedTextIndex(index);
    setText(texts[index]);
  };

  // 编辑文案
  const handleEditText = (newText: string) => {
    setText(newText);
    const newTexts = [...texts];
    newTexts[selectedTextIndex] = newText;
    setTexts(newTexts);
  };

  // 重新生成单张图片（不计入限制）
  const regenerateSingleImage = async (index: number) => {
    setLoadingImage(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/generate/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: params.idea }),
      });
      const data = await response.json();
      if (data.imageUrls && data.imageUrls.length > 0) {
        const newUrls = [...imageUrls];
        newUrls[index] = data.imageUrls[0];
        setImageUrls(newUrls);
      }
    } catch (err) {
      Alert.alert("错误", "图片生成失败");
    } finally {
      setLoadingImage(false);
    }
  };

  // 重新生成全部图片（2张，计入限制）
  const regenerateAllImages = async () => {
    if (remainingImages < LIMITS.images.perBatch) {
      Alert.alert("提示", `今日图片生成次数已用完，每次生成${LIMITS.images.perBatch}张`);
      return;
    }

    setLoadingImage(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/generate/images`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": deviceId,
        },
        body: JSON.stringify({ prompt: params.idea }),
      });
      const data = await response.json();
      
      if (response.ok && data.imageUrls && data.imageUrls.length > 0) {
        setImageUrls(data.imageUrls);
        setSelectedImageIndex(0);
        setRemainingImages(data.remaining);
      } else {
        Alert.alert("错误", data.message || "图片生成失败");
        if (data.remaining !== undefined) {
          setRemainingImages(data.remaining);
        }
      }
    } catch (err) {
      Alert.alert("错误", "图片生成失败");
    } finally {
      setLoadingImage(false);
    }
  };

  // 重新生成单条文案（不计入限制）
  const regenerateSingleText = async (index: number) => {
    setLoadingText(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/generate/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: params.idea }),
      });
      const data = await response.json();
      if (data.text) {
        const newTexts = [...texts];
        newTexts[index] = data.text;
        setTexts(newTexts);
        if (index === selectedTextIndex) {
          setText(data.text);
        }
      }
    } catch (err) {
      Alert.alert("错误", "文案生成失败");
    } finally {
      setLoadingText(false);
    }
  };

  // 重新生成全部文案（1条，计入限制）
  const regenerateAllTexts = async () => {
    if (remainingTexts < LIMITS.texts.perBatch) {
      Alert.alert("提示", `今日文案生成次数已用完`);
      return;
    }

    setLoadingText(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/generate/texts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": deviceId,
        },
        body: JSON.stringify({ prompt: params.idea }),
      });
      const data = await response.json();
      
      if (response.ok && data.texts && data.texts.length > 0) {
        setTexts(data.texts);
        setSelectedTextIndex(0);
        setText(data.texts[0]);
        setRemainingTexts(data.remaining);
      } else {
        Alert.alert("错误", data.message || "文案生成失败");
        if (data.remaining !== undefined) {
          setRemainingTexts(data.remaining);
        }
      }
    } catch (err) {
      Alert.alert("错误", "文案生成失败");
    } finally {
      setLoadingText(false);
    }
  };

  // 重新生成视频
  const regenerateVideo = async () => {
    const currentImageUrl = imageUrls[selectedImageIndex];
    if (!currentImageUrl) {
      Alert.alert("提示", "请先选择图片");
      return;
    }

    if (selectedDuration === "free" && remainingVideoEdits <= 0) {
      Alert.alert(
        "免费次数已用完",
        "今日5秒内视频免费编辑次数已用完，请明天再来或选择更长时长",
        [
          { text: "选择更长时长", onPress: () => setSelectedDuration("standard") },
          { text: "确定", style: "cancel" },
        ]
      );
      return;
    }

    setLoadingVideo(true);
    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/api/v1/generate/video-regenerate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id": deviceId,
          },
          body: JSON.stringify({
            prompt: params.idea,
            imageUrl: currentImageUrl,
            durationType: selectedDuration,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setLastFrameUrl(data.lastFrameUrl || "");
        if (data.remainingFreeEdits !== undefined) {
          setRemainingVideoEdits(data.remainingFreeEdits);
        }
      } else {
        Alert.alert("错误", data.message || data.error || "视频生成失败");
        if (data.remainingEdits !== undefined) {
          setRemainingVideoEdits(data.remainingEdits);
        }
      }
    } catch (err) {
      Alert.alert("错误", "视频生成失败");
    } finally {
      setLoadingVideo(false);
    }
  };

  const selectedDurationInfo = DURATION_OPTIONS.find(
    (o) => o.type === selectedDuration
  ) || DURATION_OPTIONS[0];

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>选择素材</Text>
          <TouchableOpacity onPress={() => router.replace("/")} style={styles.newButton}>
            <Text style={styles.newButtonText}>新建</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Daily Quota Info */}
          <View style={styles.quotaInfo}>
            <Text style={styles.quotaText}>
              图片剩余: {remainingImages}/{LIMITS.images.maxPerDay} | 
              文案剩余: {remainingTexts}/{LIMITS.texts.maxPerDay} | 
              视频剩余: {remainingVideoEdits}/3
            </Text>
          </View>

          {/* Images Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>图片库 ({imageUrls.length}张)</Text>
              <TouchableOpacity
                style={[
                  styles.regenerateAllButton,
                  remainingImages < LIMITS.images.perBatch && styles.regenerateAllButtonDisabled,
                ]}
                onPress={regenerateAllImages}
                disabled={loadingImage || remainingImages < LIMITS.images.perBatch}
              >
                {loadingImage ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <Text style={[
                    styles.regenerateAllText,
                    remainingImages < LIMITS.images.perBatch && styles.regenerateAllTextDisabled,
                  ]}>
                    重新生成({remainingImages})
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Selected Image Preview */}
            {imageUrls.length > 0 && (
              <TouchableOpacity
                style={styles.mainImageContainer}
                onPress={() => setImagePreviewVisible(true)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: imageUrls[selectedImageIndex] }}
                  style={styles.mainImage}
                  resizeMode="cover"
                />
                <View style={styles.mainImageOverlay}>
                  <Text style={styles.mainImageHint}>点击预览大图</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Image Grid */}
            <View style={styles.imageGrid}>
              {imageUrls.map((url, index) => (
                <TouchableOpacity
                  key={`${url}-${index}`}
                  style={[
                    styles.imageItem,
                    selectedImageIndex === index && styles.imageItemSelected,
                  ]}
                  onPress={() => handleSelectImage(index)}
                >
                  <Image source={{ uri: url }} style={styles.imageThumb} />
                  {selectedImageIndex === index && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>{selectedImageIndex + 1}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.imageRefreshBtn}
                    onPress={() => regenerateSingleImage(index)}
                    disabled={loadingImage}
                  >
                    <Text style={styles.imageRefreshText}>R</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Texts Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>文案库 ({texts.length}条)</Text>
              <TouchableOpacity
                style={[
                  styles.regenerateAllButton,
                  remainingTexts < LIMITS.texts.perBatch && styles.regenerateAllButtonDisabled,
                ]}
                onPress={regenerateAllTexts}
                disabled={loadingText || remainingTexts < LIMITS.texts.perBatch}
              >
                {loadingText ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <Text style={[
                    styles.regenerateAllText,
                    remainingTexts < LIMITS.texts.perBatch && styles.regenerateAllTextDisabled,
                  ]}>
                    重新生成({remainingTexts})
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Text List */}
            <View style={styles.textList}>
              {texts.map((t, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.textItem,
                    selectedTextIndex === index && styles.textItemSelected,
                  ]}
                  onPress={() => handleSelectText(index)}
                >
                  <View style={styles.textItemHeader}>
                    <Text style={styles.textItemIndex}>文案 {index + 1}</Text>
                    <TouchableOpacity
                      onPress={() => regenerateSingleText(index)}
                      disabled={loadingText}
                    >
                      <Text style={styles.textRefreshText}>R</Text>
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={styles.textItemContent}
                    numberOfLines={selectedTextIndex === index ? undefined : 2}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Edit Selected Text */}
            {texts.length > 0 && (
              <View style={styles.textEditor}>
                <Text style={styles.textEditorLabel}>编辑当前文案</Text>
                <View style={styles.textCard}>
                  <TextInput
                    style={styles.textInput}
                    value={text}
                    onChangeText={handleEditText}
                    multiline
                    placeholder="在这里编辑你的文案..."
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Video Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>视频</Text>
              {selectedDuration === "free" && (
                <View style={styles.quotaBadge}>
                  <Text style={styles.quotaBadgeText}>今日剩余 {remainingVideoEdits} 次</Text>
                </View>
              )}
            </View>

            {/* Duration Selector */}
            <View style={styles.durationSelector}>
              {DURATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    styles.durationChip,
                    selectedDuration === option.type && {
                      backgroundColor: option.color,
                      borderColor: option.color,
                    },
                  ]}
                  onPress={() => setSelectedDuration(option.type)}
                  disabled={loadingVideo}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      selectedDuration === option.type && styles.durationChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedDuration === "free" && remainingVideoEdits <= 0 && (
              <Text style={styles.quotaWarning}>
                今日免费编辑次数已用完，请明天再来或选择付费时长
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.regenerateVideoButton,
                (loadingVideo || (selectedDuration === "free" && remainingVideoEdits <= 0)) &&
                  styles.regenerateVideoButtonDisabled,
              ]}
              onPress={regenerateVideo}
              disabled={loadingVideo || (selectedDuration === "free" && remainingVideoEdits <= 0)}
            >
              {loadingVideo ? (
                <ActivityIndicator color="#4F46E5" />
              ) : (
                <Text style={styles.regenerateVideoText}>
                  生成 {selectedDurationInfo.duration}秒 视频
                </Text>
              )}
            </TouchableOpacity>

            {videoUrl ? (
              <View style={styles.videoContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: videoUrl }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                />
              </View>
            ) : lastFrameUrl ? (
              <View style={styles.mainImageContainer}>
                <Image source={{ uri: lastFrameUrl }} style={styles.mainImage} />
                <View style={styles.videoProcessing}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.videoProcessingText}>视频生成中...</Text>
                </View>
              </View>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoPlaceholderText}>
                  选择图片后点击上方按钮生成视频
                </Text>
              </View>
            )}
          </View>

          {/* Original Idea */}
          <View style={styles.ideaSection}>
            <Text style={styles.ideaLabel}>原始想法</Text>
            <Text style={styles.ideaText}>{params.idea}</Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => Alert.alert("提示", "内容已保存")}
          >
            <Text style={styles.saveButtonText}>保存创作</Text>
          </TouchableOpacity>
        </View>

        {/* Image Preview Modal */}
        <Modal
          visible={imagePreviewVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImagePreviewVisible(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setImagePreviewVisible(false)}
            >
              <Text style={styles.modalCloseText}>X</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: imageUrls[selectedImageIndex] }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <View style={styles.previewNav}>
              <TouchableOpacity
                style={styles.previewNavBtn}
                onPress={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                disabled={selectedImageIndex === 0}
              >
                <Text style={styles.previewNavText}>{"<"}</Text>
              </TouchableOpacity>
              <Text style={styles.previewIndex}>
                {selectedImageIndex + 1} / {imageUrls.length}
              </Text>
              <TouchableOpacity
                style={styles.previewNavBtn}
                onPress={() => setSelectedImageIndex(Math.min(imageUrls.length - 1, selectedImageIndex + 1))}
                disabled={selectedImageIndex === imageUrls.length - 1}
              >
                <Text style={styles.previewNavText}>{">"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  newButton: {
    paddingVertical: 4,
    paddingLeft: 12,
  },
  newButtonText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  quotaInfo: {
    backgroundColor: "#EEF2FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
  },
  quotaText: {
    fontSize: 12,
    color: "#4F46E5",
    textAlign: "center",
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  regenerateAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
  },
  regenerateAllButtonDisabled: {
    backgroundColor: "#F3F4F6",
  },
  regenerateAllText: {
    fontSize: 13,
    color: "#4F46E5",
    fontWeight: "500",
  },
  regenerateAllTextDisabled: {
    color: "#9CA3AF",
  },
  mainImageContainer: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    marginBottom: 12,
  },
  mainImage: {
    width: "100%",
    aspectRatio: 9 / 16,
  },
  mainImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 8,
    alignItems: "center",
  },
  mainImageHint: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  imageItem: {
    width: IMAGE_ITEM_WIDTH,
    height: IMAGE_ITEM_WIDTH,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
  },
  imageItemSelected: {
    borderColor: "#4F46E5",
  },
  imageThumb: {
    width: "100%",
    height: "100%",
  },
  selectedBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#4F46E5",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  imageRefreshBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  imageRefreshText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  textList: {
    gap: 8,
    marginBottom: 16,
  },
  textItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  textItemSelected: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  textItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  textItemIndex: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  textRefreshText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "bold",
  },
  textItemContent: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  textEditor: {
    marginTop: 8,
  },
  textEditorLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  textCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
  },
  textInput: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 22,
    minHeight: 80,
  },
  quotaBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quotaBadgeText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },
  durationSelector: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  durationChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  durationChipTextSelected: {
    color: "#FFFFFF",
  },
  quotaWarning: {
    color: "#EF4444",
    fontSize: 12,
    marginBottom: 10,
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 8,
    textAlign: "center",
  },
  regenerateVideoButton: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#4F46E5",
  },
  regenerateVideoButtonDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
  },
  regenerateVideoText: {
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "600",
  },
  videoContainer: {
    backgroundColor: "#000",
    borderRadius: 16,
    overflow: "hidden",
  },
  video: {
    width: "100%",
    aspectRatio: 9 / 16,
  },
  videoPlaceholder: {
    backgroundColor: "#E5E7EB",
    borderRadius: 16,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholderText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  videoProcessing: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoProcessingText: {
    color: "#FFFFFF",
    marginTop: 8,
    fontSize: 14,
  },
  ideaSection: {
    marginTop: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },
  ideaLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  ideaText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  bottomAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  saveButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  previewImage: {
    width: "100%",
    height: "70%",
  },
  previewNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 40,
  },
  previewNavBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewNavText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  previewIndex: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});
