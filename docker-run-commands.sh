#!/bin/bash
# 完整的Docker容器启动命令

echo "🐳 Docker容器启动命令："
echo ""

# 启动后端容器（8000端口）
echo "1️⃣ 启动后端容器："
echo "docker run -d --name expe_backend \\"
echo "  -p 8000:8000 \\"
echo "  -e DATA_DIR=/app/data \\"
echo "  -v \$(pwd)/data:/app/data \\"
echo "  expe_backend-backend:latest"
echo ""

# 启动nginx容器（80端口）
echo "2️⃣ 启动nginx容器："
echo "docker run -d --name expe_nginx \\"
echo "  -p 80:80 \\"
echo "  -v \$(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro \\"
echo "  --link expe_backend:backend \\"
echo "  nginx:alpine"
echo ""

# 或者使用Docker Compose（推荐）
echo "🚀 推荐：使用Docker Compose一键启动："
echo "docker-compose up -d"
echo ""

echo "📋 常用命令："
echo "查看状态: docker-compose ps"
echo "查看日志: docker-compose logs"
echo "停止服务: docker-compose down"
echo "重启服务: docker-compose restart"