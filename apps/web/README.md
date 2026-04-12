# 灵感山羊 - 网页应用

基于 React 的网页版灵感山羊应用，提供与移动端一致的用户体验。

## 功能特性

### 核心功能
- 📝 **灵感创作**: 一键生成图片、文案、视频
- ✨ **文案润色**: 智能优化文案内容
- 🔗 **内容提取**: 从URL提取优质内容
- 📱 **历史记录**: 查看和管理创作历史

### 用户系统
- 📱 手机号注册登录
- 🔐 会员体系
- 💰 积分系统

## 技术栈

- React 18
- TypeScript
- TailwindCSS
- React Router
- Vite

## 开发

```bash
cd apps/web
npm install
npm run dev
```

## 页面结构

```
src/
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── InputForm.tsx
│   └── ResultCard.tsx
├── pages/
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   └── History.tsx
├── hooks/
│   └── useApi.ts
├── services/
│   └── api.ts
└── App.tsx
```

## API 集成

网页应用调用后端 API：
- 基础URL: `http://localhost:9091/api/v1`
- 用户认证: `/auth/login`, `/auth/register`, `/auth/send-code`
- 内容生成: `/generate/all`, `/generate/image`, `/generate/video`
- 用户服务: `/user/membership`, `/user/points`

## 响应式设计

- 桌面端: 1200px+
- 平板端: 768px - 1199px
- 移动端: < 768px
