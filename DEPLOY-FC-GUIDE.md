# 灵感山羊APP - 阿里云函数计算部署指南

## 方案概述

使用阿里云函数计算部署后端服务：
- **新用户福利**: 3个月免费，每月15万CU额度
- **国内访问**: 阿里云国内节点，延迟低
- **免运维**: Serverless架构，无需管理服务器

## 免费额度说明

| 项目 | 免费额度 |
|------|----------|
| CU使用量 | 15万CU/月（连续3个月） |
| 调用次数 | 每月前100万次免费 |
| 执行时间 | 每月前40万GB-秒免费 |
| 公网流量 | 220GB/月 CDT |

> 按256MB内存计算，每月可免费执行约160万秒（约444小时）

## 部署方式一：手动部署（推荐新手）

### 第一步：构建部署包

```bash
cd 灵感山羊APP/inspiration-goat
chmod +x deploy-fc.sh
./deploy-fc.sh
```

### 第二步：登录阿里云控制台

1. 打开函数计算控制台: https://fc.console.aliyun.com/
2. 选择地域（推荐：杭州、上海）
3. 点击"服务及函数"

### 第三步：创建服务

1. 点击"创建服务"
2. 填写信息：
   - 服务名称: `inspiration-goat`
   - 描述: `灵感山羊APP后端服务`
   - 日志配置: 可不配置（免费）
   - 勾选"开启公网访问"

### 第四步：创建函数

1. 进入服务后，点击"创建函数"
2. 选择"自定义运行时（Custom Runtime）"
3. 填写配置：
   - 函数名称: `api-server`
   - 内存: 512 MB
   - 超时时间: 600 秒
   - 端口: 9091
   - 启动命令: `/code/bootstrap`

4. 上传代码：
   - 点击"上传代码"
   - 选择生成的 `fc-deploy.zip`

### 第五步：配置环境变量

1. 进入函数配置
2. 点击"环境变量"
3. 添加：
   - `COZE_WORKLOAD_IDENTITY_API_KEY` = 你的API密钥
   - `NODE_ENV` = production
   - `PORT` = 9091

### 第六步：获取访问地址

1. 点击"触发器管理"
2. 点击"创建触发器"
3. 类型选择"HTTP触发器"
4. 关闭"安全认证"（或按需配置）
5. 获取公网访问地址

## 部署方式二：Serverless Devs CLI

### 安装工具

```bash
npm install -g @serverless-devs/s
```

### 配置密钥

```bash
s config add \
  --AccessKeyID 你的AK \
  --AccessKeySecret 你的SK
```

### 部署

```bash
cd 灵感山羊APP/inspiration-goat
s deploy
```

## 部署后配置

### 更新前端API地址

部署成功后，获取函数计算提供的HTTP触发器地址，更新到前端：

1. 编辑 `apps/web/src/services/api.ts`
2. 修改 `API_BASE_URL` 为你的函数地址
3. 重新构建部署到Netlify

### 示例配置

```typescript
// apps/web/src/services/api.ts
const API_BASE_URL = 'https://api-inspiration-goat.fcapp.xyz'
```

## 成本预估

假设每天100次API调用，每次执行1秒：

| 资源 | 消耗 | 费用 |
|------|------|------|
| 调用次数 | 3,000次/月 | 0（免费额度内） |
| 执行时间 | 3,000秒/月 | 0（免费额度内） |
| **合计** | | **0元/月** |

## 常见问题

### Q: 函数计算有执行时间限制吗？
A: 基本实例最大600秒超时。如果需要长时任务，考虑使用异步调用。

### Q: 如何查看日志？
A: 在函数计算控制台，点击"日志"查看函数执行日志。

### Q: 如何配置自定义域名？
A: 在"域名管理"中添加自定义域名，并配置CNAME解析。

### Q: 免费额度用完后如何计费？
A: 按量付费，256MB内存执行1秒约0.00001668美元。

## 监控与告警

建议配置：
- 日志服务（可选）
- 定时触发器检查健康状态
- 监控仪表盘查看CU使用量

---

如需帮助，请参考阿里云文档: https://help.aliyun.com/zh/function-compute/
