#!/bin/bash
# Linux服务器部署脚本

echo "🚀 开始部署Docker镜像..."

# 检查是否提供了镜像文件
if [ -f "backend.tar" ]; then
    echo "📦 加载Docker镜像..."
    docker load < backend.tar
    
    if [ $? -eq 0 ]; then
        echo "✅ 镜像加载成功"
        rm backend.tar
    else
        echo "❌ 镜像加载失败"
        exit 1
    fi
fi

# 检查镜像是否存在
if docker images | grep -q "expe_backend-backend"; then
    echo "✅ Docker镜像已准备就绪"
else
    echo "❌ Docker镜像未找到，请先上传镜像文件"
    exit 1
fi

# 创建必要的目录
echo "📁 创建目录结构..."
mkdir -p data logs

# 复制数据文件（如果存在）
if [ -d "cmake-build-debug/data" ]; then
    echo "📊 复制数据文件..."
    cp -r cmake-build-debug/data/* data/
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 健康检查
echo "🏥 执行健康检查..."
if curl -f http://localhost:8000/health &> /dev/null; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败，检查日志："
    docker-compose logs backend
    exit 1
fi

# 显示状态
echo "📊 服务状态："
docker-compose ps

echo "🎉 部署完成！"
echo "访问地址：http://your-server-ip"
echo "健康检查：http://your-server-ip:8000/health"
echo "API文档：http://your-server-ip:8000/docs"