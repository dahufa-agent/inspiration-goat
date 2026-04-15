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
  { id: 'xiaohongshu', name: '小红书', icon: 'book', color: '#FF2442' },
  { id: 'douyin', name: '抖音', icon: 'music', color: '#000000' },
  { id: 'gzh', name: '公众号', icon: 'envelope', color: '#4F46E5' },
  { id: 'zhihu', name: '知乎', icon: 'comment', color: '#0084FF' },
  { id: 'general', name: '通用', icon: 'star', color: '#10B981' },
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
  { id: 'scenery', name: '风景', icon: 'image' },
  { id: 'portrait', name: '人像', icon: 'user' },
  { id: 'food', name: '美食', icon: 'utensils' },
  { id: 'animal', name: '萌宠', icon: 'paw' },
  { id: 'art', name: '艺术', icon: 'palette' },
  { id: 'lifestyle', name: '生活', icon: 'coffee' },
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
      <Text style={styles.styleSelectorTitle}>创作风格</Text>
      <View style={styles.styleRow}>
        <Text style={styles.styleLabel}>文案风格：</Text>
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TEXT_STYLES.map((style) => (
              <TouchableOpacity
                key={style.id}
                style={[styles.styleChip, selectedTextStyle === style.id && { backgroundColor: style.color + '20', borderColor: style.color }]}
                onPress={() => setSelectedTextStyle(style.id)}
              >
                <FontAwesome6 name={style.icon as any} size={14} color={COLORS.text} />
                <Text style={[styles.styleChipText, selectedTextStyle === style.id && { color: style.color }]}>{style.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      <View style={styles.styleRow}>
        <Text style={styles.styleLabel}>图片风格：</Text>
        <View>
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
    </View>
  );

  // ==================== 新增：热点话题组件 ====================
  const getHotTopicIcon = (platform: string) => {
    switch (platform) {
      case 'weibo': return 'newspaper';
      case 'zhihu': return 'comment';
      case 'douyin': return 'music';
      default: return 'book';
    }
  };

  const HotTopicsSection = () => (
    hotTopics.length > 0 ? (
      <View style={styles.hotTopicsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>热点话题</Text>
          <TouchableOpacity onPress={loadHotTopics}>
            <Text style={styles.refreshBtn}>刷新</Text>
          </TouchableOpacity>
        </View>
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {hotTopics.map((topic) => (
              <TouchableOpacity key={topic.id} style={styles.hotTopicChip} onPress={() => setIdea(topic.title)}>
                <FontAwesome6 name={getHotTopicIcon(topic.platform) as any} size={12} color={COLORS.text} />
                <Text style={styles.hotTopicTitle} numberOfLines={1}>{topic.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
                <FontAwesome6 name="clock-rotate-left" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* 热点话题 */}
          <HotTopicsSection />

          {/* 模板分类 */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.templatesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>快速模板</Text>
              <TouchableOpacity onPress={() => setShowStyleModal(true)}>
                <Text style={styles.moreBtn}>更多风格</Text>
              </TouchableOpacity>
            </View>
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity key={cat.id} style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]} onPress={() => setSelectedCategory(cat.id)}>
                    <FontAwesome6 name={cat.icon as any} size={14} color={selectedCategory === cat.id ? '#FFFFFF' : COLORS.text} />
                    <Text style={[styles.categoryName, selectedCategory === cat.id && styles.categoryNameActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
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
            <Text style={styles.inputLabel}>你的创意想法</Text>
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
            <Text style={styles.sectionTitle}>视频时长</Text>
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
              <FontAwesome6 name="circle-exclamation" size={16} color={COLORS.error} />
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
                <FontAwesome6 name="wand-magic-sparkles" size={20} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>一键生成全部</Text>
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
                <Text style={styles.styleGroupTitle}>文案风格</Text>
                <View style={styles.styleGrid}>
                  {TEXT_STYLES.map((style) => (
                    <TouchableOpacity key={style.id} style={[styles.styleCard, selectedTextStyle === style.id && { borderColor: style.color, backgroundColor: style.color + '10' }]} onPress={() => setSelectedTextStyle(style.id)}>
                      <FontAwesome6 name={style.icon as any} size={24} color={COLORS.text} />
                      <Text style={[styles.styleCardName, selectedTextStyle === style.id && { color: style.color }]}>{style.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.styleGroupTitle}>图片风格</Text>
                <View style={styles.styleGrid}>
                  {IMAGE_STYLES.map((style) => (
                    <TouchableOpacity key={style.id} style={[styles.styleCard, selectedImageStyle === style.id && styles.styleCardSelected]} onPress={() => setSelectedImageStyle(style.id)}>
                      <FontAwesome6 name="image" size={24} color={COLORS.primary} />
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

// 柔和卡片风格颜色配置
const COLORS = {
  background: '#F0F0F3',
  cardBg: '#F0F0F3',
  primary: '#6C63FF',
  primaryLight: '#896BFF',
  secondary: '#FF6584',
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#FF6B6B',
  text: '#2D3436',
  textSecondary: '#636E72',
  placeholder: '#B2BEC3',
  shadowLight: '#FFFFFF',
  shadowDark: '#D1D9E6',
  pressed: '#E8E8EB',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  greeting: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: "row", gap: 12 },
  pointsBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.cardBg, justifyContent: "center", alignItems: "center", shadowColor: COLORS.shadowDark, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
  
  // 热点话题 - 柔和胶囊
  hotTopicsSection: { marginBottom: 24 },
  hotTopicChip: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.cardBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 10, gap: 6, shadowColor: COLORS.shadowDark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 3 },
  hotTopicPlatform: { fontSize: 12 },
  hotTopicTitle: { fontSize: 13, color: COLORS.text, maxWidth: 100 },
  
  // 模板
  templatesSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  moreBtn: { fontSize: 14, color: COLORS.primary },
  refreshBtn: { fontSize: 13, color: COLORS.textSecondary },
  categoryScroll: { marginBottom: 14 },
  categoryChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.cardBg, marginRight: 10, gap: 6, shadowColor: COLORS.shadowDark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 3 },
  categoryChipActive: { backgroundColor: COLORS.primary },
  categoryIcon: { fontSize: 14 },
  categoryName: { fontSize: 13, color: COLORS.text },
  categoryNameActive: { color: COLORS.white },
  templateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  templateItem: { width: "47%", backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 20, marginHorizontal: "1.5%", shadowColor: COLORS.shadowDark, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
  templateText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  
  // 风格选择器 - 柔和卡片
  styleSelector: { backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: COLORS.shadowDark, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  styleSelectorTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 14 },
  styleRow: { marginBottom: 12 },
  styleLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10 },
  styleChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.pressed, marginRight: 10, gap: 6, borderWidth: 2, borderColor: "transparent" },
  styleChipIcon: { fontSize: 14 },
  styleChipText: { fontSize: 13, color: COLORS.text },
  styleChipTextSelected: { fontWeight: "600" },
  styleChipSelected: { backgroundColor: "rgba(108, 99, 255, 0.12)", borderColor: COLORS.primary },
  
  // 输入区域 - 凹陷效果
  inputSection: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  textInput: { backgroundColor: COLORS.pressed, borderRadius: 20, padding: 18, fontSize: 15, minHeight: 120, textAlignVertical: "top", color: COLORS.text, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
  clearBtn: { position: "absolute", right: 12, top: 50, padding: 8 },
  clearBtnText: { fontSize: 13, color: COLORS.placeholder },
  
  // 视频时长
  durationSection: { marginBottom: 24 },
  durationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  durationCard: { width: "47%", backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 20, borderWidth: 2, borderColor: "transparent", shadowColor: COLORS.shadowDark, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
  durationCardActive: { borderColor: COLORS.primary, backgroundColor: "rgba(108, 99, 255, 0.08)" },
  durationBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginBottom: 10 },
  durationBadgeText: { fontSize: 15, fontWeight: "700" },
  durationPrice: { fontSize: 15, fontWeight: "600", color: COLORS.text, marginBottom: 4 },
  durationDesc: { fontSize: 12, color: COLORS.textSecondary },
  
  // 剩余次数 - 柔和卡片
  usageSection: { flexDirection: "row", justifyContent: "space-around", backgroundColor: COLORS.cardBg, padding: 18, borderRadius: 24, marginBottom: 24, shadowColor: COLORS.shadowDark, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  usageItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  usageText: { fontSize: 13, color: COLORS.text, fontWeight: "600" },
  
  // 错误提示
  errorContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 107, 107, 0.12)", padding: 14, borderRadius: 16, marginBottom: 18, gap: 10 },
  errorText: { fontSize: 13, color: COLORS.error, flex: 1 },
  
  // 生成按钮 - 渐变风格
  generateButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 9999, gap: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  generateButtonDisabled: { backgroundColor: COLORS.placeholder },
  generateButtonText: { fontSize: 18, fontWeight: "800", color: COLORS.white },
  
  // VIP 横幅
  vipBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(253, 203, 110, 0.15)", padding: 16, borderRadius: 20, marginTop: 18, borderWidth: 1, borderColor: "rgba(253, 203, 110, 0.3)" },
  vipContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  vipText: {},
  vipTitle: { fontSize: 15, fontWeight: "700", color: "#92400E" },
  vipSubtitle: { fontSize: 12, color: "#B45309", marginTop: 2 },
  permanentVipBanner: { backgroundColor: "rgba(0, 184, 148, 0.12)", padding: 14, borderRadius: 16, marginTop: 18, alignItems: "center" },
  permanentVipText: { fontSize: 14, fontWeight: "700", color: COLORS.success },
  
  // 进度弹窗
  progressOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  progressCard: { backgroundColor: COLORS.white, borderRadius: 28, padding: 36, width: "80%", alignItems: "center", shadowColor: COLORS.shadowDark, shadowOffset: { width: 8, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  progressTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text, marginTop: 24, marginBottom: 10 },
  progressMessage: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  progressBar: { width: "100%", height: 10, backgroundColor: COLORS.pressed, borderRadius: 5, marginBottom: 10 },
  progressFill: { height: "100%", backgroundColor: COLORS.primary, borderRadius: 5 },
  progressPercent: { fontSize: 14, color: COLORS.textSecondary },
  
  // 通用弹窗
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 44, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  modalClose: { fontSize: 24, color: COLORS.placeholder },
  modalBody: { marginBottom: 24 },
  modalLabel: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 10 },
  modalInput: { backgroundColor: COLORS.pressed, borderRadius: 16, padding: 16, fontSize: 15, marginBottom: 14, color: COLORS.text, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
  durationSelect: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  durationChip: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 9999, borderWidth: 2, borderColor: COLORS.pressed, backgroundColor: COLORS.cardBg },
  durationChipSelected: { borderColor: COLORS.primary, backgroundColor: "rgba(108, 99, 255, 0.1)" },
  durationChipText: { fontSize: 14, color: COLORS.textSecondary },
  durationChipTextSelected: { color: COLORS.primary, fontWeight: "700" },
  modalButton: { backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 18, alignItems: "center", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  modalButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  
  // 风格选择弹窗
  styleGroupTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 18, marginTop: 20 },
  styleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  styleCard: { width: "30%", backgroundColor: COLORS.cardBg, padding: 18, borderRadius: 18, alignItems: "center", borderWidth: 2, borderColor: "transparent", shadowColor: COLORS.shadowDark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 3 },
  styleCardSelected: { backgroundColor: "rgba(108, 99, 255, 0.1)", borderColor: COLORS.primary },
  styleCardIcon: { fontSize: 28, marginBottom: 10 },
  styleCardName: { fontSize: 13, color: COLORS.text, fontWeight: "600" },
  styleCardNameSelected: { color: COLORS.primary, fontWeight: "700" },
  
  // 免费码
  freeCodeDisplay: { backgroundColor: "rgba(253, 203, 110, 0.15)", borderRadius: 18, padding: 24, alignItems: "center" },
  freeCodeLabel: { fontSize: 14, color: "#92400E", marginBottom: 10 },
  freeCodeValue: { fontSize: 30, fontWeight: "800", color: "#D97706", letterSpacing: 4 },
  freeCodeHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: COLORS.shadowDark, marginRight: 12, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.white, fontSize: 14, fontWeight: "700" },
  giftToggle: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  giftToggleText: { fontSize: 14, color: COLORS.text },
});
