import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { Screen } from "@/components/Screen";
import { useSafeRouter, useSafeSearchParams } from "@/hooks/useSafeRouter";
import { FontAwesome6 } from "@expo/vector-icons";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

// 平台配置 - 六大平台一键发布
const PLATFORMS = [
  { id: 'douyin', name: '抖音', icon: 'play', color: '#FFFFFF', bgColor: '#1A1A1A', desc: '短视频' },
  { id: 'xiaohongshu', name: '小红书', icon: 'bookmark', color: '#FF2442', bgColor: '#FFF0F2', desc: '种草笔记' },
  { id: 'kuaishou', name: '快手', icon: 'bolt', color: '#FF4906', bgColor: '#FFF0EB', desc: '老铁文化' },
  { id: 'bilibili', name: 'B站', icon: 'play-circle', color: '#00A1D6', bgColor: '#E8F5FB', desc: '弹幕视频' },
  { id: 'weibo', name: '微博', icon: 'at', color: '#E6162D', bgColor: '#FFEEF0', desc: '社交媒体' },
  { id: 'video', name: '视频号', icon: 'video', color: '#07C160', bgColor: '#E8F8EE', desc: '微信生态' },
];

interface PublishResult {
  platform: string;
  platformName: string;
  platformIcon: string;
  status: string;
  adaptedContent: string;
  hashtags: string[];
  title: string;
  mediaType: string;
  message: string;
}

export default function PublishScreen() {
  const router = useSafeRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['douyin', 'xiaohongshu']);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      Alert.alert("提示", "请输入要发布的内容");
      return;
    }
    if (selectedPlatforms.length === 0) {
      Alert.alert("提示", "请选择至少一个发布平台");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/publish/onekey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          title: title || undefined,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          videoUrl: videoUrl || undefined,
          platforms: selectedPlatforms,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPublishResults(data.results);
        Alert.alert(
          "发布就绪",
          `已完成${data.readyCount}个平台的内容适配，点击各平台按钮前往发布`,
          [{ text: "知道了" }]
        );
      } else {
        Alert.alert("发布失败", data.error || "请重试");
      }
    } catch (error) {
      console.error("Publish error:", error);
      Alert.alert("发布失败", "网络错误，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPlatform = (platformId: string) => {
    // 模拟打开各平台App或网页
    const urls: Record<string, string> = {
      douyin: "douyin://",
      xiaohongshu: "xhsdiscover://",
      kuaishou: "kwai://",
      bilibili: "bilibili://",
      weibo: "weibo://",
      video: "weixin://",
    };
    const url = urls[platformId];
    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("提示", `请安装${PLATFORMS.find(p => p.id === platformId)?.name} App`);
        }
      });
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>一键发布全平台</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* 平台选择 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>选择发布平台</Text>
          <Text style={styles.sectionSubtitle}>全网6大平台，一键适配发布</Text>
          <View style={styles.platformGrid}>
            {PLATFORMS.map(platform => {
              const isSelected = selectedPlatforms.includes(platform.id);
              return (
                <TouchableOpacity
                  key={platform.id}
                  style={[
                    styles.platformCard,
                    { backgroundColor: isSelected ? platform.bgColor : '#f5f5f5' },
                    isSelected && { borderColor: platform.color, borderWidth: 2 },
                  ]}
                  onPress={() => togglePlatform(platform.id)}
                >
                  <FontAwesome6
                    name={platform.icon as any}
                    size={24}
                    color={isSelected ? platform.color : '#999'}
                  />
                  <Text style={[styles.platformName, { color: isSelected ? platform.color : '#666' }]}>
                    {platform.name}
                  </Text>
                  <Text style={[styles.platformDesc, { color: isSelected ? platform.color : '#999' }]}>
                    {platform.desc}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: platform.color }]}>
                      <FontAwesome6 name="check" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 内容输入 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>发布内容</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="输入标题（可选）"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.contentInput}
            placeholder="输入要发布的内容..."
            placeholderTextColor="#999"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{content.length} 字</Text>
        </View>

        {/* 提示信息 */}
        <View style={styles.tipsCard}>
          <FontAwesome6 name="lightbulb" size={16} color="#F59E0B" />
          <Text style={styles.tipsText}>
            内容将自动适配各平台风格，添加合适的话题标签，让你的内容更加吸睛！
          </Text>
        </View>

        {/* 发布结果 */}
        {publishResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>适配结果</Text>
            {publishResults.map((result, index) => (
              <View key={index} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultIcon}>{result.platformIcon}</Text>
                  <Text style={styles.resultPlatform}>{result.platformName}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>就绪</Text>
                  </View>
                </View>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {result.title}
                </Text>
                <Text style={styles.resultContent} numberOfLines={3}>
                  {result.adaptedContent}
                </Text>
                <View style={styles.hashtags}>
                  {result.hashtags.slice(0, 3).map((tag, i) => (
                    <Text key={i} style={styles.hashtag}>{tag}</Text>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={() => handleOpenPlatform(result.platform)}
                >
                  <Text style={styles.openButtonText}>前往发布</Text>
                  <FontAwesome6 name="up-right-from-square" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* 发布按钮 */}
        <TouchableOpacity
          style={[styles.publishButton, loading && styles.publishButtonDisabled]}
          onPress={handlePublish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome6 name="rocket" size={18} color="#fff" />
              <Text style={styles.publishButtonText}>
                一键发布到 {selectedPlatforms.length} 个平台
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  platformCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  platformIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  platformName: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  platformDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  contentInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#333',
    minHeight: 120,
    lineHeight: 24,
  },
  charCount: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    marginTop: 6,
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
  resultCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  resultPlatform: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  resultContent: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  hashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  hashtag: {
    fontSize: 12,
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  openButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    gap: 10,
  },
  publishButtonDisabled: {
    backgroundColor: '#ccc',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
