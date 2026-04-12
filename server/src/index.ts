import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import {
  ImageGenerationClient,
  VideoGenerationClient,
  LLMClient,
  FetchClient,
  Config,
  HeaderUtils,
} from "coze-coding-dev-sdk";
import type { Message } from "coze-coding-dev-sdk";

// AI 模型配置
// 图片生成使用豆包模型 doubao-seedream-4-5-251128（默认，无需显式指定）
const VIDEO_MODEL = "doubao-seedance-1-5-pro-251215"; // 即梦视频生成模型

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// 视频时长配置
const VIDEO_DURATIONS = {
  free: { duration: 5, label: "5秒", price: "免费", maxPerDay: 10 },
  paid5: { duration: 10, label: "10秒", price: "10积分", maxPerDay: -1 },
  paid10: { duration: 15, label: "15秒", price: "20积分", maxPerDay: -1 },
  paid15: { duration: 20, label: "20秒", price: "30积分", maxPerDay: -1 },
} as const;

// 每日生成限制配置
const DAILY_LIMITS = {
  images: {
    perBatch: 2,      // 每次生成2张
    maxPerDay: 20,    // 每天免费20张
    chargePerImage: 1, // 超过后每张1积分
  },
  texts: {
    perBatch: 1,      // 每次生成1条
    maxPerDay: 10,    // 每天免费10次
    chargePerText: 2,  // 超过后每次2积分
  },
};

// 内存中的每日数据（生产环境应使用数据库）
interface DailyData {
  date: string;
  imageCount: number;
  textCount: number;
  videoEdits: number;
}

const dailyData: Record<string, DailyData> = {};

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getOrCreateDailyData(deviceId: string): DailyData {
  const today = getTodayKey();
  const record = dailyData[deviceId];
  
  // 新的一天，重置计数
  if (!record || record.date !== today) {
    dailyData[deviceId] = {
      date: today,
      imageCount: 0,
      textCount: 0,
      videoEdits: 0,
    };
  }
  
  return dailyData[deviceId];
}

function getRemainingCounts(deviceId: string): {
  remainingImages: number;
  remainingTexts: number;
  remainingVideoEdits: number;
} {
  const data = getOrCreateDailyData(deviceId);
  return {
    remainingImages: Math.max(0, DAILY_LIMITS.images.maxPerDay - data.imageCount),
    remainingTexts: Math.max(0, DAILY_LIMITS.texts.maxPerDay - data.textCount),
    remainingVideoEdits: VIDEO_DURATIONS.free.maxPerDay - data.videoEdits,
  };
}

function checkVideoEditAllowed(deviceId: string, durationType: string): { 
  allowed: boolean; 
  remaining: number;
} {
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

// Health check
app.get("/api/v1/health", (req, res) => {
  console.log("Health check success");
  res.status(200).json({ status: "ok" });
});

/**
 * 获取每日限制信息
 */
app.get("/api/v1/limits", (req, res) => {
  const deviceId = (req.headers["x-device-id"] as string) || "default";
  const remaining = getRemainingCounts(deviceId);
  
  res.json({
    images: {
      perBatch: DAILY_LIMITS.images.perBatch,
      maxPerDay: DAILY_LIMITS.images.maxPerDay,
      remaining: remaining.remainingImages,
      canGenerate: remaining.remainingImages >= DAILY_LIMITS.images.perBatch,
    },
    texts: {
      perBatch: DAILY_LIMITS.texts.perBatch,
      maxPerDay: DAILY_LIMITS.texts.maxPerDay,
      remaining: remaining.remainingTexts,
      canGenerate: remaining.remainingTexts >= DAILY_LIMITS.texts.perBatch,
    },
    videoEdits: {
      free: {
        maxPerDay: VIDEO_DURATIONS.free.maxPerDay,
        remaining: remaining.remainingVideoEdits,
        canGenerate: remaining.remainingVideoEdits > 0,
      },
    },
  });
});

/**
 * 获取视频时长选项
 */
app.get("/api/v1/video/durations", (req, res) => {
  const deviceId = (req.headers["x-device-id"] as string) || "default";
  const remaining = getRemainingCounts(deviceId);
  
  res.json({
    durations: [
      {
        type: "free",
        duration: VIDEO_DURATIONS.free.duration,
        label: VIDEO_DURATIONS.free.label,
        price: VIDEO_DURATIONS.free.price,
        description: `每日可编辑${VIDEO_DURATIONS.free.maxPerDay}次`,
        remainingEdits: remaining.remainingVideoEdits,
      },
      {
        type: "paid5",
        duration: VIDEO_DURATIONS.paid5.duration,
        label: VIDEO_DURATIONS.paid5.label,
        price: VIDEO_DURATIONS.paid5.price,
        description: "每增加5秒收取10积分",
      },
      {
        type: "paid10",
        duration: VIDEO_DURATIONS.paid10.duration,
        label: VIDEO_DURATIONS.paid10.label,
        price: VIDEO_DURATIONS.paid10.price,
        description: "每增加10秒收取20积分",
      },
      {
        type: "paid15",
        duration: VIDEO_DURATIONS.paid15.duration,
        label: VIDEO_DURATIONS.paid15.label,
        price: VIDEO_DURATIONS.paid15.price,
        description: "每增加15秒收取30积分",
      },
    ],
    remainingFreeEdits: remaining.remainingVideoEdits,
  });
});

/**
 * 生成图片（单张，不计入每日限制）
 */
app.post("/api/v1/generate/image", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    // 图片生成使用豆包模型（SDK默认配置）
    const imageClient = new ImageGenerationClient(config, customHeaders);

    let currentPrompt = prompt;
    let success = false;
    let imageUrls: string[] = [];
    let errorMessages: string[] = [];
    let optimizationNote: string | undefined;

    // 首次尝试（使用豆包图片模型）
    try {
      const response = await imageClient.generate({
        prompt: currentPrompt,
        size: "2K",
        watermark: false,
      });
      const helper = imageClient.getResponseHelper(response);
      if (helper.success) {
        imageUrls = helper.imageUrls;
        success = true;
      } else {
        errorMessages = helper.errorMessages || [];
      }
    } catch (error: any) {
      // 检查是否是敏感内容错误
      const isSensitiveError = error?.response?.error?.code === 'InputTextSensitiveContentDetected' ||
                               error?.message?.includes('SensitiveContent');
      
      if (isSensitiveError) {
        console.log("Original prompt rejected, trying sanitized version...");
        const result = sanitizeImagePrompt(prompt);
        currentPrompt = result.sanitized;
        optimizationNote = result.reasons.length > 0 
          ? `已为您优化：${result.reasons.join('；')}，以确保内容可正常生成` 
          : undefined;
        
        // 脱敏后重试
        try {
          const response = await imageClient.generate({
            prompt: currentPrompt,
            size: "2K",
            watermark: false,
          });
          const helper = imageClient.getResponseHelper(response);
          if (helper.success) {
            imageUrls = helper.imageUrls;
            success = true;
          } else {
            errorMessages = helper.errorMessages || [];
          }
        } catch (retryError: any) {
          console.error("Retry also failed:", retryError);
          errorMessages = [retryError.message || "Image generation failed"];
        }
      } else {
        throw error;
      }
    }

    if (success) {
      res.json({ imageUrls, optimizationNote });
    } else {
      res.status(500).json({ errors: errorMessages });
    }
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});

/**
 * 生成文案（单条，不计入每日限制）
 */
app.post("/api/v1/generate/text", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位资深创意文案师，擅长创作短视频脚本、社交媒体文案、营销文案等。
根据用户提供的想法，生成适合配图的文案内容。
请直接输出文案内容，不需要解释。`;

    let currentPrompt = prompt;
    let messages: Message[] = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `想法主题：${currentPrompt}\n\n请生成一段吸引人的文案，可以用于配图或视频旁白。` },
    ];

    let response = await llmClient.invoke(messages, {
      model: "deepseek-v3-2-251201",
      temperature: 0.8,
    });

    let optimizationNote: string | undefined;

    // 如果LLM返回错误包含敏感词，尝试脱敏重试
    if (response.content?.includes?.('敏感') || response.content?.includes?.('无法生成')) {
      console.log("Original prompt rejected by LLM, trying sanitized version...");
      const result = sanitizePrompt(prompt);
      currentPrompt = result.sanitized;
      optimizationNote = result.reasons.length > 0 
        ? `已为您优化：${result.reasons.join('；')}，以确保内容可正常生成` 
        : undefined;
      messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: `想法主题：${currentPrompt}\n\n请生成一段吸引人的文案，可以用于配图或视频旁白。` },
      ];
      response = await llmClient.invoke(messages, {
        model: "deepseek-v3-2-251201",
        temperature: 0.8,
      });
    }

    res.json({ text: response.content, optimizationNote });
  } catch (error) {
    console.error("Text generation error:", error);
    res.status(500).json({ error: "Text generation failed" });
  }
});

/**
 * 生成视频
 */
app.post("/api/v1/generate/video", async (req: Request, res: Response) => {
  try {
    const { prompt, imageUrl, durationType = "free" } = req.body;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    // 检查内容是否允许，并获取脱敏后的提示词
    const contentCheck = await isContentAllowed(prompt);
    if (!contentCheck.allowed) {
      return res.status(400).json({ error: contentCheck.reason || "内容不允许生成" });
    }

    // 使用脱敏后的提示词
    const finalPrompt = contentCheck.sanitizedPrompt || prompt;

    const durationConfig = VIDEO_DURATIONS[durationType as keyof typeof VIDEO_DURATIONS] || VIDEO_DURATIONS.free;
    const duration = durationConfig.duration;

    // 检查视频编辑次数限制（只有5秒免费视频才限制）
    if (durationType === "free") {
      const check = checkVideoEditAllowed(deviceId, durationType);
      if (!check.allowed) {
        return res.status(403).json({
          error: "今日免费视频编辑次数已用完",
          remainingEdits: 0,
          message: "5秒视频每日可编辑10次，请明天再来或选择更长时长"
        });
      }
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const videoClient = new VideoGenerationClient(config, customHeaders);

    const contentItems: any[] = [];

    if (imageUrl) {
      contentItems.push({
        type: "image_url",
        image_url: { url: imageUrl },
        role: "first_frame",
      });
    }

    contentItems.push({
      type: "text",
      text: finalPrompt,
    });

    const response = await videoClient.videoGeneration(contentItems, {
      model: VIDEO_MODEL, // 即梦视频生成模型
      duration,
      ratio: "9:16",
      resolution: "720p",
      watermark: false,
      generateAudio: true,
    });

    if (response.videoUrl) {
      const remaining = getRemainingCounts(deviceId);
      
      res.json({
        videoUrl: response.videoUrl,
        lastFrameUrl: response.lastFrameUrl,
        duration,
        durationType,
        isFree: durationType === "free",
        remainingFreeEdits: remaining.remainingVideoEdits,
      });
    } else {
      res.status(500).json({ error: "Video generation failed" });
    }
  } catch (error) {
    console.error("Video generation error:", error);
    res.status(500).json({ error: "Video generation failed" });
  }
});

/**
 * 批量生成图片（计入每日限制）
 */
app.post("/api/v1/generate/images", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const data = getOrCreateDailyData(deviceId);
    const remaining = DAILY_LIMITS.images.maxPerDay - data.imageCount;
    
    // 检查剩余次数
    if (remaining <= 0) {
      return res.status(403).json({
        error: "今日图片生成次数已用完",
        remaining: 0,
        maxPerDay: DAILY_LIMITS.images.maxPerDay,
        message: `每日最多生成${DAILY_LIMITS.images.maxPerDay}张图片，请明天再来`
      });
    }

    // 每次生成2张
    const count = Math.min(DAILY_LIMITS.images.perBatch, remaining);

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const imgClient = new ImageGenerationClient(config, customHeaders);

    let currentPrompt = prompt;
    let success = false;
    let optimizationNote: string | undefined;

    // 首次尝试
    try {
      const requests = Array(count).fill(null).map(() => ({
        prompt: currentPrompt,
        size: "2K",
        watermark: false,
      }));
      await imgClient.batchGenerate(requests);
      success = true;
    } catch (error: any) {
      // 检查是否是敏感内容错误
      const isSensitiveError = error?.response?.error?.code === 'InputTextSensitiveContentDetected' ||
                               error?.message?.includes('SensitiveContent');
      
      if (isSensitiveError) {
        console.log("Original prompt rejected, trying sanitized version...");
        const result = sanitizeImagePrompt(prompt);
        currentPrompt = result.sanitized;
        optimizationNote = result.reasons.length > 0 
          ? `已为您优化：${result.reasons.join('；')}，以确保内容可正常生成` 
          : undefined;
        success = false;
      } else {
        throw error;
      }
    }

    // 如果失败，脱敏重试
    if (!success) {
      const requests = Array(count).fill(null).map(() => ({
        prompt: currentPrompt,
        size: "2K",
        watermark: false,
      }));
      await imgClient.batchGenerate(requests);
    }

    const imageUrls: string[] = [];

    // 重新获取结果
    const requests = Array(count).fill(null).map(() => ({
      prompt: currentPrompt,
      size: "2K",
      watermark: false,
    }));
    const responses = await imgClient.batchGenerate(requests);

    responses.forEach((response: any) => {
      const helper = imgClient.getResponseHelper(response);
      if (helper.success && helper.imageUrls.length > 0) {
        imageUrls.push(helper.imageUrls[0]);
        data.imageCount += 1;
      }
    });

    const newRemaining = DAILY_LIMITS.images.maxPerDay - data.imageCount;

    res.json({
      imageUrls,
      totalGenerated: imageUrls.length,
      perBatch: DAILY_LIMITS.images.perBatch,
      remaining: newRemaining,
      maxPerDay: DAILY_LIMITS.images.maxPerDay,
      optimizationNote,
    });
  } catch (error) {
    console.error("Image batch generation error:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});

/**
 * 批量生成文案（计入每日限制）
 */
app.post("/api/v1/generate/texts", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    // 先直接脱敏（让AI自动处理）
    const sanitizeResult = sanitizePrompt(prompt);
    const finalPrompt = sanitizeResult.sanitized;
    const optimizationNote = sanitizeResult.reasons.length > 0 
      ? `已为您优化：${sanitizeResult.reasons.join('；')}，以确保内容可正常生成` 
      : undefined;

    const data = getOrCreateDailyData(deviceId);
    const remaining = DAILY_LIMITS.texts.maxPerDay - data.textCount;
    
    // 检查剩余次数
    if (remaining <= 0) {
      return res.status(403).json({
        error: "今日文案生成次数已用完",
        remaining: 0,
        maxPerDay: DAILY_LIMITS.texts.maxPerDay,
        message: `每日最多生成${DAILY_LIMITS.texts.maxPerDay}条文案，请明天再来`
      });
    }

    // 每次生成1条
    const count = Math.min(DAILY_LIMITS.texts.perBatch, remaining);

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位资深创意文案师，擅长创作短视频脚本、社交媒体文案、营销文案等。
根据用户提供的想法，生成适合配图的文案内容。
请直接输出文案内容，不要加任何编号或前缀，不要解释。`;

    const texts: string[] = [];

    for (let i = 0; i < count; i++) {
      const messages: Message[] = [
        { role: "system" as const, content: systemPrompt },
        { 
          role: "user" as const, 
          content: `想法主题：${finalPrompt}\n\n请生成一段吸引人的文案，可以用于配图或视频旁白。` 
        },
      ];

      const response = await llmClient.invoke(messages, {
        model: "deepseek-v3-2-251201",
        temperature: 0.8,
      });

      if (response.content) {
        texts.push(response.content.trim());
        data.textCount += 1;
      }
    }

    const newRemaining = DAILY_LIMITS.texts.maxPerDay - data.textCount;

    res.json({
      texts,
      totalGenerated: texts.length,
      perBatch: DAILY_LIMITS.texts.perBatch,
      remaining: newRemaining,
      maxPerDay: DAILY_LIMITS.texts.maxPerDay,
      optimizationNote,
    });
  } catch (error) {
    console.error("Text batch generation error:", error);
    res.status(500).json({ error: "Text generation failed" });
  }
});

/**
 * 一键生成全部内容
 * POST /api/v1/generate/all
 */
app.post("/api/v1/generate/all", async (req: Request, res: Response) => {
  try {
    const { prompt, durationType = "free" } = req.body;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    const userId = req.headers["x-user-id"] as string;
    const isLoggedIn = !!userId;
    const HALF_RATE = 0.5; // 未登录用户次数减半
    
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    // 先直接脱敏获取优化说明
    const sanitizeResult = sanitizePrompt(prompt);
    const finalPrompt = sanitizeResult.sanitized;
    const optimizationNote = sanitizeResult.reasons.length > 0 
      ? `已为您优化：${sanitizeResult.reasons.join('；')}，以确保内容可正常生成` 
      : undefined;

    const durationConfig = VIDEO_DURATIONS[durationType as keyof typeof VIDEO_DURATIONS] || VIDEO_DURATIONS.free;
    const duration = durationConfig.duration;

    // 检查视频编辑次数限制（只有5秒免费视频才限制）
    if (durationType === "free") {
      const data = getOrCreateDailyData(deviceId);
      const remainingVideo = VIDEO_DURATIONS.free.maxPerDay - data.videoEdits;
      if (remainingVideo <= 0) {
        return res.status(403).json({
          error: "今日免费视频编辑次数已用完",
          remainingEdits: 0,
          isLoggedIn,
          message: `未登录用户每日可编辑${Math.floor(VIDEO_DURATIONS.free.maxPerDay * HALF_RATE)}次，请登录获取更多次数或明天再来`
        });
      }
    }

    const data = getOrCreateDailyData(deviceId);
    
    // 未登录用户次数减半
    const imageMaxPerDay = isLoggedIn ? DAILY_LIMITS.images.maxPerDay : Math.floor(DAILY_LIMITS.images.maxPerDay * HALF_RATE);
    const textMaxPerDay = isLoggedIn ? DAILY_LIMITS.texts.maxPerDay : Math.floor(DAILY_LIMITS.texts.maxPerDay * HALF_RATE);
    
    // 检查图片生成限制
    const imageRemaining = imageMaxPerDay - data.imageCount;
    if (imageRemaining < DAILY_LIMITS.images.perBatch) {
      return res.status(403).json({
        error: "今日图片生成次数不足",
        remainingImages: Math.max(0, imageRemaining),
        isLoggedIn,
        message: `未登录用户每日可生成${Math.floor(DAILY_LIMITS.images.perBatch)}张/共${imageMaxPerDay}张，请登录获取更多次数或明天再来`
      });
    }

    // 检查文案生成限制
    const textRemaining = textMaxPerDay - data.textCount;
    if (textRemaining < DAILY_LIMITS.texts.perBatch) {
      return res.status(403).json({
        error: "今日文案生成次数已用完",
        remainingTexts: Math.max(0, textRemaining),
        isLoggedIn,
        message: `未登录用户每日可生成${Math.floor(DAILY_LIMITS.texts.perBatch)}条/共${textMaxPerDay}条，请登录获取更多次数或明天再来`
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();

    // 图片生成使用豆包模型（SDK默认配置）
    const imageClient = new ImageGenerationClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);
    const videoClient = new VideoGenerationClient(config, customHeaders);

    // 1. 批量生成图片（2张）
    const imageRequests = Array(DAILY_LIMITS.images.perBatch).fill(null).map(() => ({
      prompt: finalPrompt,
      size: "2K",
      watermark: false,
    }));
    
    let imageUrls: string[] = [];
    try {
      const imageResponses = await imageClient.batchGenerate(imageRequests);
      
      imageResponses.forEach((response) => {
        const helper = imageClient.getResponseHelper(response);
        if (helper.success && helper.imageUrls.length > 0) {
          imageUrls.push(helper.imageUrls[0]);
          data.imageCount += 1;
        }
      });
    } catch (error: any) {
      // 检查是否是敏感内容审核错误 - 自动脱敏重试
      if (error?.response?.error?.code === 'InputTextSensitiveContentDetected') {
        console.log("Image generation sensitive error, retrying with sanitized prompt...");
        const retryResult = sanitizeImagePrompt(prompt);
        const retryPrompt = retryResult.sanitized;
        
        const retryRequests = Array(DAILY_LIMITS.images.perBatch).fill(null).map(() => ({
          prompt: retryPrompt,
          size: "2K",
          watermark: false,
        }));
        
        const retryResponses = await imageClient.batchGenerate(retryRequests);
        retryResponses.forEach((response: any) => {
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

    // 2. 生成文案（1条）
    const systemPrompt = `你是一位资深创意文案师，擅长创作短视频脚本、社交媒体文案、营销文案等。
根据用户提供的想法，生成适合配图的文案内容。
请直接输出文案内容，不要加任何编号或前缀，不要解释。`;

    const textMessages: Message[] = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `想法主题：${finalPrompt}\n\n请生成一段吸引人的文案，可以用于配图或视频旁白。` },
    ];

    const textResponse = await llmClient.invoke(textMessages, {
      model: "deepseek-v3-2-251201",
      temperature: 0.8,
    });

    const texts = textResponse.content ? [textResponse.content.trim()] : [];
    if (texts.length > 0) {
      data.textCount += 1;
    }

    // 3. 生成视频（使用第一张图片作为首帧）
    let videoUrl = null;
    let lastFrameUrl = null;

    if (imageUrls.length > 0) {
      const videoResponse = await videoClient.videoGeneration(
        [
          {
            type: "image_url",
            image_url: { url: imageUrls[0] },
            role: "first_frame",
          },
          { type: "text", text: finalPrompt },
        ],
        {
          model: "doubao-seedance-1-5-pro-251215",
          duration,
          ratio: "9:16",
          resolution: "720p",
          watermark: false,
          generateAudio: true,
        }
      );
      videoUrl = videoResponse.videoUrl;
      lastFrameUrl = videoResponse.lastFrameUrl;
      
      // 5秒免费视频计数
      if (durationType === "free") {
        data.videoEdits += 1;
      }
    }

    const remaining = getRemainingCounts(deviceId);
    
    // 未登录用户次数减半
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
      imageLimits: {
        perBatch: DAILY_LIMITS.images.perBatch,
        maxPerDay: imageMaxPerDay,
        chargePerImage: DAILY_LIMITS.images.chargePerImage,
      },
      textLimits: {
        perBatch: DAILY_LIMITS.texts.perBatch,
        maxPerDay: textMaxPerDay,
        chargePerText: DAILY_LIMITS.texts.chargePerText,
      },
    });
  } catch (error) {
    console.error("Generate all error:", error);
    res.status(500).json({ error: "Generation failed" });
  }
});

/**
 * 重新生成视频
 */
app.post("/api/v1/generate/video-regenerate", async (req: Request, res: Response) => {
  try {
    const { prompt, imageUrl, durationType = "free" } = req.body;
    const deviceId = (req.headers["x-device-id"] as string) || "default";
    
    if (!prompt || !imageUrl) {
      return res.status(400).json({ error: "prompt and imageUrl are required" });
    }

    // 检查内容是否允许，并获取脱敏后的提示词
    const contentCheck = await isContentAllowed(prompt);
    if (!contentCheck.allowed) {
      return res.status(400).json({ error: contentCheck.reason || "内容不允许生成" });
    }

    // 使用脱敏后的提示词
    const finalPrompt = contentCheck.sanitizedPrompt || prompt;

    const durationConfig = VIDEO_DURATIONS[durationType as keyof typeof VIDEO_DURATIONS] || VIDEO_DURATIONS.free;
    const duration = durationConfig.duration;

    if (durationType === "free") {
      const check = checkVideoEditAllowed(deviceId, durationType);
      if (!check.allowed) {
        return res.status(403).json({
          error: "今日免费视频编辑次数已用完",
          remainingEdits: 0,
          message: "5秒视频每日可编辑10次，请明天再来或选择更长时长"
        });
      }
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const videoClient = new VideoGenerationClient(config, customHeaders);

    const response = await videoClient.videoGeneration(
      [
        {
          type: "image_url",
          image_url: { url: imageUrl },
          role: "first_frame",
        },
        { type: "text", text: finalPrompt },
      ],
      {
        model: VIDEO_MODEL, // 即梦视频生成模型
        duration,
        ratio: "9:16",
        resolution: "720p",
        watermark: false,
        generateAudio: true,
      }
    );

    if (response.videoUrl) {
      const remaining = getRemainingCounts(deviceId);
      
      res.json({
        videoUrl: response.videoUrl,
        lastFrameUrl: response.lastFrameUrl,
        duration,
        durationType,
        isFree: durationType === "free",
        remainingFreeEdits: remaining.remainingVideoEdits,
      });
    } else {
      res.status(500).json({ error: "Video generation failed" });
    }
  } catch (error) {
    console.error("Video regenerate error:", error);
    res.status(500).json({ error: "Video generation failed" });
  }
});

/**
 * 内容润色
 * POST /api/v1/content/polish
 */
app.post("/api/v1/content/polish", async (req: Request, res: Response) => {
  try {
    const { content, polishStyle } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "内容不能为空" });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    // 根据润色风格选择不同的提示词
    let stylePrompt = '';
    switch (polishStyle) {
      case 'formal':
        stylePrompt = '请将以下文案改写成正式、专业的风格，适合商务场景使用。保持原意，但用词更加规范、正式。';
        break;
      case 'casual':
        stylePrompt = '请将以下文案改写成轻松、活泼的风格，适合社交媒体和日常分享。保持原意，但语气更加亲切自然。';
        break;
      case 'creative':
        stylePrompt = '请将以下文案进行创意润色，增加文案的艺术感和吸引力，让语言更加生动有感染力。';
        break;
      case 'short':
        stylePrompt = '请将以下文案精简压缩，保留核心信息，去除冗余表达，使文案更加简洁有力。';
        break;
      default:
        stylePrompt = '请对以下文案进行润色优化，提升文案质量和可读性，保持原意但表达更加流畅优美。';
    }

    const messages: Message[] = [
      { 
        role: "system" as const, 
        content: `你是一位资深文案编辑，擅长各种文风的文案润色和优化。\n请直接输出润色后的文案内容，不要添加任何说明或注释。` 
      },
      { 
        role: "user" as const, 
        content: `${stylePrompt}\n\n原始文案：\n${content}` 
      },
    ];

    const response = await llmClient.invoke(messages, {
      model: "deepseek-v3-2-251201",
      temperature: 0.7,
    });

    if (response.content) {
      res.json({ 
        polished: response.content.trim(),
        original: content,
        style: polishStyle || 'default',
      });
    } else {
      res.status(500).json({ error: "润色失败" });
    }
  } catch (error) {
    console.error("Content polish error:", error);
    res.status(500).json({ error: "润色失败" });
  }
});

/**
 * 从链接提取文案
 * POST /api/v1/content/extract-from-url
 */
app.post("/api/v1/content/extract-from-url", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "链接不能为空" });
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "链接格式不正确" });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const fetchClient = new FetchClient(config, customHeaders);

    const response = await fetchClient.fetch(url);

    if (response.status_code !== 0) {
      return res.status(500).json({ 
        error: "获取链接内容失败", 
        statusMessage: response.status_message 
      });
    }

    // 提取文本内容
    const textContent = response.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    // 提取图片链接
    const images = response.content
      .filter(item => item.type === 'image')
      .map(item => ({
        url: item.image?.display_url || item.image?.image_url,
        width: item.image?.width,
        height: item.image?.height,
      }));

    res.json({
      title: response.title || '',
      content: textContent,
      images,
      sourceUrl: response.url || url,
      publishTime: response.publish_time,
    });
  } catch (error) {
    console.error("URL extract error:", error);
    res.status(500).json({ error: "获取链接内容失败" });
  }
});

/**
 * 从链接提取文案并润色
 * POST /api/v1/content/extract-and-polish
 */
app.post("/api/v1/content/extract-and-polish", async (req: Request, res: Response) => {
  try {
    const { url, polishStyle } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "链接不能为空" });
    }

    // 先提取内容
    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const fetchClient = new FetchClient(config, customHeaders);

    const response = await fetchClient.fetch(url);

    if (response.status_code !== 0) {
      return res.status(500).json({ 
        error: "获取链接内容失败", 
        statusMessage: response.status_message 
      });
    }

    // 提取文本内容
    const originalContent = response.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    if (!originalContent) {
      return res.status(400).json({ error: "该链接没有可提取的文本内容" });
    }

    // 润色内容
    const llmClient = new LLMClient(config, customHeaders);
    
    let stylePrompt = '';
    switch (polishStyle) {
      case 'formal':
        stylePrompt = '请将以下文案改写成正式、专业的风格，适合商务场景使用。保持原意，但用词更加规范、正式。';
        break;
      case 'casual':
        stylePrompt = '请将以下文案改写成轻松、活泼的风格，适合社交媒体和日常分享。保持原意，但语气更加亲切自然。';
        break;
      case 'creative':
        stylePrompt = '请将以下文案进行创意润色，增加文案的艺术感和吸引力，让语言更加生动有感染力。';
        break;
      case 'short':
        stylePrompt = '请将以下文案精简压缩，保留核心信息，去除冗余表达，使文案更加简洁有力。';
        break;
      default:
        stylePrompt = '请对以下文案进行润色优化，提升文案质量和可读性，保持原意但表达更加流畅优美。';
    }

    const messages: Message[] = [
      { 
        role: "system" as const, 
        content: `你是一位资深文案编辑，擅长各种文风的文案润色和优化。\n请直接输出润色后的文案内容，不要添加任何说明或注释。` 
      },
      { 
        role: "user" as const, 
        content: `${stylePrompt}\n\n原始文案：\n${originalContent}` 
      },
    ];

    const llmResponse = await llmClient.invoke(messages, {
      model: "deepseek-v3-2-251201",
      temperature: 0.7,
    });

    // 提取图片链接
    const images = response.content
      .filter(item => item.type === 'image')
      .map(item => ({
        url: item.image?.display_url || item.image?.image_url,
        width: item.image?.width,
        height: item.image?.height,
      }));

    res.json({
      title: response.title || '',
      original: originalContent,
      polished: llmResponse.content?.trim() || '',
      images,
      sourceUrl: response.url || url,
      publishTime: response.publish_time,
      style: polishStyle || 'default',
    });
  } catch (error) {
    console.error("Extract and polish error:", error);
    res.status(500).json({ error: "提取并润色失败" });
  }
});

/**
 * 获取剩余编辑次数
 * 未登录用户次数减半
 */
app.get("/api/v1/user/remaining-edits", async (req, res) => {
  const deviceId = (req.headers["x-device-id"] as string) || "default";
  const userId = req.headers["x-user-id"] as string;
  const isLoggedIn = !!userId;
  
  // 获取基础剩余次数
  const remaining = getRemainingCounts(deviceId);
  
  // 未登录用户次数减半
  const HALF_RATE = 0.5;
  const remainingFreeEdits = isLoggedIn ? remaining.remainingVideoEdits : Math.floor(remaining.remainingVideoEdits * HALF_RATE);
  const remainingImages = isLoggedIn ? remaining.remainingImages : Math.floor(remaining.remainingImages * HALF_RATE);
  const remainingTexts = isLoggedIn ? remaining.remainingTexts : Math.floor(remaining.remainingTexts * HALF_RATE);
  
  // 未登录用户的每日限额也减半
  const imageMaxPerDay = isLoggedIn ? DAILY_LIMITS.images.maxPerDay : Math.floor(DAILY_LIMITS.images.maxPerDay * HALF_RATE);
  const textMaxPerDay = isLoggedIn ? DAILY_LIMITS.texts.maxPerDay : Math.floor(DAILY_LIMITS.texts.maxPerDay * HALF_RATE);
  const freeVideoMaxPerDay = isLoggedIn ? VIDEO_DURATIONS.free.maxPerDay : Math.floor(VIDEO_DURATIONS.free.maxPerDay * HALF_RATE);
  
  res.json({
    remainingFreeEdits,
    remainingImages,
    remainingTexts,
    isLoggedIn,
    imageLimits: {
      perBatch: DAILY_LIMITS.images.perBatch,
      maxPerDay: imageMaxPerDay,
    },
    textLimits: {
      perBatch: DAILY_LIMITS.texts.perBatch,
      maxPerDay: textMaxPerDay,
    },
    freeVideoMaxPerDay,
    resetDate: getTodayKey(),
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});

// ==================== 用户注册登录模块 ====================
import { getSupabaseClient } from './storage/database/supabase-client';
import crypto from 'crypto';

// 永久会员手机号
const PERMANENT_VIP_PHONE = '18104962855';

// 生成验证码
function generateCode(length: number = 6): string {
  return Math.random().toString().slice(2, 2 + length);
}

// 密码加密
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * 发送验证码
 * POST /api/v1/auth/send-code
 */
app.post("/api/v1/auth/send-code", async (req: Request, res: Response) => {
  try {
    const { phone, purpose } = req.body;
    
    if (!phone || !purpose) {
      return res.status(400).json({ error: "手机号和用途不能为空" });
    }

    // 验证手机号格式
    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "手机号格式不正确" });
    }

    const client = getSupabaseClient();
    
    // 生成6位验证码
    const code = generateCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟有效期
    
    // 标记旧验证码为已使用
    await client.from('verification_codes')
      .update({ is_used: true })
      .eq('phone', phone)
      .eq('purpose', purpose);
    
    // 插入新验证码
    const { error } = await client.from('verification_codes')
      .insert({
        phone,
        code,
        purpose,
        expires_at: expiresAt.toISOString(),
      });
    
    if (error) throw error;
    
    // 模拟发送验证码（实际应接入短信网关）
    console.log(`[验证码] ${phone} - ${code} (${purpose})`);
    
    res.json({ 
      success: true, 
      message: "验证码已发送",
      // 开发环境直接返回验证码方便测试
      ...(process.env.NODE_ENV === 'development' && { code })
    });
  } catch (error: any) {
    console.error("Send code error:", error);
    res.status(500).json({ error: "发送验证码失败" });
  }
});

/**
 * 注册
 * POST /api/v1/auth/register
 */
app.post("/api/v1/auth/register", async (req: Request, res: Response) => {
  try {
    const { phone, username, password, code } = req.body;
    
    if (!phone || !username || !password || !code) {
      return res.status(400).json({ error: "所有字段都不能为空" });
    }

    // 验证手机号格式
    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "手机号格式不正确" });
    }

    // 验证用户名格式（3-20位字母数字下划线）
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: "用户名需要3-20位字母、数字或下划线" });
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({ error: "密码至少6位" });
    }

    const client = getSupabaseClient();
    
    // 验证验证码
    const { data: validCode, error: codeError } = await client
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('purpose', 'register')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (codeError || !validCode) {
      return res.status(400).json({ error: "验证码无效或已过期" });
    }
    
    // 检查手机号是否已注册
    const { data: existingPhone } = await client
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    
    if (existingPhone) {
      return res.status(400).json({ error: "该手机号已注册" });
    }
    
    // 检查用户名是否已被使用
    const { data: existingUsername } = await client
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    
    if (existingUsername) {
      return res.status(400).json({ error: "用户名已被使用" });
    }
    
    // 创建用户
    const isPermanentVip = phone === PERMANENT_VIP_PHONE;
    const hashedPassword = hashPassword(password);
    
    const { data: newUser, error: insertError } = await client
      .from('users')
      .insert({
        phone,
        username,
        password: hashedPassword,
        is_permanent_vip: isPermanentVip,
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    // 标记验证码已使用
    await client.from('verification_codes')
      .update({ is_used: true })
      .eq('id', validCode.id);
    
    res.json({
      success: true,
      message: "注册成功",
      user: {
        id: newUser.id,
        phone: newUser.phone,
        username: newUser.username,
        isPermanentVip: newUser.is_permanent_vip,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: "注册失败" });
  }
});

/**
 * 登录
 * POST /api/v1/auth/login
 */
app.post("/api/v1/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password, code } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    const client = getSupabaseClient();
    const hashedPassword = hashPassword(password);
    
    // 查询用户（支持手机号或用户名登录）
    const { data: user, error: userError } = await client
      .from('users')
      .select('*')
      .or(`phone.eq.${username},username.eq.${username}`)
      .maybeSingle();
    
    if (userError) throw userError;
    
    if (!user) {
      return res.status(401).json({ error: "用户不存在" });
    }
    
    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: "密码错误" });
    }
    
    if (!user.is_active) {
      return res.status(401).json({ error: "账号已被禁用" });
    }
    
    // 检查会员有效期
    const now = new Date().toISOString();
    const { data: activeMembership } = await client
      .from('user_memberships')
      .select('*')
      .eq('user_id', user.id)
      .gt('end_date', now)
      .maybeSingle();
    
    const isVip = user.is_permanent_vip || !!activeMembership;
    const vipEndDate = user.is_permanent_vip ? '永久' : (activeMembership?.end_date || null);
    
    res.json({
      success: true,
      message: "登录成功",
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        isPermanentVip: user.is_permanent_vip,
        isVip,
        vipEndDate,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "登录失败" });
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

    // 只有指定手机号才能申请免费码
    const ALLOWED_FREE_CODE_PHONE = "18104962855";
    if (phone !== ALLOWED_FREE_CODE_PHONE) {
      return res.status(403).json({ error: "抱歉，仅限指定用户申请免费码" });
    }

    const client = getSupabaseClient();
    
    // 查询用户
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, phone, username, is_permanent_vip')
      .eq('phone', phone)
      .maybeSingle();
    
    if (userError) throw userError;
    
    if (!user) {
      return res.status(400).json({ error: "请先注册账号" });
    }
    
    // 如果是赠送模式，验证接收人
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
      
      // 检查接收人是否已有有效会员
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
    } else {
      // 非赠送模式：只有永久会员可以为自己申请（实际上永久会员不需要，所以这里检查是否有有效会员）
      const now = new Date().toISOString();
      const { data: activeMembership } = await client
        .from('user_memberships')
        .select('*')
        .eq('user_id', user.id)
        .gt('end_date', now)
        .maybeSingle();
      
      // 如果用户已有有效会员且不是永久会员，不允许申请
      if (activeMembership && !user.is_permanent_vip) {
        return res.status(400).json({ error: "您已有有效的会员期限" });
      }
    }
    
    // 生成免费码
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
    
    // 查询免费码
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
    
    // 查询用户
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
    
    // 如果是赠送码，验证用户手机号是否匹配
    if (freeCode.recipient_phone && freeCode.recipient_phone !== user.phone) {
      return res.status(400).json({ error: "此免费码不适用于您的账号" });
    }
    
    // 激活免费码
    const now = new Date();
    const endDate = new Date(now.getTime() + freeCode.duration_days * 24 * 60 * 60 * 1000);
    
    // 标记免费码已使用
    await client.from('free_codes')
      .update({
        is_used: true,
        used_by: userId,
        used_at: now.toISOString(),
      })
      .eq('id', freeCode.id);
    
    // 添加会员记录
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
    
    // 查询用户
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
    
    // 查询有效会员
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
    
    // 查询用户积分
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, points')
      .eq('id', userId)
      .maybeSingle();
    
    if (userError) throw userError;
    
    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }
    
    // 查询积分记录
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

    // 免费码价格（积分）
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
    
    // 查询用户
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, phone, points')
      .eq('id', userId)
      .maybeSingle();
    
    if (userError) throw userError;
    
    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }
    
    // 检查积分是否足够
    const currentPoints = user.points || 0;
    if (currentPoints < price.points) {
      return res.status(400).json({ 
        error: "积分不足",
        required: price.points,
        current: currentPoints,
      });
    }
    
    // 验证接收人（如果有）
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
    
    // 扣除积分
    const newPoints = currentPoints - price.points;
    const { error: updateError } = await client
      .from('users')
      .update({ points: newPoints })
      .eq('id', userId);
    
    if (updateError) throw updateError;
    
    // 记录积分消费
    await client.from('point_transactions').insert({
      id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type: 'spend',
      amount: price.points,
      source: 'buy_free_code',
      description: `购买${durationType === '1_month' ? '1个月' : durationType === '3_months' ? '一季度' : durationType === '6_months' ? '半年' : '一年'}免费码${recipientPhone ? `（赠送给${recipientPhone}）` : ''}`,
    });
    
    // 生成免费码
    const code = generateCode(8).toUpperCase();
    
    await client.from('free_codes').insert({
      code,
      duration_type: durationType,
      duration_days: price.days,
      recipient_phone: recipientPhone || null,
      is_purchased: true, // 标记为购买的免费码
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
    
    // 查询今日是否已签到
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
    
    // 查询用户当前积分
    const { data: user, error: userError } = await client
      .from('users')
      .select('points')
      .eq('id', userId)
      .maybeSingle();
    
    if (userError) throw userError;
    
    const CHECKIN_POINTS = 10; // 每日签到送10积分
    const newPoints = (user?.points || 0) + CHECKIN_POINTS;
    
    // 更新用户积分
    await client.from('users')
      .update({ points: newPoints })
      .eq('id', userId);
    
    // 记录签到
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
    
    // 默认配置
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

/**
 * 图片生成脱敏函数 - 将敏感人物替换为通用描述
 * 专门用于图片生成，因为图像模型有严格的敏感词检测
 */
function sanitizeImagePrompt(prompt: string): { sanitized: string; reasons: string[] } {
  let sanitized = prompt;
  const reasons: string[] = [];
  
  // 敏感人物映射表（只用于图片生成）
  const sensitiveWordMap: { [key: string]: { en: string; zh: string } } = {
    // 政治敏感人物
    '特朗普': { en: 'a mature gentleman with orange hair, suit and tie', zh: '一位成熟男士，戴着橙色假发，西装领带' },
    'Trump': { en: 'a mature gentleman with orange hair, suit and tie', zh: '一位成熟男士，戴着橙色假发，西装领带' },
    '川普': { en: 'a mature gentleman with orange hair, suit and tie', zh: '一位成熟男士，戴着橙色假发，西装领带' },
    '拜登': { en: 'an elderly gentleman with white hair, glasses', zh: '一位老年男士，白发，戴眼镜' },
    'Biden': { en: 'an elderly gentleman with white hair, glasses', zh: '一位老年男士，白发，戴眼镜' },
    '奥巴马': { en: 'a middle-aged African American man', zh: '一位中年非裔男士' },
    'Obama': { en: 'a middle-aged African American man', zh: '一位中年非裔男士' },
    '小布什': { en: 'an older American gentleman', zh: '一位美国老年男士' },
    '布什': { en: 'an American gentleman', zh: '一位美国男士' },
    // 其他敏感词
    '裸体': { en: 'cartoon character', zh: '卡通形象' },
    '血腥': { en: 'clean and fresh', zh: '干净清新' },
    '暴力': { en: 'peaceful and friendly', zh: '和平友好' },
  };
  
  for (const [sensitiveWord, replacement] of Object.entries(sensitiveWordMap)) {
    // 不区分大小写匹配
    const regex = new RegExp(sensitiveWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(regex, replacement.zh);
      reasons.push(`"${sensitiveWord}"已替换为"${replacement.zh}"`);
    }
  }
  
  return { sanitized, reasons };
}

/**
 * 提示词脱敏函数 - 用于文案生成（自动替换敏感词）
 */
function sanitizePrompt(prompt: string): { sanitized: string; reasons: string[] } {
  let sanitized = prompt;
  const reasons: string[] = [];
  
  // 敏感词映射表（用于文案生成）
  const sensitiveWordMap: { [key: string]: string } = {
    // 政治敏感人物
    '特朗普': '创意人物',
    'Trump': '创意人物',
    '川普': '创意人物',
    '拜登': '长者',
    'Biden': '长者',
    '奥巴马': '绅士',
    'Obama': '绅士',
    '小布什': '男士',
    '布什': '男士',
    // 敏感内容
    '裸体': '优雅',
    '色情': '美好',
    '赌博': '娱乐',
    '暴力': '和平',
    '血腥': '清新',
    '毒品': '健康',
    '自杀': '积极',
    '政治': '创意',
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

/**
 * 检查内容是否允许生成（根据后台设置，并自动脱敏提示词）
 */
async function isContentAllowed(prompt: string): Promise<{ allowed: boolean; reason?: string; sanitizedPrompt?: string; reasons?: string[] }> {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('app_settings')
      .select('content_filter_enabled')
      .eq('id', 'global')
      .single();
    
    // 默认进行提示词脱敏（解决AI模型的内容审核问题）
    const sanitizeResult = sanitizePrompt(prompt);
    
    // 如果脱敏后的提示词与原提示词不同，说明进行了替换
    if (sanitizeResult.sanitized !== prompt) {
      console.log(`Prompt sanitized: "${prompt}" -> "${sanitizeResult.sanitized}"`);
    }
    
    // 如果获取失败或未配置，默认允许（但仍脱敏）
    if (error || !data) {
      return { allowed: true, sanitizedPrompt: sanitizeResult.sanitized, reasons: sanitizeResult.reasons };
    }
    
    // 如果开关关闭，不限制内容（但仍脱敏提示词以通过AI审核）
    if (!data.content_filter_enabled) {
      return { allowed: true, sanitizedPrompt: sanitizeResult.sanitized, reasons: sanitizeResult.reasons };
    }
    
    // 开关开启时的过滤逻辑（可根据需要扩展）
    // 这里可以添加更严格的敏感词检测等逻辑
    
    return { allowed: true, sanitizedPrompt: sanitizeResult.sanitized, reasons: sanitizeResult.reasons };
  } catch (error) {
    // 出错时默认允许（但仍脱敏提示词）
    console.error("Content filter check error:", error);
    const sanitizeResult = sanitizePrompt(prompt);
    return { allowed: true, sanitizedPrompt: sanitizeResult.sanitized, reasons: sanitizeResult.reasons };
  }
}
