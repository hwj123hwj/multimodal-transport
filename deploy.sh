#!/bin/bash

# 多式联运后端部署脚本
set -e

echo "🚀 开始部署多式联运后端服务..."

# 1. 构建前端
echo "📦 构建前端..."
cd frontend
npm install
npm run build
cd ..

# 2. 构建Docker镜像
echo "🐳 构建Docker镜像..."
docker-compose build

# 3. 启动服务
echo "▶️ 启动服务..."
docker-compose up -d

# 4. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 5. 健康检查
echo "🏥 健康检查..."
curl -f http://localhost/health || {
    echo "❌ 服务启动失败"
    docker-compose logs
    exit 1
}

echo "✅ 部署完成！"
echo "🌐 前端地址: http://localhost"
echo "📚 API文档: http://localhost/docs"
echo "🔍 健康检查: http://localhost/health"