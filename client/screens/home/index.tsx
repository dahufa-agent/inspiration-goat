import React, { useState, useEffect, useCallback } from "react";
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
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { Screen } from "@/components/Screen";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

// 山羊老师头像 - 长胡子戴眼镜的学问山羊
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
  const [isGifting, setIsGifting] = useState(false); // 是否是赠送模式
  const [recipientPhone, setRecipientPhone] = useState(""); // 接收人手机号
  const [isGiftedCode, setIsGiftedCode] = useState(false); // 生成的码是否是赠送码

  // 获取用户信息
  const loadUserInfo = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync("userInfo");
      if (stored) {
        const user = JSON.parse(stored) as UserInfo;
        setUserInfo(user);
        setIsPermanentVip(user.isPermanentVip);
        
        // 获取会员状态
        if (user.id) {
          const response = await fetch(`${BACKEND_BASE_URL}/api/v1/user/membership`, {
            headers: { "x-user-id": user.id },
          });
          const data = await response.json();
          if (data.isVip || data.isPermanentVip) {
            setIsPermanentVip(true);
          }
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
        
        // 获取剩余次数
        const response = await fetch(`${BACKEND_BASE_URL}/api/v1/user/remaining-edits`, {
          headers: { "x-device-id": id },
        });
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
  }, [loadUserInfo]);

  const canGenerate = () => {
    if (!idea.trim()) return { allowed: false, reason: "请输入你的创意想法" };
    if (selectedDuration === "free" && remainingVideoEdits <= 0) {
      return { allowed: false, reason: "今日视频编辑次数已用完" };
    }
    if (remainingImages < LIMITS.images.perBatch) {
      return { allowed: false, reason: `今日图片生成次数已用完（每次${LIMITS.images.perBatch}张）` };
    }
    if (remainingTexts < LIMITS.texts.perBatch) {
      return { allowed: false, reason: "今日文案生成次数已用完" };
    }
    return { allowed: true, reason: "" };
  };

  const handleGenerate = async () => {
    const check = canGenerate();
    if (!check.allowed) {
      setError(check.reason);
      return;
    }

    setLoading(true);
    setError("");

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
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 更新剩余次数
        setRemainingVideoEdits(data.remainingFreeEdits ?? remainingVideoEdits);
        setRemainingImages(data.remainingImages ?? remainingImages);
        setRemainingTexts(data.remainingTexts ?? remainingTexts);

        // 跳转到编辑页面
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
        setError(data.message || data.error || "生成失败，请重试");
        if (data.remainingImages !== undefined) setRemainingImages(data.remainingImages);
        if (data.remainingTexts !== undefined) setRemainingTexts(data.remainingTexts);
        if (data.remainingFreeEdits !== undefined) setRemainingVideoEdits(data.remainingFreeEdits);
      }
    } catch (err) {
      setError("网络错误，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  const generateCheck = canGenerate();

  // 申请免费码
  const handleApplyFreeCode = async () => {
    if (!freeCodePhone) {
      Alert.alert("提示", "请输入手机号");
      return;
    }
    
    if (isGifting && !recipientPhone) {
      Alert.alert("提示", "请输入接收人手机号");
      return;
    }
    
    if (isGifting && !/^1\d{10}$/.test(recipientPhone)) {
      Alert.alert("提示", "接收人手机号格式不正确");
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/free-codes/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: freeCodePhone,
          durationType: selectedFreeCodeType,
          recipientPhone: isGifting ? recipientPhone : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFreeCode(data.freeCode);
        setIsGiftedCode(data.isGifted || false);
      } else {
        Alert.alert("提示", data.error || "申请失败");
      }
    } catch (err) {
      Alert.alert("提示", "网络错误");
    }
  };

  // 激活免费码
  const handleActivateFreeCode = async (code: string) => {
    if (!userInfo?.id) {
      Alert.alert("提示", "请先登录");
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/free-codes/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userInfo.id,
          code,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert("成功", "免费码激活成功！", [
          { text: "确定", onPress: () => {
            setShowFreeCodeModal(false);
            setFreeCode("");
            loadUserInfo();
          }}
        ]);
      } else {
        Alert.alert("提示", data.error || "激活失败");
      }
    } catch (err) {
      Alert.alert("提示", "网络错误");
    }
  };

  // 登出
  const handleLogout = async () => {
    Alert.alert("提示", "确定要退出登录吗？", [
      { text: "取消", style: "cancel" },
      { text: "确定", onPress: async () => {
        await SecureStore.deleteItemAsync("userInfo");
        setUserInfo(null);
        setIsPermanentVip(false);
      }}
    ]);
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header with Goat Teacher Avatar */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: GOAT_TEACHER_AVATAR }} style={styles.avatar} />
              <View style={styles.avatarBadge}>
                <Text style={styles.badgeText}>AI</Text>
              </View>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>你好，我是山羊老师</Text>
              <Text style={styles.subtitle}>一键生成创意内容</Text>
            </View>
            <View style={styles.userArea}>
              {userInfo ? (
                <TouchableOpacity onPress={handleLogout} style={styles.userButton}>
                  {isPermanentVip ? (
                    <View style={styles.vipBadge}>
                      <Text style={styles.vipBadgeText}>永久会员</Text>
                    </View>
                  ) : (
                    <Text style={styles.usernameText}>{userInfo.username}</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.loginButton}
                  onPress={() => router.push("/auth")}
                >
                  <Text style={styles.loginButtonText}>登录</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Permanent VIP Banner (for permanent VIP users) */}
          {userInfo && isPermanentVip && (
            <TouchableOpacity 
              style={styles.permanentVipBanner}
              onPress={() => router.push("/auth")}
            >
              <Text style={styles.permanentVipText}>永久会员 - 无限创作</Text>
            </TouchableOpacity>
          )}

          {/* Free Code Entry (only for logged in non-permanent VIP users) */}
          {userInfo && !isPermanentVip && (
            <TouchableOpacity 
              style={styles.freeCodeEntry}
              onPress={() => setShowFreeCodeModal(true)}
            >
              <View style={styles.freeCodeIcon}>
                <Text style={styles.freeCodeIconText}>兑换</Text>
              </View>
              <View style={styles.freeCodeContent}>
                <Text style={styles.freeCodeTitle}>免费码兑换</Text>
                <Text style={styles.freeCodeDesc}>输入免费码获得会员时长</Text>
              </View>
              <Text style={styles.freeCodeArrow}>{">"}</Text>
            </TouchableOpacity>
          )}

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

            {/* Daily Quota Card */}
            <View style={styles.quotaCard}>
              <Text style={styles.quotaTitle}>今日剩余次数</Text>
              <View style={styles.quotaList}>
                <View style={styles.quotaItem}>
                  <View style={[styles.quotaIcon, { backgroundColor: "#FEF3C7" }]}>
                    <Text style={styles.quotaIconText}>IMG</Text>
                  </View>
                  <View style={styles.quotaInfo}>
                    <Text style={styles.quotaLabel}>图片</Text>
                    <Text style={styles.quotaValue}>
                      {remainingImages} / {LIMITS.images.maxPerDay}
                    </Text>
                  </View>
                  <Text style={styles.quotaBatch}>每次{LIMITS.images.perBatch}张</Text>
                </View>
                <View style={styles.quotaItem}>
                  <View style={[styles.quotaIcon, { backgroundColor: "#DBEAFE" }]}>
                    <Text style={styles.quotaIconText}>TXT</Text>
                  </View>
                  <View style={styles.quotaInfo}>
                    <Text style={styles.quotaLabel}>文案</Text>
                    <Text style={styles.quotaValue}>
                      {remainingTexts} / {LIMITS.texts.maxPerDay}
                    </Text>
                  </View>
                  <Text style={styles.quotaBatch}>每次{LIMITS.texts.perBatch}条</Text>
                </View>
                <View style={styles.quotaItem}>
                  <View style={[styles.quotaIcon, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={styles.quotaIconText}>VID</Text>
                  </View>
                  <View style={styles.quotaInfo}>
                    <Text style={styles.quotaLabel}>视频（5秒）</Text>
                    <Text style={styles.quotaValue}>
                      {remainingVideoEdits} / 10
                    </Text>
                  </View>
                  <Text style={styles.quotaBatch}>免费编辑</Text>
                </View>
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={[
                styles.generateButton,
                (!generateCheck.allowed || loading) && styles.generateButtonDisabled,
              ]}
              onPress={handleGenerate}
              disabled={!generateCheck.allowed || loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.loadingText}>生成中，请稍候...</Text>
                </View>
              ) : (
                <Text style={styles.generateButtonText}>一键生成</Text>
              )}
            </TouchableOpacity>

            {/* Video Duration Selection */}
            <View style={styles.durationCard}>
              <View style={styles.durationHeader}>
                <Text style={styles.cardTitle}>选择视频时长</Text>
                {selectedDuration === "free" && (
                  <View style={styles.quotaBadge}>
                    <Text style={styles.quotaBadgeText}>今日剩余 {remainingVideoEdits} 次</Text>
                  </View>
                )}
              </View>
              <View style={styles.durationOptions}>
                {DURATION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.durationOption,
                      selectedDuration === option.type && styles.durationOptionSelected,
                      { borderColor: option.color },
                    ]}
                    onPress={() => setSelectedDuration(option.type)}
                  >
                    <View style={[styles.durationDot, { backgroundColor: option.color }]} />
                    <View style={styles.durationInfo}>
                      <Text style={styles.durationLabel}>{option.label}</Text>
                      <Text style={styles.durationPrice}>{option.price}</Text>
                    </View>
                    <Text style={[
                      styles.durationDesc,
                      selectedDuration === option.type && { color: option.color }
                    ]}>
                      {option.description}
                    </Text>
                    {selectedDuration === option.type && (
                      <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                        <Text style={styles.checkmarkText}>OK</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quick Ideas */}
            <View style={styles.quickIdeas}>
              <Text style={styles.quickIdeasTitle}>试试这些灵感</Text>
              <View style={styles.quickIdeasList}>
                {["海边日落", "森林小路", "城市夜景", "星空银河", "美食探店", "旅行风光", "人物写真", "文艺少女"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.quickIdeaChip}
                    onPress={() => setIdea(item)}
                  >
                    <Text style={styles.quickIdeaText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Bottom Tips */}
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>生成规则</Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: "#10B981" }]} />
                <Text style={styles.tipText}>图片：每日免费{LIMITS.images.maxPerDay}张，每次{LIMITS.images.perBatch}张，超出每张{LIMITS.images.chargePerImage}积分</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: "#3B82F6" }]} />
                <Text style={styles.tipText}>文案：每日免费{LIMITS.texts.maxPerDay}次，超出每次{LIMITS.texts.chargePerText}积分</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={styles.tipText}>视频：5秒每日免费10次，加时长每5秒10积分</Text>
              </View>
            </View>
          </View>

          {/* Free Code Entry */}
          {!isPermanentVip && (
            <TouchableOpacity 
              style={styles.freeCodeEntry}
              onPress={() => {
                if (userInfo) {
                  setFreeCodePhone(userInfo.phone || "");
                }
                setShowFreeCodeModal(true);
              }}
            >
              <View style={styles.freeCodeIcon}>
                <Text style={styles.freeCodeIconText}>VIP</Text>
              </View>
              <View style={styles.freeCodeContent}>
                <Text style={styles.freeCodeTitle}>领取免费会员</Text>
                <Text style={styles.freeCodeDesc}>获取1个月/季度/半年/年度会员</Text>
              </View>
              <Text style={styles.freeCodeArrow}>{">"}</Text>
            </TouchableOpacity>
          )}

          {isPermanentVip && (
            <View style={styles.permanentVipBanner}>
              <Text style={styles.permanentVipText}>永久会员 · 无限创作</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Free Code Modal */}
      <Modal
        visible={showFreeCodeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFreeCodeModal(false)}
      >
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
                  <TextInput
                    style={styles.modalInput}
                    placeholder="请输入手机号"
                    value={freeCodePhone}
                    onChangeText={setFreeCodePhone}
                    keyboardType="phone-pad"
                  />
                  
                  {/* 赠送切换 */}
                  <TouchableOpacity 
                    style={styles.giftToggle}
                    onPress={() => setIsGifting(!isGifting)}
                  >
                    <View style={[styles.checkbox, isGifting && styles.checkboxChecked]}>
                      {isGifting && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.giftToggleText}>赠送给好友</Text>
                  </TouchableOpacity>
                  
                  {/* 接收人手机号 */}
                  {isGifting && (
                    <>
                      <Text style={styles.modalLabel}>接收人手机号</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="请输入好友手机号"
                        value={recipientPhone}
                        onChangeText={setRecipientPhone}
                        keyboardType="phone-pad"
                      />
                    </>
                  )}
                  
                  <Text style={styles.modalLabel}>选择时长</Text>
                  <View style={styles.durationSelect}>
                    {FREE_CODE_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.type}
                        style={[
                          styles.durationChip,
                          selectedFreeCodeType === option.type && styles.durationChipSelected,
                        ]}
                        onPress={() => setSelectedFreeCodeType(option.type)}
                      >
                        <Text style={[
                          styles.durationChipText,
                          selectedFreeCodeType === option.type && styles.durationChipTextSelected,
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={handleApplyFreeCode}
                >
                  <Text style={styles.modalButtonText}>
                    {isGifting ? "生成赠送码" : "获取免费码"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>
                    {isGiftedCode ? "您的赠送码" : "您的免费码"}
                  </Text>
                  <View style={styles.freeCodeDisplay}>
                    <Text style={styles.freeCodeValue}>{freeCode}</Text>
                  </View>
                  <Text style={styles.freeCodeHint}>
                    {isGiftedCode
                      ? "此码已绑定好友手机，好友登录后可直接激活"
                      : "请复制免费码并登录后点击&quot;激活&quot;使用"
                    }
                  </Text>
                </View>
                
                {userInfo ? (
                  <TouchableOpacity 
                    style={styles.modalButton}
                    onPress={() => handleActivateFreeCode(freeCode)}
                  >
                    <Text style={styles.modalButtonText}>立即激活</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.modalButton}
                    onPress={() => {
                      setShowFreeCodeModal(false);
                      router.push("/auth");
                    }}
                  >
                    <Text style={styles.modalButtonText}>登录后激活</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
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
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 8,
  },
  quotaCard: {
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
  quotaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  quotaList: {
    gap: 12,
  },
  quotaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  quotaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  quotaIconText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },
  quotaInfo: {
    flex: 1,
  },
  quotaLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  quotaValue: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  quotaBatch: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  durationCard: {
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
  durationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  quotaBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quotaBadgeText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },
  durationOptions: {
    gap: 12,
  },
  durationOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  durationOptionSelected: {
    backgroundColor: "#FFFFFF",
  },
  durationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  durationInfo: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  durationPrice: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  durationDesc: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 8,
  },
  checkmark: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
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
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 14,
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
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  tipText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  // User Area
  userArea: {
    marginLeft: "auto",
  },
  userButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
  },
  usernameText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
  },
  loginButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#4F46E5",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  vipBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vipBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  // Free Code Entry
  freeCodeEntry: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  freeCodeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  freeCodeIconText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#F59E0B",
  },
  freeCodeContent: {
    flex: 1,
  },
  freeCodeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  freeCodeDesc: {
    fontSize: 12,
    color: "#6B7280",
  },
  freeCodeArrow: {
    fontSize: 18,
    color: "#9CA3AF",
  },
  permanentVipBanner: {
    backgroundColor: "#F59E0B",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  permanentVipText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  modalClose: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  modalBody: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  durationSelect: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  durationChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  durationChipSelected: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  durationChipText: {
    fontSize: 14,
    color: "#6B7280",
  },
  durationChipTextSelected: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  modalButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  freeCodeDisplay: {
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  freeCodeValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#D97706",
    letterSpacing: 4,
  },
  freeCodeHint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  // 赠送样式
  giftToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  giftToggleText: {
    fontSize: 14,
    color: "#374151",
  },
});
