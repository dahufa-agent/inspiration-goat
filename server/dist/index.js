// src/index.ts
import express from "express";
import cors from "cors";
import {
  ImageGenerationClient,
  VideoGenerationClient,
  LLMClient,
  FetchClient,
  Config,
  HeaderUtils
} from "coze-coding-dev-sdk";

// src/storage/database/supabase-client.ts
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
var envLoaded = false;
var lastEnvLoadError = null;
var connectionStatus = {
  connected: false,
  error: "Not initialized"
};
function getConnectionStatus() {
  return { ...connectionStatus };
}
function loadEnv() {
  if (envLoaded) {
    return;
  }
  if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
    console.log("[Supabase] Using environment variables from system");
    envLoaded = true;
    return;
  }
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, "../../../..");
    const envPath = path.join(projectRoot, ".env");
    import("dotenv").then((dotenv) => {
      dotenv.config({ path: envPath });
      if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
        console.log("[Supabase] Loaded from .env file:", envPath);
        envLoaded = true;
      }
    }).catch(() => {
      console.log("[Supabase] dotenv import not available");
    });
  } catch (e) {
    console.log("[Supabase] Failed to load .env file:", e);
  }
  try {
    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;
    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, `'"'"'`)}'`, {
      encoding: "utf-8",
      timeout: 15e3,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const lines = output.trim().split("\n");
    let loaded = false;
    for (const line of lines) {
      if (line.startsWith("#")) continue;
      const eqIndex = line.indexOf("=");
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if (value.startsWith("'") && value.endsWith("'") || value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
          loaded = true;
        }
      }
    }
    if (loaded) {
      console.log("[Supabase] Loaded from Python workload identity");
      envLoaded = true;
      return;
    }
  } catch (e) {
    lastEnvLoadError = e instanceof Error ? e.message : "Unknown error";
    console.log("[Supabase] Python workload identity not available:", lastEnvLoadError);
  }
  envLoaded = true;
}
function getSupabaseCredentials() {
  loadEnv();
  const url = process.env.COZE_SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    const errorMsg = "Supabase credentials not configured";
    console.error(`[Supabase] \u26A0\uFE0F ${errorMsg}`);
    console.error("[Supabase] Please set COZE_SUPABASE_URL and COZE_SUPABASE_ANON_KEY");
    console.error("[Supabase] You can:");
    console.error("[Supabase]   1. Set environment variables in your platform dashboard");
    console.error("[Supabase]   2. Create a .env file in the project root");
    console.error("[Supabase]   3. For Coze deployment, use the Python workload identity");
    connectionStatus = {
      connected: false,
      error: errorMsg
    };
    return null;
  }
  connectionStatus = {
    connected: true,
    url
  };
  return { url, anonKey };
}
function getSupabaseServiceRoleKey() {
  loadEnv();
  return process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
}
var cachedClient = null;
function getSupabaseClient(token) {
  const credentials = getSupabaseCredentials();
  if (!credentials) {
    return null;
  }
  const { url, anonKey } = credentials;
  let key;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }
  if (token) {
    return createClient(url, key, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      },
      db: {
        timeout: 6e4
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  if (cachedClient) {
    return cachedClient;
  }
  cachedClient = createClient(url, key, {
    db: {
      timeout: 6e4
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return cachedClient;
}
async function testConnection() {
  const client = getSupabaseClient();
  if (!client) {
    console.error("[Supabase] Client not available - credentials not configured");
    connectionStatus = {
      connected: false,
      error: "Credentials not configured"
    };
    return false;
  }
  try {
    const { data, error } = await client.from("users").select("id").limit(1);
    if (error) {
      console.error("[Supabase] Connection test failed:", error.message);
      connectionStatus = {
        connected: false,
        error: error.message,
        url: process.env.COZE_SUPABASE_URL
      };
      return false;
    }
    console.log("[Supabase] \u2705 Connection test successful");
    connectionStatus = {
      connected: true,
      url: process.env.COZE_SUPABASE_URL
    };
    return true;
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown error";
    console.error("[Supabase] Connection test error:", errorMsg);
    connectionStatus = {
      connected: false,
      error: errorMsg,
      url: process.env.COZE_SUPABASE_URL
    };
    return false;
  }
}

// src/index.ts
import crypto from "crypto";
process.on("uncaughtException", (err) => {
  console.error("\u274C UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("\u274C UNHANDLED REJECTION:", reason);
});
console.log("\u2705 Starting server...");
console.log("\u2705 Process cwd:", process.cwd());
console.log("\u2705 PORT from env:", process.env.PORT);
console.log("\u2705 NODE_ENV:", process.env.NODE_ENV);
var VIDEO_MODEL = "doubao-seedance-1-5-pro-251215";
var CACHE_TTL = 5 * 60 * 1e3;
var PROMPT_CACHE_SIZE = 1e3;
var promptCache = /* @__PURE__ */ new Map();
var taskQueue = /* @__PURE__ */ new Map();
var app = express();
var port = Number(process.env.PORT) || 5e3;
console.log(`\u2705 Using port: ${port}`);
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    if (req.query.compress === "true") {
      return originalSend.call(this, JSON.stringify(data));
    }
    return originalSend.call(this, data);
  };
  next();
});
function getCache(key) {
  const entry = promptCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    promptCache.delete(key);
    return null;
  }
  return entry.data;
}
function setCache(key, data) {
  if (promptCache.size >= PROMPT_CACHE_SIZE) {
    const oldestKey = promptCache.keys().next().value;
    if (oldestKey) promptCache.delete(oldestKey);
  }
  promptCache.set(key, { data, timestamp: Date.now() });
}
function clearCache() {
  promptCache.clear();
}
function getTask(taskId) {
  return taskQueue.get(taskId) || null;
}
setInterval(() => {
  const now = Date.now();
  for (const [id, task] of taskQueue.entries()) {
    if (now - task.updatedAt > 30 * 60 * 1e3) {
      taskQueue.delete(id);
    }
  }
}, 5 * 60 * 1e3);
var VIDEO_DURATIONS = {
  free: { duration: 5, label: "5\u79D2", price: "\u514D\u8D39", maxPerDay: 10 },
  paid5: { duration: 10, label: "10\u79D2", price: "10\u79EF\u5206", maxPerDay: -1 },
  paid10: { duration: 15, label: "15\u79D2", price: "20\u79EF\u5206", maxPerDay: -1 },
  paid15: { duration: 20, label: "20\u79D2", price: "30\u79EF\u5206", maxPerDay: -1 }
};
var DAILY_LIMITS = {
  images: { perBatch: 2, maxPerDay: 20, chargePerImage: 1 },
  texts: { perBatch: 1, maxPerDay: 10, chargePerText: 2 }
};
var dailyData = {};
function getTodayKey() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function getOrCreateDailyData(deviceId) {
  const today = getTodayKey();
  const record = dailyData[deviceId];
  if (!record || record.date !== today) {
    dailyData[deviceId] = { date: today, imageCount: 0, textCount: 0, videoEdits: 0 };
  }
  return dailyData[deviceId];
}
function getRemainingCounts(deviceId) {
  const data = getOrCreateDailyData(deviceId);
  return {
    remainingImages: Math.max(0, DAILY_LIMITS.images.maxPerDay - data.imageCount),
    remainingTexts: Math.max(0, DAILY_LIMITS.texts.maxPerDay - data.textCount),
    remainingVideoEdits: VIDEO_DURATIONS.free.maxPerDay - data.videoEdits
  };
}
function checkVideoEditAllowed(deviceId, durationType) {
  const data = getOrCreateDailyData(deviceId);
  if (durationType === "free") {
    const remaining = VIDEO_DURATIONS.free.maxPerDay - data.videoEdits;
    if (remaining > 0) {
      data.videoEdits += 1;
      return { allowed: true, remaining: remaining - 1 };
    }
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: -1 };
}
var STYLE_PRESETS = {
  // 小红书风格
  xiaohongshu: {
    name: "\u5C0F\u7EA2\u4E66\u98CE\u683C",
    description: "\u9002\u5408\u5C0F\u7EA2\u4E66\u5E73\u53F0\u7684\u79CD\u8349\u6587\u6848\u98CE\u683C",
    prompt: '\u8BF7\u751F\u6210\u5C0F\u7EA2\u4E66\u98CE\u683C\u7684\u79CD\u8349\u6587\u6848\uFF0C\u8981\u6C42\uFF1A1. \u6807\u9898\u5438\u5F15\u4EBA\uFF0C\u6709emoji 2. \u5185\u5BB9\u6709\u4EE3\u5165\u611F 3. \u4F7F\u7528"\u59D0\u59B9\u4EEC"\u3001"\u771F\u7684\u7EDD"\u7B49\u53E3\u8BED\u5316\u8868\u8FBE 4. \u7ED3\u5C3E\u6709\u4E92\u52A8\u5F15\u5BFC',
    temperature: 0.85
  },
  // 抖音风格
  douyin: {
    name: "\u6296\u97F3\u98CE\u683C",
    description: "\u9002\u5408\u6296\u97F3\u77ED\u89C6\u9891\u7684\u7206\u6B3E\u6587\u6848",
    prompt: '\u8BF7\u751F\u6210\u6296\u97F3\u98CE\u683C\u7684\u77ED\u89C6\u9891\u6587\u6848\uFF0C\u8981\u6C42\uFF1A1. \u524D3\u79D2\u5FC5\u987B\u6293\u4F4F\u6CE8\u610F\u529B 2. \u4F7F\u7528"\u5C45\u7136"\u3001"\u6CA1\u60F3\u5230"\u7B49\u60AC\u5FF5\u8BCD 3. \u6709\u53CD\u8F6C\u6216\u60CA\u559C 4. \u7ED3\u5C3E\u6709call to action',
    temperature: 0.9
  },
  // 公众号风格
  gzh: {
    name: "\u516C\u4F17\u53F7\u98CE\u683C",
    description: "\u9002\u5408\u5FAE\u4FE1\u516C\u4F17\u53F7\u7684\u957F\u6587\u98CE\u683C",
    prompt: "\u8BF7\u751F\u6210\u5FAE\u4FE1\u516C\u4F17\u53F7\u98CE\u683C\u7684\u6DF1\u5EA6\u6587\u6848\uFF0C\u8981\u6C42\uFF1A1. \u6807\u9898\u6709\u4F20\u64AD\u6027 2. \u7ED3\u6784\u6E05\u6670\u6709\u903B\u8F91 3. \u6709\u89C2\u70B9\u6709\u6001\u5EA6 4. \u5B57\u65701000-2000\u5B57",
    temperature: 0.75
  },
  // 知乎风格
  zhihu: {
    name: "\u77E5\u4E4E\u98CE\u683C",
    description: "\u9002\u5408\u77E5\u4E4E\u56DE\u7B54\u7684\u5E72\u8D27\u98CE\u683C",
    prompt: "\u8BF7\u751F\u6210\u77E5\u4E4E\u98CE\u683C\u7684\u5E72\u8D27\u56DE\u7B54\uFF0C\u8981\u6C42\uFF1A1. \u4E13\u4E1A\u6709\u6DF1\u5EA6 2. \u6709\u6570\u636E\u652F\u6491 3. \u7ED3\u6784\u5316\u8868\u8FBE 4. \u5BA2\u89C2\u4E2D\u7ACB\u6709\u89C1\u5730",
    temperature: 0.7
  },
  // 通用风格
  general: {
    name: "\u901A\u7528\u98CE\u683C",
    description: "\u9002\u5408\u5404\u79CD\u573A\u666F\u7684\u901A\u7528\u6587\u6848",
    prompt: "\u8BF7\u751F\u6210\u4E00\u6BB5\u7B80\u6D01\u6709\u529B\u7684\u901A\u7528\u6587\u6848\uFF0C\u8981\u6C42\uFF1A1. \u8BED\u8A00\u7CBE\u70BC 2. \u91CD\u70B9\u7A81\u51FA 3. \u6709\u611F\u67D3\u529B 4. \u9002\u5408\u914D\u56FE\u4F7F\u7528",
    temperature: 0.8
  }
};
var IMAGE_STYLES = {
  realistic: { name: "\u5199\u5B9E\u6444\u5F71", keywords: "photorealistic, high detail, professional photography" },
  illustration: { name: "\u5546\u4E1A\u63D2\u753B", keywords: "digital illustration, vector art, clean design" },
  anime: { name: "\u52A8\u6F2B\u98CE\u683C", keywords: "anime style, vibrant colors, detailed anime art" },
  oil_painting: { name: "\u6CB9\u753B\u8D28\u611F", keywords: "oil painting style, impressionist, artistic" },
  watercolor: { name: "\u6C34\u5F69\u98CE\u683C", keywords: "watercolor painting, soft colors, delicate" },
  cyberpunk: { name: "\u8D5B\u535A\u670B\u514B", keywords: "cyberpunk, neon lights, futuristic city" },
  fantasy: { name: "\u5947\u5E7B\u98CE\u683C", keywords: "fantasy art, magical atmosphere, epic scene" },
  minimalist: { name: "\u6781\u7B80\u4E3B\u4E49", keywords: "minimalist design, clean lines, simple composition" }
};
var hotTopicsCache = null;
var HOT_TOPICS_TTL = 15 * 60 * 1e3;
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "\u7075\u611F\u5C71\u7F8A API \u670D\u52A1\u8FD0\u884C\u4E2D", timestamp: Date.now() });
});
app.get("/api/v1/health", async (req, res) => {
  const supabaseStatus = getConnectionStatus();
  if (!supabaseStatus.connected && process.env.NODE_ENV === "production") {
    testConnection().catch(() => {
    });
  }
  res.json({
    status: "ok",
    timestamp: Date.now(),
    version: "2.0.0",
    uptime: process.uptime(),
    services: {
      supabase: {
        connected: supabaseStatus.connected,
        error: supabaseStatus.error || void 0,
        url: supabaseStatus.url ? "configured" : "not configured"
      },
      imageGeneration: "available",
      videoGeneration: "available",
      llm: "available"
    },
    environment: process.env.NODE_ENV || "development"
  });
});
app.get("/api/v1/limits", (req, res) => {
  const deviceId = req.headers["x-device-id"] || "default";
  const remaining = getRemainingCounts(deviceId);
  res.json({
    images: { perBatch: DAILY_LIMITS.images.perBatch, maxPerDay: DAILY_LIMITS.images.maxPerDay, remaining: remaining.remainingImages, canGenerate: remaining.remainingImages >= DAILY_LIMITS.images.perBatch },
    texts: { perBatch: DAILY_LIMITS.texts.perBatch, maxPerDay: DAILY_LIMITS.texts.maxPerDay, remaining: remaining.remainingTexts, canGenerate: remaining.remainingTexts >= DAILY_LIMITS.texts.perBatch },
    videoEdits: { free: { maxPerDay: VIDEO_DURATIONS.free.maxPerDay, remaining: remaining.remainingVideoEdits, canGenerate: remaining.remainingVideoEdits > 0 } }
  });
});
app.get("/api/v1/video/durations", (req, res) => {
  const deviceId = req.headers["x-device-id"] || "default";
  const remaining = getRemainingCounts(deviceId);
  res.json({
    durations: [
      { type: "free", duration: VIDEO_DURATIONS.free.duration, label: VIDEO_DURATIONS.free.label, price: VIDEO_DURATIONS.free.price, description: `\u6BCF\u65E5\u53EF\u7F16\u8F91${VIDEO_DURATIONS.free.maxPerDay}\u6B21`, remainingEdits: remaining.remainingVideoEdits },
      { type: "paid5", duration: VIDEO_DURATIONS.paid5.duration, label: VIDEO_DURATIONS.paid5.label, price: VIDEO_DURATIONS.paid5.price, description: "\u6BCF\u589E\u52A05\u79D2\u6536\u53D610\u79EF\u5206" },
      { type: "paid10", duration: VIDEO_DURATIONS.paid10.duration, label: VIDEO_DURATIONS.paid10.label, price: VIDEO_DURATIONS.paid10.price, description: "\u6BCF\u589E\u52A010\u79D2\u6536\u53D620\u79EF\u5206" },
      { type: "paid15", duration: VIDEO_DURATIONS.paid15.duration, label: VIDEO_DURATIONS.paid15.label, price: VIDEO_DURATIONS.paid15.price, description: "\u6BCF\u589E\u52A015\u79D2\u6536\u53D630\u79EF\u5206" }
    ],
    remainingFreeEdits: remaining.remainingVideoEdits
  });
});
app.get("/api/v1/templates/styles", (req, res) => {
  res.json({
    text: Object.entries(STYLE_PRESETS).map(([key, value]) => ({ id: key, ...value })),
    image: Object.entries(IMAGE_STYLES).map(([key, value]) => ({ id: key, ...value }))
  });
});
app.get("/api/v1/hot-topics", async (req, res) => {
  try {
    if (hotTopicsCache && Date.now() - hotTopicsCache.timestamp < HOT_TOPICS_TTL) {
      return res.json(hotTopicsCache);
    }
    const topics = [
      { id: 1, platform: "weibo", title: "\u6625\u65E5\u9650\u5B9A\u7F8E\u98DF", heat: 985200, category: "food" },
      { id: 2, platform: "zhihu", title: "2024\u804C\u573A\u8D8B\u52BF\u5206\u6790", heat: 856400, category: "career" },
      { id: 3, platform: "douyin", title: "\u53D8\u7F8E\u65E5\u8BB0", heat: 2341e3, category: "beauty" },
      { id: 4, platform: "xiaohongshu", title: "\u9732\u8425\u88C5\u5907\u6E05\u5355", heat: 678900, category: "lifestyle" },
      { id: 5, platform: "weibo", title: "\u6570\u7801\u4EA7\u54C1\u6D4B\u8BC4", heat: 543200, category: "tech" },
      { id: 6, platform: "zhihu", title: "\u526F\u4E1A\u8D5A\u94B1\u601D\u8DEF", heat: 1123e3, category: "money" },
      { id: 7, platform: "douyin", title: "\u5065\u8EAB\u6253\u5361", heat: 1876e3, category: "fitness" },
      { id: 8, platform: "xiaohongshu", title: "\u5BB6\u5C45\u6536\u7EB3\u6280\u5DE7", heat: 723100, category: "home" }
    ];
    hotTopicsCache = { topics, timestamp: Date.now() };
    res.json({ topics });
  } catch (error) {
    console.error("Hot topics error:", error);
    res.json({ topics: [] });
  }
});
app.get("/api/v1/task/:taskId", (req, res) => {
  const task = getTask(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }
  res.json(task);
});
app.post("/api/v1/generate/image", async (req, res) => {
  try {
    const { prompt, style = "realistic" } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const imageClient = new ImageGenerationClient(config, customHeaders);
    const styleConfig = IMAGE_STYLES[style] || IMAGE_STYLES.realistic;
    const styledPrompt = `${prompt}, ${styleConfig.keywords}`;
    let currentPrompt = prompt;
    let success = false;
    let imageUrls = [];
    let optimizationNote;
    try {
      const response = await imageClient.generate({ prompt: styledPrompt, size: "2K", watermark: false });
      const helper = imageClient.getResponseHelper(response);
      if (helper.success) {
        imageUrls = helper.imageUrls;
        success = true;
      }
    } catch (error) {
      const isSensitiveError = error?.response?.error?.code === "InputTextSensitiveContentDetected" || error?.message?.includes("SensitiveContent");
      if (isSensitiveError) {
        const result = sanitizeImagePrompt(prompt);
        currentPrompt = result.sanitized;
        optimizationNote = result.reasons.length > 0 ? `\u5DF2\u4E3A\u60A8\u4F18\u5316\uFF1A${result.reasons.join("\uFF1B")}` : void 0;
        const retryResponse = await imageClient.generate({ prompt: currentPrompt, size: "2K", watermark: false });
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
      res.json({ imageUrls, optimizationNote, style });
    } else {
      res.status(500).json({ error: "Image generation failed" });
    }
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});
app.post("/api/v1/generate/text", async (req, res) => {
  try {
    const { prompt, style = "general", platform = "general" } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const cacheKey = `text:${prompt}:${style}:${platform}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    const styleConfig = STYLE_PRESETS[style] || STYLE_PRESETS.general;
    const systemPrompt = `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u521B\u610F\u6587\u6848\u5E08\uFF0C\u64C5\u957F\u521B\u4F5C\u77ED\u89C6\u9891\u811A\u672C\u3001\u793E\u4EA4\u5A92\u4F53\u6587\u6848\u3001\u8425\u9500\u6587\u6848\u7B49\u3002${styleConfig.prompt}\u8BF7\u76F4\u63A5\u8F93\u51FA\u6587\u6848\u5185\u5BB9\uFF0C\u4E0D\u9700\u8981\u89E3\u91CA\u3002`;
    const sanitizeResult = sanitizePrompt(prompt);
    const finalPrompt = sanitizeResult.sanitized;
    const optimizationNote = sanitizeResult.reasons.length > 0 ? `\u5DF2\u4E3A\u60A8\u4F18\u5316\uFF1A${sanitizeResult.reasons.join("\uFF1B")}` : void 0;
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `\u60F3\u6CD5\u4E3B\u9898\uFF1A${finalPrompt}

\u8BF7\u751F\u6210\u6587\u6848\u5185\u5BB9\u3002` }
    ];
    const response = await llmClient.invoke(messages, {
      model: "deepseek-v3-2-251201",
      temperature: styleConfig.temperature
    });
    const result = { text: response.content, optimizationNote, style, platform };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error("Text generation error:", error);
    res.status(500).json({ error: "Text generation failed" });
  }
});
app.post("/api/v1/generate/video", async (req, res) => {
  try {
    const { prompt, imageUrl, durationType = "free" } = req.body;
    const deviceId = req.headers["x-device-id"] || "default";
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const contentCheck = await isContentAllowed(prompt);
    if (!contentCheck.allowed) return res.status(400).json({ error: contentCheck.reason });
    const finalPrompt = contentCheck.sanitizedPrompt || prompt;
    const durationConfig = VIDEO_DURATIONS[durationType] || VIDEO_DURATIONS.free;
    const duration = durationConfig.duration;
    if (durationType === "free") {
      const check = checkVideoEditAllowed(deviceId, durationType);
      if (!check.allowed) {
        return res.status(403).json({ error: "\u4ECA\u65E5\u514D\u8D39\u89C6\u9891\u7F16\u8F91\u6B21\u6570\u5DF2\u7528\u5B8C", remainingEdits: 0 });
      }
    }
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const videoClient = new VideoGenerationClient(config, customHeaders);
    const contentItems = [];
    if (imageUrl) {
      contentItems.push({ type: "image_url", image_url: { url: imageUrl }, role: "first_frame" });
    }
    contentItems.push({ type: "text", text: finalPrompt });
    const response = await videoClient.videoGeneration(contentItems, {
      model: VIDEO_MODEL,
      duration,
      ratio: "9:16",
      resolution: "720p",
      watermark: false,
      generateAudio: true
    });
    if (response.videoUrl) {
      const remaining = getRemainingCounts(deviceId);
      res.json({
        videoUrl: response.videoUrl,
        lastFrameUrl: response.lastFrameUrl,
        duration,
        durationType,
        isFree: durationType === "free",
        remainingFreeEdits: remaining.remainingVideoEdits
      });
    } else {
      res.status(500).json({ error: "Video generation failed" });
    }
  } catch (error) {
    console.error("Video generation error:", error);
    res.status(500).json({ error: "Video generation failed" });
  }
});
app.post("/api/v1/generate/images", async (req, res) => {
  try {
    const { prompt, style = "realistic" } = req.body;
    const deviceId = req.headers["x-device-id"] || "default";
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const data = getOrCreateDailyData(deviceId);
    const remaining = DAILY_LIMITS.images.maxPerDay - data.imageCount;
    if (remaining <= 0) {
      return res.status(403).json({ error: "\u4ECA\u65E5\u56FE\u7247\u751F\u6210\u6B21\u6570\u5DF2\u7528\u5B8C", remaining: 0, maxPerDay: DAILY_LIMITS.images.maxPerDay });
    }
    const count = Math.min(DAILY_LIMITS.images.perBatch, remaining);
    const styleConfig = IMAGE_STYLES[style] || IMAGE_STYLES.realistic;
    const styledPrompt = `${prompt}, ${styleConfig.keywords}`;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const imgClient = new ImageGenerationClient(config, customHeaders);
    let currentPrompt = styledPrompt;
    let optimizationNote;
    try {
      const requests2 = Array(count).fill(null).map(() => ({ prompt: currentPrompt, size: "2K", watermark: false }));
      await imgClient.batchGenerate(requests2);
    } catch (error) {
      const isSensitiveError = error?.response?.error?.code === "InputTextSensitiveContentDetected";
      if (isSensitiveError) {
        const result = sanitizeImagePrompt(prompt);
        currentPrompt = `${result.sanitized}, ${styleConfig.keywords}`;
        optimizationNote = result.reasons.length > 0 ? `\u5DF2\u4E3A\u60A8\u4F18\u5316\uFF1A${result.reasons.join("\uFF1B")}` : void 0;
      } else {
        throw error;
      }
    }
    const requests = Array(count).fill(null).map(() => ({ prompt: currentPrompt, size: "2K", watermark: false }));
    const responses = await imgClient.batchGenerate(requests);
    const imageUrls = [];
    responses.forEach((response) => {
      const helper = imgClient.getResponseHelper(response);
      if (helper.success && helper.imageUrls.length > 0) {
        imageUrls.push(helper.imageUrls[0]);
        data.imageCount += 1;
      }
    });
    res.json({ imageUrls, totalGenerated: imageUrls.length, perBatch: DAILY_LIMITS.images.perBatch, remaining: DAILY_LIMITS.images.maxPerDay - data.imageCount, maxPerDay: DAILY_LIMITS.images.maxPerDay, optimizationNote, style });
  } catch (error) {
    console.error("Image batch generation error:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});
app.post("/api/v1/generate/texts", async (req, res) => {
  try {
    const { prompt, style = "general", platform = "general" } = req.body;
    const deviceId = req.headers["x-device-id"] || "default";
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const sanitizeResult = sanitizePrompt(prompt);
    const finalPrompt = sanitizeResult.sanitized;
    const optimizationNote = sanitizeResult.reasons.length > 0 ? `\u5DF2\u4E3A\u60A8\u4F18\u5316\uFF1A${sanitizeResult.reasons.join("\uFF1B")}` : void 0;
    const data = getOrCreateDailyData(deviceId);
    const remaining = DAILY_LIMITS.texts.maxPerDay - data.textCount;
    if (remaining <= 0) {
      return res.status(403).json({ error: "\u4ECA\u65E5\u6587\u6848\u751F\u6210\u6B21\u6570\u5DF2\u7528\u5B8C", remaining: 0, maxPerDay: DAILY_LIMITS.texts.maxPerDay });
    }
    const count = Math.min(DAILY_LIMITS.texts.perBatch, remaining);
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    const styleConfig = STYLE_PRESETS[style] || STYLE_PRESETS.general;
    const systemPrompt = `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u521B\u610F\u6587\u6848\u5E08\uFF0C\u64C5\u957F\u521B\u4F5C\u77ED\u89C6\u9891\u811A\u672C\u3001\u793E\u4EA4\u5A92\u4F53\u6587\u6848\u3001\u8425\u9500\u6587\u6848\u7B49\u3002${styleConfig.prompt}\u8BF7\u76F4\u63A5\u8F93\u51FA\u6587\u6848\u5185\u5BB9\uFF0C\u4E0D\u8981\u52A0\u4EFB\u4F55\u7F16\u53F7\u6216\u524D\u7F00\uFF0C\u4E0D\u8981\u89E3\u91CA\u3002`;
    const texts = [];
    for (let i = 0; i < count; i++) {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `\u60F3\u6CD5\u4E3B\u9898\uFF1A${finalPrompt}

\u8BF7\u751F\u6210\u6587\u6848\u5185\u5BB9\u3002` }
      ];
      const response = await llmClient.invoke(messages, { model: "deepseek-v3-2-251201", temperature: styleConfig.temperature });
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
app.post("/api/v1/generate/all", async (req, res) => {
  try {
    const { prompt, durationType = "free", textStyle = "general", imageStyle = "realistic" } = req.body;
    const deviceId = req.headers["x-device-id"] || "default";
    const userId = req.headers["x-user-id"];
    const isLoggedIn = !!userId;
    const HALF_RATE = 0.5;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const sanitizeResult = sanitizePrompt(prompt);
    const finalPrompt = sanitizeResult.sanitized;
    const optimizationNote = sanitizeResult.reasons.length > 0 ? `\u5DF2\u4E3A\u60A8\u4F18\u5316\uFF1A${sanitizeResult.reasons.join("\uFF1B")}` : void 0;
    const durationConfig = VIDEO_DURATIONS[durationType] || VIDEO_DURATIONS.free;
    const duration = durationConfig.duration;
    if (durationType === "free") {
      const data2 = getOrCreateDailyData(deviceId);
      const remainingVideo = VIDEO_DURATIONS.free.maxPerDay - data2.videoEdits;
      if (remainingVideo <= 0) {
        return res.status(403).json({ error: "\u4ECA\u65E5\u514D\u8D39\u89C6\u9891\u7F16\u8F91\u6B21\u6570\u5DF2\u7528\u5B8C", remainingEdits: 0, isLoggedIn });
      }
    }
    const data = getOrCreateDailyData(deviceId);
    const imageMaxPerDay = isLoggedIn ? DAILY_LIMITS.images.maxPerDay : Math.floor(DAILY_LIMITS.images.maxPerDay * HALF_RATE);
    const textMaxPerDay = isLoggedIn ? DAILY_LIMITS.texts.maxPerDay : Math.floor(DAILY_LIMITS.texts.maxPerDay * HALF_RATE);
    if (imageMaxPerDay - data.imageCount < DAILY_LIMITS.images.perBatch) {
      return res.status(403).json({ error: "\u4ECA\u65E5\u56FE\u7247\u751F\u6210\u6B21\u6570\u4E0D\u8DB3", remainingImages: Math.max(0, imageMaxPerDay - data.imageCount), isLoggedIn });
    }
    if (textMaxPerDay - data.textCount < DAILY_LIMITS.texts.perBatch) {
      return res.status(403).json({ error: "\u4ECA\u65E5\u6587\u6848\u751F\u6210\u6B21\u6570\u5DF2\u7528\u5B8C", remainingTexts: Math.max(0, textMaxPerDay - data.textCount), isLoggedIn });
    }
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const imageClient = new ImageGenerationClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);
    const videoClient = new VideoGenerationClient(config, customHeaders);
    const imgStyleConfig = IMAGE_STYLES[imageStyle] || IMAGE_STYLES.realistic;
    const txtStyleConfig = STYLE_PRESETS[textStyle] || STYLE_PRESETS.general;
    const styledImagePrompt = `${finalPrompt}, ${imgStyleConfig.keywords}`;
    const imageRequests = Array(DAILY_LIMITS.images.perBatch).fill(null).map(() => ({ prompt: styledImagePrompt, size: "2K", watermark: false }));
    let imageUrls = [];
    try {
      const imageResponses = await imageClient.batchGenerate(imageRequests);
      imageResponses.forEach((response) => {
        const helper = imageClient.getResponseHelper(response);
        if (helper.success && helper.imageUrls.length > 0) {
          imageUrls.push(helper.imageUrls[0]);
          data.imageCount += 1;
        }
      });
    } catch (error) {
      if (error?.response?.error?.code === "InputTextSensitiveContentDetected") {
        const retryResult = sanitizeImagePrompt(prompt);
        const retryPrompt = `${retryResult.sanitized}, ${imgStyleConfig.keywords}`;
        const retryRequests = Array(DAILY_LIMITS.images.perBatch).fill(null).map(() => ({ prompt: retryPrompt, size: "2K", watermark: false }));
        const retryResponses = await imageClient.batchGenerate(retryRequests);
        retryResponses.forEach((response) => {
          const helper = imageClient.getResponseHelper(response);
          if (helper.success && helper.imageUrls.length > 0) {
            imageUrls.push(helper.imageUrls[0]);
            data.imageCount += 1;
          }
        });
      } else {
        throw error;
      }
    }
    const systemPrompt = `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u521B\u610F\u6587\u6848\u5E08\uFF0C\u64C5\u957F\u521B\u4F5C\u77ED\u89C6\u9891\u811A\u672C\u3001\u793E\u4EA4\u5A92\u4F53\u6587\u6848\u3001\u8425\u9500\u6587\u6848\u7B49\u3002${txtStyleConfig.prompt}\u8BF7\u76F4\u63A5\u8F93\u51FA\u6587\u6848\u5185\u5BB9\uFF0C\u4E0D\u8981\u52A0\u4EFB\u4F55\u7F16\u53F7\u6216\u524D\u7F00\uFF0C\u4E0D\u8981\u89E3\u91CA\u3002`;
    const textMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `\u60F3\u6CD5\u4E3B\u9898\uFF1A${finalPrompt}

\u8BF7\u751F\u6210\u6587\u6848\u5185\u5BB9\u3002` }
    ];
    const textResponse = await llmClient.invoke(textMessages, { model: "deepseek-v3-2-251201", temperature: txtStyleConfig.temperature });
    const texts = textResponse.content ? [textResponse.content.trim()] : [];
    if (texts.length > 0) data.textCount += 1;
    let videoUrl = null;
    let lastFrameUrl = null;
    if (imageUrls.length > 0) {
      const videoResponse = await videoClient.videoGeneration(
        [{ type: "image_url", image_url: { url: imageUrls[0] }, role: "first_frame" }, { type: "text", text: finalPrompt }],
        { model: VIDEO_MODEL, duration, ratio: "9:16", resolution: "720p", watermark: false, generateAudio: true }
      );
      videoUrl = videoResponse.videoUrl;
      lastFrameUrl = videoResponse.lastFrameUrl;
      if (durationType === "free") data.videoEdits += 1;
    }
    const remaining = getRemainingCounts(deviceId);
    const remainingFreeEdits = isLoggedIn ? remaining.remainingVideoEdits : Math.floor(remaining.remainingVideoEdits * HALF_RATE);
    const remainingImages = isLoggedIn ? remaining.remainingImages : Math.floor(remaining.remainingImages * HALF_RATE);
    const remainingTexts = isLoggedIn ? remaining.remainingTexts : Math.floor(remaining.remainingTexts * HALF_RATE);
    res.json({
      imageUrls,
      texts,
      videoUrl,
      lastFrameUrl,
      duration,
      durationType,
      isFree: durationType === "free",
      isLoggedIn,
      remainingFreeEdits,
      remainingImages,
      remainingTexts,
      optimizationNote,
      textStyle,
      imageStyle,
      imageLimits: { perBatch: DAILY_LIMITS.images.perBatch, maxPerDay: imageMaxPerDay, chargePerImage: DAILY_LIMITS.images.chargePerImage },
      textLimits: { perBatch: DAILY_LIMITS.texts.perBatch, maxPerDay: textMaxPerDay, chargePerText: DAILY_LIMITS.texts.chargePerText }
    });
  } catch (error) {
    console.error("Generate all error:", error);
    res.status(500).json({ error: "Generation failed" });
  }
});
app.post("/api/v1/generate/video-regenerate", async (req, res) => {
  try {
    const { prompt, imageUrl, durationType = "free" } = req.body;
    const deviceId = req.headers["x-device-id"] || "default";
    if (!prompt || !imageUrl) return res.status(400).json({ error: "prompt and imageUrl are required" });
    const contentCheck = await isContentAllowed(prompt);
    if (!contentCheck.allowed) return res.status(400).json({ error: contentCheck.reason });
    const finalPrompt = contentCheck.sanitizedPrompt || prompt;
    const durationConfig = VIDEO_DURATIONS[durationType] || VIDEO_DURATIONS.free;
    const duration = durationConfig.duration;
    if (durationType === "free") {
      const check = checkVideoEditAllowed(deviceId, durationType);
      if (!check.allowed) return res.status(403).json({ error: "\u4ECA\u65E5\u514D\u8D39\u89C6\u9891\u7F16\u8F91\u6B21\u6570\u5DF2\u7528\u5B8C", remainingEdits: 0 });
    }
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
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
app.post("/api/v1/content/polish", async (req, res) => {
  try {
    const { content, polishStyle } = req.body;
    if (!content) return res.status(400).json({ error: "\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" });
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    const styleConfig = STYLE_PRESETS[polishStyle] || STYLE_PRESETS.general;
    const messages = [
      { role: "system", content: `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u6587\u6848\u7F16\u8F91\uFF0C\u64C5\u957F\u5404\u79CD\u6587\u98CE\u7684\u6587\u6848\u6DA6\u8272\u548C\u4F18\u5316\u3002${styleConfig.prompt}\u8BF7\u76F4\u63A5\u8F93\u51FA\u6DA6\u8272\u540E\u7684\u6587\u6848\u5185\u5BB9\uFF0C\u4E0D\u8981\u6DFB\u52A0\u4EFB\u4F55\u8BF4\u660E\u6216\u6CE8\u91CA\u3002` },
      { role: "user", content: `\u539F\u59CB\u6587\u6848\uFF1A
${content}

\u8BF7\u6DA6\u8272\u4F18\u5316\u3002` }
    ];
    const response = await llmClient.invoke(messages, { model: "deepseek-v3-2-251201", temperature: styleConfig.temperature });
    if (response.content) {
      res.json({ polished: response.content.trim(), original: content, style: polishStyle || "general" });
    } else {
      res.status(500).json({ error: "\u6DA6\u8272\u5931\u8D25" });
    }
  } catch (error) {
    console.error("Content polish error:", error);
    res.status(500).json({ error: "\u6DA6\u8272\u5931\u8D25" });
  }
});
app.post("/api/v1/content/extract-from-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "\u94FE\u63A5\u4E0D\u80FD\u4E3A\u7A7A" });
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "\u94FE\u63A5\u683C\u5F0F\u4E0D\u6B63\u786E" });
    }
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const fetchClient = new FetchClient(config, customHeaders);
    const response = await fetchClient.fetch(url);
    if (response.status_code !== 0) {
      return res.status(500).json({ error: "\u83B7\u53D6\u94FE\u63A5\u5185\u5BB9\u5931\u8D25", statusMessage: response.status_message });
    }
    const textContent = response.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
    const images = response.content.filter((item) => item.type === "image").map((item) => ({ url: item.image?.display_url || item.image?.image_url, width: item.image?.width, height: item.image?.height }));
    res.json({ title: response.title || "", content: textContent, images, sourceUrl: response.url || url, publishTime: response.publish_time });
  } catch (error) {
    console.error("URL extract error:", error);
    res.status(500).json({ error: "\u83B7\u53D6\u94FE\u63A5\u5185\u5BB9\u5931\u8D25" });
  }
});
app.post("/api/v1/content/extract-and-polish", async (req, res) => {
  try {
    const { url, polishStyle } = req.body;
    if (!url) return res.status(400).json({ error: "\u94FE\u63A5\u4E0D\u80FD\u4E3A\u7A7A" });
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const fetchClient = new FetchClient(config, customHeaders);
    const response = await fetchClient.fetch(url);
    if (response.status_code !== 0) {
      return res.status(500).json({ error: "\u83B7\u53D6\u94FE\u63A5\u5185\u5BB9\u5931\u8D25", statusMessage: response.status_message });
    }
    const originalContent = response.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
    if (!originalContent) return res.status(400).json({ error: "\u8BE5\u94FE\u63A5\u6CA1\u6709\u53EF\u63D0\u53D6\u7684\u6587\u672C\u5185\u5BB9" });
    const llmClient = new LLMClient(config, customHeaders);
    const styleConfig = STYLE_PRESETS[polishStyle] || STYLE_PRESETS.general;
    const messages = [
      { role: "system", content: `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u6587\u6848\u7F16\u8F91\uFF0C\u64C5\u957F\u5404\u79CD\u6587\u98CE\u7684\u6587\u6848\u6DA6\u8272\u548C\u4F18\u5316\u3002${styleConfig.prompt}\u8BF7\u76F4\u63A5\u8F93\u51FA\u6DA6\u8272\u540E\u7684\u6587\u6848\u5185\u5BB9\uFF0C\u4E0D\u8981\u6DFB\u52A0\u4EFB\u4F55\u8BF4\u660E\u6216\u6CE8\u91CA\u3002` },
      { role: "user", content: `\u539F\u59CB\u6587\u6848\uFF1A
${originalContent}

\u8BF7\u6DA6\u8272\u4F18\u5316\u3002` }
    ];
    const llmResponse = await llmClient.invoke(messages, { model: "deepseek-v3-2-251201", temperature: styleConfig.temperature });
    const images = response.content.filter((item) => item.type === "image").map((item) => ({ url: item.image?.display_url || item.image?.image_url }));
    res.json({ title: response.title || "", original: originalContent, polished: llmResponse.content?.trim() || "", images, sourceUrl: response.url || url, publishTime: response.publish_time, style: polishStyle || "general" });
  } catch (error) {
    console.error("Extract and polish error:", error);
    res.status(500).json({ error: "\u63D0\u53D6\u5E76\u6DA6\u8272\u5931\u8D25" });
  }
});
app.get("/api/v1/user/remaining-edits", async (req, res) => {
  const deviceId = req.headers["x-device-id"] || "default";
  const userId = req.headers["x-user-id"];
  const isLoggedIn = !!userId;
  const HALF_RATE = 0.5;
  const remaining = getRemainingCounts(deviceId);
  const remainingFreeEdits = isLoggedIn ? remaining.remainingVideoEdits : Math.floor(remaining.remainingVideoEdits * HALF_RATE);
  const remainingImages = isLoggedIn ? remaining.remainingImages : Math.floor(remaining.remainingImages * HALF_RATE);
  const remainingTexts = isLoggedIn ? remaining.remainingTexts : Math.floor(remaining.remainingTexts * HALF_RATE);
  const imageMaxPerDay = isLoggedIn ? DAILY_LIMITS.images.maxPerDay : Math.floor(DAILY_LIMITS.images.maxPerDay * HALF_RATE);
  const textMaxPerDay = isLoggedIn ? DAILY_LIMITS.texts.maxPerDay : Math.floor(DAILY_LIMITS.texts.maxPerDay * HALF_RATE);
  const freeVideoMaxPerDay = isLoggedIn ? VIDEO_DURATIONS.free.maxPerDay : Math.floor(VIDEO_DURATIONS.free.maxPerDay * HALF_RATE);
  res.json({
    remainingFreeEdits,
    remainingImages,
    remainingTexts,
    isLoggedIn,
    imageLimits: { perBatch: DAILY_LIMITS.images.perBatch, maxPerDay: imageMaxPerDay },
    textLimits: { perBatch: DAILY_LIMITS.texts.perBatch, maxPerDay: textMaxPerDay },
    freeVideoMaxPerDay,
    resetDate: getTodayKey()
  });
});
app.post("/api/v1/generate/text-variants", async (req, res) => {
  try {
    const { prompt, count = 3 } = req.body;
    const deviceId = req.headers["x-device-id"] || "default";
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const actualCount = Math.min(Math.max(1, count), 5);
    const sanitizeResult = sanitizePrompt(prompt);
    const finalPrompt = sanitizeResult.sanitized;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    const systemPrompt = `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u521B\u610F\u6587\u6848\u5E08\uFF0C\u64C5\u957F\u521B\u4F5C\u591A\u79CD\u98CE\u683C\u7684\u6587\u6848\u3002\u8BF7\u4E3A\u540C\u4E00\u4E2A\u4E3B\u9898\u751F\u6210${actualCount}\u4E2A\u4E0D\u540C\u98CE\u683C\u7684\u6587\u6848\u53D8\u4F53\uFF0C\u6BCF\u4E2A\u53D8\u4F53\u8981\u6709\u660E\u663E\u4E0D\u540C\u7684\u89D2\u5EA6\u548C\u8868\u8FBE\u65B9\u5F0F\u3002\u7528[\u53D8\u4F53X]\u4F5C\u4E3A\u5206\u9694\u6807\u8BB0\u76F4\u63A5\u8F93\u51FA\uFF0C\u4E0D\u8981\u52A0\u7F16\u53F7\u3002`;
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `\u60F3\u6CD5\u4E3B\u9898\uFF1A${finalPrompt}` }
    ];
    const response = await llmClient.invoke(messages, { model: "deepseek-v3-2-251201", temperature: 0.9 });
    const content = response.content || "";
    const variants = content.split(/\[变体\d+\]/).filter((v) => v.trim());
    res.json({
      variants: variants.slice(0, actualCount).map((v) => v.trim()),
      count: Math.min(variants.length, actualCount),
      optimizationNote: sanitizeResult.reasons.length > 0 ? `\u5DF2\u4E3A\u60A8\u4F18\u5316\uFF1A${sanitizeResult.reasons.join("\uFF1B")}` : void 0
    });
  } catch (error) {
    console.error("Text variants generation error:", error);
    res.status(500).json({ error: "\u751F\u6210\u53D8\u4F53\u5931\u8D25" });
  }
});
app.post("/api/v1/recommend", async (req, res) => {
  try {
    const { topic, type = "all" } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    const systemPrompt = `\u4F60\u662F\u4E00\u4F4D\u5185\u5BB9\u7B56\u5212\u4E13\u5BB6\uFF0C\u64C5\u957F\u6839\u636E\u7528\u6237\u8F93\u5165\u7684\u4E3B\u9898\u63A8\u8350\u5408\u9002\u7684\u521B\u4F5C\u65B9\u5411\u3002\u8BF7\u7ED9\u51FA3\u4E2A\u63A8\u8350\u65B9\u5411\uFF0C\u6BCF\u4E2A\u65B9\u5411\u5305\u542B\uFF1A\u6807\u9898\u3001\u5173\u952E\u8BCD\u3001\u9002\u7528\u5E73\u53F0\u3002\u7528JSON\u6570\u7EC4\u683C\u5F0F\u8F93\u51FA\u3002`;
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `\u4E3B\u9898\uFF1A${topic}

\u8BF7\u63A8\u8350\u521B\u4F5C\u65B9\u5411` }
    ];
    const response = await llmClient.invoke(messages, { model: "deepseek-v3-2-251201", temperature: 0.8 });
    let recommendations = [];
    try {
      const jsonMatch = response.content?.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      }
    } catch {
      recommendations = [
        { title: `${topic}\u7684\u521B\u610F\u89D2\u5EA6`, keywords: [topic], platforms: ["\u5C0F\u7EA2\u4E66", "\u6296\u97F3"] },
        { title: `${topic}\u7684\u6DF1\u5EA6\u5206\u6790`, keywords: [topic, "\u5E72\u8D27"], platforms: ["\u77E5\u4E4E", "\u516C\u4F17\u53F7"] },
        { title: `${topic}\u7684\u8DA3\u5473\u73A9\u6CD5`, keywords: [topic, "\u8DA3\u5473"], platforms: ["\u6296\u97F3", "B\u7AD9"] }
      ];
    }
    res.json({ topic, recommendations });
  } catch (error) {
    console.error("Recommend error:", error);
    res.status(500).json({ error: "\u63A8\u8350\u5931\u8D25" });
  }
});
app.post("/api/v1/admin/clear-cache", (req, res) => {
  clearCache();
  res.json({ success: true, message: "Cache cleared" });
});
var PERMANENT_VIP_PHONE = "18104962855";
function getClient(res) {
  const client = getSupabaseClient();
  if (!client) {
    res.status(503).json({ error: "\u6570\u636E\u5E93\u670D\u52A1\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" });
    return null;
  }
  return client;
}
function generateCode(length = 6) {
  return Math.random().toString().slice(2, 2 + length);
}
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}
app.post("/api/v1/auth/send-code", async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone || !purpose) return res.status(400).json({ error: "\u624B\u673A\u53F7\u548C\u7528\u9014\u4E0D\u80FD\u4E3A\u7A7A" });
    if (!/^1\d{10}$/.test(phone)) return res.status(400).json({ error: "\u624B\u673A\u53F7\u683C\u5F0F\u4E0D\u6B63\u786E" });
    if (process.env.NODE_ENV !== "production" && !getSupabaseClient()) {
      const devCode = "123456";
      console.log(`[\u5F00\u53D1\u6A21\u5F0F] \u53D1\u9001\u9A8C\u8BC1\u7801 ${phone}: ${devCode}`);
      return res.json({ success: true, message: "\u9A8C\u8BC1\u7801\u5DF2\u53D1\u9001\uFF08\u5F00\u53D1\u6A21\u5F0F\uFF09", code: devCode });
    }
    const client = getClient(res);
    if (!client) return;
    const code = generateCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
    await client.from("verification_codes").update({ is_used: true }).eq("phone", phone).eq("purpose", purpose);
    await client.from("verification_codes").insert({ phone, code, purpose, expires_at: expiresAt.toISOString() });
    res.json({ success: true, message: "\u9A8C\u8BC1\u7801\u5DF2\u53D1\u9001", code });
  } catch (error) {
    console.error("[\u53D1\u9001\u9A8C\u8BC1\u7801] \u9519\u8BEF:", error);
    res.status(500).json({ error: "\u53D1\u9001\u9A8C\u8BC1\u7801\u5931\u8D25" });
  }
});
app.post("/api/v1/auth/register", async (req, res) => {
  try {
    const { phone, username, password, code } = req.body;
    if (!phone || !username || !password || !code) return res.status(400).json({ error: "\u6240\u6709\u5B57\u6BB5\u90FD\u4E0D\u80FD\u4E3A\u7A7A" });
    if (!/^1\d{10}$/.test(phone)) return res.status(400).json({ error: "\u624B\u673A\u53F7\u683C\u5F0F\u4E0D\u6B63\u786E" });
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: "\u7528\u6237\u540D\u9700\u89813-20\u4F4D\u5B57\u6BCD\u3001\u6570\u5B57\u6216\u4E0B\u5212\u7EBF" });
    if (password.length < 6) return res.status(400).json({ error: "\u5BC6\u7801\u81F3\u5C116\u4F4D" });
    const client = getClient(res);
    if (!client) return;
    const { data: validCode } = await client.from("verification_codes").select("*").eq("phone", phone).eq("code", code).eq("purpose", "register").eq("is_used", false).single();
    if (!validCode || new Date(validCode.expires_at) < /* @__PURE__ */ new Date()) {
      return res.status(400).json({ error: "\u9A8C\u8BC1\u7801\u65E0\u6548\u6216\u5DF2\u8FC7\u671F" });
    }
    await client.from("verification_codes").update({ is_used: true }).eq("id", validCode.id);
    const { data: existing } = await client.from("users").select("id").eq("phone", phone).single();
    if (existing) return res.status(400).json({ error: "\u8BE5\u624B\u673A\u53F7\u5DF2\u6CE8\u518C" });
    const { data: existingUsername } = await client.from("users").select("id").eq("username", username).single();
    if (existingUsername) return res.status(400).json({ error: "\u7528\u6237\u540D\u5DF2\u88AB\u5360\u7528" });
    const hashedPassword = hashPassword(password);
    const isPermanentVip = phone === PERMANENT_VIP_PHONE;
    const { data: newUser, error: insertError } = await client.from("users").insert({ phone, username, password: hashedPassword, is_vip: isPermanentVip, vip_end_date: isPermanentVip ? "2099-12-31" : null }).select().single();
    if (insertError) return res.status(500).json({ error: "\u6CE8\u518C\u5931\u8D25" });
    await client.from("verification_codes").update({ is_used: true }).eq("id", validCode.id);
    res.json({
      success: true,
      user: { id: newUser.id, phone: newUser.phone, username: newUser.username, isPermanentVip, isVip: isPermanentVip },
      token: Buffer.from(`${newUser.id}:${Date.now()}`).toString("base64")
    });
  } catch (error) {
    console.error("[\u6CE8\u518C] \u9519\u8BEF:", error);
    res.status(500).json({ error: "\u6CE8\u518C\u5931\u8D25" });
  }
});
app.post("/api/v1/auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: "\u624B\u673A\u53F7\u548C\u5BC6\u7801\u4E0D\u80FD\u4E3A\u7A7A" });
    const client = getSupabaseClient();
    const hashedPassword = hashPassword(password);
    const { data: user, error } = await client.from("users").select("*").eq("phone", phone).eq("password", hashedPassword).single();
    if (error || !user) return res.status(401).json({ error: "\u624B\u673A\u53F7\u6216\u5BC6\u7801\u9519\u8BEF" });
    const isPermanentVip = user.phone === PERMANENT_VIP_PHONE;
    const isVip = isPermanentVip || user.is_vip && new Date(user.vip_end_date) > /* @__PURE__ */ new Date();
    res.json({
      success: true,
      user: { id: user.id, phone: user.phone, username: user.username, isPermanentVip, isVip, vipEndDate: user.vip_end_date },
      token: Buffer.from(`${user.id}:${Date.now()}`).toString("base64")
    });
  } catch (error) {
    console.error("[\u767B\u5F55] \u9519\u8BEF:", error);
    res.status(500).json({ error: "\u767B\u5F55\u5931\u8D25" });
  }
});
app.get("/api/v1/auth/user-info", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "\u672A\u767B\u5F55" });
    const client = getSupabaseClient();
    const { data: user } = await client.from("users").select("*").eq("id", userId).single();
    if (!user) return res.status(404).json({ error: "\u7528\u6237\u4E0D\u5B58\u5728" });
    const isPermanentVip = user.phone === PERMANENT_VIP_PHONE;
    const isVip = isPermanentVip || user.is_vip && new Date(user.vip_end_date) > /* @__PURE__ */ new Date();
    res.json({ id: user.id, phone: user.phone, username: user.username, isPermanentVip, isVip, vipEndDate: user.vip_end_date, points: user.points || 0 });
  } catch (error) {
    console.error("[\u83B7\u53D6\u7528\u6237\u4FE1\u606F] \u9519\u8BEF:", error);
    res.status(500).json({ error: "\u83B7\u53D6\u7528\u6237\u4FE1\u606F\u5931\u8D25" });
  }
});
app.post("/api/v1/auth/activate-free-code", async (req, res) => {
  try {
    const { freeCode, phone } = req.body;
    const userId = req.headers["x-user-id"];
    if (!freeCode || !phone) return res.status(400).json({ error: "\u514D\u8D39\u7801\u548C\u624B\u673A\u53F7\u4E0D\u80FD\u4E3A\u7A7A" });
    const client = getSupabaseClient();
    const { data: codeData } = await client.from("free_codes").select("*").eq("code", freeCode).single();
    if (!codeData) return res.status(404).json({ error: "\u514D\u8D39\u7801\u65E0\u6548" });
    if (codeData.is_used) return res.status(400).json({ error: "\u514D\u8D39\u7801\u5DF2\u88AB\u4F7F\u7528" });
    if (new Date(codeData.expires_at) < /* @__PURE__ */ new Date()) return res.status(400).json({ error: "\u514D\u8D39\u7801\u5DF2\u8FC7\u671F" });
    const daysToAdd = codeData.days;
    const { data: user } = await client.from("users").select("*").eq("id", userId).single();
    if (!user) return res.status(404).json({ error: "\u7528\u6237\u4E0D\u5B58\u5728" });
    let newVipEndDate;
    if (user.vip_end_date && new Date(user.vip_end_date) > /* @__PURE__ */ new Date()) {
      newVipEndDate = new Date(new Date(user.vip_end_date).getTime() + daysToAdd * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    } else {
      newVipEndDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    }
    await client.from("users").update({ is_vip: true, vip_end_date: newVipEndDate }).eq("id", userId);
    await client.from("free_codes").update({ is_used: true, used_by: phone, used_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("code", freeCode);
    res.json({ success: true, message: `\u5DF2\u6210\u529F\u6FC0\u6D3B${daysToAdd}\u5929\u4F1A\u5458`, vipEndDate: newVipEndDate });
  } catch (error) {
    console.error("[\u6FC0\u6D3B\u514D\u8D39\u7801] \u9519\u8BEF:", error);
    res.status(500).json({ error: "\u6FC0\u6D3B\u5931\u8D25" });
  }
});
app.post("/api/v1/auth/generate-free-code", async (req, res) => {
  try {
    const { days = 30, isGift = false, recipientPhone = "" } = req.body;
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "\u8BF7\u5148\u767B\u5F55" });
    const client = getSupabaseClient();
    const { data: user } = await client.from("users").select("*").eq("id", userId).single();
    if (!user) return res.status(404).json({ error: "\u7528\u6237\u4E0D\u5B58\u5728" });
    const code = `${Date.now().toString(36)}${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
    await client.from("free_codes").insert({
      code,
      days,
      is_gift: isGift,
      recipient_phone: recipientPhone || null,
      generated_by: user.phone,
      generated_at: (/* @__PURE__ */ new Date()).toISOString(),
      expires_at: expiresAt.toISOString(),
      is_used: false
    });
    res.json({ success: true, code, days, expiresAt: expiresAt.toISOString(), isGift, recipientPhone: recipientPhone || null });
  } catch (error) {
    console.error("[\u751F\u6210\u514D\u8D39\u7801] \u9519\u8BEF:", error);
    res.status(500).json({ error: "\u751F\u6210\u5931\u8D25" });
  }
});
app.post("/api/v1/logs/client", async (req, res) => {
  try {
    const { logs } = req.body;
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: "\u65E0\u6548\u7684\u65E5\u5FD7\u6570\u636E" });
    }
    logs.forEach((log) => {
      const logMessage = `[\u5BA2\u6237\u7AEF\u65E5\u5FD7] [${log.type}] [${log.source}] ${log.message}`;
      if (log.type === "error") {
        console.error(logMessage, log.details);
      } else if (log.type === "warning") {
        console.warn(logMessage, log.details);
      } else {
        console.log(logMessage, log.details);
      }
    });
    res.json({ success: true, count: logs.length });
  } catch (error) {
    console.error("Client logs error:", error);
    res.status(500).json({ error: "\u63A5\u6536\u65E5\u5FD7\u5931\u8D25" });
  }
});
app.get("/api/v1/free-codes/options", (req, res) => {
  res.json({
    options: [
      { type: "1_month", label: "1\u4E2A\u6708", days: 30 },
      { type: "3_months", label: "\u4E00\u5B63\u5EA6", days: 90 },
      { type: "6_months", label: "\u534A\u5E74", days: 180 },
      { type: "1_year", label: "\u4E00\u5E74", days: 365 }
    ]
  });
});
app.post("/api/v1/free-codes/apply", async (req, res) => {
  try {
    const { phone, durationType, recipientPhone } = req.body;
    if (!phone || !durationType) {
      return res.status(400).json({ error: "\u624B\u673A\u53F7\u548C\u65F6\u957F\u7C7B\u578B\u4E0D\u80FD\u4E3A\u7A7A" });
    }
    const ALLOWED_FREE_CODE_PHONE = "18104962855";
    if (phone !== ALLOWED_FREE_CODE_PHONE) {
      return res.status(403).json({ error: "\u62B1\u6B49\uFF0C\u4EC5\u9650\u6307\u5B9A\u7528\u6237\u7533\u8BF7\u514D\u8D39\u7801" });
    }
    const client = getSupabaseClient();
    const { data: user, error: userError } = await client.from("users").select("id, phone, username, is_permanent_vip").eq("phone", phone).maybeSingle();
    if (userError) throw userError;
    if (!user) {
      return res.status(400).json({ error: "\u8BF7\u5148\u6CE8\u518C\u8D26\u53F7" });
    }
    if (recipientPhone) {
      if (!/^1\d{10}$/.test(recipientPhone)) {
        return res.status(400).json({ error: "\u63A5\u6536\u4EBA\u624B\u673A\u53F7\u683C\u5F0F\u4E0D\u6B63\u786E" });
      }
      const { data: recipient, error: recipientError } = await client.from("users").select("id, phone, username, is_permanent_vip").eq("phone", recipientPhone).maybeSingle();
      if (recipientError) throw recipientError;
      if (!recipient) {
        return res.status(400).json({ error: "\u63A5\u6536\u4EBA\u8D26\u53F7\u4E0D\u5B58\u5728\uFF0C\u8BF7\u63D0\u9192\u597D\u53CB\u5148\u6CE8\u518C" });
      }
      if (recipient.is_permanent_vip) {
        return res.status(400).json({ error: "\u63A5\u6536\u4EBA\u662F\u6C38\u4E45\u4F1A\u5458\uFF0C\u65E0\u9700\u514D\u8D39\u7801" });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const { data: recipientMembership } = await client.from("user_memberships").select("*").eq("user_id", recipient.id).gt("end_date", now).maybeSingle();
      if (recipientMembership) {
        return res.status(400).json({ error: "\u63A5\u6536\u4EBA\u5DF2\u6709\u6709\u6548\u7684\u4F1A\u5458\u671F\u9650" });
      }
    }
    const code = generateCode(8).toUpperCase();
    let durationDays = 30;
    switch (durationType) {
      case "1_month":
        durationDays = 30;
        break;
      case "3_months":
        durationDays = 90;
        break;
      case "6_months":
        durationDays = 180;
        break;
      case "1_year":
        durationDays = 365;
        break;
      default:
        return res.status(400).json({ error: "\u65E0\u6548\u7684\u65F6\u957F\u7C7B\u578B" });
    }
    const { error: insertError } = await client.from("free_codes").insert({
      code,
      duration_type: durationType,
      duration_days: durationDays,
      recipient_phone: recipientPhone || null
    });
    if (insertError) throw insertError;
    res.json({
      success: true,
      message: recipientPhone ? "\u8D60\u9001\u7801\u751F\u6210\u6210\u529F\uFF0C\u53EF\u76F4\u63A5\u53D1\u7ED9\u597D\u53CB\u4F7F\u7528" : "\u514D\u8D39\u7801\u751F\u6210\u6210\u529F",
      freeCode: code,
      durationType,
      durationDays,
      isGifted: !!recipientPhone,
      recipientPhone: recipientPhone || null
    });
  } catch (error) {
    console.error("Apply free code error:", error);
    res.status(500).json({ error: "\u7533\u8BF7\u514D\u8D39\u7801\u5931\u8D25" });
  }
});
app.post("/api/v1/free-codes/activate", async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ error: "\u7528\u6237ID\u548C\u514D\u8D39\u7801\u4E0D\u80FD\u4E3A\u7A7A" });
    }
    const client = getSupabaseClient();
    const { data: freeCode, error: codeError } = await client.from("free_codes").select("*").eq("code", code.toUpperCase()).eq("is_used", false).maybeSingle();
    if (codeError) throw codeError;
    if (!freeCode) {
      return res.status(400).json({ error: "\u514D\u8D39\u7801\u65E0\u6548\u6216\u5DF2\u88AB\u4F7F\u7528" });
    }
    const { data: user, error: userError } = await client.from("users").select("id, phone, is_permanent_vip").eq("id", userId).maybeSingle();
    if (userError) throw userError;
    if (!user) {
      return res.status(400).json({ error: "\u7528\u6237\u4E0D\u5B58\u5728" });
    }
    if (user.is_permanent_vip) {
      return res.status(400).json({ error: "\u60A8\u662F\u6C38\u4E45\u4F1A\u5458\uFF0C\u65E0\u9700\u6FC0\u6D3B\u514D\u8D39\u7801" });
    }
    if (freeCode.recipient_phone && freeCode.recipient_phone !== user.phone) {
      return res.status(400).json({ error: "\u6B64\u514D\u8D39\u7801\u4E0D\u9002\u7528\u4E8E\u60A8\u7684\u8D26\u53F7" });
    }
    const now = /* @__PURE__ */ new Date();
    const endDate = new Date(now.getTime() + freeCode.duration_days * 24 * 60 * 60 * 1e3);
    await client.from("free_codes").update({
      is_used: true,
      used_by: userId,
      used_at: now.toISOString()
    }).eq("id", freeCode.id);
    await client.from("user_memberships").insert({
      user_id: userId,
      membership_type: "free_code",
      source: `free_code_${freeCode.duration_type}`,
      start_date: now.toISOString(),
      end_date: endDate.toISOString()
    });
    res.json({
      success: true,
      message: "\u514D\u8D39\u7801\u6FC0\u6D3B\u6210\u529F",
      membership: {
        startDate: now.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  } catch (error) {
    console.error("Activate free code error:", error);
    res.status(500).json({ error: "\u6FC0\u6D3B\u514D\u8D39\u7801\u5931\u8D25" });
  }
});
app.get("/api/v1/user/membership", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.headers["x-device-id"];
    if (!userId) {
      return res.status(400).json({ error: "\u7528\u6237ID\u4E0D\u80FD\u4E3A\u7A7A" });
    }
    const client = getSupabaseClient();
    const { data: user, error: userError } = await client.from("users").select("id, phone, username, is_permanent_vip").eq("id", userId).maybeSingle();
    if (userError) throw userError;
    if (!user) {
      return res.status(404).json({ error: "\u7528\u6237\u4E0D\u5B58\u5728" });
    }
    if (user.is_permanent_vip) {
      return res.json({
        isVip: true,
        isPermanentVip: true,
        vipEndDate: null,
        message: "\u6C38\u4E45\u4F1A\u5458"
      });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { data: activeMembership } = await client.from("user_memberships").select("*").eq("user_id", userId).gt("end_date", now).maybeSingle();
    res.json({
      isVip: !!activeMembership,
      isPermanentVip: false,
      vipEndDate: activeMembership?.end_date || null,
      membership: activeMembership || null
    });
  } catch (error) {
    console.error("Get membership error:", error);
    res.status(500).json({ error: "\u83B7\u53D6\u4F1A\u5458\u72B6\u6001\u5931\u8D25" });
  }
});
app.get("/api/v1/user/points", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(400).json({ error: "\u7528\u6237ID\u4E0D\u80FD\u4E3A\u7A7A" });
    }
    const client = getSupabaseClient();
    const { data: user, error: userError } = await client.from("users").select("id, points").eq("id", userId).maybeSingle();
    if (userError) throw userError;
    if (!user) {
      return res.status(404).json({ error: "\u7528\u6237\u4E0D\u5B58\u5728" });
    }
    const { data: transactions, error: txError } = await client.from("point_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    if (txError) throw txError;
    res.json({
      points: user.points || 0,
      transactions: transactions || []
    });
  } catch (error) {
    console.error("Get points error:", error);
    res.status(500).json({ error: "\u83B7\u53D6\u79EF\u5206\u5931\u8D25" });
  }
});
app.post("/api/v1/free-codes/buy", async (req, res) => {
  try {
    const { durationType, recipientPhone } = req.body;
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ error: "\u8BF7\u5148\u767B\u5F55" });
    }
    if (!durationType) {
      return res.status(400).json({ error: "\u8BF7\u9009\u62E9\u65F6\u957F\u7C7B\u578B" });
    }
    const FREE_CODE_PRICES = {
      "1_month": { points: 30, days: 30 },
      "3_months": { points: 80, days: 90 },
      "6_months": { points: 150, days: 180 },
      "1_year": { points: 280, days: 365 }
    };
    const price = FREE_CODE_PRICES[durationType];
    if (!price) {
      return res.status(400).json({ error: "\u65E0\u6548\u7684\u65F6\u957F\u7C7B\u578B" });
    }
    const client = getSupabaseClient();
    const { data: user, error: userError } = await client.from("users").select("id, phone, points").eq("id", userId).maybeSingle();
    if (userError) throw userError;
    if (!user) {
      return res.status(404).json({ error: "\u7528\u6237\u4E0D\u5B58\u5728" });
    }
    const currentPoints = user.points || 0;
    if (currentPoints < price.points) {
      return res.status(400).json({
        error: "\u79EF\u5206\u4E0D\u8DB3",
        required: price.points,
        current: currentPoints
      });
    }
    if (recipientPhone) {
      if (!/^1\d{10}$/.test(recipientPhone)) {
        return res.status(400).json({ error: "\u63A5\u6536\u4EBA\u624B\u673A\u53F7\u683C\u5F0F\u4E0D\u6B63\u786E" });
      }
      const { data: recipient, error: recipientError } = await client.from("users").select("id, phone, is_permanent_vip").eq("phone", recipientPhone).maybeSingle();
      if (recipientError) throw recipientError;
      if (!recipient) {
        return res.status(400).json({ error: "\u63A5\u6536\u4EBA\u8D26\u53F7\u4E0D\u5B58\u5728\uFF0C\u8BF7\u63D0\u9192\u597D\u53CB\u5148\u6CE8\u518C" });
      }
      if (recipient.is_permanent_vip) {
        return res.status(400).json({ error: "\u63A5\u6536\u4EBA\u662F\u6C38\u4E45\u4F1A\u5458\uFF0C\u65E0\u9700\u514D\u8D39\u7801" });
      }
    }
    const newPoints = currentPoints - price.points;
    await client.from("users").update({ points: newPoints }).eq("id", userId);
    await client.from("point_transactions").insert({
      id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type: "spend",
      amount: price.points,
      source: "buy_free_code",
      description: `\u8D2D\u4E70${durationType === "1_month" ? "1\u4E2A\u6708" : durationType === "3_months" ? "\u4E00\u5B63\u5EA6" : durationType === "6_months" ? "\u534A\u5E74" : "\u4E00\u5E74"}\u514D\u8D39\u7801${recipientPhone ? `\uFF08\u8D60\u9001\u7ED9${recipientPhone}\uFF09` : ""}`
    });
    const code = generateCode(8).toUpperCase();
    await client.from("free_codes").insert({
      code,
      duration_type: durationType,
      duration_days: price.days,
      recipient_phone: recipientPhone || null,
      is_purchased: true
    });
    res.json({
      success: true,
      message: recipientPhone ? "\u8D2D\u4E70\u6210\u529F\uFF0C\u597D\u53CB\u53EF\u4F7F\u7528\u6B64\u7801" : "\u8D2D\u4E70\u6210\u529F",
      freeCode: code,
      durationType,
      durationDays: price.days,
      pointsSpent: price.points,
      remainingPoints: newPoints,
      recipientPhone: recipientPhone || null
    });
  } catch (error) {
    console.error("Buy free code error:", error);
    res.status(500).json({ error: "\u8D2D\u4E70\u514D\u8D39\u7801\u5931\u8D25" });
  }
});
app.post("/api/v1/user/daily-checkin", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ error: "\u8BF7\u5148\u767B\u5F55" });
    }
    const client = getSupabaseClient();
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const { data: existingCheckin, error: checkinError } = await client.from("point_transactions").select("id").eq("user_id", userId).eq("source", "daily_checkin").gte("created_at", `${today}T00:00:00`).maybeSingle();
    if (checkinError) throw checkinError;
    if (existingCheckin) {
      return res.status(400).json({ error: "\u4ECA\u65E5\u5DF2\u7B7E\u5230\uFF0C\u660E\u5929\u518D\u6765\u5427" });
    }
    const { data: user, error: userError } = await client.from("users").select("points").eq("id", userId).maybeSingle();
    if (userError) throw userError;
    const CHECKIN_POINTS = 10;
    const newPoints = (user?.points || 0) + CHECKIN_POINTS;
    await client.from("users").update({ points: newPoints }).eq("id", userId);
    await client.from("point_transactions").insert({
      id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type: "earn",
      amount: CHECKIN_POINTS,
      source: "daily_checkin",
      description: "\u6BCF\u65E5\u7B7E\u5230"
    });
    res.json({
      success: true,
      message: `\u7B7E\u5230\u6210\u529F\uFF0C\u83B7\u5F97${CHECKIN_POINTS}\u79EF\u5206`,
      pointsEarned: CHECKIN_POINTS,
      totalPoints: newPoints
    });
  } catch (error) {
    console.error("Daily checkin error:", error);
    res.status(500).json({ error: "\u7B7E\u5230\u5931\u8D25" });
  }
});
app.get("/api/v1/admin/settings", async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from("app_settings").select("*").eq("id", "global").single();
    if (error && error.code !== "PGRST116") {
      console.error("Get settings error:", error);
      return res.status(500).json({ error: "\u83B7\u53D6\u8BBE\u7F6E\u5931\u8D25" });
    }
    const settings = data || {
      id: "global",
      content_filter_enabled: false
    };
    res.json({
      contentFilterEnabled: settings.content_filter_enabled
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "\u83B7\u53D6\u8BBE\u7F6E\u5931\u8D25" });
  }
});
app.put("/api/v1/admin/settings", async (req, res) => {
  try {
    const { contentFilterEnabled } = req.body;
    if (typeof contentFilterEnabled !== "boolean") {
      return res.status(400).json({ error: "contentFilterEnabled must be a boolean" });
    }
    const client = getSupabaseClient();
    const { data, error } = await client.from("app_settings").upsert({
      id: "global",
      content_filter_enabled: contentFilterEnabled,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
    if (error) {
      console.error("Update settings error:", error);
      return res.status(500).json({ error: "\u66F4\u65B0\u8BBE\u7F6E\u5931\u8D25" });
    }
    res.json({
      success: true,
      contentFilterEnabled: data.content_filter_enabled
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "\u66F4\u65B0\u8BBE\u7F6E\u5931\u8D25" });
  }
});
app.listen(port, "0.0.0.0", () => {
  console.log(`\u{1F680} Server listening on http://0.0.0.0:${port}/`);
  console.log(`\u2705 Zeabur should now forward to this port`);
  console.log(`\u{1F4DD} \u6027\u80FD\u4F18\u5316: \u7F13\u5B58\u7CFB\u7EDF\u5DF2\u542F\u7528, \u4EFB\u52A1\u961F\u5217\u5DF2\u5C31\u7EEA`);
});
function sanitizeImagePrompt(prompt) {
  let sanitized = prompt;
  const reasons = [];
  const sensitiveWordMap = {
    "\u7279\u6717\u666E": { en: "a mature gentleman with orange hair", zh: "\u4E00\u4F4D\u6210\u719F\u7537\u58EB\uFF0C\u6234\u7740\u6A59\u8272\u5047\u53D1" },
    "Trump": { en: "a mature gentleman with orange hair", zh: "\u4E00\u4F4D\u6210\u719F\u7537\u58EB\uFF0C\u6234\u7740\u6A59\u8272\u5047\u53D1" },
    "\u5DDD\u666E": { en: "a mature gentleman with orange hair", zh: "\u4E00\u4F4D\u6210\u719F\u7537\u58EB\uFF0C\u6234\u7740\u6A59\u8272\u5047\u53D1" },
    "\u62DC\u767B": { en: "an elderly gentleman with white hair", zh: "\u4E00\u4F4D\u8001\u5E74\u7537\u58EB\uFF0C\u767D\u53D1" },
    "Biden": { en: "an elderly gentleman with white hair", zh: "\u4E00\u4F4D\u8001\u5E74\u7537\u58EB\uFF0C\u767D\u53D1" },
    "\u5965\u5DF4\u9A6C": { en: "a middle-aged African American man", zh: "\u4E00\u4F4D\u4E2D\u5E74\u975E\u88D4\u7537\u58EB" },
    "Obama": { en: "a middle-aged African American man", zh: "\u4E00\u4F4D\u4E2D\u5E74\u975E\u88D4\u7537\u58EB" },
    "\u5C0F\u5E03\u4EC0": { en: "an older American gentleman", zh: "\u4E00\u4F4D\u7F8E\u56FD\u8001\u5E74\u7537\u58EB" },
    "\u5E03\u4EC0": { en: "an American gentleman", zh: "\u4E00\u4F4D\u7F8E\u56FD\u7537\u58EB" },
    "\u88F8\u4F53": { en: "cartoon character", zh: "\u5361\u901A\u5F62\u8C61" },
    "\u8840\u8165": { en: "clean and fresh", zh: "\u5E72\u51C0\u6E05\u65B0" },
    "\u66B4\u529B": { en: "peaceful and friendly", zh: "\u548C\u5E73\u53CB\u597D" }
  };
  for (const [sensitiveWord, replacement] of Object.entries(sensitiveWordMap)) {
    const regex = new RegExp(sensitiveWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(regex, replacement.zh);
      reasons.push(`"${sensitiveWord}"\u5DF2\u66FF\u6362\u4E3A"${replacement.zh}"`);
    }
  }
  return { sanitized, reasons };
}
function sanitizePrompt(prompt) {
  let sanitized = prompt;
  const reasons = [];
  const sensitiveWordMap = {
    "\u7279\u6717\u666E": "\u521B\u610F\u4EBA\u7269",
    "Trump": "\u521B\u610F\u4EBA\u7269",
    "\u5DDD\u666E": "\u521B\u610F\u4EBA\u7269",
    "\u62DC\u767B": "\u957F\u8005",
    "Biden": "\u957F\u8005",
    "\u5965\u5DF4\u9A6C": "\u7EC5\u58EB",
    "Obama": "\u7EC5\u58EB",
    "\u5C0F\u5E03\u4EC0": "\u7537\u58EB",
    "\u5E03\u4EC0": "\u7537\u58EB",
    "\u88F8\u4F53": "\u4F18\u96C5",
    "\u8272\u60C5": "\u7F8E\u597D",
    "\u8D4C\u535A": "\u5A31\u4E50",
    "\u66B4\u529B": "\u548C\u5E73",
    "\u8840\u8165": "\u6E05\u65B0",
    "\u6BD2\u54C1": "\u5065\u5EB7",
    "\u81EA\u6740": "\u79EF\u6781",
    "\u653F\u6CBB": "\u521B\u610F"
  };
  for (const [sensitiveWord, replacement] of Object.entries(sensitiveWordMap)) {
    const regex = new RegExp(sensitiveWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(regex, replacement);
      reasons.push(`"${sensitiveWord}"\u5DF2\u66FF\u6362\u4E3A"${replacement}"`);
    }
  }
  return { sanitized, reasons };
}
async function isContentAllowed(prompt) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from("app_settings").select("content_filter_enabled").eq("id", "global").single();
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
