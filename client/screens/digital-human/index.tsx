/**
 * 数字人功能页面
 * 对标：万兴播爆、讯飞智作、腾讯智影
 * 功能：虚拟人播报、口播文案生成、数字人视频制作
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';

const EXPO_PUBLIC_BACKEND_BASE_URL = "http://localhost:9091";

// 数字人预设形象
const DIGITAL_HUMAN_AVATARS = [
  { id: 'business_female', name: '商务女主持', icon: 'user-tie', color: '#E53E3E', description: '专业、知性、端庄' },
  { id: 'business_male', name: '商务男主持', icon: 'user-tie', color: '#2B6CB0', description: '稳重、权威、可信' },
  { id: 'fashion_female', name: '时尚女主播', icon: 'star', color: '#D69E2E', description: '青春、活力、潮流' },
  { id: 'cartoon', name: '卡通形象', icon: 'face-smile', color: '#9F7AEA', description: '可爱、亲切、趣味' },
  { id: 'anime_female', name: '二次元少女', icon: 'sparkles', color: '#F687B3', description: '萌系、元气、梦幻' },
  { id: 'ancient_female', name: '古风美女', icon: 'masks-theater', color: '#C53030', description: '国风、典雅、韵味' },
];

// 数字人风格
const VOICE_STYLES = [
  { id: 'professional', name: '专业播报', icon: 'briefcase', description: '新闻、公告、汇报' },
  { id: 'friendly', name: '亲切友好', icon: 'comments', description: '种草、分享、教学' },
  { id: 'energetic', name: '活力四射', icon: 'bolt', description: '带货、促销、活动' },
  { id: 'elegant', name: '优雅从容', icon: 'crown', description: '品牌、宣传、高端' },
];

export default function DigitalHumanScreen() {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('professional');
  const [script, setScript] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<any>(null);

  // 生成数字人口播文案
  const generateScript = async () => {
    if (!selectedAvatar) {
      Alert.alert('提示', '请先选择数字人形象');
      return;
    }
    
    const avatar = DIGITAL_HUMAN_AVATARS.find(a => a.id === selectedAvatar);
    const prompt = `请为"${avatar?.name}"这个数字人形象生成一段30秒的口播文案。要求：
1. 语言简洁有力，适合数字人播报
2. 内容积极向上，有吸引力
3. 字数控制在150字以内
4. 可以是产品介绍、知识分享或情感共鸣类内容
5. 风格与"${avatar?.description}"匹配`;

    setGenerating(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/generate/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: 'creative',
          platform: 'general',
        }),
      });
      
      const data = await response.json();
      if (data.success && data.data?.text) {
        setScript(data.data.text);
      } else {
        Alert.alert('生成失败', '口播文案生成失败，请重试');
      }
    } catch (error) {
      Alert.alert('错误', '网络请求失败');
    } finally {
      setGenerating(false);
    }
  };

  // 生成数字人视频
  const generateVideo = async () => {
    if (!selectedAvatar || !script.trim()) {
      Alert.alert('提示', '请先选择数字人形象并输入口播文案');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/generate/digital-human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarId: selectedAvatar,
          script: script,
          voiceStyle: selectedVoice,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedVideo(data.data);
        Alert.alert('成功', '数字人视频生成成功！');
      } else {
        Alert.alert('生成失败', data.message || '视频生成失败，请重试');
      }
    } catch (error) {
      Alert.alert('错误', '网络请求失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 页面标题 */}
        <View style={styles.header}>
          <FontAwesome6 name="robot" size={28} color="#E53E3E" />
          <Text style={styles.headerTitle}>AI数字人</Text>
          <Text style={styles.headerSubtitle}>虚拟人播报 · 口播文案 · 智能生成</Text>
        </View>

        {/* 数字人形象选择 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome6 name="user-circle" size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>选择数字人形象</Text>
          </View>
          <View style={styles.avatarGrid}>
            {DIGITAL_HUMAN_AVATARS.map((avatar) => (
              <TouchableOpacity
                key={avatar.id}
                style={[
                  styles.avatarCard,
                  selectedAvatar === avatar.id && { borderColor: avatar.color, borderWidth: 2 }
                ]}
                onPress={() => setSelectedAvatar(avatar.id)}
              >
                <View style={[styles.avatarIcon, { backgroundColor: avatar.color + '20' }]}>
                  <FontAwesome6 name={avatar.icon as any} size={24} color={avatar.color} />
                </View>
                <Text style={styles.avatarName}>{avatar.name}</Text>
                <Text style={styles.avatarDesc}>{avatar.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 语音风格选择 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome6 name="microphone" size={18} color="#059669" />
            <Text style={styles.sectionTitle}>选择语音风格</Text>
          </View>
          <View style={styles.voiceGrid}>
            {VOICE_STYLES.map((style) => (
              <TouchableOpacity
                key={style.id}
                style={[
                  styles.voiceCard,
                  selectedVoice === style.id && styles.voiceCardActive
                ]}
                onPress={() => setSelectedVoice(style.id)}
              >
                <FontAwesome6
                  name={style.icon as any}
                  size={20}
                  color={selectedVoice === style.id ? '#fff' : '#666'}
                />
                <Text style={[
                  styles.voiceName,
                  selectedVoice === style.id && styles.voiceNameActive
                ]}>
                  {style.name}
                </Text>
                <Text style={[
                  styles.voiceDesc,
                  selectedVoice === style.id && styles.voiceDescActive
                ]}>
                  {style.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 口播文案输入 */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <FontAwesome6 name="pen-fancy" size={18} color="#D69E2E" />
              <Text style={styles.sectionTitle}>口播文案</Text>
            </View>
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={generateScript}
              disabled={generating || !selectedAvatar}
            >
              <FontAwesome6 name="wand-magic-sparkles" size={14} color="#fff" />
              <Text style={styles.generateBtnText}>AI生成</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.scriptInput}
            multiline
            placeholder="输入口播文案，或点击AI生成智能创作..."
            placeholderTextColor="#999"
            value={script}
            onChangeText={setScript}
          />
          <Text style={styles.tip}>建议字数：150字以内（30秒播报时长）</Text>
        </View>

        {/* 生成按钮 */}
        <TouchableOpacity
          style={[
            styles.createBtn,
            (!selectedAvatar || !script.trim() || generating) && styles.createBtnDisabled
          ]}
          onPress={generateVideo}
          disabled={!selectedAvatar || !script.trim() || generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome6 name="play-circle" size={20} color="#fff" />
              <Text style={styles.createBtnText}>生成数字人视频</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 生成的视频预览 */}
        {generatedVideo && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>生成结果</Text>
            <View style={styles.previewCard}>
              {generatedVideo.videoUrl && (
                <View style={styles.videoPlaceholder}>
                  <FontAwesome6 name="play" size={40} color="#fff" />
                  <Text style={styles.videoPlaceholderText}>视频预览</Text>
                </View>
              )}
              <View style={styles.videoInfo}>
                <Text style={styles.videoInfoText}>
                  数字人：{DIGITAL_HUMAN_AVATARS.find(a => a.id === selectedAvatar)?.name}
                </Text>
                <Text style={styles.videoInfoText}>
                  时长：{generatedVideo.duration || '30秒'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 功能说明 */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 功能说明</Text>
          <View style={styles.infoItem}>
            <FontAwesome6 name="check" size={14} color="#059669" />
            <Text style={styles.infoText}>支持6种数字人形象选择</Text>
          </View>
          <View style={styles.infoItem}>
            <FontAwesome6 name="check" size={14} color="#059669" />
            <Text style={styles.infoText}>4种语音风格适配不同场景</Text>
          </View>
          <View style={styles.infoItem}>
            <FontAwesome6 name="check" size={14} color="#059669" />
            <Text style={styles.infoText}>AI智能生成口播文案</Text>
          </View>
          <View style={styles.infoItem}>
            <FontAwesome6 name="check" size={14} color="#059669" />
            <Text style={styles.infoText}>对标万兴播爆、讯飞智作</Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginLeft: 8,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D69E2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  avatarCard: {
    width: '31%',
    marginHorizontal: '1%',
    marginBottom: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A202C',
    textAlign: 'center',
  },
  avatarDesc: {
    fontSize: 10,
    color: '#718096',
    textAlign: 'center',
    marginTop: 2,
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  voiceCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 8,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voiceCardActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  voiceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginTop: 6,
  },
  voiceNameActive: {
    color: '#fff',
  },
  voiceDesc: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  voiceDescActive: {
    color: '#E2E8F0',
  },
  scriptInput: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1A202C',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  tip: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 8,
  },
  createBtn: {
    backgroundColor: '#E53E3E',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnDisabled: {
    backgroundColor: '#A0AEC0',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  previewSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoPlaceholder: {
    height: 200,
    backgroundColor: '#1A202C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
  },
  videoInfo: {
    padding: 16,
  },
  videoInfoText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 4,
  },
  infoSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#718096',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
