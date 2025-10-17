#!/bin/bash

# 🚀 服务器初始化脚本
# 自动安装Docker、Docker Compose并配置环境

set -e

echo "🚀 开始服务器初始化..."

# 检查是否为root用户
if [[ $EUID -ne 0 ]]; then
   echo "❌ 请使用sudo或以root用户运行此脚本"
   exit 1
fi

# 更新系统
echo "📦 更新系统包..."
apt update && apt upgrade -y

# 安装必要工具
echo "🔧 安装必要工具..."
apt install -y curl wget git vim htop ufw fail2ban

# 安装Docker
echo "🐳 安装Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $SUDO_USER
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker安装完成"
else
    echo "✅ Docker已安装"
fi

# 安装Docker Compose
echo "📋 安装Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose安装完成"
else
    echo "✅ Docker Compose已安装"
fi

# 配置防火墙
echo "🛡️ 配置防火墙..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 配置fail2ban
echo "🔒 配置fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl start fail2ban

# 创建项目目录
echo "📁 创建项目目录..."
mkdir -p /opt/expe_backend
cd /opt/expe_backend

# 创建基础配置文件
echo "⚙️ 创建基础配置文件..."
cat > .env.production << EOF
# 生产环境配置
PORT=8000
DEBUG=false
DATA_DIR=/app/data
LOG_LEVEL=INFO

# 数据库配置
DATABASE_URL=sqlite:///app/data/app.db

# 安全配置
SECRET_KEY=$(openssl rand -hex 32)
ALLOWED_HOSTS=localhost,127.0.0.1
EOF

# 创建数据目录
mkdir -p data logs

# 设置权限
chown -R $SUDO_USER:$SUDO_USER /opt/expe_backend

# 安装Node.js（用于前端构建）
echo "📦 安装Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 验证安装
echo "🔍 验证安装..."
docker --version
docker-compose --version
node --version
npm --version

echo "🎉 服务器初始化完成！"
echo ""
echo "📋 下一步操作："
echo "1. 将项目代码上传到 /opt/expe_backend 目录"
echo "2. 运行 ./deploy-production.sh 进行部署"
echo "3. 配置域名和SSL证书"
echo ""
echo "🔧 常用命令："
echo "- 查看容器状态: docker-compose ps"
echo "- 查看日志: docker-compose logs -f"
echo "- 重启服务: docker-compose restart"
echo "- 更新镜像: docker-compose pull && docker-compose up -d"