#!/bin/bash
# Linux服务器部署脚本 - 从上传的tar文件部署

echo "🚀 开始部署Docker镜像..."

# 检查文件是否存在
if [ ! -f "backend.tar" ]; then
    echo "❌ backend.tar 文件不存在，请先上传镜像文件"
    echo "在Windows上执行: scp backend.tar username@server-ip:/opt/"
    exit 1
fi

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    echo "执行: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装"
    echo "执行: sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

echo "📦 加载Docker镜像..."
docker load < backend.tar

if [ $? -ne 0 ]; then
    echo "❌ 镜像加载失败"
    exit 1
fi

echo "✅ 镜像加载成功"

# 显示加载的镜像
echo "📋 可用镜像："
docker images | grep expe_backend

# 创建项目目录
echo "📁 创建项目目录..."
mkdir -p /opt/expe_backend
cd /opt/expe_backend

# 如果存在docker-compose.yml，直接启动
if [ -f "docker-compose.yml" ]; then
    echo "🚀 使用现有配置启动服务..."
    docker-compose down 2>/dev/null || true
    docker-compose up -d
else
    echo "⚠️  未找到docker-compose.yml文件"
    echo "请确保项目代码已上传到 /opt/expe_backend 目录"
    echo "或者手动创建docker-compose.yml文件"
fi

echo "⏳ 等待服务启动..."
sleep 10

echo "🏥 执行健康检查..."
if curl -f http://localhost:8000/health &> /dev/null; then
    echo "✅ 后端服务启动成功！"
else
    echo "⚠️  健康检查失败，查看日志："
    docker-compose logs backend
fi

echo "📊 服务状态："
docker-compose ps

echo "🎉 部署完成！"
echo "访问地址：http://your-server-ip:8000"
echo "健康检查：http://your-server-ip:8000/health"

# 清理tar文件（可选）
echo "🧹 清理临时文件..."
rm -f backend.tar