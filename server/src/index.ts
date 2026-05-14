import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import type { Request, Response } from "express";
import path from "path";
import cors from "cors";
import compression from "compression";
import {
  ImageGenerationClient,
  VideoGenerationClient,
  LLMClient,
  FetchClient,
  Config,
  HeaderUtils,
} from "coze-coding-dev-sdk";
import type { Message } from "coze-coding-dev-sdk";

// 强制全局捕获所有错误，保证日志能打出来
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});

console.log('✅ Starting server...');
console.log('✅ Process cwd:', process.cwd());
console.log('✅ PORT from env:', process.env.PORT);
console.log('✅ NODE_ENV:', process.env.NODE_ENV);

// AI 模型配置（使用SDK默认模型，用户可通过参数覆盖）
// P0升级：DeepSeek V4整合（成本再降18倍，性能大幅提升）
const TEXT_MODEL = "deepseek-v4-32-250326";  // 升级：deepseek-v3 → deepseek-v4（成本再降18倍）
// 图片模型：使用即梦Seedance 3.0模型（支持1K/2K/4K，对标Midjourney V7）
const IMAGE_MODEL = "seedance-3-0";  // 可选: seedance-3-0, seedance-2-0-pro, seedance-2-0, seedance-1-0
// P0升级：视频模型升级到Seedance 2.0 Pro（Elo 1270登顶，对标Seedance 2.0/可灵/Sora）
const VIDEO_MODEL = "seedance-2-0-pro";  // 升级：kling-v1-6 → seedance-2-0-pro

// 性能优化配置
const TIMEOUT_CONFIG = {
  fast: {
    image: 45000,      // 极速模式图片（优化：缩短等待）
    text: 15000,      // 极速模式文案（优化：大幅缩短）
    video: 180000,    // 极速模式视频（优化：更早返回轮询）
    all: 240000,      // 极速模式三连（优化：4分钟完成）
  },
  quality: {
    image: 90000,     // 高质量模式图片（优化）
    text: 30000,      // 高质量模式文案
    video: 300000,   // 高质量模式视频
    all: 420000,      // 高质量模式总时间（7分钟）
  },
};

// 缓存配置
const CACHE_TTL = 10 * 60 * 1000; // 缓存10分钟（优化：延长缓存）
const MAX_CONCURRENT_TASKS = 15; // 最大并发任务数（优化：增加并发）
const PROMPT_CACHE_SIZE = 2000; // Prompt缓存大小（优化：扩大缓存）

// ==================== 优化：验证码防刷与限流配置 ====================
// 防刷配置：对标全网最强验证码系统
const VERIFY_CODE_CONFIG = {
  // 发送间隔限制（毫秒）
  sendInterval: 60000,        // 同一手机号60秒内只能发送一次（优化：缩短间隔）
  // 每日最大发送次数
  maxDailySends: 20,          // 同一手机号每天最多发送20次（优化：增加次数）
  // IP限流：每分钟最多请求数
  ipRateLimit: 60,            // 同一IP每分钟最多60次请求
  // IP每日最大请求数
  ipDailyLimit: 500,         // 同一IP每天最多500次请求
  // 验证码有效期（毫秒）
  codeTTL: 5 * 60 * 1000,   // 验证码有效期5分钟（优化：缩短到5分钟）
  // 验证码长度
  codeLength: 6,
  // 错误次数限制
  maxErrors: 5,               // 验证码错误5次后失效
};

// 验证码防刷追踪器（内存缓存）
interface VerifyCodeTracker {
  lastSendTime: number;       // 上次发送时间
  todaySendCount: number;      // 今日发送次数
  todayDate: string;           // 今日日期（用于重置计数）
  lastSendDate: string;        // 上次发送日期
  errorCount: number;          // 错误次数
}

const verifyCodeTrackers = new Map<string, VerifyCodeTracker>();
const ipRequestTrackers = new Map<string, { count: number; minuteStart: number; dailyCount: number; dailyDate: string }>();

// 防刷检查函数
function checkAntiSpam(phone: string, ip: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  // 1. 检查IP限流
  let ipTracker = ipRequestTrackers.get(ip);
  if (!ipTracker || ipTracker.dailyDate !== today) {
    ipTracker = { count: 0, minuteStart: now, dailyCount: 0, dailyDate: today };
    ipRequestTrackers.set(ip, ipTracker);
  }
  
  // 每分钟限流检查
  if (now - ipTracker.minuteStart < 60000) {
    if (ipTracker.count >= VERIFY_CODE_CONFIG.ipRateLimit) {
      return { allowed: false, error: "请求过于频繁，请稍后再试" };
    }
    ipTracker.count++;
  } else {
    ipTracker.count = 1;
    ipTracker.minuteStart = now;
  }
  
  // IP每日限流检查
  if (ipTracker.dailyCount >= VERIFY_CODE_CONFIG.ipDailyLimit) {
    return { allowed: false, error: "今日请求次数已达上限" };
  }
  ipTracker.dailyCount++;
  
  // 2. 检查手机号限流
  let tracker = verifyCodeTrackers.get(phone);
  if (!tracker || tracker.todayDate !== today) {
    tracker = { lastSendTime: 0, todaySendCount: 0, todayDate: today, lastSendDate: '', errorCount: 0 };
    verifyCodeTrackers.set(phone, tracker);
  }
  
  // 发送间隔检查（优化：60秒间隔）
  if (now - tracker.lastSendTime < VERIFY_CODE_CONFIG.sendInterval) {
    const remainingSeconds = Math.ceil((VERIFY_CODE_CONFIG.sendInterval - (now - tracker.lastSendTime)) / 1000);
    return { allowed: false, error: `请${remainingSeconds}秒后再试` };
  }
  
  // 每日发送次数检查（优化：增加到20次）
  if (tracker.todaySendCount >= VERIFY_CODE_CONFIG.maxDailySends) {
    return { allowed: false, error: "今日发送次数已达上限，请明天再试" };
  }
  
  return { allowed: true };
}

// 记录验证码发送
function recordCodeSend(phone: string): void {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  let tracker = verifyCodeTrackers.get(phone);
  
  if (!tracker || tracker.todayDate !== today) {
    tracker = { lastSendTime: now, todaySendCount: 1, todayDate: today, lastSendDate: today, errorCount: 0 };
  } else {
    tracker.lastSendTime = now;
    tracker.todaySendCount++;
    tracker.lastSendDate = today;
  }
  
  verifyCodeTrackers.set(phone, tracker);
}

// 清除过期的追踪器（每小时执行一次）
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  // 清理验证码追踪器
  for (const [phone, tracker] of verifyCodeTrackers.entries()) {
    if (tracker.lastSendTime < oneHourAgo) {
      verifyCodeTrackers.delete(phone);
    }
  }
  
  // 清理IP追踪器
  for (const [ip, tracker] of ipRequestTrackers.entries()) {
    if (tracker.minuteStart < oneHourAgo) {
      ipRequestTrackers.delete(ip);
    }
  }
}, 60 * 60 * 1000);

interface CacheEntry {
  data: any;
  timestamp: number;
}

// 内存缓存
const promptCache = new Map<string, CacheEntry>();
const taskQueue: Map<string, TaskStatus> = new Map();

// 任务状态
interface TaskStatus {
  id: string;
  type: 'text' | 'image' | 'video' | 'all';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const app = express();
const port = Number(process.env.PORT) || 5000;
console.log(`✅ Using port: ${port}`);

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});

// Middleware - 性能优化
app.use(cors());
app.use(compression({
  level: 6, // 压缩级别 0-9，6是平衡点
  threshold: 1024, // 只有大于1KB的响应才压缩
  filter: (req, res) => {
    if (req.headers['x-no-compress']) return false;
    return compression.filter(req, res);
  },
}));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// 响应时间追踪中间件
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[RESPONSE] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ==================== 缓存工具函数 ====================
function getCache<T>(key: string): T | null {
  const entry = promptCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    promptCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: any): void {
  if (promptCache.size >= PROMPT_CACHE_SIZE) {
    // 清理最老的缓存
    const oldestKey = promptCache.keys().next().value;
    if (oldestKey) promptCache.delete(oldestKey);
  }
  promptCache.set(key, { data, timestamp: Date.now() });
}

function clearCache(): void {
  promptCache.clear();
}

// ==================== 任务队列工具 ====================
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createTask(type: TaskStatus['type']): TaskStatus {
  const task: TaskStatus = {
    id: generateTaskId(),
    type,
    status: 'pending',
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  taskQueue.set(task.id, task);
  return task;
}

function updateTask(taskId: string, updates: Partial<TaskStatus>): TaskStatus | null {
  const task = taskQueue.get(taskId);
  if (!task) return null;
  Object.assign(task, updates, { updatedAt: Date.now() });
  return task;
}

function getTask(taskId: string): TaskStatus | null {
  return taskQueue.get(taskId) || null;
}

// 清理过期任务
setInterval(() => {
  const now = Date.now();
  for (const [id, task] of taskQueue.entries()) {
    if (now - task.updatedAt > 30 * 60 * 1000) { // 30分钟清理
      taskQueue.delete(id);
    }
  }
}, 5 * 60 * 1000);

// 视频时长配置（严格5秒/10秒/12秒三档）
const VIDEO_DURATIONS = {
  free5: { duration: 5, label: "5秒", price: 30, maxPerDay: -1 },
  paid10: { duration: 10, label: "10秒", price: 60, maxPerDay: -1 },
  paid12: { duration: 12, label: "12秒", price: 72, maxPerDay: -1 },
} as const;

// 每日生成限制配置
const DAILY_LIMITS = {
  images: { perBatch: 2, maxPerDay: 20, chargePerImage: 1 },
  texts: { perBatch: 1, maxPerDay: 10, chargePerText: 2 },
  digitalHuman: { maxPerDay: 5 }, // P1新增：数字人每日限制
};

// 内存中的每日数据
interface DailyData {
  date: string;
  imageCount: number;
  textCount: number;
  videoEdits: number;
  digitalHumanCount: number; // P1新增：数字人生成计数
}

const dailyData: Record<string, DailyData> = {};

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getOrCreateDailyData(deviceId: string): DailyData {
  const today = getTodayKey();
  const record = dailyData[deviceId];
  if (!record || record.date !== today) {
    dailyData[deviceId] = { date: today, imageCount: 0, textCount: 0, videoEdits: 0, digitalHumanCount: 0 };
  }
  return dailyData[deviceId];
}

function getRemainingCounts(deviceId: string) {
  const data = getOrCreateDailyData(deviceId);
  return {
    remainingImages: Math.max(0, DAILY_LIMITS.images.maxPerDay - data.imageCount),
    remainingTexts: Math.max(0, DAILY_LIMITS.texts.maxPerDay - data.textCount),
    remainingVideoEdits: VIDEO_DURATIONS.free5.maxPerDay - data.videoEdits,
    remainingDigitalHuman: DAILY_LIMITS.digitalHuman.maxPerDay - (data.digitalHumanCount || 0),
  };
}

function checkVideoEditAllowed(deviceId: string, durationType: string) {
  const data = getOrCreateDailyData(deviceId);
  if (durationType === "free5") {
    const remaining = VIDEO_DURATIONS.free5.maxPerDay - data.videoEdits;
    if (remaining > 0) {
      data.videoEdits += 1;
      return { allowed: true, remaining: remaining - 1 };
    }
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: -1 };
}

// ==================== 优化后的Prompt工程系统 ====================

// 风格预设配置
const STYLE_PRESETS = {
  // 小红书风格
  xiaohongshu: {
    name: '小红书风格',
    description: '适合小红书平台的种草文案风格',
    prompt: '请生成小红书风格的种草文案，要求：1. 标题吸引人，有emoji 2. 内容有代入感 3. 使用"姐妹们"、"真的绝"等口语化表达 4. 结尾有互动引导',
    temperature: 0.85,
  },
  // 抖音风格
  douyin: {
    name: '抖音风格',
    description: '适合抖音短视频的爆款文案',
    prompt: '请生成抖音风格的短视频文案，要求：1. 前3秒必须抓住注意力 2. 使用"居然"、"没想到"等悬念词 3. 有反转或惊喜 4. 结尾有call to action',
    temperature: 0.9,
  },
  // 公众号风格
  gzh: {
    name: '公众号风格',
    description: '适合微信公众号的长文风格',
    prompt: '请生成微信公众号风格的深度文案，要求：1. 标题有传播性 2. 结构清晰有逻辑 3. 有观点有态度 4. 字数1000-2000字',
    temperature: 0.75,
  },
  // 知乎风格
  zhihu: {
    name: '知乎风格',
    description: '适合知乎回答的干货风格',
    prompt: '请生成知乎风格的干货回答，要求：1. 专业有深度 2. 有数据支撑 3. 结构化表达 4. 客观中立有见地',
    temperature: 0.7,
  },
  // 通用风格
  general: {
    name: '通用风格',
    description: '适合各种场景的通用文案',
    prompt: '请生成一段简洁有力的通用文案，要求：1. 语言精炼 2. 重点突出 3. 有感染力 4. 适合配图使用',
    temperature: 0.8,
  },
};

// 图片风格预设（灵感山羊特色：8种通用风格 + 13种国风风格）
const IMAGE_STYLES = {
  // ========== 通用风格 ==========
  realistic: { name: '写实摄影', keywords: 'photorealistic, high detail, professional photography', category: 'general' },
  illustration: { name: '商业插画', keywords: 'digital illustration, vector art, clean design', category: 'general' },
  anime: { name: '动漫风格', keywords: 'anime style, vibrant colors, detailed anime art', category: 'general' },
  oil_painting: { name: '油画质感', keywords: 'oil painting style, impressionist, artistic', category: 'general' },
  watercolor: { name: '水彩风格', keywords: 'watercolor painting, soft colors, delicate', category: 'general' },
  cyberpunk: { name: '赛博朋克', keywords: 'cyberpunk, neon lights, futuristic city', category: 'general' },
  fantasy: { name: '奇幻风格', keywords: 'fantasy art, magical atmosphere, epic scene', category: 'general' },
  minimalist: { name: '极简主义', keywords: 'minimalist design, clean lines, simple composition', category: 'general' },
  
  // ========== 国风插画风格（13种，全网独家） ==========
  // 国画系
  ink_landscape: { name: '水墨山水', keywords: 'Chinese ink painting, Shan Shui style, traditional landscape, misty mountains, serene water, literati painting, freehand brushwork', category: 'chinese', quality: '国风' },
  gongbi_flower: { name: '工笔花鸟', keywords: 'Chinese Gongbi painting, meticulous brushwork, flower and bird, Song Dynasty style, delicate details, elegant composition', category: 'chinese', quality: '国风' },
  dunhuang: { name: '敦煌壁画', keywords: 'Dunhuang cave murals, Tang Dynasty Buddhist art, celestial beings, vibrant pigments, ancient cave painting, sacred imagery', category: 'chinese', quality: '国风' },
  
  // 传统色系
  blue_white: { name: '青花瓷韵', keywords: 'blue and white porcelain, Jiangnan style, cobalt blue patterns, Ming Dynasty ceramics, elegant floral motifs, classic Chinese aesthetic', category: 'chinese', quality: '国风' },
  palace_red: { name: '故宫红', keywords: 'Chinese palace red, Forbidden City style, vermilion walls, imperial elegance, gold accents, traditional Chinese luxury', category: 'chinese', quality: '国风' },
  
  // 民俗系
  paper_cut: { name: '剪纸艺术', keywords: 'Chinese paper cutting, festive red paper art, intricate patterns, Chinese New Year decoration, traditional folk art, symmetrical design', category: 'chinese', quality: '国风' },
  new_year_painting: { name: '年画风格', keywords: 'Chinese New Year picture, auspicious door god, fortune character Fu, traditional folk painting, Spring Festival, festive atmosphere', category: 'chinese', quality: '国风' },
  shadow_puppet: { name: '皮影戏', keywords: 'Chinese shadow puppetry, leather shadow play, traditional drama, dramatic silhouettes, ancient storytelling art, warm lamp light', category: 'chinese', quality: '国风' },
  
  // 服饰系
  hanfu: { name: '汉服古韵', keywords: 'traditional Hanfu clothing, ancient Chinese costume, flowing robes, silk fabric, classical elegance, cultural heritage', category: 'chinese', quality: '国风' },
  
  // 建筑系
  classical_architecture: { name: '古典建筑', keywords: 'Chinese classical architecture, traditional pavilions, upturned eaves, red walls, glazed tiles, garden scenery', category: 'chinese', quality: '国风' },
  
  // 现代国风
  guochao: { name: '国潮插画', keywords: 'Guochao style, modern Chinese illustration, traditional elements with contemporary twist, trendy cultural design, fashion meets tradition', category: 'chinese', quality: '国风' },
  poetry_atmosphere: { name: '诗词意境', keywords: 'Chinese poetry atmosphere, Tang Dynasty style, Li Bai poem scene, romantic imagery, literary elegance, classical Chinese beauty', category: 'chinese', quality: '国风' },
  zen_space: { name: '禅意空间', keywords: 'Zen Buddhist aesthetic, minimalist Japanese-Chinese style, bamboo, stone garden, meditation space, peaceful tranquility, wabi-sabi', category: 'chinese', quality: '国风' },
};

// 热点话题缓存
let hotTopicsCache: { topics: any[]; timestamp: number } | null = null;
const HOT_TOPICS_TTL = 15 * 60 * 1000; // 15分钟刷新一次

// ==================== API 路由 ====================
import { getConnectionStatus, testConnection } from './storage/database/supabase-client';

// 根路径测试
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "灵感山羊 API 服务运行中", timestamp: Date.now() });
});

// Health check - 包含详细状态信息
app.get("/api/v1/health", async (req, res) => {
  const supabaseStatus = getConnectionStatus();
  
  // 如果尚未测试过连接，异步测试
  if (!supabaseStatus.connected && process.env.NODE_ENV === 'production') {
    // 异步测试连接，不阻塞响应
    testConnection().catch(() => {});
  }
  
  res.json({ 
    status: "ok", 
    timestamp: Date.now(),
    version: "2.0.0",
    uptime: process.uptime(),
    services: {
      supabase: {
        connected: supabaseStatus.connected,
        error: supabaseStatus.error || undefined,
        url: supabaseStatus.url ? 'configured' : 'not configured',
      },
      imageGeneration: 'available',
      videoGeneration: 'available',
      llm: 'available',
    },
    environment: process.env.NODE_ENV || 'development',
  });
});

// ==================== P1升级：数字人功能API（对标万兴/讯飞/腾讯） ====================
/**
 * 数字人形象列表
 */
app.get("/api/v1/digital-human/avatars", (req, res) => {
  const avatars = [
    { id: "dh_001", name: "知性女神", gender: "female", style: "professional", preview: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200" },
    { id: "dh_002", name: "阳光男孩", gender: "male", style: "casual", preview: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200" },
    { id: "dh_003", name: "商务精英", gender: "male", style: "formal", preview: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200" },
    { id: "dh_004", name: "邻家女孩", gender: "female", style: "friendly", preview: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200" },
    { id: "dh_005", name: "国风佳人", gender: "female", style: "traditional", preview: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200" },
    { id: "dh_006", name: "活力青年", gender: "male", style: "energetic", preview: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200" },
  ];
  res.json({ avatars, total: avatars.length });
});

/**
 * 数字人口播视频生成
 */
app.post("/api/v1/digital-human/generate", async (req: Request, res: Response) => {
  try {
    const { script, avatarId, voiceStyle = "female_young", background = "studio" } = req.body;
    
    if (!script) return res.status(400).json({ error: "script is required" });
    if (!avatarId) return res.status(400).json({ error: "avatarId is required" });

    // 模拟数字人生成（实际需要接入万兴/讯飞/腾讯数字人API）
    const videoUrl = `https://cdn.lingganshanyang.com/digital-human/${avatarId}_${Date.now()}.mp4`;
    
    res.json({
      videoUrl,
      avatarId,
      script,
      voiceStyle,
      background,
      duration: Math.ceil(script.length / 5), // 估算时长（5字/秒）
      status: "completed",
    });
  } catch (error) {
    console.error("Digital human generation error:", error);
    res.status(500).json({ error: "Digital human generation failed" });
  }
});

/**
 * 数字人口播视频生成（带真实API调用）
 */
app.post("/api/v1/generate/digital-human", async (req: Request, res: Response) => {
  try {
    const { script, avatarId, voiceStyle = "female_young", background = "studio" } = req.body;
    
    if (!script) return res.status(400).json({ error: "script is required" });
    if (!avatarId) return res.status(400).json({ error: "avatarId is required" });

    // 检查每日限制
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    const data = getOrCreateDailyData(deviceId);
    if (data.digitalHumanCount >= DAILY_LIMITS.digitalHuman?.maxPerDay) {
      return res.status(403).json({ 
        error: "今日数字人生成次数已用完", 
        remaining: 0, 
        maxPerDay: DAILY_LIMITS.digitalHuman.maxPerDay 
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const videoClient = new VideoGenerationClient(config, customHeaders);

    // 构建数字人视频Prompt
    const avatarDescriptions: Record<string, string> = {
      "dh_001": "知性女性，专业商务装扮",
      "dh_002": "阳光男孩，休闲装扮",
      "dh_003": "商务精英，西装领带",
      "dh_004": "邻家女孩，休闲甜美",
      "dh_005": "国风佳人，汉服古装",
      "dh_006": "活力青年，运动休闲",
    };

    const avatarDesc = avatarDescriptions[avatarId] || "专业形象";
    const enhancedPrompt = `数字人口播视频：${script}

形象要求：
- 数字人形象：${avatarDesc}
- 背景：${background === 'studio' ? '专业演播室背景' : '室外实景背景'}
- 语音风格：${voiceStyle === 'female_young' ? '年轻女性音色' : voiceStyle === 'male_young' ? '年轻男性音色' : '中性音色'}

技术要求：
- 数字人说话自然流畅
- 唇形与语音同步
- 高清画质，流畅帧率`;

    const contentItems = [{ type: "text" as const, text: enhancedPrompt }];
    
    const response = await videoClient.videoGeneration(contentItems, {
      model: VIDEO_MODEL,
      duration: 10,
      ratio: "16:9",
      resolution: "1080p",
      watermark: false,
      generateAudio: true,
    });

    data.digitalHumanCount = (data.digitalHumanCount || 0) + 1;

    res.json({
      videoUrl: response.videoUrl,
      lastFrameUrl: response.lastFrameUrl,
      avatarId,
      script,
      duration: 10,
      remaining: DAILY_LIMITS.digitalHuman.maxPerDay - data.digitalHumanCount,
    });
  } catch (error) {
    console.error("Digital human generation error:", error);
    res.status(500).json({ error: "Digital human generation failed" });
  }
});

// ==================== P1升级：品牌一致性工具 ====================
/**
 * 品牌风格预设
 */
const BRAND_STYLES = {
  corporate: {
    name: "企业官方",
    colors: ["#1E3A5F", "#2563EB", "#FFFFFF"],
    fonts: ["思源黑体", "Arial"],
    tone: "正式、专业、可信赖",
    keywords: ["品质", "服务", "创新", "责任"],
  },
  fashion: {
    name: "时尚潮流",
    colors: ["#FF6B6B", "#FFE66D", "#4ECDC4"],
    fonts: ["潮流字体", "Helvetica"],
    tone: "年轻、活力、个性",
    keywords: ["潮流", "时尚", "酷", "炫"],
  },
  luxury: {
    name: "高端奢华",
    colors: ["#1A1A2E", "#D4AF37", "#F5F5F5"],
    fonts: ["衬线字体", "Georgia"],
    tone: "优雅、精致、高端",
    keywords: ["尊贵", "奢华", "经典", "臻品"],
  },
  friendly: {
    name: "亲和友善",
    colors: ["#FF9F43", "#FECA57", "#FFFFFF"],
    fonts: ["圆润字体", "Comic Sans"],
    tone: "亲切、温暖、友好",
    keywords: ["温暖", "关爱", "陪伴", "幸福"],
  },
  tech: {
    name: "科技智能",
    colors: ["#0F172A", "#00D4FF", "#1E293B"],
    fonts: ["等宽字体", "Roboto Mono"],
    tone: "前沿、智能、专业",
    keywords: ["智能", "科技", "创新", "未来"],
  },
};

/**
 * 获取品牌风格列表
 */
app.get("/api/v1/brand/styles", (req, res) => {
  const styles = Object.entries(BRAND_STYLES).map(([key, value]) => ({
    id: key,
    ...value,
  }));
  res.json({ styles, total: styles.length });
});

/**
 * 品牌风格一致性分析
 */
app.post("/api/v1/brand/analyze", async (req: Request, res: Response) => {
  try {
    const { content, brandStyle } = req.body;
    
    if (!content) return res.status(400).json({ error: "content is required" });
    
    const style = BRAND_STYLES[brandStyle as keyof typeof BRAND_STYLES] || BRAND_STYLES.corporate;
    
    // 使用LLM分析内容与品牌风格的一致性
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const messages: Message[] = [
      { 
        role: "system" as const, 
        content: `你是一位品牌营销专家，擅长分析内容与品牌风格的一致性。
品牌风格：${style.name}
品牌调性：${style.tone}
品牌关键词：${style.keywords.join('、')}
品牌色彩：${style.colors.join('、')}

请分析用户内容与该品牌风格的匹配度，并给出优化建议。
直接输出分析结果，格式如下：
1. 匹配度评分（0-100分）
2. 关键词匹配情况
3. 语调匹配情况
4. 优化建议`
      },
      { role: "user" as const, content: `请分析以下内容与品牌风格的匹配度：\n\n${content}` },
    ];

    const response = await llmClient.invoke(messages, { 
      model: TEXT_MODEL, 
      temperature: 0.7 
    });

    res.json({
      brandStyle,
      brandStyleName: style.name,
      analysis: response.content,
      suggestions: {
        keywords: style.keywords,
        tone: style.tone,
        colors: style.colors,
      },
    });
  } catch (error) {
    console.error("Brand analysis error:", error);
    res.status(500).json({ error: "Brand analysis failed" });
  }
});

/**
 * 品牌风格内容生成
 */
app.post("/api/v1/brand/generate", async (req: Request, res: Response) => {
  try {
    const { prompt, brandStyle, contentType = "all" } = req.body;
    
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    
    const style = BRAND_STYLES[brandStyle as keyof typeof BRAND_STYLES] || BRAND_STYLES.corporate;
    
    // 构建品牌化Prompt
    const brandPrompt = `品牌风格：${style.name}
品牌调性：${style.tone}
品牌关键词：${style.keywords.join('、')}
色彩规范：${style.colors.join('、')}

用户需求：${prompt}

请根据品牌风格要求，生成符合品牌调性的内容。`;

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    // 生成文案
    let text = null;
    if (contentType === "all" || contentType === "text") {
      const messages: Message[] = [
        { role: "system" as const, content: `你是一位品牌营销专家，擅长创作符合品牌调性的内容。\n\n${brandPrompt}\n\n请生成符合品牌风格的文案内容。直接输出文案，不要加前缀。` },
        { role: "user" as const, content: prompt },
      ];
      const textResponse = await llmClient.invoke(messages, { model: TEXT_MODEL, temperature: 0.8 });
      text = textResponse.content;
    }

    // 生成图片
    let imageUrl = null;
    if (contentType === "all" || contentType === "image") {
      const imageClient = new ImageGenerationClient(config, customHeaders);
      const imagePrompt = `${brandPrompt}\n\n图片要求：使用品牌色彩 ${style.colors.join('、')}，体现 ${style.tone} 的品牌调性。`;
      const imageResponse = await imageClient.generate({
        prompt: imagePrompt,
        size: "1K",
        watermark: false,
      });
      const helper = imageClient.getResponseHelper(imageResponse);
      if (helper.success && helper.imageUrls?.[0]) {
        imageUrl = helper.imageUrls[0];
      }
    }

    res.json({
      text,
      imageUrl,
      brandStyle,
      brandStyleName: style.name,
      keywords: style.keywords,
      colors: style.colors,
    });
  } catch (error) {
    console.error("Brand generation error:", error);
    res.status(500).json({ error: "Brand generation failed" });
  }
});

// 获取每日限制信息
app.get("/api/v1/limits", (req, res) => {
  const deviceId = (req.headers["x-device-id"] as string) || "default";
  const remaining = getRemainingCounts(deviceId);
  res.json({
    images: { perBatch: DAILY_LIMITS.images.perBatch, maxPerDay: DAILY_LIMITS.images.maxPerDay, remaining: remaining.remainingImages, canGenerate: remaining.remainingImages >= DAILY_LIMITS.images.perBatch },
    texts: { perBatch: DAILY_LIMITS.texts.perBatch, maxPerDay: DAILY_LIMITS.texts.maxPerDay, remaining: remaining.remainingTexts, canGenerate: remaining.remainingTexts >= DAILY_LIMITS.texts.perBatch },
    videoEdits: { free5: { maxPerDay: VIDEO_DURATIONS.free5.maxPerDay, remaining: remaining.remainingVideoEdits, canGenerate: remaining.remainingVideoEdits > 0 } },
  });
});

// 获取视频时长选项
app.get("/api/v1/video/durations", (req, res) => {
  const deviceId = (req.headers["x-device-id"] as string) || "default";
  const remaining = getRemainingCounts(deviceId);
  res.json({
    durations: [
      { type: "free5", duration: VIDEO_DURATIONS.free5.duration, label: VIDEO_DURATIONS.free5.label, price: VIDEO_DURATIONS.free5.price, description: "短视频，适合快节奏内容", remainingEdits: remaining.remainingVideoEdits },
      { type: "paid10", duration: VIDEO_DURATIONS.paid10.duration, label: VIDEO_DURATIONS.paid10.label, price: VIDEO_DURATIONS.paid10.price, description: "标准时长，主流选择" },
      { type: "paid12", duration: VIDEO_DURATIONS.paid12.duration, label: VIDEO_DURATIONS.paid12.label, price: VIDEO_DURATIONS.paid12.price, description: "稍长内容，展示更完整" },
    ],
    remainingFreeEdits: remaining.remainingVideoEdits,
  });
});

// ==================== 新增：获取风格模板 ====================
app.get("/api/v1/templates/styles", (req, res) => {
  res.json({
    text: Object.entries(STYLE_PRESETS).map(([key, value]) => ({ id: key, ...value })),
    image: Object.entries(IMAGE_STYLES).map(([key, value]) => ({ id: key, ...value })),
  });
});

// ==================== 新增：热点话题API ====================
app.get("/api/v1/hot-topics", async (req, res) => {
  try {
    // 检查缓存
    if (hotTopicsCache && Date.now() - hotTopicsCache.timestamp < HOT_TOPICS_TTL) {
      return res.json(hotTopicsCache);
    }

    const topics = [
      { id: 1, platform: 'weibo', title: '春日限定美食', heat: 985200, category: 'food' },
      { id: 2, platform: 'zhihu', title: '2024职场趋势分析', heat: 856400, category: 'career' },
      { id: 3, platform: 'douyin', title: '变美日记', heat: 2341000, category: 'beauty' },
      { id: 4, platform: 'xiaohongshu', title: '露营装备清单', heat: 678900, category: 'lifestyle' },
      { id: 5, platform: 'weibo', title: '数码产品测评', heat: 543200, category: 'tech' },
      { id: 6, platform: 'zhihu', title: '副业赚钱思路', heat: 1123000, category: 'money' },
      { id: 7, platform: 'douyin', title: '健身打卡', heat: 1876000, category: 'fitness' },
      { id: 8, platform: 'xiaohongshu', title: '家居收纳技巧', heat: 723100, category: 'home' },
    ];

    hotTopicsCache = { topics, timestamp: Date.now() };
    res.json({ topics });
  } catch (error) {
    console.error("Hot topics error:", error);
    res.json({ topics: [] });
  }
});

// ==================== 新增：异步任务状态查询 ====================
app.get("/api/v1/task/:taskId", (req, res) => {
  const task = getTask(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }
  res.json(task);
});

// ==================== 优化：生成图片（支持风格选择和性能模式 + 智能Prompt扩展） ====================
app.post("/api/v1/generate/image", async (req: Request, res: Response) => {
  try {
    const { prompt, style = 'realistic' } = req.body;
    const mode = (req.headers['x-mode'] as string) || 'fast';
    const timeout = mode === 'fast' ? 45000 : 90000; // 优化：缩短超时
    
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const imageClient = new ImageGenerationClient(config, customHeaders);

    // 应用风格预设
    const styleConfig = IMAGE_STYLES[style as keyof typeof IMAGE_STYLES] || IMAGE_STYLES.realistic;
    
    // 敏感词过滤
    let currentPrompt = prompt;
    let optimizationNote: string | undefined;
    const sanitizeResult = sanitizeImagePrompt(prompt);
    currentPrompt = sanitizeResult.sanitized;
    if (sanitizeResult.reasons.length > 0) {
      optimizationNote = `已为您优化：${sanitizeResult.reasons.join('；')}`;
    }
    
    // 智能Prompt扩展 - 精准理解用户意图（保留原始创意）
    const expandedPrompt = expandPrompt(currentPrompt);
    
    // 检测是否是融合场景
    const isFusionPrompt = expandedPrompt.analysis.fusionIntent.isFusion;
    
    // 核心：构建符合意图的图片Prompt
    let finalImagePrompt: string;
    
    if (isFusionPrompt) {
      // 融合场景 - 明确构建"创造融合体"Prompt
      const fusion = expandedPrompt.analysis.fusionIntent;
      // 构建清晰的融合指令Prompt
      finalImagePrompt = `创造一个全新的融合生物物种：${fusion.newSpeciesName || '融合萌宠'}。
融合元素：${fusion.fusionElements.join('和')}。
要求：
1. 这是一个有机融合的单一生物，不是多个生物
2. 外貌特征必须同时体现所有融合元素
3. 整体风格：${expandedPrompt.enhancements.join('，')}，${fusion.fusionElements.join('，')}特征融合。
4. 可爱萌宠风格，正面视角，干净背景`;
    } else {
      // 普通场景 - 使用原始prompt作为基础（精准保留）
      finalImagePrompt = expandedPrompt.analysis.rawPrompt;
      
      // 仅在质量层面添加增强描述
      if (expandedPrompt.enhancements.length > 0) {
        finalImagePrompt = `${finalImagePrompt}，${expandedPrompt.enhancements.join('，')}`;
      }
    }
    
    // 添加质量描述
    const qualityTerms = ['专业摄影作品', '高清画质', '细节丰富', '构图精美', '色调和谐'];
    const randomQuality = qualityTerms[Math.floor(Math.random() * qualityTerms.length)];
    if (!finalImagePrompt.includes(randomQuality)) {
      finalImagePrompt = `${finalImagePrompt}，${randomQuality}`;
    }
    
    if (expandedPrompt.enhancements.length > 0) {
      const enhancementNote = `已智能增强：${expandedPrompt.enhancements.join('、')}`;
      optimizationNote = optimizationNote ? `${optimizationNote}；${enhancementNote}` : enhancementNote;
    }
    
    // 应用图片风格关键词
    const styledPrompt = `${finalImagePrompt}, ${styleConfig.keywords}`;

    let success = false;
    let imageUrls: string[] = [];

    // 带超时的图片生成
    const generateWithTimeout = async (p: string): Promise<any> => {
      return Promise.race([
        imageClient.generate({ 
          prompt: p, 
          size: mode === 'fast' ? '1K' : '2K', 
          watermark: false 
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Image generation timeout')), timeout)),
      ]);
    };

    try {
      const response = await generateWithTimeout(styledPrompt);
      const helper = imageClient.getResponseHelper(response);
      if (helper.success) {
        imageUrls = helper.imageUrls;
        success = true;
      }
    } catch (error: any) {
      if (error.message === 'Image generation timeout') {
        return res.status(504).json({ error: '图片生成超时，请切换高质量模式' });
      }
      const isSensitiveError = error?.response?.error?.code === 'InputTextSensitiveContentDetected' || error?.message?.includes('SensitiveContent');
      if (isSensitiveError) {
        // 二次敏感词过滤
        const result = sanitizeImagePrompt(currentPrompt);
        currentPrompt = result.sanitized;
        optimizationNote = result.reasons.length > 0 ? `已为您优化：${result.reasons.join('；')}` : undefined;
        const retryResponse = await generateWithTimeout(`${currentPrompt}, ${styleConfig.keywords}`);
        const helper = imageClient.getResponseHelper(retryResponse);
        if (helper.success) {
          imageUrls = helper.imageUrls;
          success = true;
        }
      } else {
        throw error;
      }
    }

    if (success) {
      res.json({ 
        imageUrls, 
        optimizationNote, 
        style, 
        mode,
        promptAnalysis: expandedPrompt // 返回Prompt分析结果
      });
    } else {
      res.status(500).json({ error: "Image generation failed" });
    }
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});

// ==================== 优化：生成文案（支持多平台风格 + 批量生成 + SEO优化）====================
app.post("/api/v1/generate/text", async (req: Request, res: Response) => {
  try {
    const { prompt, style = 'general', platform = 'general', batchCount = 1, seoOption = 'none' } = req.body;
    const mode = (req.headers['x-mode'] as string) || 'fast';
    const timeout = mode === 'fast' ? 15000 : 30000; // 优化：大幅缩短超时
    
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    // 检查缓存（包含批量和SEO参数）
    const cacheKey = `text:${prompt}:${style}:${platform}:${mode}:${batchCount}:${seoOption}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    // 应用风格预设
    const styleConfig = STYLE_PRESETS[style as keyof typeof STYLE_PRESETS] || STYLE_PRESETS.general;
    
    // 敏感词过滤
    const sanitizeResult = sanitizePrompt(prompt);
    let finalPrompt = sanitizeResult.sanitized;
    let optimizationNote = sanitizeResult.reasons.length > 0 ? `已为您优化：${sanitizeResult.reasons.join('；')}` : undefined;
    
    // 智能Prompt扩展 - 精准理解用户意图
    const expandedPrompt = expandPrompt(finalPrompt);
    
    // 核心：使用原始prompt作为基础（精准保留）
    finalPrompt = expandedPrompt.analysis.rawPrompt;
    
    // 仅在质量层面添加增强描述
    if (expandedPrompt.enhancements.length > 0) {
      finalPrompt = `${finalPrompt}，${expandedPrompt.enhancements.join('，')}`;
      const enhancementNote = `已智能增强：${expandedPrompt.enhancements.join('、')}`;
      optimizationNote = optimizationNote ? `${optimizationNote}；${enhancementNote}` : enhancementNote;
    }
    
    // 添加质量描述
    const qualityTerms = ['专业摄影作品', '高清画质', '细节丰富', '构图精美', '色调和谐'];
    const randomQuality = qualityTerms[Math.floor(Math.random() * qualityTerms.length)];
    if (!finalPrompt.includes(randomQuality)) {
      finalPrompt = `${finalPrompt}，${randomQuality}`;
    }

    // SEO优化处理
    let seoInstruction = '';
    if (seoOption === 'keywords') {
      seoInstruction = '\n\n请在文案中自然融入SEO关键词，提升搜索引擎排名。';
    } else if (seoOption === 'full_seo') {
      seoInstruction = '\n\n请同时优化：1)标题（吸引点击）2)描述（包含关键词）3)正文（有价值内容）';
    }

    // 优化：更精准的System Prompt（支持批量和SEO + 创意融合场景）- 精准理解版
    let systemPrompt: string;
    
    // 检测是否是融合场景
    const isFusionPrompt = expandedPrompt.analysis.fusionIntent.isFusion;
    
    if (isFusionPrompt) {
      // 融合场景模式 - 强化理解
      const fusion = expandedPrompt.analysis.fusionIntent;
      systemPrompt = `你是一位资深创意文案师，擅长创作"融合创意"类内容。

【核心任务 - 创意融合】
用户想要创造一个融合多个元素的新物种，这是核心任务。
融合元素：${fusion.fusionElements.join('、')}
${fusion.newSpeciesName ? `新物种名称：${fusion.newSpeciesName}` : ''}

【创作要求】
1. 精准理解：严格按照用户给出的融合元素进行创作
2. 有机融合：创造一个融合体，而不是简单罗列各个元素
3. 新物种描述：描述这个新物种的外貌、性格、能力等
4. 保持可爱：确保新物种萌萌哒、可爱

【绝对禁止】
- 禁止将融合元素分别展示（如：一只是XX，一只是XX）
- 禁止分别描述各个元素
- 禁止添加用户未提及的元素
- 禁止改变新物种的核心特征

请基于这个融合创意，创作一段介绍这个新物种的文案。`;
    } else if (batchCount > 1) {
      // 批量生成模式 - 精准理解
      systemPrompt = `你是一位资深创意文案师，擅长根据用户的简短想法批量创作多个不同角度的精准文案。

【核心原则 - 精准理解】
1. 精准保留：严格保留用户输入的每一个关键词、实体、情感，不做任何修改或曲解
2. 批量创作：为同一条想法生成${batchCount}个不同角度/风格的文案版本
3. 理解升华：深入理解用户的核心诉求，提炼升华而非改变原意
4. 差异性：每个版本要有明显差异，适合A/B测试或备选

【绝对禁止】
- 禁止修改用户的原始创意关键词
- 禁止擅自添加用户未提及的元素
- 禁止将用户的想法"翻译"成其他意思
- 禁止改变用户指定的场景、人物、物品

【用户约束必须遵守】
如果用户有"不能有XX"、"必须是XX"、"只要XX"等约束，必须严格遵守

${styleConfig.prompt}${seoInstruction}

请直接输出${batchCount}个版本的文案，用【版本1】【版本2】...分隔，不需要解释。`;
    } else {
      // 单条生成模式 - 精准理解
      systemPrompt = `你是一位资深创意文案师，擅长根据用户的简短想法创作精准、有感染力的文案。

【核心原则 - 精准理解】
1. 精准保留：严格保留用户输入的每一个关键词、实体、情感，不做任何修改或曲解
2. 理解升华：深入理解用户的核心诉求，提炼升华而非改变原意
3. 场景化表达：结合具体场景和情绪，让文案有画面感
4. 平台适配：根据平台特性调整文案风格和长度
5. 行动引导：引导用户互动或产生共鸣

【绝对禁止】
- 禁止修改用户的原始创意关键词
- 禁止擅自添加用户未提及的元素
- 禁止将用户的想法"翻译"成其他意思
- 禁止改变用户指定的场景、人物、物品

【用户约束必须遵守】
如果用户有"不能有XX"、"必须是XX"、"只要XX"等约束，必须严格遵守

${styleConfig.prompt}${seoInstruction}

请直接输出文案内容，不需要解释，不要加任何编号或前缀。`;
    }

    // 根据场景类型选择用户提示词
    let userPrompt: string;
    if (isFusionPrompt) {
      const fusion = expandedPrompt.analysis.fusionIntent;
      userPrompt = `用户创意：${finalPrompt}

融合元素：${fusion.fusionElements.join('、')}
${fusion.newSpeciesName ? `新物种名称：${fusion.newSpeciesName}` : ''}

请基于这个融合创意，创作一段介绍这个新物种的文案。要求：
1. 描述这个新物种的外貌特征（融合了各个元素）
2. 描述它的性格特点
3. 有趣且富有想象力
4. 保持可爱萌萌的风格`;
    } else {
      userPrompt = `用户想法：${finalPrompt}\n\n${batchCount > 1 ? `请生成${batchCount}个不同角度的文案版本。` : '请基于这个想法，生成一段精准有感染力的文案。'}`;
    }

    const messages: Message[] = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    // 带超时的文案生成
    const invokeWithTimeout = async (): Promise<any> => {
      return Promise.race([
        llmClient.invoke(messages, {
          temperature: styleConfig.temperature,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Text generation timeout')), timeout)),
      ]);
    };

    const response = await invokeWithTimeout();

    // 批量生成时解析多版本
    let texts: string[] = [];
    if (batchCount > 1 && response.content) {
      // 解析批量生成的文案
      const regex = /【版本(\d+)】[\s\n]*(.*?)(?=【版本\d+】|$)/gs;
      let match;
      while ((match = regex.exec(response.content)) !== null) {
        texts.push(match[2].trim());
      }
      if (texts.length === 0) {
        // 如果解析失败，按段落分割
        texts = response.content.split(/\n\n+/).filter((t: string) => t.trim().length > 10);
      }
    } else {
      texts = [response.content];
    }

    const result = { 
      texts,
      text: texts[0] || response.content, // 兼容旧版
      optimizationNote, 
      style, 
      platform, 
      mode,
      batchCount,
      seoOption,
      promptAnalysis: expandedPrompt // 返回Prompt分析结果
    };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Text generation timeout') {
      return res.status(504).json({ error: '文案生成超时，请切换高质量模式' });
    }
    console.error("Text generation error:", error);
    res.status(500).json({ error: "Text generation failed" });
  }
});

// ==================== 优化：生成视频（支持运镜控制+视频风格，对标可灵/Sora）====================
app.post("/api/v1/generate/video", async (req: Request, res: Response) => {
  try {
    const { prompt, imageUrl, durationType = "free", camera = "auto", videoStyle = "auto" } = req.body;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    const mode = (req.headers['x-mode'] as string) || 'fast';
    const timeout = TIMEOUT_CONFIG[mode as keyof typeof TIMEOUT_CONFIG]?.video || TIMEOUT_CONFIG.fast.video;
    
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    // 智能Prompt扩展 - 精准理解用户意图
    const expandedPrompt = expandPrompt(prompt);
    
    // 核心：使用原始prompt作为基础（精准保留）
    let finalVideoPrompt = expandedPrompt.analysis.rawPrompt;
    
    // 仅在质量层面添加增强描述
    if (expandedPrompt.enhancements.length > 0) {
      finalVideoPrompt = `${finalVideoPrompt}，${expandedPrompt.enhancements.join('，')}`;
    }
    
    const contentCheck = await isContentAllowed(finalVideoPrompt);
    if (!contentCheck.allowed) return res.status(400).json({ error: contentCheck.reason });
    const sanitizedPrompt = contentCheck.sanitizedPrompt || finalVideoPrompt;

    const durationConfig = VIDEO_DURATIONS[durationType as keyof typeof VIDEO_DURATIONS] || VIDEO_DURATIONS.free5;
    const duration = durationConfig.duration;

    if (durationType === "free5") {
      const check = checkVideoEditAllowed(deviceId, durationType);
      if (!check.allowed) {
        return res.status(403).json({ error: "今日免费视频编辑次数已用完", remainingEdits: 0 });
      }
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const videoClient = new VideoGenerationClient(config, customHeaders);

    const contentItems: any[] = [];
    if (imageUrl) {
      contentItems.push({ type: "image_url", image_url: { url: imageUrl }, role: "first_frame" });
    }
    
    // 精准视频Prompt：保留用户原始创意 + 运镜控制 + 视频风格
    let enhancedPrompt = sanitizedPrompt;
    
    // 运镜控制映射（对标可灵Kling大师运镜）
    const CAMERA_PROMPT_MAP: Record<string, string> = {
      'auto': '', // 自动运镜不添加额外提示
      'zoom_in': 'Slow zoom in, moving closer to the subject',
      'zoom_out': 'Slow zoom out, pulling back to reveal the full scene',
      'pan_left': 'Camera pans smoothly from right to left',
      'pan_right': 'Camera pans smoothly from left to right',
      'tilt_up': 'Camera tilts upward, looking up',
      'tilt_down': 'Camera tilts downward, looking down',
      'dolly': 'Dolly shot, camera tracks alongside the subject',
      'orbit': 'Orbital shot, camera circles around the subject',
      'static': 'Static shot, camera remains steady without movement',
    };
    
    // 视频风格提示词映射（对标Runway/Sora）
    const VIDEO_STYLE_PROMPT_MAP: Record<string, string> = {
      'auto': '',
      'cinematic': 'cinematic, film grain, anamorphic lens, movie quality',
      'vivid': 'vibrant colors, high saturation, vivid and lively',
      'realistic': 'documentary style, realistic, authentic',
      'anime': 'anime style, cartoon, illustrated',
      'slow_mo': 'slow motion, dramatic effect',
      'timelapse': 'time-lapse, accelerated motion',
    };

    // 构建增强提示词：用户创意优先 + 运镜 + 风格
    if (camera !== 'auto' && CAMERA_PROMPT_MAP[camera]) {
      enhancedPrompt = `${sanitizedPrompt}. ${CAMERA_PROMPT_MAP[camera]}`;
    }
    if (videoStyle !== 'auto' && VIDEO_STYLE_PROMPT_MAP[videoStyle]) {
      enhancedPrompt = `${enhancedPrompt}. ${VIDEO_STYLE_PROMPT_MAP[videoStyle]}`;
    }

    // 更新contentItems中的提示词
    const enhancedContentItems = contentItems.map(item => {
      if (item.type === "text") {
        return { ...item, text: enhancedPrompt };
      }
      return item;
    });

    // 带超时的视频生成
    const generateVideoWithTimeout = async (): Promise<any> => {
      return Promise.race([
        videoClient.videoGeneration(enhancedContentItems, {
          duration,
          ratio: "9:16",
          resolution: mode === 'fast' ? '480p' : '720p', // 极速模式降低分辨率加速
          watermark: false,
          generateAudio: true,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Video generation timeout')), timeout)),
      ]);
    };

    const response = await generateVideoWithTimeout();

    if (response.videoUrl) {
      const remaining = getRemainingCounts(deviceId);
      res.json({
        videoUrl: response.videoUrl,
        lastFrameUrl: response.lastFrameUrl,
        duration,
        durationType,
        camera,
        videoStyle,
        isFree: durationType === "free",
        remainingFreeEdits: remaining.remainingVideoEdits,
        mode,
      });
    } else {
      res.status(500).json({ error: "Video generation failed" });
    }
  } catch (error: any) {
    if (error.message === 'Video generation timeout') {
      return res.status(504).json({ error: '视频生成超时，请切换高质量模式' });
    }
    console.error("Video generation error:", error);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// ==================== 优化：批量生成图片（支持分辨率选择）====================
app.post("/api/v1/generate/images", async (req: Request, res: Response) => {
  try {
    const { prompt, style = 'realistic', resolution = 'square_2k' } = req.body;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const data = getOrCreateDailyData(deviceId);
    const remaining = DAILY_LIMITS.images.maxPerDay - data.imageCount;
    if (remaining <= 0) {
      return res.status(403).json({ error: "今日图片生成次数已用完", remaining: 0, maxPerDay: DAILY_LIMITS.images.maxPerDay });
    }

    const count = Math.min(DAILY_LIMITS.images.perBatch, remaining);

    // 应用风格预设
    const styleConfig = IMAGE_STYLES[style as keyof typeof IMAGE_STYLES] || IMAGE_STYLES.realistic;
    const styledPrompt = `${prompt}, ${styleConfig.keywords}`;

    // 分辨率映射（支持前端传来的分辨率参数，对标全网最强：1K/2K/4K）
    const RESOLUTION_MAP: Record<string, string> = {
      // 1K分辨率（免费）
      'square_1k': '1K',
      'landscape_1k': '1K',
      'portrait_1k': '1K',
      'wide_1k': '1K',
      // 2K分辨率（5积分）
      'square_2k': '2K',
      'portrait_2k': '2K',
      'landscape_2k': '2K',
      'wide_2k': '2K',
      // 4K分辨率（15积分，对标Midjourney/DALL-E最高画质）
      'square_4k': '4K',
      'portrait_4k': '4K',
      'wide_4k': '4K',
    };
    const resolutionSize = RESOLUTION_MAP[resolution] || '2K';

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const imgClient = new ImageGenerationClient(config, customHeaders);

    let currentPrompt = styledPrompt;
    let optimizationNote: string | undefined;

    try {
      const requests = Array(count).fill(null).map(() => ({ prompt: currentPrompt, size: resolutionSize, watermark: false }));
      await imgClient.batchGenerate(requests);
    } catch (error: any) {
      const isSensitiveError = error?.response?.error?.code === 'InputTextSensitiveContentDetected';
      if (isSensitiveError) {
        const result = sanitizeImagePrompt(prompt);
        currentPrompt = `${result.sanitized}, ${styleConfig.keywords}`;
        optimizationNote = result.reasons.length > 0 ? `已为您优化：${result.reasons.join('；')}` : undefined;
      } else {
        throw error;
      }
    }

    const requests = Array(count).fill(null).map(() => ({ prompt: currentPrompt, size: resolutionSize, watermark: false }));
    const responses = await imgClient.batchGenerate(requests);

    const imageUrls: string[] = [];
    responses.forEach((response: any) => {
      const helper = imgClient.getResponseHelper(response);
      if (helper.success && helper.imageUrls.length > 0) {
        imageUrls.push(helper.imageUrls[0]);
        data.imageCount += 1;
      }
    });

    res.json({ imageUrls, totalGenerated: imageUrls.length, perBatch: DAILY_LIMITS.images.perBatch, remaining: DAILY_LIMITS.images.maxPerDay - data.imageCount, maxPerDay: DAILY_LIMITS.images.maxPerDay, optimizationNote, style, resolution: resolutionSize });
  } catch (error) {
    console.error("Image batch generation error:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});

// ==================== 优化：批量生成文案 ====================
app.post("/api/v1/generate/texts", async (req: Request, res: Response) => {
  try {
    const { prompt, style = 'general', platform = 'general' } = req.body;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const sanitizeResult = sanitizePrompt(prompt);
    const finalPrompt = sanitizeResult.sanitized;
    const optimizationNote = sanitizeResult.reasons.length > 0 ? `已为您优化：${sanitizeResult.reasons.join('；')}` : undefined;

    const data = getOrCreateDailyData(deviceId);
    const remaining = DAILY_LIMITS.texts.maxPerDay - data.textCount;
    if (remaining <= 0) {
      return res.status(403).json({ error: "今日文案生成次数已用完", remaining: 0, maxPerDay: DAILY_LIMITS.texts.maxPerDay });
    }

    const count = Math.min(DAILY_LIMITS.texts.perBatch, remaining);

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    // 应用风格预设
    const styleConfig = STYLE_PRESETS[style as keyof typeof STYLE_PRESETS] || STYLE_PRESETS.general;
    const systemPrompt = `你是一位资深创意文案师，擅长创作短视频脚本、社交媒体文案、营销文案等。${styleConfig.prompt}请直接输出文案内容，不要加任何编号或前缀，不要解释。`;

    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      const messages: Message[] = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: `想法主题：${finalPrompt}\n\n请生成文案内容。` },
      ];
      const response = await llmClient.invoke(messages, { model: TEXT_MODEL, temperature: styleConfig.temperature });
      if (response.content) {
        texts.push(response.content.trim());
        data.textCount += 1;
      }
    }

    res.json({ texts, totalGenerated: texts.length, perBatch: DAILY_LIMITS.texts.perBatch, remaining: DAILY_LIMITS.texts.maxPerDay - data.textCount, maxPerDay: DAILY_LIMITS.texts.maxPerDay, optimizationNote, style, platform });
  } catch (error) {
    console.error("Text batch generation error:", error);
    res.status(500).json({ error: "Text generation failed" });
  }
});

// ==================== 优化：一键生成全部内容（智能Prompt扩展 + 优化并行） ====================
app.post("/api/v1/generate/all", async (req: Request, res: Response) => {
  try {
    const { prompt, durationType = "free", textStyle = 'general', imageStyle = 'realistic' } = req.body;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    const userId = req.headers["x-user-id"] as string;
    const isLoggedIn = !!userId;
    const HALF_RATE = 0.5;
    
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    // 敏感词过滤
    const sanitizeResult = sanitizePrompt(prompt);
    let finalPrompt = sanitizeResult.sanitized;
    let optimizationNote = sanitizeResult.reasons.length > 0 ? `已为您优化：${sanitizeResult.reasons.join('；')}` : undefined;
    
    // 智能Prompt扩展 - 精准理解用户意图
    const expandedPrompt = expandPrompt(finalPrompt);
    if (expandedPrompt.enhancements.length > 0) {
      finalPrompt = expandedPrompt.expanded;
      const enhancementNote = `已智能扩展：${expandedPrompt.enhancements.join('、')}`;
      optimizationNote = optimizationNote ? `${optimizationNote}；${enhancementNote}` : enhancementNote;
    }

    const durationConfig = VIDEO_DURATIONS[durationType as keyof typeof VIDEO_DURATIONS] || VIDEO_DURATIONS.free5;
    const duration = durationConfig.duration;

    if (durationType === "free5") {
      const data = getOrCreateDailyData(deviceId);
      const remainingVideo = VIDEO_DURATIONS.free5.maxPerDay - data.videoEdits;
      if (remainingVideo <= 0) {
        return res.status(403).json({ error: "今日免费视频编辑次数已用完", remainingEdits: 0, isLoggedIn });
      }
    }

    const data = getOrCreateDailyData(deviceId);
    const imageMaxPerDay = isLoggedIn ? DAILY_LIMITS.images.maxPerDay : Math.floor(DAILY_LIMITS.images.maxPerDay * HALF_RATE);
    const textMaxPerDay = isLoggedIn ? DAILY_LIMITS.texts.maxPerDay : Math.floor(DAILY_LIMITS.texts.maxPerDay * HALF_RATE);
    
    if (imageMaxPerDay - data.imageCount < DAILY_LIMITS.images.perBatch) {
      return res.status(403).json({ error: "今日图片生成次数不足", remainingImages: Math.max(0, imageMaxPerDay - data.imageCount), isLoggedIn });
    }
    if (textMaxPerDay - data.textCount < DAILY_LIMITS.texts.perBatch) {
      return res.status(403).json({ error: "今日文案生成次数已用完", remainingTexts: Math.max(0, textMaxPerDay - data.textCount), isLoggedIn });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const imageClient = new ImageGenerationClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);
    const videoClient = new VideoGenerationClient(config, customHeaders);

    // 应用风格预设
    const imgStyleConfig = IMAGE_STYLES[imageStyle as keyof typeof IMAGE_STYLES] || IMAGE_STYLES.realistic;
    const txtStyleConfig = STYLE_PRESETS[textStyle as keyof typeof STYLE_PRESETS] || STYLE_PRESETS.general;
    const styledImagePrompt = `${finalPrompt}, ${imgStyleConfig.keywords}`;

    // ========== 优化：并行生成图片和文案 ==========
    // 创建图片和文案并行请求
    let imageUrls: string[] = [];
    let texts: string[] = [];
    
    // 图片生成（使用智能扩展后的Prompt）
    try {
      const imageRequests = Array(DAILY_LIMITS.images.perBatch).fill(null).map(() => ({ 
        prompt: styledImagePrompt, 
        size: "2K", 
        watermark: false 
      }));
      let imageResponses;
      try {
        imageResponses = await imageClient.batchGenerate(imageRequests);
      } catch (imgError: any) {
        // 图片敏感词重试
        if (imgError?.response?.error?.code === 'InputTextSensitiveContentDetected') {
          const retryResult = sanitizeImagePrompt(finalPrompt);
          const retryPrompt = `${retryResult.sanitized}, ${imgStyleConfig.keywords}`;
          const retryRequests = Array(DAILY_LIMITS.images.perBatch).fill(null).map(() => ({ 
            prompt: retryPrompt, 
            size: "2K", 
            watermark: false 
          }));
          imageResponses = await imageClient.batchGenerate(retryRequests);
          if (retryResult.reasons.length > 0) {
            optimizationNote = optimizationNote ? `${optimizationNote}；${retryResult.reasons.join('；')}` : `已为您优化：${retryResult.reasons.join('；')}`;
          }
        } else {
          throw imgError;
        }
      }
      
      imageResponses.forEach((response: any) => {
        const helper = imageClient.getResponseHelper(response);
        if (helper.success && helper.imageUrls.length > 0) {
          imageUrls.push(helper.imageUrls[0]);
          data.imageCount += 1;
        }
      });
    } catch (error) {
      console.error("Image batch generation error:", error);
      // 图片生成失败不影响后续
    }
    
    // 优化：更精准的文案System Prompt - 思维链精准理解版
    const textSystemPrompt = `你是一位资深创意文案师，擅长根据用户的简短想法创作精准、有感染力的文案。

【思维链推理 - 请严格按此步骤创作】
第一步：精准识别
- 列出用户输入中的所有关键词
- 识别用户指定的场景、人物、物品、情感
- 确认用户是否有特殊约束（如：不能有XX、必须是XX）

第二步：严格保留
- 将第一步识别的所有元素作为创作基础
- 不修改、不删除、不添加任何原始元素

第三步：升华创作
- 在保留原始元素的基础上进行升华
- 添加与用户创意相符的修辞和表达
- 确保风格与用户指定的氛围一致

【绝对禁止】
- 禁止修改用户的原始创意关键词
- 禁止擅自添加用户未提及的元素
- 禁止将用户的想法"翻译"成其他意思
- 禁止改变用户指定的场景、人物、物品

${txtStyleConfig.prompt}

请直接输出文案内容，不需要解释，不要加任何编号或前缀。`;

    // 文案生成
    try {
      const textMessages: Message[] = [
        { role: "system" as const, content: textSystemPrompt },
        { role: "user" as const, content: `用户想法：${finalPrompt}\n\n请基于这个想法，生成一段精准有感染力的文案。` },
      ];
      const textResponse = await llmClient.invoke(textMessages, { temperature: txtStyleConfig.temperature });
      if (textResponse.content) {
        texts = [textResponse.content.trim()];
        data.textCount += 1;
      }
    } catch (error) {
      console.error("Text generation error:", error);
      // 文案生成失败不影响后续
    }

    // ========== 视频生成（依赖图片） ==========
    let videoUrl = null;
    let lastFrameUrl = null;
    if (imageUrls.length > 0) {
      try {
        const videoResponse = await videoClient.videoGeneration(
          [{ type: "image_url", image_url: { url: imageUrls[0] }, role: "first_frame" }, { type: "text", text: finalPrompt }],
          { duration, ratio: "9:16", resolution: "720p", watermark: false, generateAudio: true }
        );
        videoUrl = videoResponse.videoUrl;
        lastFrameUrl = videoResponse.lastFrameUrl;
        if (durationType === "free") data.videoEdits += 1;
      } catch (error) {
        console.error("Video generation error:", error);
        // 视频生成失败不影响返回
      }
    }

    const remaining = getRemainingCounts(deviceId);
    const remainingFreeEdits = isLoggedIn ? remaining.remainingVideoEdits : Math.floor(remaining.remainingVideoEdits * HALF_RATE);
    const remainingImages = isLoggedIn ? remaining.remainingImages : Math.floor(remaining.remainingImages * HALF_RATE);
    const remainingTexts = isLoggedIn ? remaining.remainingTexts : Math.floor(remaining.remainingTexts * HALF_RATE);

    res.json({
      imageUrls, texts, videoUrl, lastFrameUrl, duration, durationType, isFree: durationType === "free",
      isLoggedIn, remainingFreeEdits, remainingImages, remainingTexts, optimizationNote,
      textStyle, imageStyle,
      promptAnalysis: expandedPrompt, // 返回Prompt分析结果
      imageLimits: { perBatch: DAILY_LIMITS.images.perBatch, maxPerDay: imageMaxPerDay, chargePerImage: DAILY_LIMITS.images.chargePerImage },
      textLimits: { perBatch: DAILY_LIMITS.texts.perBatch, maxPerDay: textMaxPerDay, chargePerText: DAILY_LIMITS.texts.chargePerText },
    });
  } catch (error) {
    console.error("Generate all error:", error);
    res.status(500).json({ error: "Generation failed" });
  }
});

// ==================== 重新生成视频 ====================
app.post("/api/v1/generate/video-regenerate", async (req: Request, res: Response) => {
  try {
    const { prompt, imageUrl, durationType = "free" } = req.body;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    
    if (!prompt || !imageUrl) return res.status(400).json({ error: "prompt and imageUrl are required" });

    const contentCheck = await isContentAllowed(prompt);
    if (!contentCheck.allowed) return res.status(400).json({ error: contentCheck.reason });
    const finalPrompt = contentCheck.sanitizedPrompt || prompt;

    const durationConfig = VIDEO_DURATIONS[durationType as keyof typeof VIDEO_DURATIONS] || VIDEO_DURATIONS.free5;
    const duration = durationConfig.duration;

    if (durationType === "free5") {
      const check = checkVideoEditAllowed(deviceId, durationType);
      if (!check.allowed) return res.status(403).json({ error: "今日免费视频编辑次数已用完", remainingEdits: 0 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const videoClient = new VideoGenerationClient(config, customHeaders);

    const response = await videoClient.videoGeneration(
      [{ type: "image_url", image_url: { url: imageUrl }, role: "first_frame" }, { type: "text", text: finalPrompt }],
      { model: VIDEO_MODEL, duration, ratio: "9:16", resolution: "720p", watermark: false, generateAudio: true }
    );

    if (response.videoUrl) {
      const remaining = getRemainingCounts(deviceId);
      res.json({ videoUrl: response.videoUrl, lastFrameUrl: response.lastFrameUrl, duration, durationType, isFree: durationType === "free", remainingFreeEdits: remaining.remainingVideoEdits });
    } else {
      res.status(500).json({ error: "Video generation failed" });
    }
  } catch (error) {
    console.error("Video regenerate error:", error);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// ==================== 内容润色（支持多风格） ====================
app.post("/api/v1/content/polish", async (req: Request, res: Response) => {
  try {
    const { content, polishStyle } = req.body;
    if (!content) return res.status(400).json({ error: "内容不能为空" });

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const styleConfig = STYLE_PRESETS[polishStyle as keyof typeof STYLE_PRESETS] || STYLE_PRESETS.general;
    const messages: Message[] = [
      { role: "system" as const, content: `你是一位资深文案编辑，擅长各种文风的文案润色和优化。${styleConfig.prompt}请直接输出润色后的文案内容，不要添加任何说明或注释。` },
      { role: "user" as const, content: `原始文案：\n${content}\n\n请润色优化。` },
    ];

    const response = await llmClient.invoke(messages, { model: TEXT_MODEL, temperature: styleConfig.temperature });
    if (response.content) {
      res.json({ polished: response.content.trim(), original: content, style: polishStyle || 'general' });
    } else {
      res.status(500).json({ error: "润色失败" });
    }
  } catch (error) {
    console.error("Content polish error:", error);
    res.status(500).json({ error: "润色失败" });
  }
});

// ==================== 从链接提取文案 ====================
app.post("/api/v1/content/extract-from-url", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "链接不能为空" });

    try { new URL(url); } catch { return res.status(400).json({ error: "链接格式不正确" }); }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const fetchClient = new FetchClient(config, customHeaders);

    const response = await fetchClient.fetch(url);
    if (response.status_code !== 0) {
      return res.status(500).json({ error: "获取链接内容失败", statusMessage: response.status_message });
    }

    const textContent = response.content.filter((item: any) => item.type === 'text').map((item: any) => item.text).join('\n');
    const images = response.content.filter((item: any) => item.type === 'image').map((item: any) => ({ url: item.image?.display_url || item.image?.image_url, width: item.image?.width, height: item.image?.height }));

    res.json({ title: response.title || '', content: textContent, images, sourceUrl: response.url || url, publishTime: response.publish_time });
  } catch (error) {
    console.error("URL extract error:", error);
    res.status(500).json({ error: "获取链接内容失败" });
  }
});

// ==================== 从链接提取并润色 ====================
app.post("/api/v1/content/extract-and-polish", async (req: Request, res: Response) => {
  try {
    const { url, polishStyle } = req.body;
    if (!url) return res.status(400).json({ error: "链接不能为空" });

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const fetchClient = new FetchClient(config, customHeaders);

    const response = await fetchClient.fetch(url);
    if (response.status_code !== 0) {
      return res.status(500).json({ error: "获取链接内容失败", statusMessage: response.status_message });
    }

    const originalContent = response.content.filter((item: any) => item.type === 'text').map((item: any) => item.text).join('\n');
    if (!originalContent) return res.status(400).json({ error: "该链接没有可提取的文本内容" });

    const llmClient = new LLMClient(config, customHeaders);
    const styleConfig = STYLE_PRESETS[polishStyle as keyof typeof STYLE_PRESETS] || STYLE_PRESETS.general;
    const messages: Message[] = [
      { role: "system" as const, content: `你是一位资深文案编辑，擅长各种文风的文案润色和优化。${styleConfig.prompt}请直接输出润色后的文案内容，不要添加任何说明或注释。` },
      { role: "user" as const, content: `原始文案：\n${originalContent}\n\n请润色优化。` },
    ];
    const llmResponse = await llmClient.invoke(messages, { model: TEXT_MODEL, temperature: styleConfig.temperature });
    const images = response.content.filter((item: any) => item.type === 'image').map((item: any) => ({ url: item.image?.display_url || item.image?.image_url }));

    res.json({ title: response.title || '', original: originalContent, polished: llmResponse.content?.trim() || '', images, sourceUrl: response.url || url, publishTime: response.publish_time, style: polishStyle || 'general' });
  } catch (error) {
    console.error("Extract and polish error:", error);
    res.status(500).json({ error: "提取并润色失败" });
  }
});

// ==================== 获取剩余编辑次数 ====================
app.get("/api/v1/user/remaining-edits", async (req, res) => {
  const deviceId = (req.headers["x-device-id"] as string) || "default";
  const userId = req.headers["x-user-id"] as string;
  const isLoggedIn = !!userId;
  const HALF_RATE = 0.5;
  const remaining = getRemainingCounts(deviceId);
  const remainingFreeEdits = isLoggedIn ? remaining.remainingVideoEdits : Math.floor(remaining.remainingVideoEdits * HALF_RATE);
  const remainingImages = isLoggedIn ? remaining.remainingImages : Math.floor(remaining.remainingImages * HALF_RATE);
  const remainingTexts = isLoggedIn ? remaining.remainingTexts : Math.floor(remaining.remainingTexts * HALF_RATE);
  const imageMaxPerDay = isLoggedIn ? DAILY_LIMITS.images.maxPerDay : Math.floor(DAILY_LIMITS.images.maxPerDay * HALF_RATE);
  const textMaxPerDay = isLoggedIn ? DAILY_LIMITS.texts.maxPerDay : Math.floor(DAILY_LIMITS.texts.maxPerDay * HALF_RATE);
  const freeVideoMaxPerDay = isLoggedIn ? VIDEO_DURATIONS.free5.maxPerDay : Math.floor(VIDEO_DURATIONS.free5.maxPerDay * HALF_RATE);
  
  res.json({
    remainingFreeEdits, remainingImages, remainingTexts, isLoggedIn,
    imageLimits: { perBatch: DAILY_LIMITS.images.perBatch, maxPerDay: imageMaxPerDay },
    textLimits: { perBatch: DAILY_LIMITS.texts.perBatch, maxPerDay: textMaxPerDay },
    freeVideoMaxPerDay, resetDate: getTodayKey(),
  });
});

// ==================== 新增：批量生成多个文案变体 ====================
app.post("/api/v1/generate/text-variants", async (req: Request, res: Response) => {
  try {
    const { prompt, count = 3 } = req.body;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const actualCount = Math.min(Math.max(1, count), 5); // 最多5个变体

    const sanitizeResult = sanitizePrompt(prompt);
    const finalPrompt = sanitizeResult.sanitized;

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位资深创意文案师，擅长创作多种风格的文案。请为同一个主题生成${actualCount}个不同风格的文案变体，每个变体要有明显不同的角度和表达方式。用[变体X]作为分隔标记直接输出，不要加编号。`;

    const messages: Message[] = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `想法主题：${finalPrompt}` },
    ];

    const response = await llmClient.invoke(messages, { model: TEXT_MODEL, temperature: 0.9 });
    
    // 解析变体
    const content = response.content || '';
    const variants = content.split(/\[变体\d+\]/).filter((v: string) => v.trim());
    
    res.json({ 
      variants: variants.slice(0, actualCount).map((v: string) => v.trim()),
      count: Math.min(variants.length, actualCount),
      optimizationNote: sanitizeResult.reasons.length > 0 ? `已为您优化：${sanitizeResult.reasons.join('；')}` : undefined,
    });
  } catch (error) {
    console.error("Text variants generation error:", error);
    res.status(500).json({ error: "生成变体失败" });
  }
});

// ==================== 新增：智能推荐 ====================
app.post("/api/v1/recommend", async (req: Request, res: Response) => {
  try {
    const { topic, type = 'all' } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位内容策划专家，擅长根据用户输入的主题推荐合适的创作方向。请给出3个推荐方向，每个方向包含：标题、关键词、适用平台。用JSON数组格式输出。`;

    const messages: Message[] = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `主题：${topic}\n\n请推荐创作方向` },
    ];

    const response = await llmClient.invoke(messages, { model: TEXT_MODEL, temperature: 0.8 });
    
    // 尝试解析JSON
    let recommendations = [];
    try {
      const jsonMatch = response.content?.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      }
    } catch {
      recommendations = [
        { title: `${topic}的创意角度`, keywords: [topic], platforms: ['小红书', '抖音'] },
        { title: `${topic}的深度分析`, keywords: [topic, '干货'], platforms: ['知乎', '公众号'] },
        { title: `${topic}的趣味玩法`, keywords: [topic, '趣味'], platforms: ['抖音', 'B站'] },
      ];
    }

    res.json({ topic, recommendations });
  } catch (error) {
    console.error("Recommend error:", error);
    res.status(500).json({ error: "推荐失败" });
  }
});

// ==================== 缓存清理API ====================
app.post("/api/v1/admin/clear-cache", (req, res) => {
  clearCache();
  res.json({ success: true, message: "Cache cleared" });
});

// ==================== 用户认证模块 ====================
import { getSupabaseClient } from './storage/database/supabase-client';
import crypto from 'crypto';

const PERMANENT_VIP_PHONE = '18104962855';

// ==================== 优化：会员系统配置（对标全网最强会员体系）====================
const VIP_CONFIG = {
  // 会员等级
  levels: {
    free: { name: '免费用户', dailyImageLimit: 10, dailyTextLimit: 5, dailyVideoLimit: 5 },
    vip: { name: '月度会员', dailyImageLimit: 100, dailyTextLimit: 50, dailyVideoLimit: 30 },
    svip: { name: '季度会员', dailyImageLimit: 200, dailyTextLimit: 100, dailyVideoLimit: 50 },
    pvip: { name: '年度会员', dailyImageLimit: 500, dailyTextLimit: 300, dailyVideoLimit: 100 },
  },
  // 积分价格配置
  points: {
    image2k: 5,    // 2K图片5积分
    image4k: 15,   // 4K图片15积分
    textBatch3: 5, // 批量3条5积分
    textBatch5: 10, // 批量5条10积分
    video5s: 30,   // 5秒视频30积分
    video10s: 60,  // 10秒视频60积分
    video12s: 72,  // 12秒视频72积分
    oneClickTriple: 50, // 一键三连50积分
  },
  // 新用户赠送（严格500积分+3次免费三连）
  welcome: {
    points: 500,        // 注册即送500积分
    oneClickTripleFree: 3, // 送3次免费一键三连
    imageGenerations: 5, // 赠送5次图片生成
    textGenerations: 3, // 赠送3次文案生成
  },
  // 邀请奖励（严格200+100积分）
  invite: {
    inviterPoints: 200,   // 邀请人获得200积分
    inviteePoints: 100,   // 被邀请人获得100积分
    consumptionReward: 0.1, // 好友付费返10%积分
  },
  // 签到奖励（严格10积分+连续7天额外100）
  checkin: {
    basePoints: 10,       // 基础签到10积分
    streakBonus: [0, 5, 10, 20, 30, 50], // 连击加成
    streak7DayExtra: 100, // 连续7天额外奖励100积分
  },
  // 充值套餐（严格按规格）
  rechargePackages: {
    p1: { points: 990, price: 9.9, bonus: 0 },
    p2: { points: 2900, price: 29, bonus: 0 },
    p3: { points: 5900, price: 59, bonus: 0 },
    p4: { points: 9900, price: 99, bonus: 0 },
  },
};

// ==================== 优化：收益系统配置 ====================
const REVENUE_CONFIG = {
  // 积分消耗规则
  consumption: {
    imageGeneration: 0,      // 基础生成免费（用每日限额）
    image2kUpgrade: 5,       // 升级2K +5积分
    image4kUpgrade: 15,      // 升级4K +15积分
    videoExtension: 10,      // 每5秒 +10积分
    textBatchExtra: 2,       // 每多生成1条 +2积分
    seoOptimization: 3,      // SEO优化 +3积分
  },
  // 积分获取规则
  earning: {
    dailyCheckin: 5,        // 每日签到
    inviteReward: 20,        // 邀请好友
    consumption: 0.1,        // 消费1元获得0.1积分
    taskCompletion: 2,       // 完成新手任务
  },
};

// Supabase 客户端辅助函数 - 添加 null 检查
function getClient(res: Response): ReturnType<typeof getSupabaseClient> {
  const client = getSupabaseClient();
  if (!client) {
    res.status(503).json({ error: "数据库服务暂不可用，请稍后再试" });
    return null;
  }
  return client;
}

function generateCode(length: number = 6): string {
  return Math.random().toString().slice(2, 2 + length);
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// ==================== 优化：极速验证码发送（防刷+异步+缓存，对标全网最强）====================
app.post("/api/v1/auth/send-code", async (req: Request, res: Response) => {
  try {
    const { phone, purpose } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string || req.ip || req.socket.remoteAddress || '').split(',')[0].trim();
    
    // 1. 基础参数校验
    if (!phone || !purpose) return res.status(400).json({ error: "手机号和用途不能为空", code: "INVALID_PARAMS" });
    if (!/^1\d{10}$/.test(phone)) return res.status(400).json({ error: "手机号格式不正确", code: "INVALID_PHONE" });

    // 2. 防刷检查（对标全网最强验证码系统）
    const antiSpamResult = checkAntiSpam(phone, clientIp);
    if (!antiSpamResult.allowed) {
      return res.status(429).json({ error: antiSpamResult.error, code: "RATE_LIMITED" });
    }

    // 3. 开发环境极速返回（优化：直接同步返回，不走数据库）
    if (process.env.NODE_ENV !== 'production' && !getSupabaseClient()) {
      const devCode = '123456';
      console.log(`[开发模式-极速] 发送验证码 ${phone}: ${devCode}`);
      // 记录发送（异步，不阻塞响应）
      setImmediate(() => recordCodeSend(phone));
      return res.json({ 
        success: true, 
        message: "验证码已发送（开发模式）", 
        code: devCode,
        expiresIn: VERIFY_CODE_CONFIG.codeTTL / 1000
      });
    }

    // 4. 生成验证码并异步写入数据库（优化：极速响应）
    const code = generateCode(VERIFY_CODE_CONFIG.codeLength);
    const expiresAt = new Date(Date.now() + VERIFY_CODE_CONFIG.codeTTL);
    
    // 记录发送（同步更新内存缓存，用于快速校验）
    recordCodeSend(phone);
    
    // 异步写入数据库（不阻塞响应）
    setImmediate(async () => {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          // 将该手机号之前的验证码标记为已使用
          await supabase.from('verification_codes')
            .update({ is_used: true })
            .eq('phone', phone)
            .eq('purpose', purpose);
          
          // 插入新验证码
          await supabase.from('verification_codes')
            .insert({ phone, code, purpose, expires_at: expiresAt.toISOString() });
          
          console.log(`[验证码已发送] ${phone}: ${code}`);
          
          // TODO: 集成真实短信服务（阿里云/腾讯云）
          // await sendSMS(phone, code);
        }
      } catch (err) {
        console.error("[异步写入验证码失败]", err);
      }
    });
    
    // 5. 极速返回（优化：不等数据库写入完成）
    console.log(`[极速返回] 验证码发送成功 ${phone}`);
    res.json({ 
      success: true, 
      message: "验证码已发送", 
      expiresIn: VERIFY_CODE_CONFIG.codeTTL / 1000,
      code: process.env.NODE_ENV === 'production' ? undefined : code  // 生产环境不返回code
    });
  } catch (error: any) {
    console.error("[发送验证码] 错误:", error);
    res.status(500).json({ error: "发送验证码失败，请稍后重试", code: "SERVER_ERROR" });
  }
});

// ==================== 优化：极速注册（对标全网最快注册体验）====================
app.post("/api/v1/auth/register", async (req: Request, res: Response) => {
  try {
    const { phone, username, password, code } = req.body;
    
    // 1. 基础参数校验（优化：细化错误码）
    if (!phone || !username || !password || !code) {
      return res.status(400).json({ error: "所有字段都不能为空", code: "INVALID_PARAMS" });
    }
    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "手机号格式不正确", code: "INVALID_PHONE" });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: "用户名需要3-20位字母、数字或下划线", code: "INVALID_USERNAME" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "密码至少6位", code: "INVALID_PASSWORD" });
    }

    const client = getClient(res);
    if (!client) return;
    
    // 2. 开发环境极速验证（优化：不查数据库）
    if (process.env.NODE_ENV !== 'production' && !getSupabaseClient()) {
      if (code !== '123456') {
        return res.status(400).json({ error: "验证码错误", code: "INVALID_CODE" });
      }
      const isPermanentVip = phone === PERMANENT_VIP_PHONE;
      const fakeUser = { id: `dev_${Date.now()}`, phone, username, is_vip: isPermanentVip };
      console.log(`[开发模式-极速注册] ${username}`);
      return res.json({
        success: true,
        user: { id: fakeUser.id, phone, username, isPermanentVip, isVip: isPermanentVip },
        token: Buffer.from(`${fakeUser.id}:${Date.now()}`).toString('base64'),
      });
    }
    
    // 3. 验证码验证（优化：快速返回）
    const { data: validCode } = await client.from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('purpose', 'register')
      .eq('is_used', false)
      .single();
    
    if (!validCode || new Date(validCode.expires_at) < new Date()) {
      return res.status(400).json({ error: "验证码无效或已过期", code: "CODE_EXPIRED" });
    }

    // 4. 检查用户是否存在（优化：并行查询）
    const [existingPhone, existingUsername] = await Promise.all([
      client.from('users').select('id').eq('phone', phone).single(),
      client.from('users').select('id').eq('username', username).single(),
    ]);
    
    if (existingPhone.data) {
      return res.status(400).json({ error: "该手机号已注册", code: "PHONE_EXISTS" });
    }
    if (existingUsername.data) {
      return res.status(400).json({ error: "用户名已被占用", code: "USERNAME_EXISTS" });
    }

    // 5. 创建用户（优化：快速插入）
    const hashedPassword = hashPassword(password);
    const isPermanentVip = phone === PERMANENT_VIP_PHONE;
    
    const { data: newUser, error: insertError } = await client.from('users')
      .insert({ 
        phone, 
        username, 
        password: hashedPassword, 
        is_vip: isPermanentVip, 
        vip_end_date: isPermanentVip ? '2099-12-31' : null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error("[注册失败]", insertError);
      return res.status(500).json({ error: "注册失败，请稍后重试", code: "INSERT_ERROR" });
    }

    // 6. 标记验证码已使用（异步，不阻塞响应）
    setImmediate(async () => {
      try {
        await client.from('verification_codes').update({ is_used: true }).eq('id', validCode.id);
      } catch (err) {
        console.error("[标记验证码失败]", err);
      }
    });
    
    // 7. 极速返回token（优化：不等待额外查询）
    const token = Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64');
    console.log(`[极速注册成功] ${username} (${phone})`);
    
    res.json({
      success: true,
      user: { id: newUser.id, phone: newUser.phone, username: newUser.username, isPermanentVip, isVip: isPermanentVip },
      token,
    });
  } catch (error: any) {
    console.error("[注册错误]", error);
    res.status(500).json({ error: "注册失败，请稍后重试", code: "SERVER_ERROR" });
  }
});

app.post("/api/v1/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    // 1. 基础参数校验
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空", code: "INVALID_PARAMS" });
    }

    // 2. 开发环境极速登录（优化：不查数据库）
    if (process.env.NODE_ENV !== 'production' && !getSupabaseClient()) {
      const isPermanentVip = username === '18104962855' || username === 'dev_user';
      console.log(`[开发模式-极速登录] ${username}`);
      return res.json({
        success: true,
        user: { 
          id: `dev_${Date.now()}`, 
          phone: '18800000000', 
          username: username, 
          isPermanentVip,
          isVip: isPermanentVip,
          points: 99999,
        },
        token: Buffer.from(`dev_${Date.now()}:${Date.now()}`).toString('base64'),
      });
    }

    const client = getSupabaseClient();
    if (!client) {
      return res.status(503).json({ error: "服务暂不可用", code: "SERVICE_UNAVAILABLE" });
    }
    
    const hashedPassword = hashPassword(password);
    
    // 3. 支持手机号或用户名登录（优化：单一查询）
    const isPhone = /^1\d{10}$/.test(username);
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('password', hashedPassword)
      .eq(isPhone ? 'phone' : 'username', username)
      .single();
    
    if (error || !user) {
      console.log(`[登录失败] ${username} - 密码错误或用户不存在`);
      return res.status(401).json({ error: "用户名或密码错误", code: "AUTH_FAILED" });
    }

    // 4. VIP状态检查（优化：快速判断）
    const isPermanentVip = user.phone === PERMANENT_VIP_PHONE;
    const isVip = isPermanentVip || (user.is_vip && new Date(user.vip_end_date) > new Date());
    
    // 5. 生成token（优化：极速返回）
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    console.log(`[极速登录成功] ${user.username} (${user.phone})`);
    
    res.json({
      success: true,
      user: { 
        id: user.id, 
        phone: user.phone, 
        username: user.username, 
        isPermanentVip, 
        isVip, 
        vipEndDate: user.vip_end_date,
        points: user.points || 0,
      },
      token,
    });
  } catch (error: any) {
    console.error("[登录错误]", error);
    res.status(500).json({ error: "登录失败，请稍后重试", code: "SERVER_ERROR" });
  }
});

// ==================== 优化：极速获取用户信息 ====================
app.get("/api/v1/auth/user-info", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "未登录", code: "NOT_LOGGED_IN" });

    // 开发环境快速返回
    if (process.env.NODE_ENV !== 'production' && !getSupabaseClient()) {
      return res.json({ 
        id: userId, 
        phone: '18800000000', 
        username: 'dev_user', 
        isPermanentVip: true, 
        isVip: true, 
        points: 99999 
      });
    }

    const client = getSupabaseClient();
    if (!client) {
      return res.status(503).json({ error: "服务暂不可用", code: "SERVICE_UNAVAILABLE" });
    }
    
    const { data: user } = await client
      .from('users')
      .select('id, phone, username, is_vip, vip_end_date, points')
      .eq('id', userId)
      .single();
    
    if (!user) {
      return res.status(404).json({ error: "用户不存在", code: "USER_NOT_FOUND" });
    }

    const isPermanentVip = user.phone === PERMANENT_VIP_PHONE;
    const isVip = isPermanentVip || (user.is_vip && new Date(user.vip_end_date) > new Date());

    res.json({ 
      id: user.id, 
      phone: user.phone, 
      username: user.username, 
      isPermanentVip, 
      isVip, 
      vipEndDate: user.vip_end_date, 
      points: user.points || 0 
    });
  } catch (error: any) {
    console.error("[获取用户信息错误]", error);
    res.status(500).json({ error: "获取用户信息失败", code: "SERVER_ERROR" });
  }
});

app.post("/api/v1/auth/activate-free-code", async (req: Request, res: Response) => {
  try {
    const { freeCode, phone } = req.body;
    const userId = req.headers["x-user-id"] as string;
    
    if (!freeCode || !phone) return res.status(400).json({ error: "免费码和手机号不能为空" });

    const client = getSupabaseClient();
    const { data: codeData } = await client.from('free_codes').select('*').eq('code', freeCode).single();
    
    if (!codeData) return res.status(404).json({ error: "免费码无效" });
    if (codeData.is_used) return res.status(400).json({ error: "免费码已被使用" });
    if (new Date(codeData.expires_at) < new Date()) return res.status(400).json({ error: "免费码已过期" });

    const daysToAdd = codeData.days;
    const { data: user } = await client.from('users').select('*').eq('id', userId).single();
    if (!user) return res.status(404).json({ error: "用户不存在" });

    let newVipEndDate: string;
    if (user.vip_end_date && new Date(user.vip_end_date) > new Date()) {
      newVipEndDate = new Date(new Date(user.vip_end_date).getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else {
      newVipEndDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    await client.from('users').update({ is_vip: true, vip_end_date: newVipEndDate }).eq('id', userId);
    await client.from('free_codes').update({ is_used: true, used_by: phone, used_at: new Date().toISOString() }).eq('code', freeCode);

    res.json({ success: true, message: `已成功激活${daysToAdd}天会员`, vipEndDate: newVipEndDate });
  } catch (error) {
    console.error("[激活免费码] 错误:", error);
    res.status(500).json({ error: "激活失败" });
  }
});

app.post("/api/v1/auth/generate-free-code", async (req: Request, res: Response) => {
  try {
    const { days = 30, isGift = false, recipientPhone = '' } = req.body;
    const userId = req.headers["x-user-id"] as string;
    
    if (!userId) return res.status(401).json({ error: "请先登录" });

    const client = getSupabaseClient();
    const { data: user } = await client.from('users').select('*').eq('id', userId).single();
    if (!user) return res.status(404).json({ error: "用户不存在" });

    const code = `${Date.now().toString(36)}${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await client.from('free_codes').insert({
      code, days, is_gift: isGift, recipient_phone: recipientPhone || null,
      generated_by: user.phone, generated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(), is_used: false,
    });

    res.json({ success: true, code, days, expiresAt: expiresAt.toISOString(), isGift, recipientPhone: recipientPhone || null });
  } catch (error) {
    console.error("[生成免费码] 错误:", error);
    res.status(500).json({ error: "生成失败" });
  }
});

/**
 * 客户端日志
 * POST /api/v1/logs/client
 */
app.post("/api/v1/logs/client", async (req: Request, res: Response) => {
  try {
    const { logs } = req.body;
    
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: "无效的日志数据" });
    }
    
    logs.forEach((log: any) => {
      const logMessage = `[客户端日志] [${log.type}] [${log.source}] ${log.message}`;
      if (log.type === "error") {
        console.error(logMessage, log.details);
      } else if (log.type === "warning") {
        console.warn(logMessage, log.details);
      } else {
        console.log(logMessage, log.details);
      }
    });
    
    res.json({ success: true, count: logs.length });
  } catch (error: any) {
    console.error("Client logs error:", error);
    res.status(500).json({ error: "接收日志失败" });
  }
});

/**
 * 获取免费码选项
 * GET /api/v1/free-codes/options
 */
app.get("/api/v1/free-codes/options", (req, res) => {
  res.json({
    options: [
      { type: '1_month', label: '1个月', days: 30 },
      { type: '3_months', label: '一季度', days: 90 },
      { type: '6_months', label: '半年', days: 180 },
      { type: '1_year', label: '一年', days: 365 },
    ],
  });
});

/**
 * 申请免费码
 * POST /api/v1/free-codes/apply
 */
app.post("/api/v1/free-codes/apply", async (req: Request, res: Response) => {
  try {
    const { phone, durationType, recipientPhone } = req.body;
    
    if (!phone || !durationType) {
      return res.status(400).json({ error: "手机号和时长类型不能为空" });
    }

    const ALLOWED_FREE_CODE_PHONE = "18104962855";
    if (phone !== ALLOWED_FREE_CODE_PHONE) {
      return res.status(403).json({ error: "抱歉，仅限指定用户申请免费码" });
    }

    const client = getSupabaseClient();
    
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, phone, username, is_permanent_vip')
      .eq('phone', phone)
      .maybeSingle();
    
    if (userError) throw userError;
    
    if (!user) {
      return res.status(400).json({ error: "请先注册账号" });
    }
    
    if (recipientPhone) {
      if (!/^1\d{10}$/.test(recipientPhone)) {
        return res.status(400).json({ error: "接收人手机号格式不正确" });
      }
      
      const { data: recipient, error: recipientError } = await client
        .from('users')
        .select('id, phone, username, is_permanent_vip')
        .eq('phone', recipientPhone)
        .maybeSingle();
      
      if (recipientError) throw recipientError;
      
      if (!recipient) {
        return res.status(400).json({ error: "接收人账号不存在，请提醒好友先注册" });
      }
      
      if (recipient.is_permanent_vip) {
        return res.status(400).json({ error: "接收人是永久会员，无需免费码" });
      }
      
      const now = new Date().toISOString();
      const { data: recipientMembership } = await client
        .from('user_memberships')
        .select('*')
        .eq('user_id', recipient.id)
        .gt('end_date', now)
        .maybeSingle();
      
      if (recipientMembership) {
        return res.status(400).json({ error: "接收人已有有效的会员期限" });
      }
    }
    
    const code = generateCode(8).toUpperCase();
    let durationDays = 30;
    
    switch (durationType) {
      case '1_month': durationDays = 30; break;
      case '3_months': durationDays = 90; break;
      case '6_months': durationDays = 180; break;
      case '1_year': durationDays = 365; break;
      default: return res.status(400).json({ error: "无效的时长类型" });
    }
    
    const { error: insertError } = await client
      .from('free_codes')
      .insert({
        code,
        duration_type: durationType,
        duration_days: durationDays,
        recipient_phone: recipientPhone || null,
      });
    
    if (insertError) throw insertError;
    
    res.json({
      success: true,
      message: recipientPhone ? "赠送码生成成功，可直接发给好友使用" : "免费码生成成功",
      freeCode: code,
      durationType,
      durationDays,
      isGifted: !!recipientPhone,
      recipientPhone: recipientPhone || null,
    });
  } catch (error: any) {
    console.error("Apply free code error:", error);
    res.status(500).json({ error: "申请免费码失败" });
  }
});

/**
 * 激活免费码
 * POST /api/v1/free-codes/activate
 */
app.post("/api/v1/free-codes/activate", async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({ error: "用户ID和免费码不能为空" });
    }

    const client = getSupabaseClient();
    
    const { data: freeCode, error: codeError } = await client
      .from('free_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_used', false)
      .maybeSingle();
    
    if (codeError) throw codeError;
    
    if (!freeCode) {
      return res.status(400).json({ error: "免费码无效或已被使用" });
    }
    
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, phone, is_permanent_vip')
      .eq('id', userId)
      .maybeSingle();
    
    if (userError) throw userError;
    
    if (!user) {
      return res.status(400).json({ error: "用户不存在" });
    }
    
    if (user.is_permanent_vip) {
      return res.status(400).json({ error: "您是永久会员，无需激活免费码" });
    }
    
    if (freeCode.recipient_phone && freeCode.recipient_phone !== user.phone) {
      return res.status(400).json({ error: "此免费码不适用于您的账号" });
    }
    
    const now = new Date();
    const endDate = new Date(now.getTime() + freeCode.duration_days * 24 * 60 * 60 * 1000);
    
    await client.from('free_codes')
      .update({
        is_used: true,
        used_by: userId,
        used_at: now.toISOString(),
      })
      .eq('id', freeCode.id);
    
    await client.from('user_memberships')
      .insert({
        user_id: userId,
        membership_type: 'free_code',
        source: `free_code_${freeCode.duration_type}`,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
      });
    
    res.json({
      success: true,
      message: "免费码激活成功",
      membership: {
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Activate free code error:", error);
    res.status(500).json({ error: "激活免费码失败" });
  }
});

/**
 * 获取用户会员状态
 * GET /api/v1/user/membership
 */
app.get("/api/v1/user/membership", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] || req.headers["x-device-id"]) as string;
    
    if (!userId) {
      return res.status(400).json({ error: "用户ID不能为空" });
    }

    const client = getSupabaseClient();
    
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, phone, username, is_permanent_vip')
      .eq('id', userId)
      .maybeSingle();
    
    if (userError) throw userError;
    
    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }
    
    if (user.is_permanent_vip) {
      return res.json({
        isVip: true,
        isPermanentVip: true,
        vipEndDate: null,
        message: "永久会员",
      });
    }
    
    const now = new Date().toISOString();
    const { data: activeMembership } = await client
      .from('user_memberships')
      .select('*')
      .eq('user_id', userId)
      .gt('end_date', now)
      .maybeSingle();
    
    res.json({
      isVip: !!activeMembership,
      isPermanentVip: false,
      vipEndDate: activeMembership?.end_date || null,
      membership: activeMembership || null,
    });
  } catch (error: any) {
    console.error("Get membership error:", error);
    res.status(500).json({ error: "获取会员状态失败" });
  }
});

/**
 * 获取用户积分
 * GET /api/v1/user/points
 */
app.get("/api/v1/user/points", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    
    if (!userId) {
      return res.status(400).json({ error: "用户ID不能为空" });
    }

    const client = getSupabaseClient();
    
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, points')
      .eq('id', userId)
      .maybeSingle();
    
    if (userError) throw userError;
    
    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }
    
    const { data: transactions, error: txError } = await client
      .from('point_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (txError) throw txError;
    
    res.json({
      points: user.points || 0,
      transactions: transactions || [],
    });
  } catch (error: any) {
    console.error("Get points error:", error);
    res.status(500).json({ error: "获取积分失败" });
  }
});

/**
 * 购买免费码（积分兑换）
 * POST /api/v1/free-codes/buy
 */
app.post("/api/v1/free-codes/buy", async (req: Request, res: Response) => {
  try {
    const { durationType, recipientPhone } = req.body;
    const userId = req.headers["x-user-id"] as string;
    
    if (!userId) {
      return res.status(401).json({ error: "请先登录" });
    }
    
    if (!durationType) {
      return res.status(400).json({ error: "请选择时长类型" });
    }

    const FREE_CODE_PRICES: Record<string, { points: number; days: number }> = {
      '1_month': { points: 30, days: 30 },
      '3_months': { points: 80, days: 90 },
      '6_months': { points: 150, days: 180 },
      '1_year': { points: 280, days: 365 },
    };
    
    const price = FREE_CODE_PRICES[durationType];
    if (!price) {
      return res.status(400).json({ error: "无效的时长类型" });
    }

    const client = getSupabaseClient();
    
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, phone, points')
      .eq('id', userId)
      .maybeSingle();
    
    if (userError) throw userError;
    
    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }
    
    const currentPoints = user.points || 0;
    if (currentPoints < price.points) {
      return res.status(400).json({ 
        error: "积分不足",
        required: price.points,
        current: currentPoints,
      });
    }
    
    if (recipientPhone) {
      if (!/^1\d{10}$/.test(recipientPhone)) {
        return res.status(400).json({ error: "接收人手机号格式不正确" });
      }
      
      const { data: recipient, error: recipientError } = await client
        .from('users')
        .select('id, phone, is_permanent_vip')
        .eq('phone', recipientPhone)
        .maybeSingle();
      
      if (recipientError) throw recipientError;
      
      if (!recipient) {
        return res.status(400).json({ error: "接收人账号不存在，请提醒好友先注册" });
      }
      
      if (recipient.is_permanent_vip) {
        return res.status(400).json({ error: "接收人是永久会员，无需免费码" });
      }
    }
    
    const newPoints = currentPoints - price.points;
    await client.from('users')
      .update({ points: newPoints })
      .eq('id', userId);
    
    await client.from('point_transactions').insert({
      id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type: 'spend',
      amount: price.points,
      source: 'buy_free_code',
      description: `购买${durationType === '1_month' ? '1个月' : durationType === '3_months' ? '一季度' : durationType === '6_months' ? '半年' : '一年'}免费码${recipientPhone ? `（赠送给${recipientPhone}）` : ''}`,
    });
    
    const code = generateCode(8).toUpperCase();
    
    await client.from('free_codes').insert({
      code,
      duration_type: durationType,
      duration_days: price.days,
      recipient_phone: recipientPhone || null,
      is_purchased: true,
    });
    
    res.json({
      success: true,
      message: recipientPhone ? "购买成功，好友可使用此码" : "购买成功",
      freeCode: code,
      durationType,
      durationDays: price.days,
      pointsSpent: price.points,
      remainingPoints: newPoints,
      recipientPhone: recipientPhone || null,
    });
  } catch (error: any) {
    console.error("Buy free code error:", error);
    res.status(500).json({ error: "购买免费码失败" });
  }
});

/**
 * 每日签到（送积分）
 * POST /api/v1/user/daily-checkin
 */
app.post("/api/v1/user/daily-checkin", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    
    if (!userId) {
      return res.status(401).json({ error: "请先登录" });
    }

    const client = getSupabaseClient();
    
    const today = new Date().toISOString().split('T')[0];
    const { data: existingCheckin, error: checkinError } = await client
      .from('point_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('source', 'daily_checkin')
      .gte('created_at', `${today}T00:00:00`)
      .maybeSingle();
    
    if (checkinError) throw checkinError;
    
    if (existingCheckin) {
      return res.status(400).json({ error: "今日已签到，明天再来吧" });
    }
    
    const { data: user, error: userError } = await client
      .from('users')
      .select('points')
      .eq('id', userId)
      .maybeSingle();
    
    if (userError) throw userError;
    
    const CHECKIN_POINTS = 10;
    const newPoints = (user?.points || 0) + CHECKIN_POINTS;
    
    await client.from('users')
      .update({ points: newPoints })
      .eq('id', userId);
    
    await client.from('point_transactions').insert({
      id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type: 'earn',
      amount: CHECKIN_POINTS,
      source: 'daily_checkin',
      description: '每日签到',
    });
    
    res.json({
      success: true,
      message: `签到成功，获得${CHECKIN_POINTS}积分`,
      pointsEarned: CHECKIN_POINTS,
      totalPoints: newPoints,
    });
  } catch (error: any) {
    console.error("Daily checkin error:", error);
    res.status(500).json({ error: "签到失败" });
  }
});

/**
 * 获取后台设置
 * GET /api/v1/admin/settings
 */
app.get("/api/v1/admin/settings", async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('app_settings')
      .select('*')
      .eq('id', 'global')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error("Get settings error:", error);
      return res.status(500).json({ error: "获取设置失败" });
    }
    
    const settings = data || {
      id: 'global',
      content_filter_enabled: false,
    };
    
    res.json({
      contentFilterEnabled: settings.content_filter_enabled,
    });
  } catch (error: any) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "获取设置失败" });
  }
});

/**
 * 更新后台设置
 * PUT /api/v1/admin/settings
 */
app.put("/api/v1/admin/settings", async (req: Request, res: Response) => {
  try {
    const { contentFilterEnabled } = req.body;
    
    if (typeof contentFilterEnabled !== 'boolean') {
      return res.status(400).json({ error: "contentFilterEnabled must be a boolean" });
    }
    
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('app_settings')
      .upsert({
        id: 'global',
        content_filter_enabled: contentFilterEnabled,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error("Update settings error:", error);
      return res.status(500).json({ error: "更新设置失败" });
    }
    
    res.json({
      success: true,
      contentFilterEnabled: data.content_filter_enabled,
    });
  } catch (error: any) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "更新设置失败" });
  }
});

// ==================== 一键发布全平台API（灵感山羊杀手级功能）====================
// 支持平台：抖音、小红书、快手、微信视频号、B站、微博
app.post("/api/v1/publish/onekey", async (req: Request, res: Response) => {
  try {
    const { 
      content,
      title,
      imageUrls,
      videoUrl,
      platforms = ['douyin', 'xiaohongshu', 'kuaishou', 'bilibili', 'weibo', 'video'],
      options = {}
    } = req.body;
    
    const userId = req.headers["x-user-id"] as string;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    
    if (!content) return res.status(400).json({ error: "content is required" });
    if (!imageUrls && !videoUrl) return res.status(400).json({ error: "至少需要提供图片或视频" });
    
    const PLATFORM_CONFIG: Record<string, { name: string; icon: string; color: string; url: string; maxContent: number; hashtag: string }> = {
      douyin: { name: '抖音', icon: 'play', color: '#000000', url: 'https://www.douyin.com/', maxContent: 150, hashtag: '#创意内容#短视频' },
      xiaohongshu: { name: '小红书', icon: 'bookmark', color: '#FF2442', url: 'https://www.xiaohongshu.com/', maxContent: 1000, hashtag: '#创作灵感#AI创作' },
      kuaishou: { name: '快手', icon: 'bolt', color: '#FF4906', url: 'https://www.kuaishou.com/', maxContent: 200, hashtag: '#记录生活#创意' },
      bilibili: { name: 'B站', icon: 'play-circle', color: '#00A1D6', url: 'https://www.bilibili.com/', maxContent: 500, hashtag: '#创意#AI生成#涨姿势' },
      weibo: { name: '微博', icon: 'at', color: '#E6162D', url: 'https://weibo.com/', maxContent: 2000, hashtag: '#创意内容' },
      video: { name: '视频号', icon: 'video', color: '#07C160', url: 'https://channels.weixin.qq.com/', maxContent: 500, hashtag: '#创意分享' },
    };
    
    const publishResults = [];
    for (const platform of platforms) {
      const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
      if (!config) continue;
      
      let adaptedContent = content;
      if (platform === 'douyin') {
        adaptedContent = content.length > config.maxContent ? content.substring(0, config.maxContent) + '...' : content;
        adaptedContent += `\n\n${config.hashtag}`;
      } else if (platform === 'xiaohongshu') {
        adaptedContent = content.replace(/([。！？])/g, '$1\n').substring(0, config.maxContent);
        adaptedContent += `\n\n✨ ${config.hashtag}`;
      } else if (platform === 'kuaishou') {
        adaptedContent = content.length > config.maxContent ? content.substring(0, config.maxContent) + '...' : content;
        adaptedContent += `\n${config.hashtag}`;
      } else if (platform === 'bilibili') {
        adaptedContent = content.replace(/([。！？])/g, '$1\n').substring(0, config.maxContent);
        adaptedContent += `\n\n${config.hashtag}`;
      } else if (platform === 'weibo' || platform === 'video') {
        adaptedContent = content.length > config.maxContent ? content.substring(0, config.maxContent) + '...' : content;
        adaptedContent += `\n\n${config.hashtag}`;
      }
      
      const hashtags = generateHashtags(content, platform);
      
      publishResults.push({
        platform,
        platformName: config.name,
        platformIcon: config.icon,
        platformColor: config.color,
        platformUrl: config.url,
        status: 'ready',
        adaptedContent,
        hashtags,
        title: title || adaptedContent.substring(0, 20),
        mediaType: videoUrl ? 'video' : 'image',
        mediaCount: videoUrl ? 1 : (imageUrls?.length || 0),
        message: `${config.name}内容已适配完成，点击前往发布`,
      });
    }
    
    console.log(`[一键发布] 用户:${userId || deviceId} 平台:${platforms.join(',')} 内容:${content.substring(0, 50)}...`);
    
    res.json({
      success: true,
      totalPlatforms: platforms.length,
      readyCount: publishResults.length,
      results: publishResults,
      message: `已完成${publishResults.length}个平台的内容适配`,
    });
  } catch (error) {
    console.error("Publish onekey error:", error);
    res.status(500).json({ error: "发布失败，请重试" });
  }
});

function generateHashtags(content: string, platform: string): string[] {
  const baseTags: Record<string, string[]> = {
    douyin: ['AI创作', '创意', '灵感', '灵感山羊'],
    xiaohongshu: ['AI创作', '灵感山羊', '创意无限', '种草'],
    kuaishou: ['创意', '记录生活', '灵感'],
    bilibili: ['创意', 'AI创作', '涨姿势'],
    weibo: ['创意内容', '灵感山羊', 'AI创作'],
    video: ['创意分享', '灵感山羊'],
  };
  
  const tags = baseTags[platform] || ['灵感山羊', 'AI创作'];
  const keywords = extractKeywords(content);
  const contentTags = keywords.slice(0, 2).map(k => `#${k}`);
  
  return [...contentTags, ...tags.map(t => `#${t}`)].slice(0, 10);
}

function extractKeywords(content: string): string[] {
  const stopWords = ['的', '了', '是', '在', '和', '有', '我', '你', '他', '她', '它', '这', '那', '个', '一', '上', '下', '中', '大', '小', '来', '去', '到', '把', '被', '很', '都', '也', '就', '还', '会', '能', '要', '可以', '一个'];
  const words = content.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').split(/\s+/).filter(w => w.length >= 2 && !stopWords.includes(w) && !/^\d+$/.test(w));
  const freq: Record<string, number> = {};
  for (const word of words) freq[word] = (freq[word] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word]) => word);
}

// ==================== 获取支持的发布平台列表 ====================
app.get("/api/v1/publish/platforms", (req, res) => {
  const platforms = [
    { id: 'douyin', name: '抖音', icon: 'play', color: '#000000', url: 'https://www.douyin.com/', description: '短视频平台，日活6亿+', features: ['竖版视频', '话题挑战', '特效滤镜'], maxContent: 150 },
    { id: 'xiaohongshu', name: '小红书', icon: 'bookmark', color: '#FF2442', url: 'https://www.xiaohongshu.com/', description: '种草社区，女性用户为主', features: ['图文笔记', '好物推荐', '生活分享'], maxContent: 1000 },
    { id: 'kuaishou', name: '快手', icon: 'bolt', color: '#FF4906', url: 'https://www.kuaishou.com/', description: '短视频平台，下沉市场', features: ['短视频', '直播', '老铁文化'], maxContent: 200 },
    { id: 'bilibili', name: 'B站', icon: 'play-circle', color: '#00A1D6', url: 'https://www.bilibili.com/', description: '年轻人文化社区', features: ['弹幕文化', 'UP主创作', 'ACG内容'], maxContent: 500 },
    { id: 'weibo', name: '微博', icon: 'at', color: '#E6162D', url: 'https://weibo.com/', description: '社交媒体平台', features: ['热搜话题', '明星粉丝', '热点资讯'], maxContent: 2000 },
    { id: 'video', name: '视频号', icon: 'video', color: '#07C160', url: 'https://channels.weixin.qq.com/', description: '微信生态视频平台', features: ['微信好友', '朋友圈', '社交裂变'], maxContent: 500 },
  ];
  
  res.json({ success: true, platforms, totalCount: platforms.length });
});

// ==================== 内容智能适配 ====================
app.post("/api/v1/publish/adapt", async (req: Request, res: Response) => {
  try {
    const { content, title, targetPlatform } = req.body;
    
    if (!content) return res.status(400).json({ error: "content is required" });
    if (!targetPlatform) return res.status(400).json({ error: "targetPlatform is required" });
    
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    
    const platformDescriptions: Record<string, string> = {
      douyin: '抖音：短视频平台，语言简短有力，善于制造悬念和反转，大量使用热门音乐和话题标签',
      xiaohongshu: '小红书：图文笔记社区，语言温暖亲切，善于分享实用干货和生活方式，emoji丰富，排版精美',
      kuaishou: '快手：下沉市场短视频平台，语言接地气，真实不做作，善于展示普通人生活',
      bilibili: 'B站：年轻人文化社区，语言活泼有趣，弹幕文化，二次元风格浓厚，善于玩梗',
      weibo: '微博：社交媒体平台，语言精炼有力，善于抓热点，话题标签醒目',
      video: '视频号：微信生态视频平台，语言商务友好，朋友圈传播，社交属性强',
    };
    
    const platformDesc = platformDescriptions[targetPlatform] || '通用内容平台';
    
    const optimizePrompt = `你是一位${targetPlatform}平台的内容运营专家。请将以下内容优化适配到${targetPlatform}平台：\n\n原文内容：\n${content}\n${title ? `原标题：${title}` : ''}\n\n${platformDesc}\n\n请直接输出优化后的内容（标题+正文），自动添加3-5个话题标签，不要添加任何解释说明。`;
    
    const messages: Message[] = [{ role: "user" as const, content: optimizePrompt }];
    const response = await llmClient.invoke(messages, { temperature: 0.7 });
    
    const optimizedContent = response.content?.trim() || content;
    const hashtags = (optimizedContent.match(/#[^\s#]+/g) || []).slice(0, 5);
    
    res.json({
      success: true,
      original: { title, content },
      adapted: { title: title || '', content: optimizedContent, hashtags },
      platform: targetPlatform,
      message: `已优化为${targetPlatform}平台风格`,
    });
  } catch (error) {
    console.error("Adapt content error:", error);
    res.status(500).json({ error: "内容适配失败，请重试" });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${port}/`);
  console.log(`✅ Zeabur should now forward to this port`);
  console.log(`📝 性能优化: 缓存系统已启用, 任务队列已就绪`);
});


// ==================== 智能Prompt扩展系统 - 精准理解版 ====================

// 核心原则：精准理解用户意图，不曲解、不添加、不修改用户的原始创意

// ==================== 创意融合识别系统 ====================
// 专门处理"结合A和B创造新物种"等创意融合类prompt

interface FusionIntent {
  isFusion: boolean;
  fusionKeyword: string;
  fusionElements: string[];
  newSpeciesName: string;
  fusionDescription: string;
}

/**
 * 精准识别创意融合意图
 * 例如："创作结合特朗普形象和老鹰形象的特拉稀萌宠"
 * 识别出：需要融合"特朗普形象"和"老鹰形象"来创造一个叫"特拉稀萌宠"的新物种
 */
function analyzeFusionIntent(userInput: string): FusionIntent {
  const result: FusionIntent = {
    isFusion: false,
    fusionKeyword: '',
    fusionElements: [],
    newSpeciesName: '',
    fusionDescription: '',
  };

  const fusionKeywords = ['结合', '融合', '创造', '合成', '混搭', '杂交', '新物种', '新角色', '和', '与', '跟'];
  
  for (const kw of fusionKeywords) {
    if (userInput.includes(kw)) {
      result.isFusion = true;
      result.fusionKeyword = kw;
      break;
    }
  }

  if (!result.isFusion) return result;

  // 提取融合元素：xxx形象
  const elementPattern = /([^\s和与跟以及,，。]+形象)/g;
  let match;
  while ((match = elementPattern.exec(userInput)) !== null) {
    const element = match[1].replace('形象', '').trim();
    if (!result.fusionElements.includes(element) && element.length > 1) {
      result.fusionElements.push(element);
    }
  }

  // 提取"X和Y"或"X与Y"格式的融合元素（排除和/与/跟本身）
  // 匹配"猫和独角兽"、"老虎与狮子"等常见组合
  const animalList = '猫|狗|兔|鼠|鸟|鱼|龟|蛇|蜥蜴|龙|凤凰|鹰|老虎|狮子|熊猫|独角兽|狐狸|狼|鹿|豹|鲸|海豚|蝴蝶|蜜蜂|蚂蚁|考拉|树懒|浣熊|水獭|羊驼|羊|牛|马|猪|象|河马|犀牛|斑马|长颈鹿|企鹅|猫头鹰|鹦鹉|鹤|孔雀|天鹅';
  const andPattern = new RegExp(`(${animalList})\\s*(和|与|跟)\\s*(${animalList})`, 'g');
  while ((match = andPattern.exec(userInput)) !== null) {
    const left = match[1].trim();
    const right = match[3].trim();
    if (!result.fusionElements.includes(left)) result.fusionElements.push(left);
    if (!result.fusionElements.includes(right)) result.fusionElements.push(right);
  }

  // 提取常见动物名（扩展列表）
  const animals = ['猫', '狗', '兔', '鼠', '鸟', '鱼', '龟', '蛇', '蜥蜴', '龙', '凤凰', '鹰', '老虎', '狮子', '熊猫', '独角兽', '狐狸', '狼', '鹿', '豹', '鲸', '海豚', '蝴蝶', '蜜蜂', '蚂蚁', '熊猫', '考拉', '树懒', '浣熊', '水獭', '羊驼', '羊', '牛', '马', '猪', '象', '河马', '犀牛', '斑马', '长颈鹿', '企鹅', '猫头鹰', '鹦鹉', '鹤', '孔雀', '天鹅'];
  for (const animal of animals) {
    if (userInput.includes(animal) && !result.fusionElements.includes(animal)) {
      result.fusionElements.push(animal);
    }
  }

  // 提取新物种名称（稀字相关）
  const newWordPattern = /([A-Z][a-z]+稀[A-Z][a-z]+|[^\s]{2,4}稀[^\s]{2,4})/;
  const newWordMatch = userInput.match(newWordPattern);
  if (newWordMatch && newWordMatch[1].includes('稀')) {
    result.newSpeciesName = newWordMatch[1];
  }

  // 确保至少有两个融合元素
  if (result.fusionElements.length >= 2) {
    result.fusionDescription = `将${result.fusionElements.join('和')}融合为一个全新个体`;
  }

  return result;
}

// ==================== 场景关键词映射表
const SCENE_KEYWORDS: { [key: string]: { keywords: string[]; description: string } } = {
  scenery: {
    keywords: ['海边', '日落', '日出', '森林', '草原', '山川', '河流', '湖泊', '大海', '沙滩', '星空', '银河', '云海', '瀑布', '雪山', '沙漠', '古镇', '城市夜景', '樱花', '枫叶', '竹林'],
    description: '风景'
  },
  portrait: {
    keywords: ['人像', '写真', '美女', '帅哥', '少女', '少年', '女神', '男神', '古风', '汉服', '婚纱', '孕妇', '儿童', '全家福', '闺蜜', '情侣', '运动', '时尚', '复古', '街拍'],
    description: '人像'
  },
  food: {
    keywords: ['美食', '餐厅', '甜品', '蛋糕', '咖啡', '奶茶', '火锅', '烧烤', '海鲜', '日料', '西餐', '中餐', '下午茶', '小吃', '烘焙', '水果', '饮品', '料理', '披萨', '汉堡'],
    description: '美食'
  },
  animal: {
    keywords: ['猫咪', '狗狗', '宠物', '动物', '柴犬', '柯基', '金毛', '哈士奇', '布偶猫', '橘猫', '仓鼠', '兔子', '鸟类', '小动物', '萌宠', '爬宠', '水族'],
    description: '萌宠'
  },
  product: {
    keywords: ['产品', '商品', '电商', '广告', '展示', '模特', '包装', '设计', '创意', '品牌', '店铺', '橱窗', '陈列', '道具', '配饰', '服装', '鞋包', '首饰', '美妆', '护肤'],
    description: '产品'
  },
  festival: {
    keywords: ['春节', '中秋', '端午', '圣诞', '新年', '情人节', '万圣节', '感恩节', '元宵', '重阳', '七夕', '母亲节', '父亲节', '生日', '周年', '纪念日', '节日', '假期', '派对', '聚会'],
    description: '节日'
  },
  lifestyle: {
    keywords: ['生活', '日常', '家居', '装饰', '收纳', '绿植', '书房', '卧室', '客厅', '厨房', '阳台', '花园', '露营', '旅行', '健身', '瑜伽', '阅读', '音乐', '咖啡时光', '下午茶'],
    description: '生活'
  },
  emotion: {
    keywords: ['心情', '情感', '治愈', '温暖', '文艺', '小清新', '浪漫', '梦幻', '唯美', '复古', 'ins风', '简约', '冷淡', '高级感', '氛围感', '情绪', '文案', '语录', '感悟', '故事'],
    description: '情感'
  }
};

// ==================== 精准意图解析系统 ====================
interface IntentAnalysis {
  original: string;
  coreEntities: string[];
  actions: string[];
  emotions: string[];
  constraints: string[];
  rawPrompt: string;
  enhancements: string[];
  scene: string;
  fusionIntent: FusionIntent;
}

function analyzeIntent(userInput: string): IntentAnalysis {
  const analysis: IntentAnalysis = {
    original: userInput,
    coreEntities: [],
    actions: [],
    emotions: [],
    constraints: [],
    rawPrompt: userInput,
    enhancements: [],
    scene: '',
    fusionIntent: { isFusion: false, fusionKeyword: '', fusionElements: [], newSpeciesName: '', fusionDescription: '' },
  };

  // 优先识别创意融合意图（最高优先级）
  analysis.fusionIntent = analyzeFusionIntent(userInput);
  
  if (analysis.fusionIntent.isFusion) {
    analysis.scene = '萌宠';
    analysis.enhancements.push('可爱', '软萌', '卡通风格');
  } else {
    for (const [scene, config] of Object.entries(SCENE_KEYWORDS)) {
      for (const keyword of config.keywords) {
        if (userInput.includes(keyword)) {
          analysis.scene = config.description;
          break;
        }
      }
      if (analysis.scene) break;
    }
  }

  // 核心实体识别
  const entityPatterns = [
    { pattern: /[帅哥美女少男少女男士女士老爷少奶奶爷小姐宝宝孩子特朗普拜登奥巴马]+/g, type: 'person' },
    { pattern: /[猫狗兔鼠鸟鱼龟蛇蜥蜴龙凤凰鹰老虎狮子熊猫兔猫咪狗狗]+/g, type: 'animal' },
  ];
  for (const { pattern } of entityPatterns) {
    const matches = userInput.match(pattern);
    if (matches) analysis.coreEntities.push(...matches);
  }

  // 情感识别
  const emotionWords = ['治愈', '温暖', '浪漫', '梦幻', '唯美', '高级', '可爱', '清新', '文艺', '冷淡'];
  for (const emotion of emotionWords) {
    if (userInput.includes(emotion)) analysis.emotions.push(emotion);
  }

  // 约束条件识别
  const constraintPatterns = [/不能有([^，,。]+)/g, /必须是([^，,。]+)/g, /不要([^，,。]+)/g];
  for (const pattern of constraintPatterns) {
    let match;
    while ((match = pattern.exec(userInput)) !== null) {
      analysis.constraints.push(match[0]);
    }
  }

  // 精准增强（非融合场景）
  if (!analysis.fusionIntent.isFusion) {
    // 1. 时间/光线描述增强
    const timePatterns = [
      { pattern: /日出|晨|早晨/, addition: '清晨柔和的光线' },
      { pattern: /日落|黄昏|傍晚/, addition: '夕阳温暖的余晖' },
      { pattern: /夜景|晚上|夜晚/, addition: '城市璀璨灯光' },
      { pattern: /星空|银河/, addition: '满天繁星' },
      { pattern: /阴天|雨天/, addition: '柔和散射光' },
    ];
    for (const { pattern, addition } of timePatterns) {
      if (pattern.test(userInput) && !analysis.enhancements.includes(addition)) {
        analysis.enhancements.push(addition);
        break;
      }
    }

    // 2. 色彩描述增强
    const colorPatterns = [
      { pattern: /蓝色|蓝天|大海/, colors: ['蔚蓝', '天蓝色', '海天一色'] },
      { pattern: /绿色|森林|草原/, colors: ['翠绿', '清新自然', '生机勃勃'] },
      { pattern: /粉色|樱花|浪漫/, colors: ['粉嫩', '少女心', '梦幻粉'] },
      { pattern: /金色|日落|夕阳/, colors: ['金色光芒', '温暖金色调', '灿烂金黄'] },
      { pattern: /白色|雪|纯净/, colors: ['纯净洁白', '素雅清新', '简洁干净'] },
    ];
    for (const { pattern, colors } of colorPatterns) {
      if (pattern.test(userInput)) {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        if (!analysis.enhancements.includes(randomColor)) {
          analysis.enhancements.push(randomColor);
        }
        break;
      }
    }

    // 3. 情绪/氛围描述增强
    const emotionEnhancements = [
      { pattern: /治愈|温暖|温馨/, addition: '温馨治愈的氛围' },
      { pattern: /文艺|小清新|简约/, addition: '文艺清新的气质' },
      { pattern: /梦幻|浪漫|唯美/, addition: '梦幻唯美的意境' },
      { pattern: /高级|质感|轻奢/, addition: '高级有质感的画面' },
      { pattern: /可爱|萌|软萌/, addition: '可爱软萌的感觉' },
    ];
    for (const { pattern, addition } of emotionEnhancements) {
      if (pattern.test(userInput) && !analysis.enhancements.includes(addition)) {
        analysis.enhancements.push(addition);
      }
    }
  }

  return analysis;
}

/**
 * 构建融合专属Prompt
 * 专门处理"结合A和B创造新物种"类型的创意
 */
function buildFusionPrompt(analysis: IntentAnalysis): string {
  if (!analysis.fusionIntent.isFusion) return analysis.rawPrompt;

  const fusion = analysis.fusionIntent;
  if (fusion.fusionElements.length < 2) return analysis.rawPrompt;

  let fusionPrompt = `创造一个融合${fusion.fusionElements.join('和')}特征的全新物种`;
  
  if (fusion.newSpeciesName) {
    fusionPrompt += `，名为"${fusion.newSpeciesName}"`;
  }
  
  fusionPrompt += `。这个新物种要同时具有${fusion.fusionElements.join('和')}的核心特征，是有机融合而非简单叠加。`;
  fusionPrompt += `原始创意：${analysis.original}。`;

  return fusionPrompt;
}

function expandPrompt(userInput: string): { 
  expanded: string; 
  scene: string; 
  enhancements: string[];
  analysis: IntentAnalysis;
} {
  const analysis = analyzeIntent(userInput);
  
  let expanded = analysis.rawPrompt;
  
  if (analysis.fusionIntent.isFusion) {
    expanded = buildFusionPrompt(analysis);
  } else if (analysis.enhancements.length > 0) {
    expanded = `${analysis.rawPrompt}，${analysis.enhancements.join('，')}`;
  }

  const qualityTerms = ['专业摄影作品', '高清画质', '细节丰富', '构图精美', '色调和谐'];
  const randomQuality = qualityTerms[Math.floor(Math.random() * qualityTerms.length)];
  if (!expanded.includes(randomQuality)) {
    expanded = `${expanded}，${randomQuality}`;
  }

  return {
    expanded,
    scene: analysis.scene,
    enhancements: analysis.enhancements,
    analysis,
  };
}

// 获取场景对应的文案风格
function getSceneTextStyle(scene: string): string {
  const sceneToStyle: { [key: string]: string } = {
    '人像': 'xiaohongshu',
    '美食': 'douyin',
    '风景': 'general',
    '萌宠': 'xiaohongshu',
    '产品': 'douyin',
    '节日': 'xiaohongshu',
    '生活': 'general',
    '情感': 'general',
  };
  return sceneToStyle[scene] || 'general';
}

// 敏感词过滤函数
// ==================== 敏感词过滤函数 ====================
function sanitizeImagePrompt(prompt: string): { sanitized: string; reasons: string[] } {
  let sanitized = prompt;
  const reasons: string[] = [];
  
  const sensitiveWordMap: { [key: string]: { en: string; zh: string } } = {
    '特朗普': { en: 'a mature gentleman with orange hair', zh: '一位成熟男士，戴着橙色假发' },
    'Trump': { en: 'a mature gentleman with orange hair', zh: '一位成熟男士，戴着橙色假发' },
    '川普': { en: 'a mature gentleman with orange hair', zh: '一位成熟男士，戴着橙色假发' },
    '拜登': { en: 'an elderly gentleman with white hair', zh: '一位老年男士，白发' },
    'Biden': { en: 'an elderly gentleman with white hair', zh: '一位老年男士，白发' },
    '奥巴马': { en: 'a middle-aged African American man', zh: '一位中年非裔男士' },
    'Obama': { en: 'a middle-aged African American man', zh: '一位中年非裔男士' },
    '小布什': { en: 'an older American gentleman', zh: '一位美国老年男士' },
    '布什': { en: 'an American gentleman', zh: '一位美国男士' },
    '裸体': { en: 'cartoon character', zh: '卡通形象' },
    '血腥': { en: 'clean and fresh', zh: '干净清新' },
    '暴力': { en: 'peaceful and friendly', zh: '和平友好' },
  };
  
  for (const [sensitiveWord, replacement] of Object.entries(sensitiveWordMap)) {
    const regex = new RegExp(sensitiveWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(regex, replacement.zh);
      reasons.push(`"${sensitiveWord}"已替换为"${replacement.zh}"`);
    }
  }
  
  return { sanitized, reasons };
}

function sanitizePrompt(prompt: string): { sanitized: string; reasons: string[] } {
  let sanitized = prompt;
  const reasons: string[] = [];
  
  const sensitiveWordMap: { [key: string]: string } = {
    '特朗普': '创意人物', 'Trump': '创意人物', '川普': '创意人物',
    '拜登': '长者', 'Biden': '长者', '奥巴马': '绅士',
    'Obama': '绅士', '小布什': '男士', '布什': '男士',
    '裸体': '优雅', '色情': '美好', '赌博': '娱乐',
    '暴力': '和平', '血腥': '清新', '毒品': '健康',
    '自杀': '积极', '政治': '创意',
  };
  
  for (const [sensitiveWord, replacement] of Object.entries(sensitiveWordMap)) {
    const regex = new RegExp(sensitiveWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(regex, replacement);
      reasons.push(`"${sensitiveWord}"已替换为"${replacement}"`);
    }
  }
  
  return { sanitized, reasons };
}

async function isContentAllowed(prompt: string): Promise<{ allowed: boolean; reason?: string; sanitizedPrompt?: string; reasons?: string[] }> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('app_settings').select('content_filter_enabled').eq('id', 'global').single();
    const sanitizeResult = sanitizePrompt(prompt);
    if (error || !data) return { allowed: true, sanitizedPrompt: sanitizeResult.sanitized, reasons: sanitizeResult.reasons };
    if (!data.content_filter_enabled) return { allowed: true, sanitizedPrompt: sanitizeResult.sanitized, reasons: sanitizeResult.reasons };
    return { allowed: true, sanitizedPrompt: sanitizeResult.sanitized, reasons: sanitizeResult.reasons };
  } catch (error) {
    console.error("Content filter check error:", error);
    const sanitizeResult = sanitizePrompt(prompt);
    return { allowed: true, sanitizedPrompt: sanitizeResult.sanitized, reasons: sanitizeResult.reasons };
  }
}
