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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check
app.get("/api/v1/health", (req, res) => {
  console.log("Health check success");
  res.status(200).json({ status: "ok" });
});

/**
 * 生成图片
 * POST /api/v1/generate/image
 * Body: { prompt: string }
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
 * 生成文案
 * POST /api/v1/generate/text
 * Body: { prompt: string }
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
 * POST /api/v1/generate/video
 * Body: { prompt: string, imageUrl?: string }
 */
app.post("/api/v1/generate/video", async (req: Request, res: Response) => {
  try {
    const { prompt, imageUrl } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();
    const client = new VideoGenerationClient(config, customHeaders);

    const contentItems: any[] = [];

    // 如果有图片，添加为首帧
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
      duration: 5,
      ratio: "9:16",
      resolution: "720p",
      watermark: false,
      generateAudio: true,
    });

    if (response.videoUrl) {
      res.json({
        videoUrl: response.videoUrl,
        lastFrameUrl: response.lastFrameUrl,
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
 * 一键生成全部内容（图片+文案+视频）
 * POST /api/v1/generate/all
 * Body: { prompt: string }
 */
app.post("/api/v1/generate/all", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );
    const config = new Config();

    // 并行执行图片和文案生成
    const imageClient = new ImageGenerationClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);
    const videoClient = new VideoGenerationClient(config, customHeaders);

    // 1. 生成图片
    const imageResponse = await imageClient.generate({
      prompt,
      size: "2K",
      watermark: false,
    });
    const imageHelper = imageClient.getResponseHelper(imageResponse);

    if (!imageHelper.success || imageHelper.imageUrls.length === 0) {
      return res.status(500).json({ error: "Image generation failed" });
    }
    const imageUrl = imageHelper.imageUrls[0];

    // 2. 生成文案
    const systemPrompt = `你是一位资深创意文案师，擅长创作短视频脚本、社交媒体文案、营销文案等。
根据用户提供的想法，生成适合配图的文案内容。
请直接输出文案内容，不需要解释。`;

    const textResponse = await llmClient.invoke(
      [
        { role: "system" as const, content: systemPrompt },
        {
          role: "user" as const,
          content: `想法主题：${prompt}\n\n请生成一段吸引人的文案，可以用于配图或视频旁白。`,
        },
      ],
      {
        model: "doubao-seed-2-0-lite-260215",
        temperature: 0.8,
      }
    );

    // 3. 生成视频（使用生成的图片作为首帧）
    const videoResponse = await videoClient.videoGeneration(
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
        duration: 5,
        ratio: "9:16",
        resolution: "720p",
        watermark: false,
        generateAudio: true,
      }
    );

    res.json({
      imageUrl,
      text: textResponse.content,
      videoUrl: videoResponse.videoUrl || null,
      lastFrameUrl: videoResponse.lastFrameUrl || null,
    });
  } catch (error) {
    console.error("Generate all error:", error);
    res.status(500).json({ error: "Generation failed" });
  }
});

/**
 * 重新生成视频（基于现有图片）
 * POST /api/v1/generate/video-regenerate
 * Body: { prompt: string, imageUrl: string }
 */
app.post(
  "/api/v1/generate/video-regenerate",
  async (req: Request, res: Response) => {
    try {
      const { prompt, imageUrl } = req.body;
      if (!prompt || !imageUrl) {
        return res
          .status(400)
          .json({ error: "prompt and imageUrl are required" });
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
          duration: 5,
          ratio: "9:16",
          resolution: "720p",
          watermark: false,
          generateAudio: true,
        }
      );

      if (response.videoUrl) {
        res.json({
          videoUrl: response.videoUrl,
          lastFrameUrl: response.lastFrameUrl,
        });
      } else {
        res.status(500).json({ error: "Video generation failed" });
      }
    } catch (error) {
      console.error("Video regenerate error:", error);
      res.status(500).json({ error: "Video generation failed" });
    }
  }
);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
