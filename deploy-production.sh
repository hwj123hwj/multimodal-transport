#!/bin/bash

# 生产环境Docker部署脚本
# 适用于Ubuntu/Debian/CentOS等Linux服务器

set -e

echo "🚀 开始生产环境部署..."

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down || true

# 构建前端
echo "📦 构建前端应用..."
cd frontend
npm install
npm run build
cd ..

# 复制数据文件到Docker卷目录
echo "📁 准备数据文件..."
mkdir -p data
cp -r cmake-build-debug/data/* data/ || true

# 构建并启动服务
echo "🏗️ 构建并启动Docker服务..."
docker-compose up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 健康检查
echo "🏥 执行健康检查..."
if curl -f http://localhost/health &> /dev/null; then
    echo "✅ 后端服务健康检查通过"
else
    echo "❌ 后端服务健康检查失败"
    docker-compose logs backend
    exit 1
fi

if curl -f http://localhost/api/matchings &> /dev/null; then
    echo "✅ API服务正常运行"
else
    echo "⚠️ API服务可能需要数据文件"
fi

echo "🎉 部署完成！"
echo "访问地址: http://localhost"
echo "API文档: http://localhost/docs"
echo "健康检查: http://localhost/health"