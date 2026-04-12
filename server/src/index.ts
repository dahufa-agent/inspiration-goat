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
  standard: { duration: 8, label: "6-8秒", price: "标准收费", maxPerDay: -1 },
  premium: { duration: 12, label: "9-12秒", price: "高级收费", maxPerDay: -1 },
} as const;

// 配置常量
const MAX_IMAGES = 20;
const MAX_TEXTS = 10;

// 内存中的每日编辑计数
const dailyEditCounts: Record<string, { date: string; count: number }> = {};

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function checkAndIncrementEditCount(deviceId: string, duration: number): { allowed: boolean; remaining: number; isFree: boolean } {
  const today = getTodayKey();
  const record = dailyEditCounts[deviceId] || { date: today, count: 0 };
  
  if (record.date !== today) {
    dailyEditCounts[deviceId] = { date: today, count: 0 };
  }
  
  const isFree = duration <= 5;
  
  if (isFree) {
    const remaining = 3 - record.count;
    if (remaining > 0) {
      dailyEditCounts[deviceId].count += 1;
      return { allowed: true, remaining: remaining - 1, isFree: true };
    }
    return { allowed: false, remaining: 0, isFree: true };
  }
  
  return { allowed: true, remaining: -1, isFree: false };
}

function getRemainingEdits(deviceId: string): { remaining: number; isFree: boolean; resetDate: string } {
  const today = getTodayKey();
  const record = dailyEditCounts[deviceId] || { date: today, count: 0 };
  
  if (record.date !== today) {
    return { remaining: 3, isFree: true, resetDate: today };
  }
  
  return { remaining: Math.max(0, 3 - record.count), isFree: true, resetDate: today };
}

// Health check
app.get("/api/v1/health", (req, res) => {
  console.log("Health check success");
  res.status(200).json({ status: "ok" });
});

/**
 * 获取视频时长选项
 */
app.get("/api/v1/video/durations", (req, res) => {
  const deviceId = (req.headers["x-device-id"] as string) || "default";
  const remaining = getRemainingEdits(deviceId);
  
  res.json({
    durations: [
      {
        type: "free",
        duration: VIDEO_DURATIONS.free.duration,
        label: VIDEO_DURATIONS.free.label,
        price: VIDEO_DURATIONS.free.price,
        description: `每日可编辑${VIDEO_DURATIONS.free.maxPerDay}次`,
        remainingEdits: remaining.remaining,
      },
      {
        type: "standard",
        duration: VIDEO_DURATIONS.standard.duration,
        label: VIDEO_DURATIONS.standard.label,
        price: VIDEO_DURATIONS.standard.price,
        description: "标准时长，适合大多数场景",
      },
      {
        type: "premium",
        duration: VIDEO_DURATIONS.premium.duration,
        label: VIDEO_DURATIONS.premium.label,
        price: VIDEO_DURATIONS.premium.price,
        description: "超长时长，电影级效果",
      },
    ],
    remainingFreeEdits: remaining.remaining,
  });
});

/**
 * 批量生成图片
 * POST /api/v1/generate/images
 * Body: { prompt: string, count?: number (default 20, max 20) }
 */
app.post("/api/v1/generate/images", async (req: Request, res: Response) => {
  try {
    const { prompt, count = MAX_IMAGES } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const imageCount = Math.min(count, MAX_IMAGES);
    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 批量生成图片
    const requests = Array(imageCount).fill(null).map(() => ({
      prompt,
      size: "2K",
      watermark: false,
    }));

    const responses = await client.batchGenerate(requests);
    
    const imageUrls: string[] = [];
    const errors: string[] = [];

    responses.forEach((response, index) => {
      const helper = client.getResponseHelper(response);
      if (helper.success && helper.imageUrls.length > 0) {
        imageUrls.push(helper.imageUrls[0]);
      } else {
        errors.push(`Image ${index + 1}: ${helper.errorMessages.join(", ")}`);
      }
    });

    res.json({
      imageUrls,
      total: imageUrls.length,
      requested: imageCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Image batch generation error:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
});

/**
 * 批量生成文案
 * POST /api/v1/generate/texts
 * Body: { prompt: string, count?: number (default 10, max 10) }
 */
app.post("/api/v1/generate/texts", async (req: Request, res: Response) => {
  try {
    const { prompt, count = MAX_TEXTS } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const textCount = Math.min(count, MAX_TEXTS);
    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位资深创意文案师，擅长创作短视频脚本、社交媒体文案、营销文案等。
根据用户提供的想法，生成适合配图的文案内容。
请直接输出文案内容，不要加任何编号或前缀，不要解释。`;

    const texts: string[] = [];

    // 串行生成文案以确保多样性
    for (let i = 0; i < textCount; i++) {
      const variation = [
        "换一种风格，重写这段文案",
        "用更煽情的表达方式",
        "用更简洁有力的表达",
        "增加一些悬念感",
        "用更文艺的方式表达",
        "增加一些幽默元素",
        "突出情感共鸣",
        "强调画面感",
        "增加故事性",
        "用对比手法",
      ];

      const messages: Message[] = [
        { role: "system" as const, content: systemPrompt },
        { 
          role: "user" as const, 
          content: `想法主题：${prompt}\n\n请生成一段吸引人的文案，可以用于配图或视频旁白。${i > 0 ? variation[i % variation.length] : ""}` 
        },
      ];

      const response = await client.invoke(messages, {
        model: "doubao-seed-2-0-lite-260215",
        temperature: 0.8,
      });

      if (response.content) {
        texts.push(response.content.trim());
      }
    }

    res.json({
      texts,
      total: texts.length,
      requested: textCount,
    });
  } catch (error) {
    console.error("Text batch generation error:", error);
    res.status(500).json({ error: "Text generation failed" });
  }
});

/**
 * 生成单张图片
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
 * 生成单条文案
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

    if (duration <= 5) {
      const check = checkAndIncrementEditCount(deviceId, duration);
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
      const remaining = getRemainingEdits(deviceId);
      
      res.json({
        videoUrl: response.videoUrl,
        lastFrameUrl: response.lastFrameUrl,
        duration,
        durationType,
        isFree: duration <= 5,
        remainingFreeEdits: remaining.remaining,
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
 * 一键生成全部内容（20张图片 + 10条文案 + 视频）
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

    if (duration <= 5) {
      const check = checkAndIncrementEditCount(deviceId, duration);
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

    const imageClient = new ImageGenerationClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);
    const videoClient = new VideoGenerationClient(config, customHeaders);

    // 1. 批量生成图片
    const imageRequests = Array(MAX_IMAGES).fill(null).map(() => ({
      prompt,
      size: "2K",
      watermark: false,
    }));
    const imageResponses = await imageClient.batchGenerate(imageRequests);
    
    const imageUrls: string[] = [];
    imageResponses.forEach((response) => {
      const helper = imageClient.getResponseHelper(response);
      if (helper.success && helper.imageUrls.length > 0) {
        imageUrls.push(helper.imageUrls[0]);
      }
    });

    if (imageUrls.length === 0) {
      return res.status(500).json({ error: "Image generation failed" });
    }

    // 2. 批量生成文案
    const systemPrompt = `你是一位资深创意文案师，擅长创作短视频脚本、社交媒体文案、营销文案等。
根据用户提供的想法，生成适合配图的文案内容。
请直接输出文案内容，不要加任何编号或前缀，不要解释。`;

    const texts: string[] = [];
    const textVariations = [
      "换一种风格，重写这段文案",
      "用更煽情的表达方式",
      "用更简洁有力的表达",
      "增加一些悬念感",
      "用更文艺的方式表达",
      "增加一些幽默元素",
      "突出情感共鸣",
      "强调画面感",
      "增加故事性",
      "用对比手法",
    ];

    for (let i = 0; i < MAX_TEXTS; i++) {
      const messages: Message[] = [
        { role: "system" as const, content: systemPrompt },
        { 
          role: "user" as const, 
          content: `想法主题：${prompt}\n\n请生成一段吸引人的文案，可以用于配图或视频旁白。${i > 0 ? textVariations[i % textVariations.length] : ""}` 
        },
      ];

      const textResponse = await llmClient.invoke(messages, {
        model: "doubao-seed-2-0-lite-260215",
        temperature: 0.8,
      });

      if (textResponse.content) {
        texts.push(textResponse.content.trim());
      }
    }

    // 3. 生成视频（使用第一张图片作为首帧）
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

    const remaining = getRemainingEdits(deviceId);

    res.json({
      imageUrls,
      texts,
      videoUrl: videoResponse.videoUrl || null,
      lastFrameUrl: videoResponse.lastFrameUrl || null,
      duration,
      durationType,
      isFree: duration <= 5,
      remainingFreeEdits: remaining.remaining,
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
      const check = checkAndIncrementEditCount(deviceId, duration);
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
      const remaining = getRemainingEdits(deviceId);
      
      res.json({
        videoUrl: response.videoUrl,
        lastFrameUrl: response.lastFrameUrl,
        duration,
        durationType,
        isFree: duration <= 5,
        remainingFreeEdits: remaining.remaining,
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
  const remaining = getRemainingEdits(deviceId);
  
  res.json({
    remainingFreeEdits: remaining.remaining,
    isFree: true,
    resetDate: remaining.resetDate,
    message: remaining.remaining > 0
      ? `今日还可编辑${remaining.remaining}次`
      : "今日免费编辑次数已用完，明天恢复",
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
