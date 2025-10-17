#!/bin/bash
# 快速启动命令 - 让其他设备都能访问

echo "🚀 启动 expe_backend 服务..."

# 停止已有容器
docker-compose down

# 启动服务（关键：绑定到所有网络接口）
docker-compose up -d

echo "⏳ 等待服务启动..."
sleep 5

# 显示状态
echo "📊 服务状态："
docker-compose ps

echo "✅ 启动完成！"
echo "访问地址："
echo "  前端: http://服务器公网IP:80"
echo "  后端: http://服务器公网IP:8000"
echo "  健康检查: http://服务器公网IP:8000/health"