#!/bin/bash
# 灵感山羊APP - 阿里云函数计算部署脚本

set -e

echo "🚀 开始部署灵感山羊APP后端到阿里云函数计算..."

# 进入服务器目录
cd "$(dirname "$0")"

# 1. 安装依赖
echo "📦 安装项目依赖..."
cd server
npm install

# 2. 构建项目
echo "⚡ 构建项目..."
npm run build

# 3. 复制必要文件到fc-deploy目录
echo "📁 准备部署文件..."
cd ..
rm -rf fc-deploy 2>/dev/null || true
mkdir -p fc-deploy

# 复制编译后的代码
cp server/dist/index.js fc-deploy/

# 复制node_modules
cp -r server/node_modules fc-deploy/

# 复制package.json (移除devDependencies以减小体积)
cp server/package.json fc-deploy/package.json

# 4. 创建bootstrap启动脚本
cat > fc-deploy/bootstrap << 'BOOTSTRAP'
#!/bin/bash
cd /code/bootstrap
node index.js
BOOTSTRAP

chmod +x fc-deploy/bootstrap

# 5. 创建zip包
echo "📦 创建部署包..."
cd fc-deploy
zip -r ../fc-deploy.zip .
cd ..

echo ""
echo "✅ 部署包已生成: fc-deploy.zip"
echo ""
echo "📋 部署步骤:"
echo "1. 登录阿里云函数计算控制台: https://fc.console.aliyun.com/"
echo "2. 创建服务: 地域选择'杭州'或'上海'，创建服务名称如 'inspiration-goat'"
echo "3. 创建函数:"
echo "   - 选择'使用自定义运行时'模板"
echo "   - 函数名称: 'api-server'"
echo "   - 启动命令: /code/bootstrap"
echo "   - 监听端口: 9091"
echo "4. 上传fc-deploy.zip包"
echo "5. 配置环境变量: COZE_WORKLOAD_IDENTITY_API_KEY"
echo "6. 测试函数"
echo ""
echo "📝 函数计算免费额度说明:"
echo "- 新用户: 3个月免费，每月15万CU"
echo "- 执行时间: 基本实例600s超时限制"
echo "- 内存: 最大3GB"
echo ""
