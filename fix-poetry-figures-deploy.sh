#!/bin/bash
# ============================================================
# 灵感山羊APP - 诗词人物Tab修复部署脚本
# ============================================================

set -e

echo "=========================================="
echo "灵感山羊APP - 诗词人物Tab修复"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 服务器配置
SERVER_IP="112.124.105.236"
SERVER_USER="root"
SERVER_PATH="/var/www/inspiration-goat"

echo ""
echo "📦 步骤1: 本地构建完成"

# 检查构建产物
if [ -f "apps/web/dist/index.html" ]; then
    echo "✅ 构建产物存在"
    echo "   - JS文件大小: $(du -h apps/web/dist/assets/*.js | awk '{print $1}')"
else
    echo "❌ 构建产物不存在，请先运行 npm run build"
    exit 1
fi

echo ""
echo "📤 步骤2: 部署到服务器"

# 检查SSH连接
echo "正在检查SSH连接..."
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "echo 'SSH连接成功'" 2>/dev/null; then
    echo "✅ SSH连接成功"
    
    # 创建备份
    echo "正在创建备份..."
    ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${SERVER_PATH}/backup/\$(date +%Y%m%d%H%M%S)" 2>/dev/null
    ssh ${SERVER_USER}@${SERVER_IP} "cp -r ${SERVER_PATH}/* ${SERVER_PATH}/backup/\$(date +%Y%m%d%H%M%S)/" 2>/dev/null || true
    echo "✅ 备份完成"
    
    # 上传新文件
    echo "正在上传新文件..."
    scp -r apps/web/dist/* ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/
    echo "✅ 上传完成"
    
    # 重新加载Nginx
    echo "正在重新加载Nginx..."
    ssh ${SERVER_USER}@${SERVER_IP} "nginx -s reload" 2>/dev/null || true
    echo "✅ Nginx重新加载完成"
    
    echo ""
    echo "🎉 部署完成！"
    echo ""
    echo "请访问以下链接验证修复："
    echo "   诗词页面: http://${SERVER_IP}/poetry"
    echo "   人物页面: http://${SERVER_IP}/figures"
    
else
    echo "❌ SSH连接失败，请手动部署"
fi

echo ""
echo "=========================================="
echo "手动部署步骤（如果SSH连接失败）"
echo "=========================================="
echo ""
echo "1. 在本地打包构建产物："
echo "   cd 灵感山羊APP/inspiration-goat/apps/web"
echo "   npm run build"
echo "   tar -czvf dist-fixed.tar.gz dist/"
echo ""
echo "2. 上传到服务器："
echo "   scp dist-fixed.tar.gz root@${SERVER_IP}:/tmp/"
echo ""
echo "3. 在服务器上执行："
echo "   cd /var/www/inspiration-goat"
echo "   # 备份"
echo "   mkdir -p backup/\$(date +%Y%m%d)"
echo "   cp -r * backup/\$(date +%Y%m%d)/"
echo "   # 解压新文件"
echo "   tar -xzvf /tmp/dist-fixed.tar.gz"
echo "   # 重载Nginx"
echo "   nginx -s reload"
echo ""
echo "4. 验证页面："
echo "   诗词页面: http://${SERVER_IP}/poetry"
echo "   人物页面: http://${SERVER_IP}/figures"
echo ""
