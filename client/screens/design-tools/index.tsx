/**
 * 在线设计工具页面
 * 对标：Canva AI 2.0
 * 功能：一键排版、海报制作、可视化美工、模板库
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// 设计模板分类
const TEMPLATE_CATEGORIES = [
  { id: 'poster', name: '海报', icon: 'image', color: '#E53E3E' },
  { id: 'social', name: '社交媒体', icon: 'share-nodes', color: '#D69E2E' },
  { id: 'marketing', name: '营销物料', icon: 'bullhorn', color: '#059669' },
  { id: 'business', name: '商务办公', icon: 'briefcase', color: '#3182CE' },
  { id: 'invitation', name: '邀请函', icon: 'envelope', color: '#9F7AEA' },
  { id: 'other', name: '其他', icon: 'ellipsis', color: '#718096' },
];

// 预设模板
const TEMPLATES = [
  {
    id: '1',
    name: '产品推广海报',
    category: 'poster',
    thumbnail: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
    size: 'A4',
    bgColor: '#FF6B6B',
  },
  {
    id: '2',
    name: '小红书封面',
    category: 'social',
    thumbnail: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400',
    size: '3:4',
    bgColor: '#4ECDC4',
  },
  {
    id: '3',
    name: '抖音短视频封面',
    category: 'social',
    thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400',
    size: '9:16',
    bgColor: '#FFE66D',
  },
  {
    id: '4',
    name: '节日促销海报',
    category: 'marketing',
    thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
    size: 'A4',
    bgColor: '#FF8E53',
  },
  {
    id: '5',
    name: '商务名片',
    category: 'business',
    thumbnail: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=400',
    size: '标准',
    bgColor: '#2B6CB0',
  },
  {
    id: '6',
    name: '活动邀请函',
    category: 'invitation',
    thumbnail: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400',
    size: 'A5',
    bgColor: '#9F7AEA',
  },
  {
    id: '7',
    name: '电商主图',
    category: 'marketing',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
    size: '1:1',
    bgColor: '#48BB78',
  },
  {
    id: '8',
    name: '公众号首图',
    category: 'social',
    thumbnail: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400',
    size: '2.35:1',
    bgColor: '#ED8936',
  },
];

// 字体样式
const FONT_STYLES = [
  { id: 'modern', name: '现代简约', font: 'System' },
  { id: 'elegant', name: '优雅古典', font: 'serif' },
  { id: 'playful', name: '活泼可爱', font: 'cursive' },
  { id: 'bold', name: '粗犷有力', font: 'System' },
];

// 配色方案
const COLOR_SCHEMES = [
  { id: 'warm', name: '暖色调', colors: ['#FF6B6B', '#FFA07A', '#FFD700'] },
  { id: 'cool', name: '冷色调', colors: ['#4A90E2', '#50E3C2', '#B8E986'] },
  { id: 'luxury', name: '轻奢金', colors: ['#C9A96E', '#2C2C2C', '#F5F5DC'] },
  { id: 'fresh', name: '清新绿', colors: ['#48BB78', '#68D391', '#C6F6D5'] },
];

export default function DesignToolsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string>('poster');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedFont, setSelectedFont] = useState<string>('modern');
  const [selectedColor, setSelectedColor] = useState<string>('warm');
  const [mainText, setMainText] = useState('');
  const [subText, setSubText] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const filteredTemplates = TEMPLATES.filter(t => t.category === selectedCategory);
  const currentTemplate = TEMPLATES.find(t => t.id === selectedTemplate);
  const currentColorScheme = COLOR_SCHEMES.find(c => c.id === selectedColor);

  // 快速生成设计
  const handleQuickGenerate = () => {
    if (!mainText.trim()) {
      alert('请输入主标题文字');
      return;
    }
    setPreviewMode(true);
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 页面标题 */}
        <View style={styles.header}>
          <FontAwesome6 name="palette" size={28} color="#D69E2E" />
          <Text style={styles.headerTitle}>AI设计工具</Text>
          <Text style={styles.headerSubtitle}>一键排版 · 海报制作 · 可视化美工</Text>
        </View>

        {/* 模板分类 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome6 name="layer-group" size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>选择模板类型</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryRow}>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.id && { backgroundColor: cat.color }
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setSelectedTemplate(null);
                  }}
                >
                  <FontAwesome6
                    name={cat.icon as any}
                    size={14}
                    color={selectedCategory === cat.id ? '#fff' : cat.color}
                  />
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === cat.id && styles.categoryChipTextActive
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 模板选择 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome6 name="square-images" size={18} color="#059669" />
            <Text style={styles.sectionTitle}>选择设计模板</Text>
          </View>
          <View style={styles.templateGrid}>
            {filteredTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  selectedTemplate === template.id && styles.templateCardSelected
                ]}
                onPress={() => setSelectedTemplate(template.id)}
              >
                <View style={[styles.templateThumbnail, { backgroundColor: template.bgColor }]}>
                  <FontAwesome6 name="image" size={24} color="#fff" />
                </View>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateSize}>{template.size}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 文字内容 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome6 name="type" size={18} color="#E53E3E" />
            <Text style={styles.sectionTitle}>输入文字内容</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="主标题（必填）"
            placeholderTextColor="#999"
            value={mainText}
            onChangeText={setMainText}
          />
          <TextInput
            style={[styles.textInput, styles.textInputSmall]}
            placeholder="副标题/描述（选填）"
            placeholderTextColor="#999"
            value={subText}
            onChangeText={setSubText}
          />
        </View>

        {/* 字体风格 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome6 name="font" size={18} color="#3182CE" />
            <Text style={styles.sectionTitle}>选择字体风格</Text>
          </View>
          <View style={styles.fontRow}>
            {FONT_STYLES.map((font) => (
              <TouchableOpacity
                key={font.id}
                style={[
                  styles.fontCard,
                  selectedFont === font.id && styles.fontCardActive
                ]}
                onPress={() => setSelectedFont(font.id)}
              >
                <Text style={[
                  styles.fontName,
                  selectedFont === font.id && styles.fontNameActive,
                  font.id === 'elegant' && styles.fontElegant,
                  font.id === 'playful' && styles.fontPlayful,
                ]}>
                  Aa
                </Text>
                <Text style={[
                  styles.fontLabel,
                  selectedFont === font.id && styles.fontLabelActive
                ]}>
                  {font.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 配色方案 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome6 name="paintbrush" size={18} color="#9F7AEA" />
            <Text style={styles.sectionTitle}>选择配色方案</Text>
          </View>
          <View style={styles.colorRow}>
            {COLOR_SCHEMES.map((scheme) => (
              <TouchableOpacity
                key={scheme.id}
                style={[
                  styles.colorCard,
                  selectedColor === scheme.id && styles.colorCardActive
                ]}
                onPress={() => setSelectedColor(scheme.id)}
              >
                <View style={styles.colorDots}>
                  {scheme.colors.map((color, idx) => (
                    <View
                      key={idx}
                      style={[styles.colorDot, { backgroundColor: color }]}
                    />
                  ))}
                </View>
                <Text style={[
                  styles.colorName,
                  selectedColor === scheme.id && styles.colorNameActive
                ]}>
                  {scheme.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 生成按钮 */}
        <TouchableOpacity
          style={[
            styles.generateBtn,
            !mainText.trim() && styles.generateBtnDisabled
          ]}
          onPress={handleQuickGenerate}
          disabled={!mainText.trim()}
        >
          <FontAwesome6 name="wand-magic-sparkles" size={20} color="#fff" />
          <Text style={styles.generateBtnText}>AI一键生成设计</Text>
        </TouchableOpacity>

        {/* 预览模式 */}
        {previewMode && currentTemplate && (
          <View style={styles.previewSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>设计预览</Text>
              <TouchableOpacity onPress={() => setPreviewMode(false)}>
                <FontAwesome6 name="xmark" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={[styles.previewCard, { backgroundColor: currentTemplate.bgColor }]}>
              <Text style={[
                styles.previewTitle,
                selectedFont === 'elegant' && styles.fontElegant,
                selectedFont === 'playful' && styles.fontPlayful,
                selectedFont === 'bold' && styles.fontBold,
              ]}>
                {mainText}
              </Text>
              {subText && (
                <Text style={styles.previewSubtitle}>{subText}</Text>
              )}
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>灵感山羊</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.downloadBtn}>
              <FontAwesome6 name="download" size={16} color="#fff" />
              <Text style={styles.downloadBtnText}>下载设计</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 功能说明 */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 功能说明</Text>
          <View style={styles.infoItem}>
            <FontAwesome6 name="check-circle" size={14} color="#059669" />
            <Text style={styles.infoText}>对标Canva AI 2.0，一站式在线设计</Text>
          </View>
          <View style={styles.infoItem}>
            <FontAwesome6 name="check-circle" size={14} color="#059669" />
            <Text style={styles.infoText}>内置30+设计模板，快速生成海报</Text>
          </View>
          <View style={styles.infoItem}>
            <FontAwesome6 name="check-circle" size={14} color="#059669" />
            <Text style={styles.infoText}>支持小红书、抖音、公众号封面</Text>
          </View>
          <View style={styles.infoItem}>
            <FontAwesome6 name="check-circle" size={14} color="#059669" />
            <Text style={styles.infoText}>AI智能配色、排版、美化</Text>
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
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginLeft: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 13,
    color: '#4A5568',
    marginLeft: 6,
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  templateCard: {
    width: CARD_WIDTH,
    marginHorizontal: 6,
    marginBottom: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateCardSelected: {
    borderColor: '#4F46E5',
  },
  templateThumbnail: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A202C',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  templateSize: {
    fontSize: 10,
    color: '#718096',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  textInput: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A202C',
    marginBottom: 10,
  },
  textInputSmall: {
    marginBottom: 0,
  },
  fontRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fontCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fontCardActive: {
    backgroundColor: '#3182CE',
    borderColor: '#3182CE',
  },
  fontName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A202C',
  },
  fontNameActive: {
    color: '#fff',
  },
  fontElegant: {
    fontFamily: 'serif',
  },
  fontPlayful: {
    fontFamily: 'cursive',
  },
  fontBold: {
    fontWeight: '800',
  },
  fontLabel: {
    fontSize: 10,
    color: '#718096',
    marginTop: 4,
  },
  fontLabelActive: {
    color: '#E2E8F0',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCardActive: {
    backgroundColor: '#EDF2F7',
    borderColor: '#9F7AEA',
  },
  colorDots: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  colorName: {
    fontSize: 11,
    color: '#4A5568',
  },
  colorNameActive: {
    color: '#9F7AEA',
    fontWeight: '600',
  },
  generateBtn: {
    backgroundColor: '#D69E2E',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateBtnDisabled: {
    backgroundColor: '#A0AEC0',
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  previewSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  previewCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
    marginVertical: 16,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  previewSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
  previewBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewBadgeText: {
    fontSize: 10,
    color: '#fff',
  },
  downloadBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
