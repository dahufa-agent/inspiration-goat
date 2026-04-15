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
  ScrollView,
  Alert,
  useWindowDimensions,
} from "react-native";
import { Screen } from "@/components/Screen";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import { FontAwesome6 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";

// 调试模式：设置为 true 可以跳过验证码
const DEV_MODE = true;
const DEV_FIXED_CODE = "123456";

// 玻璃拟态风格配色
const COLORS = {
  primary: '#6366F1',       // 主色-靛蓝
  primaryDark: '#4F46E5',   // 深主色
  secondary: '#8B5CF6',     // 紫色
  accent: '#EC4899',        // 粉色
  success: '#10B981',       // 绿色
  warning: '#F59E0B',       // 橙色
  error: '#EF4444',          // 红色
  background: '#0F172A',    // 深色背景
  backgroundLight: '#1E293B', // 浅背景
  cardBg: 'rgba(30, 41, 59, 0.8)', // 玻璃卡片
  text: '#F8FAFC',          // 主文字
  textSecondary: '#94A3B8', // 次要文字
  textMuted: '#64748B',     // 弱化文字
  border: 'rgba(148, 163, 184, 0.2)', // 边框
  inputBg: 'rgba(15, 23, 42, 0.6)',   // 输入框背景
  gradient1: '#6366F1',
  gradient2: '#8B5CF6',
  gradient3: '#EC4899',
};

export default function AuthScreen() {
  const router = useSafeRouter();
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideScreen = width >= 768;
  
  const [isLoginMode, setIsLoginMode] = useState(true); // 默认显示登录页面
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // 登录表单
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // 注册表单
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  
  // 错误提示
  const [error, setError] = useState("");

  // 检查是否已登录
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const userInfo = await SecureStore.getItemAsync("userInfo");
        if (userInfo) {
          const user = JSON.parse(userInfo);
          if (user.isVip || user.isPermanentVip) {
            router.replace("/");
          }
        }
      } catch (err) {
        console.error("Check login error:", err);
      }
    };
    checkLogin();
  }, [router]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      setError("请输入11位手机号");
      return;
    }
    
    if (!/^1\d{10}$/.test(phone)) {
      setError("手机号格式不正确");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "register" }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setCountdown(60);
        
        if (DEV_MODE && data.code) {
          Alert.alert("【开发模式】验证码", `您的验证码是：${data.code}`, [{ text: "知道了" }]);
        } else {
          Alert.alert("提示", "验证码已发送，请查收短信");
        }
      } else {
        setError(data.error || "发送验证码失败");
        Alert.alert("发送失败", data.error || "发送验证码失败");
      }
    } catch (err: any) {
      setError("网络错误，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 切换到登录
  const switchToLogin = () => {
    setIsLoginMode(true);
    setError("");
  };

  // 切换到注册
  const switchToRegister = () => {
    setIsLoginMode(false);
    setError("");
  };

  // 注册
  const handleRegister = async () => {
    if (!phone || !username || !password) {
      setError("所有字段都不能为空");
      return;
    }
    
    if (!/^1\d{10}$/.test(phone)) {
      setError("手机号格式不正确");
      return;
    }
    
    if (!/^\w{3,20}$/.test(username)) {
      setError("用户名需要3-20位字母、数字或下划线");
      return;
    }
    
    if (password.length < 6) {
      setError("密码至少6位");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("两次密码输入不一致");
      return;
    }
    
    const codeToUse = DEV_MODE ? DEV_FIXED_CODE : verifyCode;
    if (!DEV_MODE && !verifyCode) {
      setError("请输入验证码");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, username, password, code: codeToUse }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await SecureStore.setItemAsync("userInfo", JSON.stringify({
          id: data.user.id,
          phone: data.user.phone,
          username: data.user.username,
          isPermanentVip: data.user.isPermanentVip,
          isVip: data.user.isPermanentVip,
        }));
        
        Alert.alert("注册成功", "欢迎加入灵感山羊！", [
          { text: "开始创作", onPress: () => router.replace("/") }
        ]);
      } else {
        setError(data.error || "注册失败");
      }
    } catch (err: any) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 登录
  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      setError("用户名和密码不能为空");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await SecureStore.setItemAsync("userInfo", JSON.stringify({
          id: data.user.id,
          phone: data.user.phone,
          username: data.user.username,
          isPermanentVip: data.user.isPermanentVip,
          isVip: data.user.isVip,
          vipEndDate: data.user.vipEndDate,
        }));
        
        Alert.alert("登录成功", `欢迎回来，${data.user.username}！`, [
          { text: "开始创作", onPress: () => router.replace("/") }
        ]);
      } else {
        setError(data.error || "用户名或密码错误");
      }
    } catch (err: any) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 渲染登录表单
  const renderLoginForm = () => (
    <View style={styles.form}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>手机号 / 用户名</Text>
        <View style={styles.inputWrapper}>
          <FontAwesome6 name="user" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="请输入手机号或用户名"
            placeholderTextColor={COLORS.textMuted}
            value={loginUsername}
            onChangeText={setLoginUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>密码</Text>
        <View style={styles.inputWrapper}>
          <FontAwesome6 name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="请输入密码"
            placeholderTextColor={COLORS.textMuted}
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry
            autoCorrect={false}
          />
        </View>
      </View>
      
      <TouchableOpacity style={styles.forgotButton}>
        <Text style={styles.forgotText}>忘记密码？</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>登录</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // 渲染注册表单
  const renderRegisterForm = () => (
    <View style={styles.form}>
      {DEV_MODE && (
        <View style={styles.devBanner}>
          <FontAwesome6 name="code" size={14} color={COLORS.warning} />
          <Text style={styles.devBannerText}>开发模式：验证码固定为 {DEV_FIXED_CODE}</Text>
        </View>
      )}
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>手机号</Text>
        <View style={styles.inputWrapper}>
          <FontAwesome6 name="phone" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="请输入手机号"
            placeholderTextColor={COLORS.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={11}
            autoCorrect={false}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>验证码</Text>
        <View style={styles.codeInputRow}>
          <View style={[styles.inputWrapper, styles.codeInputWrapper]}>
            <FontAwesome6 name="shield-halved" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder={DEV_MODE ? DEV_FIXED_CODE : "请输入验证码"}
              placeholderTextColor={COLORS.textMuted}
              value={verifyCode}
              onChangeText={setVerifyCode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!DEV_MODE}
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendCodeBtn, (countdown > 0 || loading) && styles.sendCodeBtnDisabled]}
            onPress={handleSendCode}
            disabled={countdown > 0 || loading}
            activeOpacity={0.8}
          >
            {loading && countdown === 0 ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={[styles.sendCodeText, countdown > 0 && styles.sendCodeTextActive]}>
                {countdown > 0 ? `${countdown}s` : "获取验证码"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>用户名</Text>
        <View style={styles.inputWrapper}>
          <FontAwesome6 name="at" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="3-20位字母、数字或下划线"
            placeholderTextColor={COLORS.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>密码</Text>
        <View style={styles.inputWrapper}>
          <FontAwesome6 name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="至少6位"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCorrect={false}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>确认密码</Text>
        <View style={styles.inputWrapper}>
          <FontAwesome6 name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="再次输入密码"
            placeholderTextColor={COLORS.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCorrect={false}
          />
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>注册</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Screen style={{ backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            isWideScreen && styles.scrollContentWide
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 背景装饰 */}
          <View style={styles.bgDecoration}>
            <View style={[styles.gradientOrb, styles.orb1]} />
            <View style={[styles.gradientOrb, styles.orb2]} />
            <View style={[styles.gradientOrb, styles.orb3]} />
          </View>

          {/* Logo区域 */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBadge}>
              <FontAwesome6 name="wand-magic-sparkles" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>灵感山羊</Text>
            <Text style={styles.appDesc}>一键生成文案、图片、视频</Text>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, isLoginMode && styles.tabActive]}
              onPress={switchToLogin}
              activeOpacity={0.7}
            >
              <FontAwesome6 
                name="right-to-bracket" 
                size={16} 
                color={isLoginMode ? COLORS.primary : COLORS.textMuted} 
              />
              <Text style={[styles.tabText, isLoginMode && styles.tabTextActive]}>登录</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isLoginMode && styles.tabActive]}
              onPress={switchToRegister}
              activeOpacity={0.7}
            >
              <FontAwesome6 
                name="user-plus" 
                size={16} 
                color={!isLoginMode ? COLORS.primary : COLORS.textMuted} 
              />
              <Text style={[styles.tabText, !isLoginMode && styles.tabTextActive]}>注册</Text>
            </TouchableOpacity>
          </View>

          {/* 错误提示 */}
          {error ? (
            <View style={styles.errorContainer}>
              <FontAwesome6 name="circle-exclamation" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* 表单区域 */}
          {isLoginMode ? renderLoginForm() : renderRegisterForm()}

          {/* 协议 */}
          <View style={styles.agreement}>
            <Text style={styles.agreementText}>登录即表示同意</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>《用户协议》</Text>
            </TouchableOpacity>
            <Text style={styles.agreementText}>和</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>《隐私政策》</Text>
            </TouchableOpacity>
          </View>

          {/* 跳过提示 */}
          <TouchableOpacity style={styles.skipButton} onPress={() => router.replace("/")}>
            <Text style={styles.skipText}>游客模式</Text>
            <FontAwesome6 name="arrow-right" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  scrollContentWide: {
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  // 背景装饰
  bgDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  gradientOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  orb1: {
    width: 300,
    height: 300,
    backgroundColor: COLORS.gradient1,
    top: -100,
    right: -100,
  },
  orb2: {
    width: 200,
    height: 200,
    backgroundColor: COLORS.gradient2,
    bottom: 100,
    left: -80,
  },
  orb3: {
    width: 150,
    height: 150,
    backgroundColor: COLORS.gradient3,
    bottom: -50,
    right: 50,
  },
  // Logo
  logoContainer: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: 1,
  },
  appDesc: {
    fontSize: 15,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  // Tab
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  tabActive: {
    backgroundColor: COLORS.backgroundLight,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  // 错误提示
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    flex: 1,
  },
  // 表单
  form: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  devBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  devBannerText: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  inputWithIcon: {
    paddingLeft: 12,
  },
  codeInputRow: {
    flexDirection: "row",
    gap: 12,
  },
  codeInputWrapper: {
    flex: 1,
  },
  sendCodeBtn: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  sendCodeBtnDisabled: {
    borderColor: COLORS.border,
    opacity: 0.6,
  },
  sendCodeText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  sendCodeTextActive: {
    color: COLORS.textMuted,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: -8,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // 协议
  agreement: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 8,
  },
  agreementText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "500",
  },
  // 跳过
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
    paddingVertical: 12,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
