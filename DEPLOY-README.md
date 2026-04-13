# 灵感山羊APP - 部署说明

## 当前状态

| 组件 | 状态 | 访问地址 |
|------|------|----------|
| 前端 | ✅ 已部署 | https://dainty-beijinho-9f2857.netlify.app |
| 后端 | ⏳ 待部署 | - |

## 部署方案

**推荐方案：阿里云函数计算**

- 新用户3个月免费（每月15万CU）
- 国内访问速度快
- Serverless架构免运维

## 快速部署（5分钟）

### 1. 安装工具
```bash
npm install -g @serverless-devs/s
```

### 2. 配置阿里云密钥
```bash
s config add \
  --AccessKeyID 你的AK \
  --AccessKeySecret 你的SK \
  --aliasName default
```

### 3. 部署
```bash
cd 灵感山羊APP/inspiration-goat
s deploy
```

### 4. 配置环境变量
在阿里云控制台添加：
- `COZE_WORKLOAD_IDENTITY_API_KEY` = 你的API密钥

### 5. 更新前端
编辑 `apps/web/.env.production`:
```
VITE_API_BASE_URL=https://你的函数地址/api/v1
```

## 部署包位置

- `fc-deploy.zip` - 完整部署包（7.3MB）

## 文档

- `QUICK-DEPLOY.md` - 快速部署指南
- `DEPLOY-FC-GUIDE.md` - 详细部署文档
- `DEPLOYMENT-STATUS.md` - 部署状态跟踪

## 免费额度

| 项目 | 额度 |
|------|------|
| 新用户免费期 | 3个月 |
| 每月CU额度 | 15万CU |
| 调用次数 | 100万次/月 |

## 成本预估

| 日使用量 | 月成本 |
|----------|--------|
| 100次 | 0元 |
| 1000次 | 0元 |
| 10000次 | ~5元 |

## 技术栈

- 前端: React + Vite (部署在Netlify)
- 后端: Express (部署在阿里云函数计算)
- AI模型: 豆包图片 + DeepSeek文案 + 即梦视频
