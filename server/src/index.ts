import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import {
  ImageGenerationClient,
  VideoGenerationClient,
  LLMClient,
  Config,
  HeaderUtils,
} from "coze-coding-dev-sdk";
import type { Message } from "coze-coding-dev-sdk";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// 视频时长配置
const VIDEO_DURATIONS = {
  free: { duration: 5, label: "5秒内", price: "免费", maxPerDay: 3 },
  paid: { duration: 10, label: "5秒以上", price: "收费", maxPerDay: -1 },
} as const;

// 每日生成限制配置
const DAILY_LIMITS = {
  images: {
    perBatch: 2,      // 每次生成2张
    maxPerDay: 20,    // 每天最多20张
  },
  texts: {
    perBatch: 1,      // 每次生成1条
    maxPerDay: 10,    // 每天最多10条
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
        type: "paid",
        duration: VIDEO_DURATIONS.paid.duration,
        label: VIDEO_DURATIONS.paid.label,
        price: VIDEO_DURATIONS.paid.price,
        description: "不限次数，随时可用",
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
    const client = new ImageGenerationClient(config, customHeaders);

    const response = await client.generate({
      prompt,
      size: "2K",
      watermark: false,
    });

    const helper = client.getResponseHelper(response);

    if (helper.success) {
      res.json({ imageUrls: helper.imageUrls });
    } else {
      res.status(500).json({ errors: helper.errorMessages });
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
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位资深创意文案师，擅长创作短视频脚本、社交媒体文案、营销文案等。
根据用户提供的想法，生成适合配图的文案内容。
请直接输出文案内容，不需要解释。`;

    const messages: Message[] = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `想法主题：${prompt}\n\n请生成一段吸引人的文案，可以用于配图或视频旁白。` },
    ];

    const response = await client.invoke(messages, {
      model: "doubao-seed-2-0-lite-260215",
      temperature: 0.8,
    });

    res.json({ text: response.content });
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

    const durationConfig = VIDEO_DURATIONS[durationType as keyof typeof VIDEO_DURATIONS] || VIDEO_DURATIONS.free;
    const duration = durationConfig.duration;

    // 检查视频编辑次数限制
    if (duration <= 5) {
      const check = checkVideoEditAllowed(deviceId, durationType);
      if (!check.allowed) {
        return res.status(403).json({
          error: "今日免费编辑次数已用完",
          remainingEdits: 0,
          message: "5秒内视频每日可编辑3次，请明天再来或选择更长时长"
        });
      }
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const client = new VideoGenerationClient(config, customHeaders);

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
      text: prompt,
    });

    const response = await client.videoGeneration(contentItems, {
      model: "doubao-seedance-1-5-pro-251215",
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
        isFree: duration <= 5,
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
    const client = new ImageGenerationClient(config, customHeaders);

    const requests = Array(count).fill(null).map(() => ({
      prompt,
      size: "2K",
      watermark: false,
    }));

    const responses = await client.batchGenerate(requests);
    
    const imageUrls: string[] = [];

    responses.forEach((response) => {
      const helper = client.getResponseHelper(response);
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
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位资深创意文案师，擅长创作短视频脚本、社交媒体文案、营销文案等。
根据用户提供的想法，生成适合配图的文案内容。
请直接输出文案内容，不要加任何编号或前缀，不要解释。`;

    const texts: string[] = [];

    for (let i = 0; i < count; i++) {
      const messages: Message[] = [
        { role: "system" as const, content: systemPrompt },
        { 
          role: "user" as const, 
          content: `想法主题：${prompt}\n\n请生成一段吸引人的文案，可以用于配图或视频旁白。` 
        },
      ];

      const response = await client.invoke(messages, {
        model: "doubao-seed-2-0-lite-260215",
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
    
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const durationConfig = VIDEO_DURATIONS[durationType as keyof typeof VIDEO_DURATIONS] || VIDEO_DURATIONS.free;
    const duration = durationConfig.duration;

    // 检查视频编辑次数限制
    if (duration <= 5) {
      const check = checkVideoEditAllowed(deviceId, durationType);
      if (!check.allowed) {
        return res.status(403).json({
          error: "今日免费编辑次数已用完",
          remainingEdits: 0,
          message: "5秒内视频每日可编辑3次，请明天再来或选择更长时长"
        });
      }
    }

    const data = getOrCreateDailyData(deviceId);
    
    // 检查图片生成限制
    const imageRemaining = DAILY_LIMITS.images.maxPerDay - data.imageCount;
    if (imageRemaining < DAILY_LIMITS.images.perBatch) {
      return res.status(403).json({
        error: "今日图片生成次数不足",
        remainingImages: imageRemaining,
        message: `图片每日每批${DAILY_LIMITS.images.perBatch}张，今日剩余${imageRemaining}张，请明天再来`
      });
    }

    // 检查文案生成限制
    const textRemaining = DAILY_LIMITS.texts.maxPerDay - data.textCount;
    if (textRemaining < DAILY_LIMITS.texts.perBatch) {
      return res.status(403).json({
        error: "今日文案生成次数已用完",
        remainingTexts: textRemaining,
        message: `文案每日最多${DAILY_LIMITS.texts.maxPerDay}条，今日剩余${textRemaining}条，请明天再来`
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();

    const imageClient = new ImageGenerationClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);
    const videoClient = new VideoGenerationClient(config, customHeaders);

    // 1. 批量生成图片（2张）
    const imageRequests = Array(DAILY_LIMITS.images.perBatch).fill(null).map(() => ({
      prompt,
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
      // 检查是否是敏感内容审核错误
      if (error?.response?.error?.code === 'InputTextSensitiveContentDetected') {
        return res.status(400).json({
          error: "内容包含敏感信息",
          code: "SENSITIVE_CONTENT",
          message: "您的创意想法可能包含不适合生成的内容（如涉及政治、色情、暴力等），请换一个想法试试，如'海边日落'、'森林小路'、'美食分享'等"
        });
      }
      throw error;
    }

    // 2. 生成文案（1条）
    const systemPrompt = `你是一位资深创意文案师，擅长创作短视频脚本、社交媒体文案、营销文案等。
根据用户提供的想法，生成适合配图的文案内容。
请直接输出文案内容，不要加任何编号或前缀，不要解释。`;

    const textMessages: Message[] = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `想法主题：${prompt}\n\n请生成一段吸引人的文案，可以用于配图或视频旁白。` },
    ];

    const textResponse = await llmClient.invoke(textMessages, {
      model: "doubao-seed-2-0-lite-260215",
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
          { type: "text", text: prompt },
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
    }

    const remaining = getRemainingCounts(deviceId);

    res.json({
      imageUrls,
      texts,
      videoUrl,
      lastFrameUrl,
      duration,
      durationType,
      isFree: duration <= 5,
      remainingFreeEdits: remaining.remainingVideoEdits,
      remainingImages: remaining.remainingImages,
      remainingTexts: remaining.remainingTexts,
      imageLimits: {
        perBatch: DAILY_LIMITS.images.perBatch,
        maxPerDay: DAILY_LIMITS.images.maxPerDay,
      },
      textLimits: {
        perBatch: DAILY_LIMITS.texts.perBatch,
        maxPerDay: DAILY_LIMITS.texts.maxPerDay,
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

    const durationConfig = VIDEO_DURATIONS[durationType as keyof typeof VIDEO_DURATIONS] || VIDEO_DURATIONS.free;
    const duration = durationConfig.duration;

    if (duration <= 5) {
      const check = checkVideoEditAllowed(deviceId, durationType);
      if (!check.allowed) {
        return res.status(403).json({
          error: "今日免费编辑次数已用完",
          remainingEdits: 0,
          message: "5秒内视频每日可编辑3次，请明天再来或选择更长时长"
        });
      }
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const client = new VideoGenerationClient(config, customHeaders);

    const response = await client.videoGeneration(
      [
        {
          type: "image_url",
          image_url: { url: imageUrl },
          role: "first_frame",
        },
        { type: "text", text: prompt },
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

    if (response.videoUrl) {
      const remaining = getRemainingCounts(deviceId);
      
      res.json({
        videoUrl: response.videoUrl,
        lastFrameUrl: response.lastFrameUrl,
        duration,
        durationType,
        isFree: duration <= 5,
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
 * 获取剩余编辑次数
 */
app.get("/api/v1/user/remaining-edits", (req, res) => {
  const deviceId = (req.headers["x-device-id"] as string) || "default";
  const remaining = getRemainingCounts(deviceId);
  
  res.json({
    remainingFreeEdits: remaining.remainingVideoEdits,
    remainingImages: remaining.remainingImages,
    remainingTexts: remaining.remainingTexts,
    imageLimits: {
      perBatch: DAILY_LIMITS.images.perBatch,
      maxPerDay: DAILY_LIMITS.images.maxPerDay,
    },
    textLimits: {
      perBatch: DAILY_LIMITS.texts.perBatch,
      maxPerDay: DAILY_LIMITS.texts.maxPerDay,
    },
    resetDate: getTodayKey(),
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
