# 灵感山羊APP - 后端部署状态

## 当前状态

- ✅ 前端已部署: https://dainty-beijinho-9f2857.netlify.app
- ⏳ 后端部署: 待完成

## 后端部署包

部署包已生成: `./灵感山羊APP/inspiration-goat/fc-deploy.zip`

内容：
- `index.js` - 编译后的后端代码 (56KB)
- `package.json` - 依赖清单
- `bootstrap` - 启动脚本

## 部署步骤

### 1. 登录阿里云函数计算控制台

访问: https://fc.console.aliyun.com/

### 2. 创建服务

1. 选择地域（推荐：杭州或上海）
2. 点击"创建服务"
3. 配置：
   - 服务名称: `inspiration-goat`
   - 描述: 灵感山羊APP后端服务
   - 勾选"开启公网访问"

### 3. 创建函数

1. 进入服务后，点击"创建函数"
2. 选择"自定义运行时"
3. 配置：
   - 函数名称: `api-server`
   - 内存: 512 MB
   - 超时时间: 600 秒
   - 端口: 9091
   - 启动命令: `/code/bootstrap`
4. 上传代码: 选择 `fc-deploy.zip`

### 4. 配置环境变量

在函数配置中添加：
- `COZE_WORKLOAD_IDENTITY_API_KEY` = 你的API密钥
- `NODE_ENV` = production
- `PORT` = 9091

### 5. 获取访问地址

1. 点击"触发器管理"
2. 创建HTTP触发器
3. 复制公网访问地址

### 6. 更新前端配置

部署成功后，编辑 `./灵感山羊APP/inspiration-goat/apps/web/.env.production`:

```
VITE_API_BASE_URL=https://你的函数地址/api/v1
```

然后重新构建部署到Netlify。

## 部署命令汇总

```bash
# 1. 进入项目目录
cd 灵感山羊APP/inspiration-goat

# 2. 构建后端
cd server && npm install && npm run build && cd ..

# 3. 创建部署包
mkdir -p fc-deploy
cp server/dist/index.js fc-deploy/
cp server/package.json fc-deploy/
# 编辑 fc-deploy/package.json 移除 devDependencies
# 创建 fc-deploy/bootstrap 启动脚本
zip -r fc-deploy.zip fc-deploy/

# 4. 上传到阿里云（通过控制台或CLI）
```

## 免费额度

- 新用户: 3个月免费，每月15万CU
- 预计成本（初期）: 0元/月
