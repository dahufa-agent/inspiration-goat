# 灵感山羊微信小程序

基于微信小程序的 AI 创意内容生成应用。

## 功能特性

- **首页创作**：输入灵感，一键生成图片、文案和视频
- **用户认证**：登录、注册、验证码
- **会员中心**：月度/季度/年度/永久会员
- **积分中心**：积分余额、签到、充值
- **历史记录**：查看创作历史
- **个人中心**：用户信息管理

## 项目结构

```
miniprogram/
├── app.js              # 应用入口
├── app.json            # 应用配置
├── app.wxss            # 全局样式
├── sitemap.json        # 站点地图
├── pages/
│   ├── index/          # 首页（创作）
│   ├── login/          # 登录页
│   ├── register/       # 注册页
│   ├── membership/     # 会员中心
│   ├── credits/        # 积分中心
│   ├── history/        # 历史记录
│   └── profile/        # 个人中心
├── services/
│   └── api.js          # API 服务层
└── images/             # 图标资源
```

## 开发说明

### 1. 配置后端地址

在 `services/api.js` 中修改 `API_BASE_URL` 为实际的后端地址：

```javascript
const API_BASE_URL = 'http://your-backend-url.com/api/v1'
```

### 2. 配置 AppID

在 `project.config.json` 中修改 `appid` 为你的小程序 AppID：

```json
{
  "appid": "your-appid"
}
```

### 3. 添加 TabBar 图标

在 `images/` 目录下添加以下图标文件：
- `home.png` / `home-active.png`
- `history.png` / `history-active.png`
- `profile.png` / `profile-active.png`

### 4. 使用微信开发者工具

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开项目，选择 `apps/miniprogram` 目录
3. 设置 AppID
4. 开始开发

## 接口说明

小程序通过 API 服务层对接后端 Express 服务器，接口包括：

- `POST /api/v1/auth/send-code` - 发送验证码
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/generate/all` - 一键生成全部
- `GET /api/v1/user/remaining-edits` - 获取剩余次数
- `GET /api/v1/user/membership` - 获取会员状态
- `GET /api/v1/user/points` - 获取积分
- `POST /api/v1/free-codes/activate` - 激活免费码

详细接口文档请参考后端 API。
