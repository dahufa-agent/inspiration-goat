import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Screen } from "@/components/Screen";
import { useSafeRouter, useSafeSearchParams } from "@/hooks/useSafeRouter";
import { Video, ResizeMode } from "expo-av";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";
const { width } = Dimensions.get("window");

export default function EditScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{
    idea: string;
    imageUrl: string;
    text: string;
    videoUrl: string;
    lastFrameUrl: string;
  }>();

  const [text, setText] = useState(params.text || "");
  const [imageUrl, setImageUrl] = useState(params.imageUrl || "");
  const [videoUrl, setVideoUrl] = useState(params.videoUrl || "");
  const [lastFrameUrl, setLastFrameUrl] = useState(params.lastFrameUrl || "");
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingText, setLoadingText] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const videoRef = useRef<Video>(null);

  // 重新生成图片
  const regenerateImage = async () => {
    setLoadingImage(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/generate/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: params.idea }),
      });
      const data = await response.json();
      if (data.imageUrls && data.imageUrls.length > 0) {
        setImageUrl(data.imageUrls[0]);
      }
    } catch (err) {
      Alert.alert("错误", "图片生成失败");
    } finally {
      setLoadingImage(false);
    }
  };

  // 重新生成文案
  const regenerateText = async () => {
    setLoadingText(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/generate/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: params.idea }),
      });
      const data = await response.json();
      if (data.text) {
        setText(data.text);
      }
    } catch (err) {
      Alert.alert("错误", "文案生成失败");
    } finally {
      setLoadingText(false);
    }
  };

  // 重新生成视频
  const regenerateVideo = async () => {
    if (!imageUrl) {
      Alert.alert("提示", "请先生成图片");
      return;
    }
    setLoadingVideo(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/generate/video-regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: params.idea, imageUrl }),
      });
      const data = await response.json();
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setLastFrameUrl(data.lastFrameUrl || "");
      }
    } catch (err) {
      Alert.alert("错误", "视频生成失败");
    } finally {
      setLoadingVideo(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>编辑创作</Text>
          <TouchableOpacity onPress={() => router.replace("/")} style={styles.newButton}>
            <Text style={styles.newButtonText}>新建</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Image Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>图片</Text>
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={regenerateImage}
                disabled={loadingImage}
              >
                {loadingImage ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <Text style={styles.regenerateText}>重新生成</Text>
                )}
              </TouchableOpacity>
            </View>
            {imageUrl ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
              </View>
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>图片生成中...</Text>
              </View>
            )}
          </View>

          {/* Text Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>文案</Text>
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={regenerateText}
                disabled={loadingText}
              >
                {loadingText ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <Text style={styles.regenerateText}>重新生成</Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.textCard}>
              <TextInput
                style={styles.textInput}
                value={text}
                onChangeText={setText}
                multiline
                placeholder="在这里编辑你的文案..."
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Video Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>视频</Text>
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={regenerateVideo}
                disabled={loadingVideo}
              >
                {loadingVideo ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <Text style={styles.regenerateText}>重新生成</Text>
                )}
              </TouchableOpacity>
            </View>
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
              <View style={styles.imageContainer}>
                <Image source={{ uri: lastFrameUrl }} style={styles.image} resizeMode="cover" />
                <View style={styles.videoProcessing}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.videoProcessingText}>视频生成中...</Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>视频生成中...</Text>
              </View>
            )}
          </View>

          {/* Original Idea */}
          <View style={styles.ideaSection}>
            <Text style={styles.ideaLabel}>原始想法</Text>
            <Text style={styles.ideaText}>{params.idea}</Text>
          </View>

          <View style={{ height: 40 }} />
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
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  regenerateText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
  },
  imageContainer: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    aspectRatio: 9 / 16,
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
  placeholder: {
    backgroundColor: "#E5E7EB",
    borderRadius: 16,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#9CA3AF",
    fontSize: 16,
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
  textCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  textInput: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
    minHeight: 100,
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
});
