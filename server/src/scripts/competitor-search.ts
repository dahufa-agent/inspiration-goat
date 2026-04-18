/**
 * 竞品分析脚本 - 使用Web Search获取AI内容生成类竞品信息
 */
import { SearchClient, Config } from "coze-coding-dev-sdk";

async function searchCompetitors() {
  const config = new Config();
  const client = new SearchClient(config);

  console.log("=".repeat(60));
  console.log("搜索AI内容生成类竞品信息");
  console.log("=".repeat(60));

  // 搜索国内AI图片生成竞品
  console.log("\n【1】搜索国内AI图片生成竞品...");
  const jimengResult = await client.webSearch("即梦AI图片生成 2024 2025", 10, true);
  console.log("\n搜索结果:");
  jimengResult.web_items?.forEach((item, i) => {
    console.log(`${i + 1}. ${item.title}`);
    console.log(`   ${item.snippet?.substring(0, 100)}...`);
    console.log(`   来源: ${item.site_name}`);
  });

  // 搜索可灵AI视频竞品
  console.log("\n【2】搜索AI视频生成竞品...");
  const kilinResult = await client.webSearch("可灵AI视频生成 快手 2024 2025", 10, true);
  console.log("\n搜索结果:");
  kilinResult.web_items?.forEach((item, i) => {
    console.log(`${i + 1}. ${item.title}`);
    console.log(`   ${item.snippet?.substring(0, 100)}...`);
    console.log(`   来源: ${item.site_name}`);
  });

  // 搜索通义万相/腾讯混元
  console.log("\n【3】搜索AI图文生成工具...");
  const otherResult = await client.webSearch("AI图文生成工具 通义万相 腾讯混元 智谱 2024", 10, true);
  console.log("\n搜索结果:");
  otherResult.web_items?.forEach((item, i) => {
    console.log(`${i + 1}. ${item.title}`);
    console.log(`   ${item.snippet?.substring(0, 100)}...`);
    console.log(`   来源: ${item.site_name}`);
  });

  // 搜索AI内容创作APP
  console.log("\n【4】搜索AI内容创作APP...");
  const appResult = await client.webSearch("AI内容创作APP 一键生成图片文案视频 2024 2025", 10, true);
  console.log("\n搜索结果:");
  appResult.web_items?.forEach((item, i) => {
    console.log(`${i + 1}. ${item.title}`);
    console.log(`   ${item.snippet?.substring(0, 100)}...`);
    console.log(`   来源: ${item.site_name}`);
  });

  // 搜索海外竞品
  console.log("\n【5】搜索海外AI内容生成竞品...");
  const overseasResult = await client.webSearch("AI content generation app ChatGPT Claude image video 2024", 10, true);
  console.log("\n搜索结果:");
  overseasResult.web_items?.forEach((item, i) => {
    console.log(`${i + 1}. ${item.title}`);
    console.log(`   ${item.snippet?.substring(0, 100)}...`);
    console.log(`   来源: ${item.site_name}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("搜索完成");
  console.log("=".repeat(60));
}

searchCompetitors().catch(console.error);
