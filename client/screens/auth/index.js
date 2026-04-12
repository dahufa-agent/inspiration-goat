import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert, } from "react-native";
import { Screen } from "@/components/Screen";
import { useSafeRouter } from "@/hooks/useSafeRouter";
import * as SecureStore from "expo-secure-store";
const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";
// 调试模式：设置为 true 可以跳过验证码
const DEV_MODE = true;
const DEV_FIXED_CODE = "123456";
export default function AuthScreen() {
    const router = useSafeRouter();
    const [isLoginMode, setIsLoginMode] = useState(false); // 默认显示注册页面
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [debugInfo, setDebugInfo] = useState("");
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
    // 记录调试信息
    const addDebug = useCallback((msg) => {
        const timestamp = new Date().toLocaleTimeString();
        setDebugInfo(prev => `[${timestamp}] ${msg}\n${prev}`.slice(0, 500));
        console.log(`[Auth] ${msg}`);
    }, []);
    // 检查是否已登录
    useEffect(() => {
        addDebug("组件挂载，检查登录状态");
        const checkLogin = async () => {
            try {
                const userInfo = await SecureStore.getItemAsync("userInfo");
                if (userInfo) {
                    const user = JSON.parse(userInfo);
                    addDebug(`找到用户信息: ${user.username}`);
                    if (user.isVip || user.isPermanentVip) {
                        addDebug("用户已是VIP，跳转首页");
                        router.replace("/");
                    }
                }
                else {
                    addDebug("未找到用户信息");
                }
            }
            catch (err) {
                addDebug(`检查登录错误: ${err.message}`);
                console.error("Check login error:", err);
            }
        };
        checkLogin();
    }, [router, addDebug]);
    // 发送验证码
    const handleSendCode = async () => {
        addDebug(`发送验证码开始, phone=${phone}, length=${phone.length}`);
        if (!phone || phone.length !== 11) {
            setError("请输入11位手机号");
            addDebug("手机号长度不正确");
            return;
        }
        if (!/^1\d{10}$/.test(phone)) {
            setError("手机号格式不正确");
            addDebug("手机号格式错误");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const requestUrl = `${BACKEND_BASE_URL}/api/v1/auth/send-code`;
            addDebug(`请求URL: ${requestUrl}`);
            const response = await fetch(requestUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone,
                    purpose: "register",
                }),
            });
            const data = await response.json();
            addDebug(`响应状态: ${response.status}, data: ${JSON.stringify(data)}`);
            if (response.ok && data.success) {
                setCountdown(60);
                // 开发模式直接显示验证码
                if (DEV_MODE && data.code) {
                    Alert.alert("【开发模式】验证码", `您的验证码是：${data.code}\n\n(生产环境请查收短信)`, [{ text: "知道了" }]);
                }
                else {
                    Alert.alert("提示", "验证码已发送，请查收短信");
                }
            }
            else {
                const errorMsg = data.error || "发送验证码失败";
                setError(errorMsg);
                addDebug(`发送失败: ${errorMsg}`);
                Alert.alert("发送失败", errorMsg);
            }
        }
        catch (err) {
            console.error("[发送验证码] 网络错误:", err);
            const errorMsg = "网络错误，请检查网络连接";
            setError(errorMsg);
            addDebug(`网络错误: ${err.message}`);
            Alert.alert("网络错误", `无法连接到服务器\n\n${BACKEND_BASE_URL}\n\n${err.message}`);
        }
        finally {
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
        addDebug("切换到登录");
        setIsLoginMode(true);
        setError("");
        setLoading(false);
    };
    // 切换到注册
    const switchToRegister = () => {
        addDebug("切换到注册");
        setIsLoginMode(false);
        setError("");
        setLoading(false);
    };
    // 注册
    const handleRegister = async () => {
        addDebug(`注册开始, phone=${phone}, username=${username}`);
        if (!phone || !username || !password) {
            setError("所有字段都不能为空");
            addDebug("字段为空");
            return;
        }
        if (!/^1\d{10}$/.test(phone)) {
            setError("手机号格式不正确");
            addDebug("手机号格式错误");
            return;
        }
        if (!/^\w{3,20}$/.test(username)) {
            setError("用户名需要3-20位字母、数字或下划线");
            addDebug("用户名格式错误");
            return;
        }
        if (password.length < 6) {
            setError("密码至少6位");
            addDebug("密码太短");
            return;
        }
        if (password !== confirmPassword) {
            setError("两次密码输入不一致");
            addDebug("两次密码不一致");
            return;
        }
        // 开发模式使用固定验证码
        const codeToUse = DEV_MODE ? DEV_FIXED_CODE : verifyCode;
        if (!DEV_MODE && !verifyCode) {
            setError("请输入验证码");
            addDebug("验证码为空");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const response = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone,
                    username,
                    password,
                    code: codeToUse,
                }),
            });
            const data = await response.json();
            addDebug(`注册响应: ${response.status}, ${JSON.stringify(data)}`);
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
            }
            else {
                setError(data.error || "注册失败");
                addDebug(`注册失败: ${data.error}`);
            }
        }
        catch (err) {
            setError("网络错误，请重试");
            addDebug(`注册网络错误: ${err.message}`);
        }
        finally {
            setLoading(false);
        }
    };
    // 登录
    const handleLogin = async () => {
        addDebug(`登录开始, username=${loginUsername}`);
        if (!loginUsername || !loginPassword) {
            setError("用户名和密码不能为空");
            addDebug("用户名或密码为空");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const response = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: loginUsername,
                    password: loginPassword,
                }),
            });
            const data = await response.json();
            addDebug(`登录响应: ${response.status}, success=${response.ok}`);
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
            }
            else {
                setError(data.error || "登录失败");
                addDebug(`登录失败: ${data.error}`);
            }
        }
        catch (err) {
            setError("网络错误，请重试");
            addDebug(`登录网络错误: ${err.message}`);
        }
        finally {
            setLoading(false);
        }
    };
    return (<Screen>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>灵感</Text>
            </View>
            <Text style={styles.appName}>灵感山羊</Text>
            <Text style={styles.appDesc}>一键生成创意内容</Text>
          </View>

          {/* Tab Switcher - 修复：确保正确切换 */}
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, isLoginMode && styles.tabActive]} onPress={switchToLogin} activeOpacity={0.7}>
              <Text style={[styles.tabText, isLoginMode && styles.tabTextActive]}>登录</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, !isLoginMode && styles.tabActive]} onPress={switchToRegister} activeOpacity={0.7}>
              <Text style={[styles.tabText, !isLoginMode && styles.tabTextActive]}>注册</Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Debug Info (开发模式) */}
          {__DEV__ && debugInfo ? (<View style={styles.debugContainer}>
              <Text style={styles.debugText}>{debugInfo}</Text>
            </View>) : null}

          {/* 登录表单 - 修复：条件判断 */}
          {isLoginMode ? (<View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>手机号 / 用户名</Text>
                <TextInput style={styles.input} placeholder="请输入手机号或用户名" placeholderTextColor="#9CA3AF" value={loginUsername} onChangeText={setLoginUsername} autoCapitalize="none"/>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>密码</Text>
                <TextInput style={styles.input} placeholder="请输入密码" placeholderTextColor="#9CA3AF" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry/>
              </View>
              
              <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
                {loading ? (<ActivityIndicator color="#FFFFFF"/>) : (<Text style={styles.buttonText}>登录</Text>)}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.forgotButton}>
                <Text style={styles.forgotText}>忘记密码？</Text>
              </TouchableOpacity>
            </View>) : (
        /* 注册表单 - 修复：条件判断 */
        <View style={styles.form}>
              {/* 开发模式提示 */}
              {DEV_MODE && (<View style={styles.devBanner}>
                  <Text style={styles.devBannerText}>开发模式：验证码固定为 {DEV_FIXED_CODE}</Text>
                </View>)}
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>手机号</Text>
                <View style={styles.phoneInputContainer}>
                  <TextInput style={[styles.input, styles.phoneInput]} placeholder="请输入手机号" placeholderTextColor="#9CA3AF" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={11}/>
                  <TouchableOpacity style={[styles.sendCodeBtn, (countdown > 0 || loading) && styles.sendCodeBtnDisabled]} onPress={handleSendCode} disabled={countdown > 0 || loading}>
                    {loading ? (<ActivityIndicator size="small" color="#4F46E5"/>) : (<Text style={styles.sendCodeText}>
                        {countdown > 0 ? `${countdown}s` : "获取验证码"}
                      </Text>)}
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>验证码</Text>
                <TextInput style={styles.input} placeholder={DEV_MODE ? `开发模式：${DEV_FIXED_CODE}` : "请输入验证码"} placeholderTextColor="#9CA3AF" value={verifyCode} onChangeText={setVerifyCode} keyboardType="number-pad" maxLength={6} editable={!DEV_MODE}/>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>用户名</Text>
                <TextInput style={styles.input} placeholder="3-20位字母、数字或下划线" placeholderTextColor="#9CA3AF" value={username} onChangeText={setUsername} autoCapitalize="none"/>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>密码</Text>
                <TextInput style={styles.input} placeholder="至少6位" placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} secureTextEntry/>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>确认密码</Text>
                <TextInput style={styles.input} placeholder="再次输入密码" placeholderTextColor="#9CA3AF" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry/>
              </View>
              
              <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
                {loading ? (<ActivityIndicator color="#FFFFFF"/>) : (<Text style={styles.buttonText}>注册</Text>)}
              </TouchableOpacity>
            </View>)}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>登录即表示同意</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>《用户协议》</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>和</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>《隐私政策》</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>);
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F3F4F6",
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: "#4F46E5",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    logoText: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#FFFFFF",
    },
    appName: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1F2937",
        marginBottom: 4,
    },
    appDesc: {
        fontSize: 14,
        color: "#6B7280",
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#E5E7EB",
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 16,
        fontWeight: "500",
        color: "#6B7280",
    },
    tabTextActive: {
        color: "#4F46E5",
        fontWeight: "600",
    },
    errorText: {
        color: "#EF4444",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 16,
    },
    debugContainer: {
        backgroundColor: "#1F2937",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    debugText: {
        color: "#10B981",
        fontSize: 10,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    form: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    devBanner: {
        backgroundColor: "#FEF3C7",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#F59E0B",
    },
    devBannerText: {
        color: "#92400E",
        fontSize: 12,
        textAlign: "center",
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: "#374151",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: "#1F2937",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    phoneInputContainer: {
        flexDirection: "row",
        gap: 12,
    },
    phoneInput: {
        flex: 1,
    },
    sendCodeBtn: {
        backgroundColor: "#EEF2FF",
        borderRadius: 12,
        paddingHorizontal: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#4F46E5",
        minWidth: 100,
        height: 50,
    },
    sendCodeBtnDisabled: {
        backgroundColor: "#F3F4F6",
        borderColor: "#D1D5DB",
    },
    sendCodeText: {
        color: "#4F46E5",
        fontSize: 14,
        fontWeight: "600",
    },
    button: {
        backgroundColor: "#4F46E5",
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: "#9CA3AF",
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    forgotButton: {
        alignItems: "center",
        marginTop: 16,
    },
    forgotText: {
        color: "#4F46E5",
        fontSize: 14,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 32,
        flexWrap: "wrap",
    },
    footerText: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    linkText: {
        fontSize: 12,
        color: "#4F46E5",
    },
});
