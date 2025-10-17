#!/bin/bash

# Python后端+C++算法Docker部署脚本

echo "🚀 开始部署Python后端+C++算法..."

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
echo "🔥 启动服务..."
docker-compose up -d

# 4. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 5. 健康检查
echo "🏥 健康检查..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ 部署成功！服务运行正常"
    echo "📋 服务信息："
    echo "   - 前端地址: http://localhost"
    echo "   - 后端API: http://localhost/api"
    echo "   - 健康检查: http://localhost/health"
else
    echo "❌ 部署失败！服务未正常启动"
    echo "📋 查看日志："
    echo "   docker-compose logs"
    exit 1
fi