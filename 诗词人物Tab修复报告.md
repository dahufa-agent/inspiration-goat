# 灵感山羊APP诗词人物Tab修复报告

## 问题分析

经过排查发现，灵感山羊APP的诗词Tab和人物Tab点击后显示空白的原因是：

**根本原因**：前端代码中缺少诗词页面和人物页面的组件实现
- 路由配置中没有 `/poetry` 和 `/figures` 路由
- 没有对应的页面组件
- 导航栏中没有诗词和人物Tab入口

**后端状态**：后端API正常工作
- `/api/v1/guoxue/poems/all` - 诗词API正常
- `/api/v1/guoxue/figures/all` - 人物API正常

## 修复方案

### 1. 新增页面组件

**诗词页面** (`src/pages/Poetry.tsx`)
- 从后端API获取诗词列表
- 按标签筛选诗词
- 支持展开/收起查看全文
- 美观的古典风格UI设计

**人物页面** (`src/pages/Figures.tsx`)
- 从后端API获取历史人物列表
- 展示人物头像、称号、时代、简介
- 点击查看详情弹窗
- 展示人物主要成就

### 2. 更新路由配置

**修改文件**: `src/App.tsx`
```tsx
// 新增导入
import Poetry from './pages/Poetry'
import Figures from './pages/Figures'

// 新增路由
<Route path="/poetry" element={<Poetry />} />
<Route path="/figures" element={<Figures />} />
```

### 3. 更新导航栏

**修改文件**: `src/components/Header.tsx`
```tsx
// 新增导航项
{ to: '/poetry', label: '诗词', icon: '📜' },
{ to: '/figures', label: '人物', icon: '👑' },
```

## 文件清单

修改的文件：
1. `灵感山羊APP/inspiration-goat/apps/web/src/App.tsx` - 添加路由
2. `灵感山羊APP/inspiration-goat/apps/web/src/components/Header.tsx` - 添加导航项
3. `灵感山羊APP/inspiration-goat/apps/web/src/pages/Poetry.tsx` - 新增诗词页面
4. `灵感山羊APP/inspiration-goat/apps/web/src/pages/Figures.tsx` - 新增人物页面

构建产物：
- `灵感山羊APP/inspiration-goat/apps/web/dist/` - 编译后的静态文件

## 部署说明

### 方式一：使用部署脚本

```bash
cd 灵感山羊APP/inspiration-goat
chmod +x fix-poetry-figures-deploy.sh
./fix-poetry-figures-deploy.sh
```

### 方式二：手动部署

1. **上传打包文件到服务器**
```bash
scp dist-fixed.tar.gz root@112.124.105.236:/tmp/
```

2. **SSH到服务器**
```bash
ssh root@112.124.105.236
```

3. **备份现有文件**
```bash
cd /var/www/inspiration-goat
mkdir -p backup/$(date +%Y%m%d)
cp -r * backup/$(date +%Y%m%d)/
```

4. **解压新文件**
```bash
tar -xzvf /tmp/dist-fixed.tar.gz
```

5. **重载Nginx**
```bash
nginx -s reload
```

## 验证修复

部署完成后，访问以下链接验证：

1. **首页** - http://112.124.105.236/
   - 应能看到导航栏新增"诗词"和"人物"Tab

2. **诗词页面** - http://112.124.105.236/poetry
   - 应显示诗词列表
   - 可按标签筛选
   - 点击可展开查看全文

3. **人物页面** - http://112.124.105.236/figures
   - 应显示历史人物卡片
   - 点击可查看详情弹窗

## 技术细节

- **前端框架**: React + TypeScript + Vite
- **路由**: React Router v6
- **样式**: Tailwind CSS
- **后端接口**: REST API (http://112.124.105.236:8080)
- **构建大小**: JS 128KB (原104KB，新增24KB)

---
*修复时间: $(date '+%Y-%m-%d %H:%M:%S')*
