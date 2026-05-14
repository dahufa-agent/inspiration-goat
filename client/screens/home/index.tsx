import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
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

// ==================== 升级：视频时长选项（支持更长时长，对标全网最强）====================
const DURATION_OPTIONS = [
  { type: "free", duration: 5, label: "5秒", price: "免费", description: "每日10次", color: "#10B981" },
  { type: "paid5", duration: 10, label: "10秒", price: "10积分", description: "每增加5秒+10积分", color: "#F59E0B" },
  { type: "paid10", duration: 15, label: "15秒", price: "20积分", description: "每增加10秒+20积分", color: "#F59E0B" },
  { type: "paid15", duration: 20, label: "20秒", price: "30积分", description: "每增加15秒+30积分", color: "#EF4444" },
  { type: "paid20", duration: 30, label: "30秒", price: "50积分", description: "长视频/微电影", color: "#8B5CF6" },
];

// ==================== 新增：视频运镜控制（对标可灵Kling大师运镜）====================
const CAMERA_CONTROLS = [
  { id: 'auto', name: '自动运镜', icon: 'wand-magic-sparkles', description: 'AI智能选择最佳运镜', color: '#6C63FF' },
  { id: 'zoom_in', name: '推进镜头', icon: 'magnifying-glass-plus', description: '由远及近，突出主体', color: '#10B981' },
  { id: 'zoom_out', name: '拉远镜头', icon: 'magnifying-glass-minus', description: '由近及远，展示全貌', color: '#F59E0B' },
  { id: 'pan_left', name: '向左平移', icon: 'arrow-left', description: '从右向左移动视角', color: '#3B82F6' },
  { id: 'pan_right', name: '向右平移', icon: 'arrow-right', description: '从左向右移动视角', color: '#EC4899' },
  { id: 'tilt_up', name: '向上摇镜', icon: 'arrow-up', description: '从下向上展示', color: '#14B8A6' },
  { id: 'tilt_down', name: '向下摇镜', icon: 'arrow-down', description: '从上向下展示', color: '#F97316' },
  { id: 'dolly', name: '移动镜头', icon: 'car-side', description: '跟随主体移动', color: '#8B5CF6' },
  { id: 'orbit', name: '环绕运镜', icon: 'rotate', description: '360度环绕主体', color: '#EF4444' },
  { id: 'static', name: '固定镜头', icon: 'video', description: '镜头固定，稳定画面', color: '#64748B' },
];

// ==================== 新增：视频风格预设（对标Runway/Sora）====================
const VIDEO_STYLES = [
  { id: 'auto', name: '自动风格', icon: 'wand-magic-sparkles', description: 'AI匹配最佳风格', color: '#6C63FF' },
  { id: 'cinematic', name: '电影感', icon: 'film', description: '好莱坞电影质感', color: '#10B981' },
  { id: 'vivid', name: '生动鲜活', icon: 'sparkles', description: '色彩饱和，活力满满', color: '#F59E0B' },
  { id: 'realistic', name: '写实记录', icon: 'camera', description: '纪录片风格', color: '#3B82F6' },
  { id: 'anime', name: '动漫风格', icon: 'face-smile', description: '二次元动画风', color: '#EC4899' },
  { id: 'slow_mo', name: '慢动作', icon: 'clock', description: '戏剧性慢镜头', color: '#14B8A6' },
  { id: 'timelapse', name: '延时摄影', icon: 'forward-fast', description: '时间压缩效果', color: '#F97316' },
];

// 每日限制配置
const LIMITS = {
  images: { perBatch: 2, maxPerDay: 20, chargePerImage: 1 },
  texts: { perBatch: 1, maxPerDay: 10, chargePerText: 2 },
};

// ==================== 性能模式配置 ====================
const PERFORMANCE_MODES = {
  fast: {
    id: 'fast',
    name: '极速模式',
    icon: 'bolt',
    color: '#10B981',
    description: '≤5秒图片 · ≤2秒文案 · ≤15秒视频 · ≤60秒三连',
    times: { image: '≤5秒', text: '≤2秒', video: '≤15秒', all: '≤60秒' },
  },
  quality: {
    id: 'quality',
    name: '高质量模式',
    icon: 'gem',
    color: '#4F46E5',
    description: '≤15秒图片 · ≤5秒文案 · ≤120秒视频',
    times: { image: '≤15秒', text: '≤5秒', video: '≤120秒', all: '~120秒' },
  },
};

// ==================== 升级：图片分辨率选择（支持4K，对标全网最强）====================
const IMAGE_RESOLUTIONS = [
  // 1K分辨率（免费）
  { id: 'square_1k', name: '1K方图', size: '1024×1024', aspect: '1:1', price: '免费', description: '小红书/朋友圈' },
  { id: 'landscape_1k', name: '1K横图', size: '1024×768', aspect: '4:3', price: '免费', description: '微博/公众号' },
  { id: 'portrait_1k', name: '1K竖图', size: '768×1024', aspect: '3:4', price: '免费', description: '抖音/小红书' },
  { id: 'wide_1k', name: '1K宽图', size: '1024×576', aspect: '16:9', price: '免费', description: 'B站/视频封面' },
  // 2K分辨率（5积分）
  { id: 'square_2k', name: '2K方图', size: '2048×2048', aspect: '1:1', price: '5积分', description: '高清打印/壁纸' },
  { id: 'portrait_2k', name: '2K竖图', size: '1536×2048', aspect: '3:4', price: '5积分', description: '手机壁纸' },
  { id: 'landscape_2k', name: '2K横图', size: '2048×1536', aspect: '4:3', price: '5积分', description: '高清海报' },
  // 4K分辨率（15积分，对标Midjourney/DALL-E最高画质）
  { id: 'square_4k', name: '4K方图', size: '4096×4096', aspect: '1:1', price: '15积分', description: '专业级画质/打印' },
  { id: 'portrait_4k', name: '4K竖图', size: '3072×4096', aspect: '3:4', price: '15积分', description: '超高清壁纸' },
  { id: 'wide_4k', name: '4K宽图', size: '4096×2304', aspect: '16:9', price: '15积分', description: '电影级画质' },
];

// ==================== 新增：文案批量生成配置 ====================
const TEXT_BATCH_OPTIONS = [
  { id: 1, name: '生成1条', count: 1, price: '免费' },
  { id: 3, name: '批量3条', count: 3, price: '5积分' },
  { id: 5, name: '批量5条', count: 5, price: '10积分' },
];

// ==================== 新增：文案SEO优化配置 ====================
const SEO_OPTIONS = [
  { id: 'none', name: '不优化', desc: '保持原样' },
  { id: 'keywords', name: '关键词优化', desc: '自动植入SEO关键词' },
  { id: 'full_seo', name: '全SEO优化', desc: '关键词+标题+描述' },
];

// ==================== 竞品对比配置 ====================
const COMPETITORS = {
  image: { jimeng: '30秒', kilin: '-', lingxiang: '-' },
  text: { jimeng: '-', kilin: '-', lingxiang: '-' },
  video: { jimeng: '120秒', kilin: '120秒', lingxiang: '≤120秒' },
};

// 免费码选项
const FREE_CODE_OPTIONS = [
  { type: '1_month', label: '1个月', days: 30 },
  { type: '3_months', label: '一季度', days: 90 },
  { type: '6_months', label: '半年', days: 180 },
  { type: '1_year', label: '一年', days: 365 },
];

// ==================== 新增：风格预设配置 ====================
// ==================== 升级文案风格（12+平台适配，对标全网最强）====================
const TEXT_STYLES = [
  // 社交媒体类
  { id: 'xiaohongshu', name: '小红书', icon: 'book', color: '#FF2442', platform: '种草/分享', chars: '500-1000' },
  { id: 'douyin', name: '抖音', icon: 'music', color: '#000000', platform: '短视频文案', chars: '100-300' },
  { id: 'kuaishou', name: '快手', icon: 'video', color: '#FF4906', platform: '短视频文案', chars: '100-300' },
  { id: 'bilibili', name: 'B站', icon: 'play-circle', color: '#00A1D6', platform: '视频简介', chars: '200-500' },
  // 内容平台类
  { id: 'weibo', name: '微博', icon: 'newspaper', color: '#E6162D', platform: '热搜/话题', chars: '140-500' },
  { id: 'gzh', name: '公众号', icon: 'envelope', color: '#4F46E5', platform: '深度内容', chars: '1000-3000' },
  { id: 'zhihu', name: '知乎', icon: 'comment', color: '#0084FF', platform: '问答/长文', chars: '500-2000' },
  { id: 'toutiao', name: '头条', icon: 'newspaper-o', color: '#F85959', platform: '资讯/热点', chars: '500-1500' },
  // 商业类
  { id: 'ecommerce', name: '电商详情', icon: 'shopping-cart', color: '#FF6B00', platform: '产品描述', chars: '300-800' },
  { id: 'advertising', name: '广告文案', icon: 'bullhorn', color: '#FFD700', platform: '营销推广', chars: '50-200' },
  { id: 'resume', name: '简历优化', icon: 'briefcase', color: '#2D3436', platform: '求职应聘', chars: '200-500' },
  // 通用类
  { id: 'general', name: '通用文案', icon: 'star', color: '#10B981', platform: '通用场景', chars: '200-1000' },
];

// ==================== 升级图片风格（8种通用风格 + 13种国风风格，对标Midjourney/DALL-E）====================
const IMAGE_STYLES = [
  // ========== 通用风格 ==========
  // 摄影类
  { id: 'photorealistic', name: '写实摄影', keywords: 'photorealistic, high detail, 8K', category: 'photo', quality: '通用' },
  { id: 'portrait_photo', name: '人像摄影', keywords: 'professional portrait photography, studio lighting', category: 'photo', quality: '通用' },
  { id: 'landscape', name: '风景摄影', keywords: 'landscape photography, golden hour, breathtaking', category: 'photo', quality: '通用' },
  // 插画类
  { id: 'digital_art', name: '商业插画', keywords: 'digital illustration, vector art, clean lines', category: 'illustration', quality: '通用' },
  { id: 'anime', name: '动漫风格', keywords: 'anime style, vibrant colors, detailed anime art', category: 'anime', quality: '通用' },
  { id: 'oil_painting', name: '油画质感', keywords: 'oil painting style, impressionist, masterpiece', category: 'art', quality: '通用' },
  { id: 'watercolor', name: '水彩画', keywords: 'watercolor painting, soft colors, delicate', category: 'art', quality: '通用' },
  { id: 'cyberpunk', name: '赛博朋克', keywords: 'cyberpunk, neon lights, futuristic city', category: 'creative', quality: '通用' },
  { id: 'fantasy', name: '奇幻风格', keywords: 'fantasy art, magical, epic', category: 'creative', quality: '通用' },
  { id: 'minimalist', name: '极简主义', keywords: 'minimalist design, clean lines, simple composition', category: 'creative', quality: '通用' },
  
  // ========== 国风插画风格（13种，全网独家） ==========
  // 国画系
  { id: 'ink_landscape', name: '水墨山水', keywords: 'Chinese ink painting, Shan Shui style, misty mountains, literati painting', category: 'chinese', quality: '国风', badge: '独家' },
  { id: 'gongbi_flower', name: '工笔花鸟', keywords: 'Chinese Gongbi painting, meticulous brushwork, Song Dynasty style, delicate', category: 'chinese', quality: '国风', badge: '独家' },
  { id: 'dunhuang', name: '敦煌壁画', keywords: 'Dunhuang cave murals, Tang Dynasty Buddhist art, celestial beings', category: 'chinese', quality: '国风', badge: '独家' },
  // 传统色系
  { id: 'blue_white', name: '青花瓷韵', keywords: 'blue and white porcelain, Jiangnan style, cobalt blue patterns', category: 'chinese', quality: '国风', badge: '独家' },
  { id: 'palace_red', name: '故宫红', keywords: 'Chinese palace red, Forbidden City style, vermilion walls, imperial elegance', category: 'chinese', quality: '国风', badge: '独家' },
  // 民俗系
  { id: 'paper_cut', name: '剪纸艺术', keywords: 'Chinese paper cutting, festive red paper art, intricate patterns', category: 'chinese', quality: '国风', badge: '独家' },
  { id: 'new_year_painting', name: '年画风格', keywords: 'Chinese New Year picture, auspicious door god, fortune character Fu', category: 'chinese', quality: '国风', badge: '独家' },
  { id: 'shadow_puppet', name: '皮影戏', keywords: 'Chinese shadow puppetry, leather shadow play, dramatic silhouettes', category: 'chinese', quality: '国风', badge: '独家' },
  // 服饰系
  { id: 'hanfu', name: '汉服古韵', keywords: 'traditional Hanfu clothing, ancient Chinese costume, silk fabric', category: 'chinese', quality: '国风', badge: '独家' },
  // 建筑系
  { id: 'classical_architecture', name: '古典建筑', keywords: 'Chinese classical architecture, traditional pavilions, upturned eaves', category: 'chinese', quality: '国风', badge: '独家' },
  // 现代国风
  { id: 'guochao', name: '国潮插画', keywords: 'Guochao style, modern Chinese illustration, trendy cultural design', category: 'chinese', quality: '国风', badge: '独家' },
  { id: 'poetry_atmosphere', name: '诗词意境', keywords: 'Chinese poetry atmosphere, Tang Dynasty style, Li Bai poem scene', category: 'chinese', quality: '国风', badge: '独家' },
  { id: 'zen_space', name: '禅意空间', keywords: 'Zen Buddhist aesthetic, minimalist, bamboo garden, meditation space', category: 'chinese', quality: '国风', badge: '独家' },
];

// ==================== 新增：行业场景模板中心 ====================
const SCENE_TEMPLATES = [
  {
    id: 'birthday',
    name: '生日祝福',
    icon: 'cake-candles',
    color: '#FF6B6B',
    category: 'celebration',
    prompt: '温馨生日场景，蛋糕蜡烛，欢乐氛围',
    textStyle: 'xiaohongshu',
    description: '适合发朋友圈祝福'
  },
  {
    id: 'festival',
    name: '节日营销',
    icon: 'gift',
    color: '#FF9F43',
    category: 'marketing',
    prompt: '节日氛围营销素材，喜庆热闘',
    textStyle: 'douyin',
    description: '春节/中秋/圣诞等节日'
  },
  {
    id: 'product',
    name: '产品展示',
    icon: 'shopping-bag',
    color: '#4ECDC4',
    category: 'ecommerce',
    prompt: '精致产品展示，质感光影，专业摄影',
    textStyle: 'gzh',
    description: '电商主图/详情页'
  },
  {
    id: 'travel',
    name: '旅行分享',
    icon: 'plane',
    color: '#45B7D1',
    category: 'lifestyle',
    prompt: '绝美风景打卡地，明信片风格',
    textStyle: 'xiaohongshu',
    description: '小红书旅行攻略'
  },
  {
    id: 'food',
    name: '美食打卡',
    icon: 'utensils',
    color: '#F8B739',
    category: 'food',
    prompt: '美食特写，食欲满满，精致摆盘',
    textStyle: 'xiaohongshu',
    description: '探店打卡/美食推荐'
  },
  {
    id: 'pet',
    name: '萌宠时刻',
    icon: 'paw',
    color: '#A55EEA',
    category: 'lifestyle',
    prompt: '可爱宠物，治愈系，萌态万千',
    textStyle: 'douyin',
    description: '宠物日常分享'
  },
  {
    id: 'fashion',
    name: '时尚穿搭',
    icon: 'shirt',
    color: '#E84393',
    category: 'lifestyle',
    prompt: '时尚穿搭街拍，高级感模特',
    textStyle: 'xiaohongshu',
    description: '服装搭配/时尚博主'
  },
  {
    id: 'work',
    name: '职场商务',
    icon: 'briefcase',
    color: '#2D3436',
    category: 'business',
    prompt: '商务办公场景，专业高效',
    textStyle: 'zhihu',
    description: 'PPT配图/商务素材'
  },
  {
    id: 'quote',
    name: '语录金句',
    icon: 'quote-left',
    color: '#6C5CE7',
    category: 'inspiration',
    prompt: '励志文案配图，简约大气，文字感强',
    textStyle: 'general',
    description: '朋友圈文案/社交媒体'
  },
  {
    id: 'nature',
    name: '自然风光',
    icon: 'leaf',
    color: '#00B894',
    category: 'scenery',
    prompt: '自然风光摄影，大片质感',
    textStyle: 'xiaohongshu',
    description: '壁纸/风景素材'
  },
  {
    id: 'portrait',
    name: '人像写真',
    icon: 'user',
    color: '#FD79A8',
    category: 'portrait',
    prompt: '人像摄影，质感光影，电影感',
    textStyle: 'xiaohongshu',
    description: '写真/证件照风格'
  },
  {
    id: 'art',
    name: '艺术创意',
    icon: 'palette',
    color: '#E17055',
    category: 'art',
    prompt: '艺术插画风格，创意独特',
    textStyle: 'general',
    description: '创意海报/艺术创作'
  },
];

// ==================== 新增：新手引导配置 ====================
const ONBOARDING_STEPS = [
  {
    id: 'step1',
    title: '欢迎使用灵感山羊',
    description: '一键生成图片、文案、视频，让创作变得简单高效',
    icon: 'wand-magic-sparkles',
    color: '#6366F1',
  },
  {
    id: 'step2',
    title: '输入你的创意',
    description: '用一句话描述你的想法，或选择一个模板开始创作',
    icon: 'lightbulb',
    color: '#F59E0B',
  },
  {
    id: 'step3',
    title: '一键生成全部',
    description: '图片、文案、视频同步生成，最快5秒出图',
    icon: 'bolt',
    color: '#10B981',
  },
  {
    id: 'step4',
    title: '编辑与分享',
    description: '选择喜欢的风格，一键保存或分享到社交平台',
    icon: 'share-nodes',
    color: '#EC4899',
  },
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
  const [selectedCamera, setSelectedCamera] = useState("auto"); // 新增：视频运镜控制
  const [selectedVideoStyle, setSelectedVideoStyle] = useState("auto"); // 新增：视频风格
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
  // 新增：图片分辨率选择
  const [selectedResolution, setSelectedResolution] = useState("square_1k");
  // 新增：文案批量生成选项
  const [selectedBatchCount, setSelectedBatchCount] = useState(1);
  // 新增：SEO优化选项
  const [selectedSeoOption, setSelectedSeoOption] = useState("none");
  // 新增：显示分辨率选择弹窗
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showSeoModal, setShowSeoModal] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  // 新增：风格分类Tab（通用/国风独家）
  const [styleCategory, setStyleCategory] = useState<'general' | 'chinese'>('general');
  const [hotTopics, setHotTopics] = useState<Array<{id: number; platform: string; title: string; heat: number}>>([]);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({ stage: 'idle', progress: 0, message: '' });
  const [showProgressModal, setShowProgressModal] = useState(false);
  
  // ==================== 性能模式状态 ====================
  const [performanceMode, setPerformanceMode] = useState<'fast' | 'quality'>('fast');
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number>(0);

  // ==================== 新增：新手引导状态 ====================
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // ==================== 新增：场景模板弹窗状态 ====================
  const [showSceneModal, setShowSceneModal] = useState(false);

  // 根据分类筛选风格
  const getFilteredImageStyles = () => {
    if (styleCategory === 'chinese') {
      return IMAGE_STYLES.filter(s => s.category === 'chinese');
    }
    return IMAGE_STYLES.filter(s => s.category !== 'chinese');
  };

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
        
        // 检查是否需要显示新手引导
        const hasSeenOnboarding = await SecureStore.getItemAsync("hasSeenOnboarding");
        if (!hasSeenOnboarding) {
          setShowOnboarding(true);
        }
        
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

  // ==================== 新增：新手引导下一步 ====================
  const handleOnboardingNext = async () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      // 引导结束，标记已看过
      await SecureStore.setItemAsync("hasSeenOnboarding", "true");
      setShowOnboarding(false);
    }
  };

  // ==================== 新增：跳过新手引导 ====================
  const handleSkipOnboarding = async () => {
    await SecureStore.setItemAsync("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  };

  // ==================== 新增：使用场景模板 ====================
  const handleUseSceneTemplate = (template: typeof SCENE_TEMPLATES[0]) => {
    setIdea(template.prompt);
    setSelectedTextStyle(template.textStyle);
    setShowSceneModal(false);
  };

  const canGenerate = () => {
    if (!idea.trim()) return { allowed: false, reason: "请输入你的创意想法" };
    if (selectedDuration === "free" && remainingVideoEdits <= 0) return { allowed: false, reason: "今日视频编辑次数已用完" };
    if (remainingImages < LIMITS.images.perBatch) return { allowed: false, reason: `今日图片生成次数已用完（每次${LIMITS.images.perBatch}张）` };
    if (remainingTexts < LIMITS.texts.perBatch) return { allowed: false, reason: "今日文案生成次数已用完" };
    return { allowed: true, reason: "" };
  };

  // ==================== 一键发布功能 ====================
  const handleQuickPublish = () => {
    // 保存当前创作内容到全局状态或缓存
    const content = {
      idea: idea.trim(),
      selectedImageStyle,
      selectedTextStyle,
      selectedResolution,
      selectedDuration,
    };
    // 导航到发布页面
    router.push('/publish', { 
      from: 'home',
      idea: idea.trim(),
      imageStyle: selectedImageStyle,
      textStyle: selectedTextStyle,
      resolution: selectedResolution,
      duration: selectedDuration,
    });
  };

  // ==================== 优化：并行带进度反馈的生成 ====================
  const handleGenerate = async () => {
    const check = canGenerate();
    if (!check.allowed) {
      setError(check.reason);
      return;
    }

    setLoading(true);
    setError("");
    setShowProgressModal(true);
    setGenerationStartTime(Date.now());
    
    const isFastMode = performanceMode === 'fast';
    const modeConfig = PERFORMANCE_MODES[performanceMode];

    try {
      // 并行请求：图片 + 文案 + 视频
      const parallelRequests = [
        // 图片生成（新增分辨率参数）
        fetch(`${BACKEND_BASE_URL}/api/v1/generate/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-device-id": deviceId, "x-mode": performanceMode },
          body: JSON.stringify({ 
            prompt: idea.trim(), 
            style: selectedImageStyle,
            resolution: selectedResolution  // 新增：分辨率参数
          }),
        }),
        // 文案生成（新增批量和SEO参数）
        fetch(`${BACKEND_BASE_URL}/api/v1/generate/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-device-id": deviceId, "x-mode": performanceMode },
          body: JSON.stringify({ 
            prompt: idea.trim(), 
            style: selectedTextStyle,
            batchCount: selectedBatchCount,  // 新增：批量生成数量
            seoOption: selectedSeoOption      // 新增：SEO优化选项
          }),
        }),
      ];

      // 阶段1：并行获取图片和文案结果
      setGenerationProgress({ stage: 'image', progress: 15, message: `正在并行生成图片(${modeConfig.times.image})和文案(${modeConfig.times.text})...` });

      const [imageResponse, textResponse] = await Promise.all(parallelRequests);
      const imageData = await imageResponse.json();
      const textData = await textResponse.json();

      // 显示Prompt分析结果
      if (imageData.promptAnalysis || textData.promptAnalysis) {
        const analysis = imageData.promptAnalysis || textData.promptAnalysis;
        if (analysis.enhancements && analysis.enhancements.length > 0) {
          setGenerationProgress({ 
            stage: 'text', 
            progress: 30, 
            message: `已智能理解：${analysis.scene || '创意主题'}，${analysis.enhancements.join('、')}` 
          });
        }
      }

      // 更新进度
      setGenerationProgress({ stage: 'text', progress: 40, message: '图片和文案生成完成，正在处理视频...' });

      // 检查是否有图片结果
      if (!imageData.imageUrls || imageData.imageUrls.length === 0) {
        throw new Error('图片生成失败');
      }

      // 阶段2：视频生成（需要等图片完成后作为首帧，包含运镜控制和视频风格）
      setGenerationProgress({ stage: 'video', progress: 60, message: `正在生成视频(${modeConfig.times.video})...` });

      const videoResponse = await fetch(`${BACKEND_BASE_URL}/api/v1/generate/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-device-id": deviceId, "x-mode": performanceMode },
        body: JSON.stringify({ 
          prompt: idea.trim(), 
          imageUrl: imageData.imageUrls[0],
          durationType: selectedDuration,
          camera: selectedCamera,  // 新增：运镜控制
          videoStyle: selectedVideoStyle  // 新增：视频风格
        }),
      });
      
      const videoData = await videoResponse.json();

      // 计算实际耗时
      const actualTime = Math.round((Date.now() - generationStartTime) / 1000);
      
      setGenerationProgress({ 
        stage: 'complete', 
        progress: 100, 
        message: `生成完成！耗时${actualTime}秒` 
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowProgressModal(false);

      // 保存历史
      try {
        const historyItem = {
          id: `h_${Date.now()}`,
          prompt: idea.trim(),
          imageUrls: imageData.imageUrls || [],
          text: textData.text || "",
          videoUrl: videoData.videoUrl || "",
          createdAt: new Date().toISOString(),
          isFavorite: false,
          performanceMode,
          generationTime: actualTime,
        };
        const stored = await SecureStore.getItemAsync("generationHistory");
        const history = stored ? JSON.parse(stored) : [];
        history.unshift(historyItem);
        if (history.length > 100) history.pop();
        await SecureStore.setItemAsync("generationHistory", JSON.stringify(history));
      } catch (e) {
        console.error("Save history error:", e);
      }

      setRemainingVideoEdits(videoData.remainingFreeEdits ?? remainingVideoEdits);
      setRemainingImages(imageData.remaining ?? remainingImages);
      setRemainingTexts(remainingTexts - 1);

      router.push("/edit", {
        idea: idea.trim(),
        imageUrls: JSON.stringify(imageData.imageUrls || []),
        texts: JSON.stringify([textData.text || ""]),
        videoUrl: videoData.videoUrl || "",
        lastFrameUrl: videoData.lastFrameUrl || "",
        durationType: videoData.durationType || "free",
        remainingFreeEdits: videoData.remainingFreeEdits ?? remainingVideoEdits,
        remainingImages: imageData.remaining ?? remainingImages,
        remainingTexts: remainingTexts - 1,
      });
    } catch (err: any) {
      setShowProgressModal(false);
      setError(err.message || "网络错误，请检查网络连接");
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
        <View style={styles.styleRow}>
          <Text style={styles.styleLabel}>批量生成：</Text>
          <TouchableOpacity 
            style={styles.optionSelector}
            onPress={() => setShowBatchModal(true)}
          >
            <Text style={styles.optionText}>
              {TEXT_BATCH_OPTIONS.find(b => b.count === selectedBatchCount)?.name || '生成1条'}
            </Text>
            <FontAwesome6 name="chevron-down" size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.styleLabel}>  SEO优化：</Text>
          <TouchableOpacity 
            style={styles.optionSelector}
            onPress={() => setShowSeoModal(true)}
          >
            <Text style={styles.optionText}>
              {SEO_OPTIONS.find(s => s.id === selectedSeoOption)?.name || '不优化'}
            </Text>
            <FontAwesome6 name="chevron-down" size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>
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
      {/* 新增：图片分辨率选择入口 */}
      <View style={styles.styleRow}>
        <Text style={styles.styleLabel}>图片分辨率：</Text>
        <TouchableOpacity 
          style={styles.resolutionSelector}
          onPress={() => setShowResolutionModal(true)}
        >
          <Text style={styles.resolutionText}>
            {IMAGE_RESOLUTIONS.find(r => r.id === selectedResolution)?.name || '1K方图'}
          </Text>
          <Text style={styles.resolutionSize}>
            {IMAGE_RESOLUTIONS.find(r => r.id === selectedResolution)?.size}
          </Text>
          <FontAwesome6 name="chevron-down" size={14} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ==================== 新增：图片分辨率选择弹窗 ====================
  const ResolutionModal = () => {
    const getCurrentResolution = () => IMAGE_RESOLUTIONS.find(r => r.id === selectedResolution) || IMAGE_RESOLUTIONS[0];
    
    return (
      <Modal visible={showResolutionModal} transparent animationType="slide" onRequestClose={() => setShowResolutionModal(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.resolutionModalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>选择分辨率</Text>
                <TouchableOpacity onPress={() => setShowResolutionModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {IMAGE_RESOLUTIONS.map((res) => (
                  <TouchableOpacity 
                    key={res.id}
                    style={[
                      styles.resolutionCard,
                      selectedResolution === res.id && styles.resolutionCardSelected
                    ]}
                    onPress={() => {
                      setSelectedResolution(res.id);
                      setShowResolutionModal(false);
                    }}
                  >
                    <View style={styles.resolutionInfo}>
                      <View style={styles.resolutionHeader}>
                        <Text style={[
                          styles.resolutionName,
                          selectedResolution === res.id && styles.resolutionNameSelected
                        ]}>{res.name}</Text>
                        <View style={[
                          styles.resolutionPriceTag,
                          res.price === '免费' ? styles.resolutionPriceFree : styles.resolutionPricePaid
                        ]}>
                          <Text style={styles.resolutionPriceText}>{res.price}</Text>
                        </View>
                      </View>
                      <Text style={styles.resolutionSizeText}>{res.size}</Text>
                      <Text style={styles.resolutionDesc}>{res.description}</Text>
                    </View>
                    {selectedResolution === res.id && (
                      <View style={styles.resolutionCheck}>
                        <FontAwesome6 name="check" size={16} color={COLORS.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // ==================== 新增：批量生成选择弹窗 ====================
  const BatchModal = () => (
    <Modal visible={showBatchModal} transparent animationType="slide" onRequestClose={() => setShowBatchModal(false)}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.batchModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>批量生成文案</Text>
              <TouchableOpacity onPress={() => setShowBatchModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.batchOptions}>
              {TEXT_BATCH_OPTIONS.map((option) => (
                <TouchableOpacity 
                  key={option.id}
                  style={[
                    styles.batchCard,
                    selectedBatchCount === option.count && styles.batchCardSelected
                  ]}
                  onPress={() => {
                    setSelectedBatchCount(option.count);
                    setShowBatchModal(false);
                  }}
                >
                  <Text style={[
                    styles.batchName,
                    selectedBatchCount === option.count && styles.batchNameSelected
                  ]}>{option.name}</Text>
                  <Text style={styles.batchDesc}>适用场景：多版本对比、备选方案</Text>
                  <View style={[
                    styles.batchPriceTag,
                    option.price === '免费' ? styles.resolutionPriceFree : styles.resolutionPricePaid
                  ]}>
                    <Text style={styles.resolutionPriceText}>{option.price}</Text>
                  </View>
                  {selectedBatchCount === option.count && (
                    <View style={styles.resolutionCheck}>
                      <FontAwesome6 name="check" size={16} color={COLORS.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // ==================== 新增：SEO优化选择弹窗 ====================
  const SeoModal = () => (
    <Modal visible={showSeoModal} transparent animationType="slide" onRequestClose={() => setShowSeoModal(false)}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.seoModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SEO优化设置</Text>
              <TouchableOpacity onPress={() => setShowSeoModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.seoOptions}>
              {SEO_OPTIONS.map((option) => (
                <TouchableOpacity 
                  key={option.id}
                  style={[
                    styles.seoCard,
                    selectedSeoOption === option.id && styles.seoCardSelected
                  ]}
                  onPress={() => {
                    setSelectedSeoOption(option.id);
                    setShowSeoModal(false);
                  }}
                >
                  <Text style={[
                    styles.seoName,
                    selectedSeoOption === option.id && styles.seoNameSelected
                  ]}>{option.name}</Text>
                  <Text style={styles.seoDesc}>{option.desc}</Text>
                  {selectedSeoOption === option.id && (
                    <View style={styles.resolutionCheck}>
                      <FontAwesome6 name="check" size={16} color={COLORS.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // ==================== 新增：性能模式选择器 ====================
  const PerformanceModeSelector = () => (
    <View style={styles.performanceSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>生成模式</Text>
        <TouchableOpacity onPress={() => setShowPerformanceModal(true)}>
          <Text style={styles.moreBtn}>竞品对比</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.performanceGrid}>
        {Object.values(PERFORMANCE_MODES).map((mode) => (
          <TouchableOpacity
            key={mode.id}
            style={[
              styles.performanceCard,
              performanceMode === mode.id && { borderColor: mode.color, backgroundColor: mode.color + '10' }
            ]}
            onPress={() => setPerformanceMode(mode.id as 'fast' | 'quality')}
          >
            <View style={[styles.performanceIconContainer, { backgroundColor: mode.color + '20' }]}>
              <FontAwesome6 name={mode.icon as any} size={20} color={mode.color} />
            </View>
            <Text style={[styles.performanceName, performanceMode === mode.id && { color: mode.color }]}>{mode.name}</Text>
            <Text style={styles.performanceTime}>
              <FontAwesome6 name="clock" size={10} color={COLORS.textSecondary} /> 
              {' '}{mode.times.all}
            </Text>
            {performanceMode === mode.id && (
              <View style={[styles.performanceBadge, { backgroundColor: mode.color }]}>
                <FontAwesome6 name="check" size={10} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ==================== 新增：竞品对比弹窗 ====================
  const CompetitorModal = () => (
    <Modal visible={showPerformanceModal} transparent animationType="slide" onRequestClose={() => setShowPerformanceModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>性能对比</Text>
            <TouchableOpacity onPress={() => setShowPerformanceModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 灵感山羊 */}
            <Text style={styles.competitorTitle}>
              <FontAwesome6 name="star" size={14} color={COLORS.primary} /> 灵感山羊
            </Text>
            <View style={styles.competitorCard}>
              <View style={styles.competitorRow}>
                <Text style={styles.competitorLabel}>功能</Text>
                <Text style={styles.competitorLabel}>极速模式</Text>
                <Text style={styles.competitorLabel}>高质量模式</Text>
              </View>
              <View style={styles.competitorRow}>
                <Text style={styles.competitorFeature}>图片生成</Text>
                <Text style={styles.competitorValue}>{COMPETITORS.image.lingxiang}</Text>
                <Text style={styles.competitorValue}>-</Text>
              </View>
              <View style={styles.competitorRow}>
                <Text style={styles.competitorFeature}>文案生成</Text>
                <Text style={styles.competitorValue}>{COMPETITORS.text.lingxiang}</Text>
                <Text style={styles.competitorValue}>-</Text>
              </View>
              <View style={styles.competitorRow}>
                <Text style={styles.competitorFeature}>视频生成</Text>
                <Text style={styles.competitorValue}>-</Text>
                <Text style={styles.competitorValue}>{COMPETITORS.video.lingxiang}</Text>
              </View>
              <View style={[styles.competitorRow, styles.competitorHighlight]}>
                <Text style={styles.competitorFeature}>一键三连</Text>
                <Text style={[styles.competitorValue, styles.competitorBest]}>≤60秒</Text>
                <Text style={styles.competitorValue}>-</Text>
              </View>
            </View>

            {/* 竞品对比 */}
            <Text style={styles.competitorTitle}>
              <FontAwesome6 name="trophy" size={14} color="#F59E0B" /> 竞品对比
            </Text>
            <View style={styles.competitorCard}>
              <View style={styles.competitorRow}>
                <Text style={styles.competitorLabel}>竞品</Text>
                <Text style={styles.competitorLabel}>即梦</Text>
                <Text style={styles.competitorLabel}>可灵</Text>
              </View>
              <View style={styles.competitorRow}>
                <Text style={styles.competitorFeature}>图片生成</Text>
                <Text style={styles.competitorValue}>{COMPETITORS.image.jimeng}</Text>
                <Text style={styles.competitorValue}>{COMPETITORS.image.kilin}</Text>
              </View>
              <View style={styles.competitorRow}>
                <Text style={styles.competitorFeature}>视频生成</Text>
                <Text style={styles.competitorValue}>{COMPETITORS.video.jimeng}</Text>
                <Text style={styles.competitorValue}>{COMPETITORS.video.kilin}</Text>
              </View>
              <View style={[styles.competitorRow, styles.competitorHighlight]}>
                <Text style={styles.competitorFeature}>一键三连</Text>
                <Text style={styles.competitorValue}>-</Text>
                <Text style={styles.competitorValue}>-</Text>
              </View>
            </View>

            <View style={styles.competitorNote}>
              <FontAwesome6 name="lightbulb" size={14} color={COLORS.primary} />
              <Text style={styles.competitorNoteText}>灵感山羊一键三连功能为行业首创，竞品暂无此功能</Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.modalButton} onPress={() => setShowPerformanceModal(false)}>
            <Text style={styles.modalButtonText}>知道了</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  const ProgressModal = () => {
    // 根据阶段显示不同图标
    const getStageIcon = () => {
      switch (generationProgress.stage) {
        case 'image': return 'image';
        case 'text': return 'pen';
        case 'video': return 'video';
        case 'complete': return 'check';
        default: return 'sparkles';
      }
    };
    
    return (
      <Modal visible={showProgressModal} transparent animationType="fade">
        <View style={styles.progressOverlay}>
          <View style={styles.progressCard}>
            <FontAwesome6 name={getStageIcon() as any} size={48} color={COLORS.primary} style={styles.progressStageIcon} />
            <Text style={styles.progressTitle}>
              {generationProgress.stage === 'complete' ? '创作完成！' : '正在创作中...'}
            </Text>
            <Text style={styles.progressMessage}>{generationProgress.message}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${generationProgress.progress}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{generationProgress.progress}%</Text>
            
            {generationProgress.stage === 'complete' && (
              <View style={styles.progressSuccessHint}>
                <FontAwesome6 name="check" size={16} color="#10B981" />
                <Text style={styles.progressSuccessText}>准备跳转到编辑页面...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // ==================== 新增：新手引导弹窗 ====================
  const OnboardingModal = () => {
    const currentStep = ONBOARDING_STEPS[onboardingStep];
    
    return (
      <Modal visible={showOnboarding} transparent animationType="fade">
        <View style={styles.onboardingOverlay}>
          <View style={styles.onboardingCard}>
            {/* 步骤指示器 */}
            <View style={styles.onboardingDots}>
              {ONBOARDING_STEPS.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.onboardingDot, idx === onboardingStep && styles.onboardingDotActive]}
                />
              ))}
            </View>

            {/* 图标 */}
            <View style={[styles.onboardingIconContainer, { backgroundColor: currentStep.color + '20' }]}>
              <FontAwesome6 name={currentStep.icon as any} size={48} color={currentStep.color} />
            </View>

            {/* 内容 */}
            <Text style={styles.onboardingTitle}>{currentStep.title}</Text>
            <Text style={styles.onboardingDescription}>{currentStep.description}</Text>

            {/* 按钮 */}
            <View style={styles.onboardingButtons}>
              <TouchableOpacity style={styles.onboardingSkipBtn} onPress={handleSkipOnboarding}>
                <Text style={styles.onboardingSkipText}>跳过</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.onboardingNextBtn, { backgroundColor: currentStep.color }]}
                onPress={handleOnboardingNext}
              >
                <Text style={styles.onboardingNextText}>
                  {onboardingStep < ONBOARDING_STEPS.length - 1 ? '下一步' : '开始创作'}
                </Text>
                <FontAwesome6 name={onboardingStep < ONBOARDING_STEPS.length - 1 ? 'arrow-right' : 'wand-magic-sparkles'} size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ==================== 新增：场景模板弹窗 ====================
  const SceneTemplateModal = () => (
    <Modal visible={showSceneModal} transparent animationType="slide" onRequestClose={() => setShowSceneModal(false)}>
      <View style={styles.sceneModalOverlay}>
        <View style={styles.sceneModalContent}>
          {/* Header */}
          <View style={styles.sceneModalHeader}>
            <Text style={styles.sceneModalTitle}>场景模板中心</Text>
            <TouchableOpacity onPress={() => setShowSceneModal(false)}>
              <FontAwesome6 name="xmark" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* 模板网格 */}
          <ScrollView style={styles.sceneTemplateList} showsVerticalScrollIndicator={false}>
            <View style={styles.sceneTemplateGrid}>
              {SCENE_TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.sceneTemplateCard}
                  onPress={() => handleUseSceneTemplate(template)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.sceneTemplateIcon, { backgroundColor: template.color + '20' }]}>
                    <FontAwesome6 name={template.icon as any} size={24} color={template.color} />
                  </View>
                  <Text style={styles.sceneTemplateName}>{template.name}</Text>
                  <Text style={styles.sceneTemplateDesc} numberOfLines={1}>{template.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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
              <TouchableOpacity 
                style={styles.avatarButton}
                onPress={() => router.push("/auth")}
                activeOpacity={0.8}
              >
                <Image source={{ uri: GOAT_TEACHER_AVATAR }} style={styles.avatar} />
              </TouchableOpacity>
              <View>
                {userInfo ? (
                  <>
                    <Text style={styles.greeting}>你好，{userInfo.username}</Text>
                    <Text style={styles.subtitle}>今天想创作什么？</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.greeting}>你好，创意家</Text>
                    <Text style={styles.subtitle}>一键生成创意内容</Text>
                  </>
                )}
              </View>
            </View>
            <View style={styles.headerRight}>
              {userInfo ? (
                <>
                  <TouchableOpacity style={styles.headerButton} onPress={() => router.push("/history")}>
                    <FontAwesome6 name="clock-rotate-left" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  {isPermanentVip && (
                    <View style={styles.vipBadge}>
                      <FontAwesome6 name="crown" size={12} color="#F59E0B" />
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.headerAuthContainer}>
                  <TouchableOpacity 
                    style={styles.headerLoginBtn}
                    onPress={() => router.push("/auth")}
                  >
                    <Text style={styles.headerLoginBtnText}>登录</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.headerRegisterBtn}
                    onPress={() => router.push("/auth")}
                  >
                    <Text style={styles.headerRegisterBtnText}>注册</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>

          {/* 热点话题 */}
          <HotTopicsSection />

          {/* 功能亮点展示区 */}
          <Animated.View entering={FadeInUp.delay(50).duration(500)} style={styles.featureHighlights}>
            <View style={styles.featureHighlightsHeader}>
              <Text style={styles.featureHighlightsTitle}>灵感山羊升级啦</Text>
              <View style={styles.featureBadge}>
                <Text style={styles.featureBadgeText}>NEW</Text>
              </View>
            </View>
            <View style={styles.featureHighlightsGrid}>
              <TouchableOpacity style={styles.featureHighlightCard} onPress={() => setShowStyleModal(true)}>
                <View style={[styles.featureIconBg, { backgroundColor: 'rgba(229, 62, 62, 0.1)' }]}>
                  <FontAwesome6 name="dragon" size={22} color="#E53E3E" />
                </View>
                <Text style={styles.featureHighlightTitle}>13种国风风格</Text>
                <Text style={styles.featureHighlightSub}>全网独家</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.featureHighlightCard} onPress={handleQuickPublish}>
                <View style={[styles.featureIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <FontAwesome6 name="globe" size={22} color="#10B981" />
                </View>
                <Text style={styles.featureHighlightTitle}>一键发布全平台</Text>
                <Text style={styles.featureHighlightSub}>6大平台</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.featureHighlightCard} onPress={() => setIdea("结合猫和龙的可爱萌宠")}>
                <View style={[styles.featureIconBg, { backgroundColor: 'rgba(108, 99, 255, 0.1)' }]}>
                  <FontAwesome6 name="wand-magic-sparkles" size={22} color="#6C63FF" />
                </View>
                <Text style={styles.featureHighlightTitle}>创意融合</Text>
                <Text style={styles.featureHighlightSub}>精准理解</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* 场景模板入口 */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)}>
            <TouchableOpacity style={styles.sceneTemplateEntry} onPress={() => setShowSceneModal(true)}>
              <View style={styles.sceneTemplateEntryLeft}>
                <View style={styles.sceneTemplateIconBg}>
                  <FontAwesome6 name="layer-group" size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.sceneTemplateEntryTitle}>场景模板中心</Text>
                  <Text style={styles.sceneTemplateEntryDesc}>12+精选场景一键使用</Text>
                </View>
              </View>
              <View style={styles.sceneTemplateEntryRight}>
                <Text style={styles.sceneTemplateEntryAction}>立即使用</Text>
                <FontAwesome6 name="chevron-right" size={14} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* 专业工具快捷入口 */}
          <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.proToolsSection}>
            <Text style={styles.proToolsTitle}>专业工具</Text>
            <View style={styles.proToolsGrid}>
              <TouchableOpacity style={styles.proToolCard} onPress={() => router.push('/digital-human')}>
                <View style={[styles.proToolIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <FontAwesome6 name="user-robot" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.proToolName}>AI数字人</Text>
                <Text style={styles.proToolDesc}>虚拟主播播报</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.proToolCard} onPress={() => router.push('/design-tools')}>
                <View style={[styles.proToolIcon, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                  <FontAwesome6 name="palette" size={24} color="#EC4899" />
                </View>
                <Text style={styles.proToolName}>在线设计</Text>
                <Text style={styles.proToolDesc}>海报排版一键</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.proToolCard} onPress={() => router.push('/agent-workflow')}>
                <View style={[styles.proToolIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <FontAwesome6 name="robot" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.proToolName}>Agent编排</Text>
                <Text style={styles.proToolDesc}>自动化批量创作</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* 输入区域 - 创意想法 */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>你的创意想法</Text>
              <TouchableOpacity onPress={() => setShowSceneModal(true)}>
                <Text style={styles.inputHint}>不知道写什么？试试模板</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="例如：海边日落、可爱猫咪、产品宣传、节日祝福..."
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

          {/* 生成模式选择 */}
          <PerformanceModeSelector />

          {/* 一键生成全部按钮 */}
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

          {/* 一键发布按钮 */}
          {idea.trim().length > 0 && (
            <TouchableOpacity
              style={styles.publishButton}
              onPress={handleQuickPublish}
            >
              <FontAwesome6 name="paper-plane" size={18} color="#FFFFFF" />
              <Text style={styles.publishButtonText}>一键发布全平台</Text>
            </TouchableOpacity>
          )}

          {/* 错误提示 */}
          {error ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
              <FontAwesome6 name="circle-exclamation" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          {/* 风格选择 */}
          <StyleSelector />

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

          {/* 新增：视频运镜控制（对标可灵Kling大师运镜） */}
          <Animated.View entering={FadeInUp.delay(350).duration(500)} style={styles.cameraSection}>
            <Text style={styles.sectionTitle}>
              <FontAwesome6 name="camera" size={16} color={COLORS.primary} /> 运镜控制
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cameraScroll}>
              {CAMERA_CONTROLS.map((camera) => (
                <TouchableOpacity 
                  key={camera.id} 
                  style={[
                    styles.cameraCard, 
                    selectedCamera === camera.id && { borderColor: camera.color, backgroundColor: camera.color + '10' }
                  ]} 
                  onPress={() => setSelectedCamera(camera.id)}
                >
                  <FontAwesome6 name={camera.icon as any} size={20} color={selectedCamera === camera.id ? camera.color : COLORS.textSecondary} />
                  <Text style={[styles.cameraName, selectedCamera === camera.id && { color: camera.color }]}>{camera.name}</Text>
                  <Text style={styles.cameraDesc}>{camera.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* 新增：视频风格选择（对标Runway/Sora） */}
          <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.videoStyleSection}>
            <Text style={styles.sectionTitle}>
              <FontAwesome6 name="palette" size={16} color={COLORS.primary} /> 视频风格
            </Text>
            <View style={styles.videoStyleGrid}>
              {VIDEO_STYLES.map((style) => (
                <TouchableOpacity 
                  key={style.id} 
                  style={[
                    styles.videoStyleCard, 
                    selectedVideoStyle === style.id && { borderColor: style.color, backgroundColor: style.color + '10' }
                  ]} 
                  onPress={() => setSelectedVideoStyle(style.id)}
                >
                  <FontAwesome6 name={style.icon as any} size={18} color={selectedVideoStyle === style.id ? style.color : COLORS.textSecondary} />
                  <Text style={[styles.videoStyleName, selectedVideoStyle === style.id && { color: style.color }]}>{style.name}</Text>
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

          {/* 对比全网竞品 - 醒目入口 */}
          <TouchableOpacity style={styles.compareBanner} onPress={() => setShowPerformanceModal(true)}>
            <View style={styles.compareBannerLeft}>
              <View style={styles.compareIconContainer}>
                <FontAwesome6 name="trophy" size={20} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.compareBannerTitle}>对比全网竞品</Text>
                <Text style={styles.compareBannerSubtitle}>一键三连 · 行业首创</Text>
              </View>
            </View>
            <View style={styles.compareBannerRight}>
              <Text style={styles.compareBannerText}>查看详情</Text>
              <FontAwesome6 name="chevron-right" size={14} color="#6C63FF" />
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* 进度弹窗 */}
        <ProgressModal />

        {/* 竞品对比弹窗 */}
        <CompetitorModal />

        {/* 分辨率选择弹窗 */}
        <ResolutionModal />

        {/* 批量生成选择弹窗 */}
        <BatchModal />

        {/* SEO优化选择弹窗 */}
        <SeoModal />

        {/* 风格选择弹窗 */}
        <Modal visible={showStyleModal} transparent animationType="slide" onRequestClose={() => setShowStyleModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
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
                {/* 风格分类Tab */}
                <View style={styles.styleCategoryTabs}>
                  <TouchableOpacity 
                    style={[styles.styleCategoryTab, styleCategory === 'general' && styles.styleCategoryTabActive]}
                    onPress={() => setStyleCategory('general')}
                  >
                    <Text style={[styles.styleCategoryTabText, styleCategory === 'general' && styles.styleCategoryTabTextActive]}>
                      通用风格 ({IMAGE_STYLES.filter(s => s.category !== 'chinese').length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.styleCategoryTab, styleCategory === 'chinese' && styles.styleCategoryTabActive]}
                    onPress={() => setStyleCategory('chinese')}
                  >
                    <Text style={[styles.styleCategoryTabText, styleCategory === 'chinese' && styles.styleCategoryTabTextActive]}>
                      国风独家
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.styleGrid}>
                  {getFilteredImageStyles().map((style) => (
                    <TouchableOpacity key={style.id} style={[styles.styleCard, selectedImageStyle === style.id && styles.styleCardSelected]} onPress={() => setSelectedImageStyle(style.id)}>
                      <View style={styles.styleCardHeader}>
                        <FontAwesome6 name="image" size={24} color={style.category === 'chinese' ? '#E53E3E' : COLORS.primary} />
                        {style.badge && (
                          <View style={styles.exclusiveBadge}>
                            <Text style={styles.exclusiveBadgeText}>{style.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.styleCardName, selectedImageStyle === style.id && styles.styleCardNameSelected]}>{style.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {styleCategory === 'chinese' && (
                  <View style={styles.chineseStyleIntro}>
                    <Text style={styles.chineseStyleIntroTitle}>13种国风风格，全网独家</Text>
                    <Text style={styles.chineseStyleIntroText}>水墨山水 | 工笔花鸟 | 敦煌壁画 | 青花瓷韵 | 故宫红 | 剪纸艺术 | 年画风格 | 皮影戏 | 汉服古韵 | 古典建筑 | 国潮插画 | 诗词意境 | 禅意空间</Text>
                  </View>
                )}
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

        {/* 新手引导弹窗 */}
        <OnboardingModal />

        {/* 场景模板弹窗 */}
        <SceneTemplateModal />
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarButton: { borderRadius: 26 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  greeting: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  headerAuthContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
  },
  headerRegisterBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: COLORS.cardBg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderTopColor: 'rgba(255,255,255,1)',
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerRegisterBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  headerLoginBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: 'rgba(255,255,255,0.5)',
    borderBottomColor: 'rgba(0,0,0,0.15)',
  },
  headerLoginBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.white },
  vipBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF3C7', justifyContent: "center", alignItems: "center", shadowColor: '#F59E0B', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  
  // 热点话题 - 柔和胶囊
  hotTopicsSection: { marginBottom: 16 },
  hotTopicChip: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.cardBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 10, gap: 6, shadowColor: COLORS.shadowDark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 3 },
  hotTopicPlatform: { fontSize: 12 },
  hotTopicTitle: { fontSize: 13, color: COLORS.text, maxWidth: 100 },

  // 对比全网竞品 - 醒目卡片
  compareBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderTopColor: 'rgba(255,255,255,1)',
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  compareBannerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  compareIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(253, 203, 110, 0.15)',
    justifyContent: "center",
    alignItems: "center",
    shadowColor: '#F59E0B',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  compareBannerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  compareBannerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  compareBannerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  compareBannerText: { fontSize: 14, color: COLORS.primary, fontWeight: "600" },
  
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
  
  // 分辨率选择器
  resolutionSelector: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: COLORS.pressed, 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 8,
    gap: 8 
  },
  resolutionText: { fontSize: 13, color: COLORS.text, fontWeight: "600" },
  resolutionSize: { fontSize: 11, color: COLORS.textSecondary },
  
  // 批量生成和SEO选项选择器
  optionSelector: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: COLORS.pressed, 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 8,
    gap: 6 
  },
  optionText: { fontSize: 13, color: COLORS.text, fontWeight: "600" },
  
  // 分辨率选择弹窗
  resolutionModalContent: { maxHeight: '70%' },
  resolutionCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between",
    backgroundColor: COLORS.white, 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  resolutionCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  resolutionInfo: { flex: 1 },
  resolutionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  resolutionName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  resolutionNameSelected: { color: COLORS.primary },
  resolutionPriceTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  resolutionPriceFree: { backgroundColor: "#10B98120" },
  resolutionPricePaid: { backgroundColor: "#F59E0B20" },
  resolutionPriceText: { fontSize: 11, fontWeight: "600", color: COLORS.textSecondary },
  resolutionSizeText: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  resolutionDesc: { fontSize: 11, color: COLORS.textSecondary },
  resolutionCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary + '20', justifyContent: "center", alignItems: "center" },
  
  // 批量生成弹窗
  batchModalContent: { maxHeight: '50%' },
  batchOptions: { paddingTop: 10 },
  batchCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  batchCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  batchName: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  batchNameSelected: { color: COLORS.primary },
  batchDesc: { fontSize: 12, color: COLORS.textSecondary },
  batchPriceTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  
  // SEO优化弹窗
  seoModalContent: { maxHeight: '50%' },
  seoOptions: { paddingTop: 10 },
  seoCard: { 
    flexDirection: "row", 
    alignItems: "center",
    backgroundColor: COLORS.white, 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  seoCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  seoName: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
  seoNameSelected: { color: COLORS.primary },
  seoDesc: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  
  // 性能模式选择
  performanceSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderTopColor: 'rgba(255,255,255,0.8)',
  },
  performanceGrid: { flexDirection: "row", gap: 14 },
  performanceCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  performanceIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  performanceName: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  performanceTime: { fontSize: 11, color: COLORS.textSecondary },
  performanceBadge: { position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  
  // 竞品对比
  competitorTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 12, marginTop: 20 },
  competitorCard: { backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 16, marginBottom: 16 },
  competitorRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  competitorLabel: { flex: 1, fontSize: 12, fontWeight: "600", color: COLORS.textSecondary, textAlign: "center" },
  competitorFeature: { flex: 1, fontSize: 13, color: COLORS.text },
  competitorValue: { flex: 1, fontSize: 13, color: COLORS.text, textAlign: "center" },
  competitorHighlight: { backgroundColor: "rgba(108, 99, 255, 0.08)", borderRadius: 12, marginHorizontal: -8, paddingHorizontal: 8 },
  competitorBest: { color: COLORS.primary, fontWeight: "700" },
  competitorNote: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(108, 99, 255, 0.08)", padding: 14, borderRadius: 16, gap: 10, marginTop: 8 },
  competitorNoteText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  // 功能亮点展示区样式
  featureHighlights: { backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 18, marginTop: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', shadowColor: COLORS.shadowDark, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  featureHighlightsHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 },
  featureHighlightsTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  featureBadge: { backgroundColor: "#E53E3E", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  featureBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  featureHighlightsGrid: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  featureHighlightCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", shadowColor: COLORS.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  featureIconBg: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  featureHighlightTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  featureHighlightSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, textAlign: "center" },

  // ==================== 新增：专业工具区域样式 ====================
  proToolsSection: { marginBottom: 16 },
  proToolsTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 12, paddingHorizontal: 4 },
  proToolsGrid: { flexDirection: "row", gap: 10 },
  proToolCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    borderTopColor: "rgba(255,255,255,0.8)",
    borderBottomColor: "rgba(0,0,0,0.1)",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  proToolIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  proToolName: { fontSize: 13, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  proToolDesc: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textAlign: "center" },

  // ==================== 新增：场景模板入口样式 ====================
  sceneTemplateEntry: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    borderTopColor: "rgba(255,255,255,0.8)",
    borderBottomColor: "rgba(0,0,0,0.1)",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sceneTemplateEntryLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  sceneTemplateIconBg: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(108, 99, 255, 0.12)", justifyContent: "center", alignItems: "center" },
  sceneTemplateEntryTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  sceneTemplateEntryDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sceneTemplateEntryRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  sceneTemplateEntryAction: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },

  // ==================== 新增：输入区域样式 ====================
  inputHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  inputHint: { fontSize: 13, color: COLORS.primary, fontWeight: "500" },

  // 输入区域 - 凹陷效果
  inputSection: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  textInput: {
    backgroundColor: COLORS.pressed,
    borderRadius: 20,
    padding: 18,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: "top",
    color: COLORS.text,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderTopColor: 'rgba(255,255,255,0.8)',
    borderBottomColor: 'rgba(0,0,0,0.1)',
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  clearBtn: { position: "absolute", right: 12, top: 50, padding: 8 },
  clearBtnText: { fontSize: 13, color: COLORS.placeholder },
  
  // 视频时长
  durationSection: { marginBottom: 24 },
  durationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  durationCard: {
    width: "47%",
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderTopColor: 'rgba(255,255,255,0.8)',
    borderBottomColor: 'rgba(0,0,0,0.1)',
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  durationCardActive: { borderColor: COLORS.primary, backgroundColor: "rgba(108, 99, 255, 0.08)" },
  durationBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginBottom: 10 },
  durationBadgeText: { fontSize: 15, fontWeight: "700" },
  durationPrice: { fontSize: 15, fontWeight: "600", color: COLORS.text, marginBottom: 4 },
  durationDesc: { fontSize: 12, color: COLORS.textSecondary },
  
  // 新增：运镜控制样式（对标可灵Kling）
  cameraSection: { marginBottom: 24 },
  cameraScroll: { marginTop: 12 },
  cameraCard: {
    backgroundColor: COLORS.cardBg,
    padding: 14,
    borderRadius: 16,
    marginRight: 12,
    width: 100,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraName: { fontSize: 12, fontWeight: "600", color: COLORS.text, marginTop: 8, marginBottom: 4 },
  cameraDesc: { fontSize: 10, color: COLORS.textSecondary, textAlign: "center" },
  
  // 新增：视频风格样式（对标Runway/Sora）
  videoStyleSection: { marginBottom: 24 },
  videoStyleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  videoStyleCard: {
    backgroundColor: COLORS.cardBg,
    padding: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  videoStyleName: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  
  // 剩余次数 - 柔和卡片
  usageSection: { flexDirection: "row", justifyContent: "space-around", backgroundColor: COLORS.cardBg, padding: 18, borderRadius: 24, marginBottom: 24, shadowColor: COLORS.shadowDark, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  usageItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  usageText: { fontSize: 13, color: COLORS.text, fontWeight: "600" },
  
  // 错误提示
  errorContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 107, 107, 0.12)", padding: 14, borderRadius: 16, marginBottom: 18, gap: 10 },
  errorText: { fontSize: 13, color: COLORS.error, flex: 1 },
  
  // 生成按钮 - 渐变风格
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    borderRadius: 9999,
    gap: 12,
    // 立体感多层阴影
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    // 内阴影效果（伪）
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderTopColor: 'rgba(255,255,255,0.4)',
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  generateButtonDisabled: {
    backgroundColor: COLORS.placeholder,
    shadowColor: COLORS.placeholder,
    shadowOpacity: 0.2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  generateButtonText: { fontSize: 18, fontWeight: "800", color: COLORS.white },
  
  // 一键发布按钮
  publishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981", // 绿色
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishButtonText: { fontSize: 15, fontWeight: "700", color: COLORS.white },
  
  // VIP 横幅
  vipBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(253, 203, 110, 0.2)",
    padding: 16,
    borderRadius: 20,
    marginTop: 18,
    borderWidth: 2,
    borderColor: "rgba(253, 203, 110, 0.4)",
    borderTopColor: 'rgba(255,255,255,0.6)',
    borderBottomColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  vipContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  vipText: {},
  vipTitle: { fontSize: 15, fontWeight: "700", color: "#92400E" },
  vipSubtitle: { fontSize: 12, color: "#B45309", marginTop: 2 },
  permanentVipBanner: { backgroundColor: "rgba(0, 184, 148, 0.12)", padding: 14, borderRadius: 16, marginTop: 18, alignItems: "center" },
  permanentVipText: { fontSize: 14, fontWeight: "700", color: COLORS.success },
  
  // 进度弹窗
  progressOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  progressCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: 28, 
    padding: 36, 
    width: "85%", 
    alignItems: "center", 
    shadowColor: COLORS.shadowDark, 
    shadowOffset: { width: 8, height: 8 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 16, 
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderTopColor: 'rgba(255,255,255,1)',
  },
  progressStageIcon: { marginBottom: 16 },
  progressTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginTop: 16, marginBottom: 12 },
  progressMessage: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 20, textAlign: "center", lineHeight: 22 },
  progressBar: { width: "100%", height: 12, backgroundColor: COLORS.pressed, borderRadius: 6, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: "100%", backgroundColor: COLORS.primary, borderRadius: 6 },
  progressPercent: { fontSize: 16, fontWeight: "700", color: COLORS.primary },
  progressSuccessHint: { flexDirection: "row", alignItems: "center", marginTop: 20, gap: 8 },
  progressSuccessText: { fontSize: 14, color: COLORS.success },
  
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
  modalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderTopColor: 'rgba(255,255,255,0.4)',
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  
  // 风格选择弹窗
  styleGroupTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 18, marginTop: 20 },
  styleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  styleCard: { width: "30%", backgroundColor: COLORS.cardBg, padding: 18, borderRadius: 18, alignItems: "center", borderWidth: 2, borderColor: "transparent", shadowColor: COLORS.shadowDark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 3 },
  styleCardSelected: { backgroundColor: "rgba(108, 99, 255, 0.1)", borderColor: COLORS.primary },
  styleCardIcon: { fontSize: 28, marginBottom: 10 },
  styleCardName: { fontSize: 13, color: COLORS.text, fontWeight: "600" },
  styleCardNameSelected: { color: COLORS.primary, fontWeight: "700" },
  // 国风风格分类Tab
  styleCategoryTabs: { flexDirection: "row", marginBottom: 16, gap: 10 },
  styleCategoryTab: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: COLORS.cardBg, alignItems: "center" },
  styleCategoryTabActive: { backgroundColor: "#E53E3E" },
  styleCategoryTabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "600" },
  styleCategoryTabTextActive: { color: COLORS.white, fontWeight: "700" },
  styleCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 },
  exclusiveBadge: { backgroundColor: "#E53E3E", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  exclusiveBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: "700" },
  chineseStyleIntro: { backgroundColor: "rgba(229, 62, 62, 0.1)", borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 10 },
  chineseStyleIntroTitle: { fontSize: 14, fontWeight: "700", color: "#E53E3E", marginBottom: 8 },
  chineseStyleIntroText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 20 },
  
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

  // ==================== 新增：新手引导弹窗样式 ====================
  onboardingOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  onboardingCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: 32, 
    padding: 40, 
    width: "88%", 
    alignItems: "center",
    shadowColor: COLORS.shadowDark, 
    shadowOffset: { width: 10, height: 10 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 20, 
    elevation: 15,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
    borderTopColor: "rgba(255,255,255,1)",
  },
  onboardingDots: { flexDirection: "row", marginBottom: 32, gap: 8 },
  onboardingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.pressed },
  onboardingDotActive: { backgroundColor: COLORS.primary, width: 24 },
  onboardingIconContainer: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 28 },
  onboardingTitle: { fontSize: 24, fontWeight: "800", color: COLORS.text, marginBottom: 16, textAlign: "center" },
  onboardingDescription: { fontSize: 16, color: COLORS.textSecondary, textAlign: "center", lineHeight: 24, marginBottom: 36 },
  onboardingButtons: { flexDirection: "row", alignItems: "center", gap: 16 },
  onboardingSkipBtn: { paddingVertical: 14, paddingHorizontal: 24 },
  onboardingSkipText: { fontSize: 15, color: COLORS.placeholder, fontWeight: "500" },
  onboardingNextBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 9999 },
  onboardingNextText: { fontSize: 15, color: COLORS.white, fontWeight: "700" },

  // ==================== 新增：场景模板弹窗样式 ====================
  sceneModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sceneModalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 44, maxHeight: "85%" },
  sceneModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  sceneModalTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  sceneTemplateList: { maxHeight: 500 },
  sceneTemplateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  sceneTemplateCard: { 
    width: "30%", 
    backgroundColor: COLORS.cardBg, 
    padding: 16, 
    borderRadius: 18, 
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    borderTopColor: "rgba(255,255,255,0.8)",
    borderBottomColor: "rgba(0,0,0,0.1)",
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sceneTemplateIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  sceneTemplateName: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 4, textAlign: "center" },
  sceneTemplateDesc: { fontSize: 11, color: COLORS.textSecondary, textAlign: "center" },
});
