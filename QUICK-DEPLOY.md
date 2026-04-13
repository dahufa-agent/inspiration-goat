# 灵感山羊APP - 阿里云函数计算一键部署指南

## 部署包已就绪 ✅

- 位置: `./灵感山羊APP/inspiration-goat/fc-deploy.zip`
- 大小: 7.3 MB
- 包含: index.js + node_modules

## 部署到阿里云函数计算（5分钟完成）

### 第一步：获取阿里云AK/SK

1. 登录阿里云控制台: https://account.aliyun.com
2. 点击右上角头像 → AccessKey管理
3. 创建AccessKey（保存AK和SK）

### 第二步：安装Serverless Devs

```bash
npm install -g @serverless-devs/s
```

### 第三步：配置密钥

```bash
s config add \
  --AccessKeyID 你的AK \
  --AccessKeySecret 你的SK \
  --aliasName default
```

### 第四步：部署

```bash
cd 灵感山羊APP/inspiration-goat
s deploy
```

### 第五步：配置环境变量

在阿里云控制台 → 函数计算 → 找到 `inspiration-goat` 服务 → `api-server` 函数：

1. 点击"函数配置" → "环境变量"
2. 添加：
   - `COZE_WORKLOAD_IDENTITY_API_KEY` = 你的API密钥
   - `NODE_ENV` = production
   - `PORT` = 9091

### 第六步：获取API地址

1. 点击"触发器管理"
2. 点击"创建触发器"
3. 类型选择"HTTP触发器"
4. 复制URL（格式: https://xxx.fcapp.xyz）

### 第七步：更新前端

编辑 `./灵感山羊APP/inspiration-goat/apps/web/.env.production`:

```
VITE_API_BASE_URL=https://你的函数URL/api/v1
```

重新部署前端到Netlify。

## 手动部署（通过控制台）

如果CLI部署失败，可以手动操作：

1. 打开 https://fc.console.aliyun.com/
2. 创建服务 `inspiration-goat`
3. 创建函数：
   - 运行时: 自定义
   - 上传: fc-deploy.zip
   - 启动命令: /code/bootstrap
   - 端口: 9091
4. 创建HTTP触发器获取URL
5. 配置环境变量

## 免费额度说明

| 资源 | 额度 |
|------|------|
| 新用户免费 | 3个月，每月15万CU |
| 执行时间(256MB) | 约444小时/月 |
| 调用次数 | 100万次/月 |

## 成本预估

| 月使用量 | 预计成本 |
|----------|----------|
| 100次/天 | 0元 |
| 1000次/天 | 0元 |
| 10000次/天 | ~5元 |

## 常见问题

### Q: 函数执行超时怎么办？
A: 在函数配置中增大超时时间（最大600秒）

### Q: 如何查看日志？
A: 函数计算控制台 → 日志查询

### Q: 免费额度用完会怎样？
A: 按量付费，费用很低

---

部署完成后，APP即可通过国内网络正常访问！
