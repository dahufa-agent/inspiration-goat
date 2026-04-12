import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeInUp, FadeInDown, Layout } from "react-native-reanimated";
import { Screen } from "@/components/Screen";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { FontAwesome6 } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

// 山羊老师头像
const GOAT_TEACHER_AVATAR = "https://coze-coding-project.tos.coze.site/coze_storage_7627778343278215204/image/generate_image_b6078ad5-ea30-4a35-b64f-be3d8e2a6ce0.jpeg?sign=1807522848-177fac84ec-0-e563565f1f5d6087dc714c42d6cfa0a9202ff2202029a59ecee87677f22dd55c";

// 视频时长选项
const DURATION_OPTIONS = [
  { type: "free", duration: 5, label: "5秒", price: "免费", description: "每日10次", color: "#10B981" },
  { type: "paid5", duration: 10, label: "10秒", price: "10积分", description: "每增加5秒+10积分", color: "#F59E0B" },
  { type: "paid10", duration: 15, label: "15秒", price: "20积分", description: "每增加10秒+20积分", color: "#F59E0B" },
  { type: "paid15", duration: 20, label: "20秒", price: "30积分", description: "每增加15秒+30积分", color: "#EF4444" },
];

// 每日限制配置
const LIMITS = {
  images: { perBatch: 2, maxPerDay: 20, chargePerImage: 1 },
  texts: { perBatch: 1, maxPerDay: 10, chargePerText: 2 },
};

// 免费码选项
const FREE_CODE_OPTIONS = [
  { type: '1_month', label: '1个月', days: 30 },
  { type: '3_months', label: '一季度', days: 90 },
  { type: '6_months', label: '半年', days: 180 },
  { type: '1_year', label: '一年', days: 365 },
];

// ==================== 新增：风格预设配置 ====================
const TEXT_STYLES = [
  { id: 'xiaohongshu', name: '小红书', icon: '📕', color: '#FF2442' },
  { id: 'douyin', name: '抖音', icon: '🎵', color: '#000000' },
  { id: 'gzh', name: '公众号', icon: '📧', color: '#4F46E5' },
  { id: 'zhihu', name: '知乎', icon: '💬', color: '#0084FF' },
  { id: 'general', name: '通用', icon: '✨', color: '#10B981' },
];

const IMAGE_STYLES = [
  { id: 'realistic', name: '写实摄影', keywords: 'photorealistic, high detail' },
  { id: 'illustration', name: '商业插画', keywords: 'digital illustration, vector art' },
  { id: 'anime', name: '动漫风格', keywords: 'anime style, vibrant colors' },
  { id: 'oil_painting', name: '油画质感', keywords: 'oil painting style, impressionist' },
  { id: 'cyberpunk', name: '赛博朋克', keywords: 'cyberpunk, neon lights' },
  { id: 'fantasy', name: '奇幻风格', keywords: 'fantasy art, magical' },
];

// 模板数据
const TEMPLATES = {
  scenery: ["海边日落晚霞", "森林迷雾小路", "城市璀璨夜景", "星空银河漫天", "瀑布彩虹飞流", "雪山日出金山", "草原骏马奔腾", "沙漠驼铃声声"],
  portrait: ["复古港风写真", "清新森系少女", "韩系氧气美女", "欧美高级感", "国风古韵美人", "运动活力少年", "文艺胶片风", "时尚街拍大片"],
  food: ["精致法式甜点", "日式刺身料理", "意式披萨烤肠", "中餐满汉全席", "网红奶茶饮品", "街头特色小吃", "咖啡馆下午茶", "烘焙面包香气"],
  animal: ["橘猫慵懒午后", "柴犬微笑卖萌", "布偶猫公主范", "柯基蜜桃臀", "兔子软萌可爱", "仓鼠屯粮脸颊", "金毛暖男微笑", "哈士奇表情包"],
  art: ["梵高星空风格", "莫奈印象派花园", "浮世绘樱花", "赛博朋克未来城", "水墨山水意境", "蒸汽朋克机械", "梦幻水晶城堡", "幻想精灵森林"],
  lifestyle: ["咖啡馆悠闲时光", "书房的午后", "阳台小花园", "露营星空下", "健身房动感", "厨房烘焙时光", "旅行路上风景", "居家慵懒周末"],
};

// 模板分类
const CATEGORIES = [
  { id: 'scenery', name: '风景', icon: '🏔️' },
  { id: 'portrait', name: '人像', icon: '👤' },
  { id: 'food', name: '美食', icon: '🍜' },
  { id: 'animal', name: '萌宠', icon: '🐱' },
  { id: 'art', name: '艺术', icon: '🎨' },
  { id: 'lifestyle', name: '生活', icon: '☕' },
];

// 生成进度状态
interface GenerationProgress {
  stage: 'idle' | 'image' | 'text' | 'video' | 'complete';
  progress: number;
  message: string;
}

interface UserInfo {
  id: string;
  phone: string;
  username: string;
  isPermanentVip: boolean;
  isVip: boolean;
  vipEndDate?: string;
}

export default function HomeScreen() {
  const router = useSafeRouter();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("free");
  const [remainingVideoEdits, setRemainingVideoEdits] = useState(10);
  const [remainingImages, setRemainingImages] = useState(20);
  const [remainingTexts, setRemainingTexts] = useState(10);
  const [deviceId, setDeviceId] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [showFreeCodeModal, setShowFreeCodeModal] = useState(false);
  const [freeCodePhone, setFreeCodePhone] = useState("");
  const [selectedFreeCodeType, setSelectedFreeCodeType] = useState("1_month");
  const [freeCode, setFreeCode] = useState("");
  const [isPermanentVip, setIsPermanentVip] = useState(false);
  const [isGifting, setIsGifting] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [isGiftedCode, setIsGiftedCode] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showCheckinSuccess, setShowCheckinSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("scenery");
  
  // ==================== 新增：风格选择状态 ====================
  const [selectedTextStyle, setSelectedTextStyle] = useState("general");
  const [selectedImageStyle, setSelectedImageStyle] = useState("realistic");
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [hotTopics, setHotTopics] = useState<Array<{id: number; platform: string; title: string; heat: number}>>([]);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({ stage: 'idle', progress: 0, message: '' });
  const [showProgressModal, setShowProgressModal] = useState(false);

  const getCurrentTemplates = () => TEMPLATES[selectedCategory as keyof typeof TEMPLATES] || TEMPLATES.scenery;

  // ==================== 新增：加载热点话题 ====================
  const loadHotTopics = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/hot-topics`);
      const data = await response.json();
      if (data.topics && data.topics.length > 0) {
        setHotTopics(data.topics.slice(0, 6));
      }
    } catch (err) {
      console.log("Load hot topics error:", err);
    }
  }, []);

  // 获取用户信息
  const loadUserInfo = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync("userInfo");
      if (stored) {
        const user = JSON.parse(stored) as UserInfo;
        setUserInfo(user);
        setIsPermanentVip(user.isPermanentVip);
        if (user.id) {
          const response = await fetch(`${BACKEND_BASE_URL}/api/v1/user/membership`, { headers: { "x-user-id": user.id } });
          const data = await response.json();
          if (data.isVip || data.isPermanentVip) setIsPermanentVip(true);
        }
        if (user.id) {
          const pointsResponse = await fetch(`${BACKEND_BASE_URL}/api/v1/user/points`, { headers: { "x-user-id": user.id } });
          const pointsData = await pointsResponse.json();
          if (pointsData.points !== undefined) setUserPoints(pointsData.points);
        }
      }
    } catch (err) {
      console.error("Load user info error:", err);
    }
  }, []);

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
        await loadUserInfo();
        await loadHotTopics();
        
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/user/remaining-edits`, { headers: { "x-device-id": id } });
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
  }, [loadUserInfo, loadHotTopics]);

  const canGenerate = () => {
    if (!idea.trim()) return { allowed: false, reason: "请输入你的创意想法" };
    if (selectedDuration === "free" && remainingVideoEdits <= 0) return { allowed: false, reason: "今日视频编辑次数已用完" };
    if (remainingImages < LIMITS.images.perBatch) return { allowed: false, reason: `今日图片生成次数已用完（每次${LIMITS.images.perBatch}张）` };
    if (remainingTexts < LIMITS.texts.perBatch) return { allowed: false, reason: "今日文案生成次数已用完" };
    return { allowed: true, reason: "" };
  };

  // ==================== 优化：带进度反馈的生成 ====================
  const handleGenerate = async () => {
    const check = canGenerate();
    if (!check.allowed) {
      setError(check.reason);
      return;
    }

    setLoading(true);
    setError("");
    setShowProgressModal(true);
    setGenerationProgress({ stage: 'image', progress: 10, message: '正在生成图片...' });

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
          textStyle: selectedTextStyle,
          imageStyle: selectedImageStyle,
        }),
      });

      setGenerationProgress({ stage: 'text', progress: 40, message: '正在生成文案...' });
      await new Promise(resolve => setTimeout(resolve, 500));

      const data = await response.json();

      if (response.ok) {
        setGenerationProgress({ stage: 'video', progress: 70, message: '正在生成视频...' });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setGenerationProgress({ stage: 'complete', progress: 100, message: '生成完成！' });
        await new Promise(resolve => setTimeout(resolve, 800));
        setShowProgressModal(false);

        // 保存历史
        try {
          const historyItem = {
            id: `h_${Date.now()}`,
            prompt: idea.trim(),
            imageUrls: data.imageUrls || [],
            text: (data.texts || [])[0] || "",
            videoUrl: data.videoUrl || "",
            createdAt: new Date().toISOString(),
            isFavorite: false,
          };
          const stored = await SecureStore.getItemAsync("generationHistory");
          const history = stored ? JSON.parse(stored) : [];
          history.unshift(historyItem);
          if (history.length > 100) history.pop();
          await SecureStore.setItemAsync("generationHistory", JSON.stringify(history));
        } catch (e) {
          console.error("Save history error:", e);
        }

        setRemainingVideoEdits(data.remainingFreeEdits ?? remainingVideoEdits);
        setRemainingImages(data.remainingImages ?? remainingImages);
        setRemainingTexts(data.remainingTexts ?? remainingTexts);

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
        setShowProgressModal(false);
        setError(data.message || data.error || "生成失败，请重试");
        if (data.remainingImages !== undefined) setRemainingImages(data.remainingImages);
        if (data.remainingTexts !== undefined) setRemainingTexts(data.remainingTexts);
        if (data.remainingFreeEdits !== undefined) setRemainingVideoEdits(data.remainingFreeEdits);
      }
    } catch (err) {
      setShowProgressModal(false);
      setError("网络错误，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  // ==================== 新增：使用热点话题 ====================
  const useHotTopic = (title: string) => {
    setIdea(title);
  };

  // 申请免费码
  const handleApplyFreeCode = async () => {
    if (!freeCodePhone) { Alert.alert("提示", "请输入手机号"); return; }
    if (isGifting && !recipientPhone) { Alert.alert("提示", "请输入接收人手机号"); return; }
    if (isGifting && !/^1\d{10}$/.test(recipientPhone)) { Alert.alert("提示", "接收人手机号格式不正确"); return; }
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/free-codes/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: freeCodePhone, durationType: selectedFreeCodeType, recipientPhone: isGifting ? recipientPhone : undefined }),
      });
      const data = await response.json();
      if (response.ok) {
        setFreeCode(data.freeCode);
        setIsGiftedCode(data.isGifted || false);
      } else {
        Alert.alert("提示", data.error || "申请失败");
      }
    } catch (err) {
      Alert.alert("提示", "申请失败，请重试");
    }
  };

  // ==================== 新增：风格选择器 ====================
  const StyleSelector = () => (
    <View style={styles.styleSelector}>
      <Text style={styles.styleSelectorTitle}>✨ 创作风格</Text>
      <View style={styles.styleRow}>
        <Text style={styles.styleLabel}>文案风格：</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TEXT_STYLES.map((style) => (
            <TouchableOpacity
              key={style.id}
              style={[styles.styleChip, selectedTextStyle === style.id && { backgroundColor: style.color + '20', borderColor: style.color }]}
              onPress={() => setSelectedTextStyle(style.id)}
            >
              <Text style={styles.styleChipIcon}>{style.icon}</Text>
              <Text style={[styles.styleChipText, selectedTextStyle === style.id && { color: style.color }]}>{style.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.styleRow}>
        <Text style={styles.styleLabel}>图片风格：</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {IMAGE_STYLES.map((style) => (
            <TouchableOpacity
              key={style.id}
              style={[styles.styleChip, selectedImageStyle === style.id && styles.styleChipSelected]}
              onPress={() => setSelectedImageStyle(style.id)}
            >
              <Text style={[styles.styleChipText, selectedImageStyle === style.id && styles.styleChipTextSelected]}>{style.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  // ==================== 新增：热点话题组件 ====================
  const HotTopicsSection = () => (
    hotTopics.length > 0 ? (
      <View style={styles.hotTopicsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 热点话题</Text>
          <TouchableOpacity onPress={loadHotTopics}>
            <Text style={styles.refreshBtn}>刷新</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {hotTopics.map((topic) => (
            <TouchableOpacity key={topic.id} style={styles.hotTopicChip} onPress={() => useHotTopic(topic.title)}>
              <Text style={styles.hotTopicPlatform}>
                {topic.platform === 'weibo' ? '📰' : topic.platform === 'zhihu' ? '💬' : topic.platform === 'douyin' ? '🎵' : '📕'}
              </Text>
              <Text style={styles.hotTopicTitle} numberOfLines={1}>{topic.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    ) : null
  );

  // ==================== 新增：生成进度弹窗 ====================
  const ProgressModal = () => (
    <Modal visible={showProgressModal} transparent animationType="fade">
      <View style={styles.progressOverlay}>
        <View style={styles.progressCard}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.progressTitle}>正在创作中...</Text>
          <Text style={styles.progressMessage}>{generationProgress.message}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${generationProgress.progress}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{generationProgress.progress}%</Text>
        </View>
      </View>
    </Modal>
  );

  const generateCheck = canGenerate();

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <View style={styles.headerLeft}>
              <Image source={{ uri: GOAT_TEACHER_AVATAR }} style={styles.avatar} />
              <View>
                <Text style={styles.greeting}>你好，创意家</Text>
                <Text style={styles.subtitle}>今天想创作什么？</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.pointsBadge} onPress={() => router.push("/history")}>
                <FontAwesome6 name="history" size={20} color="#4F46E5" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* 热点话题 */}
          <HotTopicsSection />

          {/* 模板分类 */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.templatesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📚 快速模板</Text>
              <TouchableOpacity onPress={() => setShowStyleModal(true)}>
                <Text style={styles.moreBtn}>更多风格 →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat.id} style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]} onPress={() => setSelectedCategory(cat.id)}>
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryName, selectedCategory === cat.id && styles.categoryNameActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.templateGrid}>
              {getCurrentTemplates().slice(0, 4).map((template, idx) => (
                <TouchableOpacity key={idx} style={styles.templateItem} onPress={() => setIdea(template)}>
                  <Text style={styles.templateText} numberOfLines={2}>{template}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* 风格选择 */}
          <StyleSelector />

          {/* 输入区域 */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.inputSection}>
            <Text style={styles.inputLabel}>💡 你的创意想法</Text>
            <TextInput
              style={styles.textInput}
              placeholder="描述你想要创作的内容..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={idea}
              onChangeText={setIdea}
            />
            {idea.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={() => setIdea("")}>
                <Text style={styles.clearBtnText}>清除</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* 视频时长选择 */}
          <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.durationSection}>
            <Text style={styles.sectionTitle}>🎬 视频时长</Text>
            <View style={styles.durationGrid}>
              {DURATION_OPTIONS.map((option) => (
                <TouchableOpacity key={option.type} style={[styles.durationCard, selectedDuration === option.type && styles.durationCardActive]} onPress={() => setSelectedDuration(option.type)}>
                  <View style={[styles.durationBadge, { backgroundColor: option.color + '20' }]}>
                    <Text style={[styles.durationBadgeText, { color: option.color }]}>{option.label}</Text>
                  </View>
                  <Text style={styles.durationPrice}>{option.price}</Text>
                  <Text style={styles.durationDesc}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* 剩余次数 */}
          <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.usageSection}>
            <View style={styles.usageItem}>
              <FontAwesome6 name="image" size={18} color="#10B981" />
              <Text style={styles.usageText}>图片 {remainingImages}/{LIMITS.images.maxPerDay}</Text>
            </View>
            <View style={styles.usageItem}>
              <FontAwesome6 name="pen" size={18} color="#4F46E5" />
              <Text style={styles.usageText}>文案 {remainingTexts}/{LIMITS.texts.maxPerDay}</Text>
            </View>
            <View style={styles.usageItem}>
              <FontAwesome6 name="video" size={18} color="#F59E0B" />
              <Text style={styles.usageText}>视频 {remainingVideoEdits}/{VIDEO_DURATIONS.free.maxPerDay}</Text>
            </View>
          </Animated.View>

          {/* 错误提示 */}
          {error ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
              <FontAwesome6 name="exclamation-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          {/* 生成按钮 */}
          <TouchableOpacity
            style={[styles.generateButton, (!generateCheck.allowed || loading) && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={!generateCheck.allowed || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <FontAwesome6 name="magic" size={20} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>🚀 一键生成全部</Text>
              </>
            )}
          </TouchableOpacity>

          {/* VIP Banner */}
          {!isPermanentVip && (
            <TouchableOpacity style={styles.vipBanner} onPress={() => router.push("/auth")}>
              <View style={styles.vipContent}>
                <FontAwesome6 name="crown" size={20} color="#F59E0B" />
                <View style={styles.vipText}>
                  <Text style={styles.vipTitle}>解锁无限创作</Text>
                  <Text style={styles.vipSubtitle}>升级会员享更多权益</Text>
                </View>
              </View>
              <FontAwesome6 name="chevron-right" size={18} color="#F59E0B" />
            </TouchableOpacity>
          )}

          {isPermanentVip && (
            <View style={styles.permanentVipBanner}>
              <Text style={styles.permanentVipText}>永久会员 · 无限创作</Text>
            </View>
          )}
        </ScrollView>

        {/* 进度弹窗 */}
        <ProgressModal />

        {/* 风格选择弹窗 */}
        <Modal visible={showStyleModal} transparent animationType="slide" onRequestClose={() => setShowStyleModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>选择创作风格</Text>
                <TouchableOpacity onPress={() => setShowStyleModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.styleGroupTitle}>📝 文案风格</Text>
                <View style={styles.styleGrid}>
                  {TEXT_STYLES.map((style) => (
                    <TouchableOpacity key={style.id} style={[styles.styleCard, selectedTextStyle === style.id && { borderColor: style.color, backgroundColor: style.color + '10' }]} onPress={() => setSelectedTextStyle(style.id)}>
                      <Text style={styles.styleCardIcon}>{style.icon}</Text>
                      <Text style={[styles.styleCardName, selectedTextStyle === style.id && { color: style.color }]}>{style.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.styleGroupTitle}>🖼️ 图片风格</Text>
                <View style={styles.styleGrid}>
                  {IMAGE_STYLES.map((style) => (
                    <TouchableOpacity key={style.id} style={[styles.styleCard, selectedImageStyle === style.id && styles.styleCardSelected]} onPress={() => setSelectedImageStyle(style.id)}>
                      <Text style={styles.styleCardIcon}>🎨</Text>
                      <Text style={[styles.styleCardName, selectedImageStyle === style.id && styles.styleCardNameSelected]}>{style.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.modalButton} onPress={() => setShowStyleModal(false)}>
                <Text style={styles.modalButtonText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Free Code Modal */}
        <Modal visible={showFreeCodeModal} transparent animationType="slide" onRequestClose={() => setShowFreeCodeModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>领取免费会员</Text>
                <TouchableOpacity onPress={() => setShowFreeCodeModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              
              {!freeCode ? (
                <>
                  <View style={styles.modalBody}>
                    <Text style={styles.modalLabel}>手机号</Text>
                    <TextInput style={styles.modalInput} placeholder="请输入手机号" value={freeCodePhone} onChangeText={setFreeCodePhone} keyboardType="phone-pad" />
                    <TouchableOpacity style={styles.giftToggle} onPress={() => setIsGifting(!isGifting)}>
                      <View style={[styles.checkbox, isGifting && styles.checkboxChecked]}>
                        {isGifting && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.giftToggleText}>赠送给好友</Text>
                    </TouchableOpacity>
                    {isGifting && (
                      <>
                        <Text style={styles.modalLabel}>接收人手机号</Text>
                        <TextInput style={styles.modalInput} placeholder="请输入好友手机号" value={recipientPhone} onChangeText={setRecipientPhone} keyboardType="phone-pad" />
                      </>
                    )}
                    <Text style={styles.modalLabel}>选择时长</Text>
                    <View style={styles.durationSelect}>
                      {FREE_CODE_OPTIONS.map((option) => (
                        <TouchableOpacity key={option.type} style={[styles.durationChip, selectedFreeCodeType === option.type && styles.durationChipSelected]} onPress={() => setSelectedFreeCodeType(option.type)}>
                          <Text style={[styles.durationChipText, selectedFreeCodeType === option.type && styles.durationChipTextSelected]}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.modalButton} onPress={handleApplyFreeCode}>
                    <Text style={styles.modalButtonText}>申请免费码</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.freeCodeDisplay}>
                  <Text style={styles.freeCodeLabel}>你的免费码</Text>
                  <Text style={styles.freeCodeValue}>{freeCode}</Text>
                  <Text style={styles.freeCodeHint}>{isGiftedCode ? '已激活' : '请分享给好友使用'}</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// 视频时长常量
const VIDEO_DURATIONS = { free: { maxPerDay: 10 } };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  greeting: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  subtitle: { fontSize: 14, color: "#6B7280" },
  headerRight: { flexDirection: "row", gap: 12 },
  pointsBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center" },
  
  // 热点话题
  hotTopicsSection: { marginBottom: 20 },
  hotTopicChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 10, gap: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  hotTopicPlatform: { fontSize: 12 },
  hotTopicTitle: { fontSize: 13, color: "#374151", maxWidth: 100 },
  
  // 模板
  templatesSection: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  moreBtn: { fontSize: 14, color: "#4F46E5" },
  refreshBtn: { fontSize: 13, color: "#6B7280" },
  categoryScroll: { marginBottom: 12 },
  categoryChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFF", marginRight: 10, gap: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  categoryChipActive: { backgroundColor: "#4F46E5" },
  categoryIcon: { fontSize: 14 },
  categoryName: { fontSize: 13, color: "#374151" },
  categoryNameActive: { color: "#FFF" },
  templateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  templateItem: { width: "48%", backgroundColor: "#FFF", padding: 14, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  templateText: { fontSize: 13, color: "#374151", lineHeight: 18 },
  
  // 风格选择器
  styleSelector: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  styleSelectorTitle: { fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 12 },
  styleRow: { marginBottom: 10 },
  styleLabel: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  styleChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F3F4F6", marginRight: 10, gap: 6, borderWidth: 2, borderColor: "transparent" },
  styleChipIcon: { fontSize: 14 },
  styleChipText: { fontSize: 13, color: "#374151" },
  styleChipTextSelected: { fontWeight: "600" },
  styleChipSelected: { backgroundColor: "#EEF2FF", borderColor: "#4F46E5" },
  
  // 输入区域
  inputSection: { marginBottom: 20 },
  inputLabel: { fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 10 },
  textInput: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, fontSize: 15, minHeight: 120, textAlignVertical: "top", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  clearBtn: { position: "absolute", right: 10, top: 38, padding: 8 },
  clearBtnText: { fontSize: 13, color: "#9CA3AF" },
  
  // 视频时长
  durationSection: { marginBottom: 20 },
  durationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  durationCard: { width: "48%", backgroundColor: "#FFF", padding: 14, borderRadius: 14, borderWidth: 2, borderColor: "transparent", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  durationCardActive: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
  durationBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  durationBadgeText: { fontSize: 14, fontWeight: "600" },
  durationPrice: { fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 4 },
  durationDesc: { fontSize: 12, color: "#6B7280" },
  
  // 剩余次数
  usageSection: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#FFF", padding: 16, borderRadius: 16, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  usageItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  usageText: { fontSize: 13, color: "#374151" },
  
  // 错误
  errorContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12, marginBottom: 16, gap: 8 },
  errorText: { fontSize: 13, color: "#DC2626", flex: 1 },
  
  // 生成按钮
  generateButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4F46E5", paddingVertical: 18, borderRadius: 16, gap: 10, shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  generateButtonDisabled: { backgroundColor: "#9CA3AF" },
  generateButtonText: { fontSize: 17, fontWeight: "bold", color: "#FFFFFF" },
  
  // VIP
  vipBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFBEB", padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: "#FCD34D" },
  vipContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  vipText: {},
  vipTitle: { fontSize: 15, fontWeight: "600", color: "#92400E" },
  vipSubtitle: { fontSize: 12, color: "#B45309" },
  permanentVipBanner: { backgroundColor: "#ECFDF5", padding: 14, borderRadius: 12, marginTop: 16, alignItems: "center" },
  permanentVipText: { fontSize: 14, fontWeight: "600", color: "#059669" },
  
  // 进度弹窗
  progressOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  progressCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 32, width: "80%", alignItems: "center" },
  progressTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginTop: 20, marginBottom: 8 },
  progressMessage: { fontSize: 14, color: "#6B7280", marginBottom: 20 },
  progressBar: { width: "100%", height: 8, backgroundColor: "#E5E7EB", borderRadius: 4, marginBottom: 8 },
  progressFill: { height: "100%", backgroundColor: "#4F46E5", borderRadius: 4 },
  progressPercent: { fontSize: 13, color: "#6B7280" },
  
  // 通用弹窗
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937" },
  modalClose: { fontSize: 24, color: "#9CA3AF" },
  modalBody: { marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 },
  modalInput: { backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12 },
  durationSelect: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  durationChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 2, borderColor: "#E5E7EB", backgroundColor: "#FFF" },
  durationChipSelected: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
  durationChipText: { fontSize: 14, color: "#6B7280" },
  durationChipTextSelected: { color: "#4F46E5", fontWeight: "600" },
  modalButton: { backgroundColor: "#4F46E5", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  modalButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  
  // 风格选择弹窗
  styleGroupTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 16, marginTop: 16 },
  styleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  styleCard: { width: "30%", backgroundColor: "#F9FAFB", padding: 16, borderRadius: 12, alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  styleCardSelected: { backgroundColor: "#EEF2FF", borderColor: "#4F46E5" },
  styleCardIcon: { fontSize: 24, marginBottom: 8 },
  styleCardName: { fontSize: 13, color: "#374151" },
  styleCardNameSelected: { color: "#4F46E5", fontWeight: "600" },
  
  // 免费码
  freeCodeDisplay: { backgroundColor: "#FEF3C7", borderRadius: 12, padding: 20, alignItems: "center" },
  freeCodeLabel: { fontSize: 14, color: "#92400E", marginBottom: 8 },
  freeCodeValue: { fontSize: 28, fontWeight: "bold", color: "#D97706", letterSpacing: 4 },
  freeCodeHint: { fontSize: 12, color: "#6B7280", marginTop: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#D1D5DB", marginRight: 10, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  checkmark: { color: "#FFF", fontSize: 14 },
  giftToggle: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  giftToggleText: { fontSize: 14, color: "#374151" },
});
