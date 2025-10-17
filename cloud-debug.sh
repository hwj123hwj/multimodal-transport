#!/bin/bash
# 云服务器网络连接诊断脚本

echo "🔍 云服务器网络连接诊断..."

# 获取公网IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "无法获取")
echo "🌐 公网IP: $PUBLIC_IP"

# 检查端口监听
echo "🔌 端口监听状态："
netstat -tulnp | grep -E ":80|:8000"

# 检查服务状态
echo "📋 Docker容器状态："
docker-compose ps

# 测试本地连接
echo "🏠 本地连接测试："
curl -I http://localhost:80 && echo "✅ 本地80端口正常" || echo "❌ 本地80端口失败"
curl -I http://localhost:8000 && echo "✅ 本地8000端口正常" || echo "❌ 本地8000端口失败"

# 检查防火墙
echo "🔥 防火墙状态："
if command -v ufw &> /dev/null; then
    echo "UFW状态："
    ufw status | grep -E "80|8000"
elif command -v firewall-cmd &> /dev/null; then
    echo "Firewalld状态："
    firewall-cmd --list-all | grep -E "ports|services"
fi

# 检查云服务商安全组
echo ""
echo "☁️ 云服务商安全组检查指南："
echo "阿里云：登录控制台 -> 云服务器ECS -> 安全组 -> 配置规则"
echo "腾讯云：登录控制台 -> 云服务器 -> 安全组 -> 入站规则"  
echo "华为云：登录控制台 -> 云服务器 -> 安全组 -> 入方向规则"
echo "AWS：登录控制台 -> EC2 -> Security Groups -> Inbound rules"
echo "Azure：登录控制台 -> Network Security Groups -> Inbound security rules"

echo ""
echo "📝 需要开放以下端口："
echo "TCP 80 (HTTP) - 用于Web访问"
echo "TCP 8000 (API) - 用于后端API"
echo "TCP 22 (SSH) - 用于远程连接"

echo ""
echo "🔧 安全组配置步骤："
echo "1. 登录云服务商控制台"
echo "2. 找到对应的安全组"
echo "3. 添加入方向规则："
echo "   - 端口范围: 80/80"
echo "   - 协议: TCP" 
echo "   - 源地址: 0.0.0.0/0 (或指定IP段)"
echo "4. 保存规则"

# 测试公网访问
echo ""
echo "🧪 公网访问测试："
echo "从本地执行: curl -I http://$PUBLIC_IP:80"
echo "如果超时，说明安全组未配置正确"

# 获取云服务商信息
echo ""
echo "🔍 云服务商检测："
if curl -s metadata.aliyun.com &>/dev/null; then
    echo "检测到：阿里云服务器"
elif curl -s metadata.tencentyun.com &>/dev/null; then  
    echo "检测到：腾讯云服务器"
elif curl -s 169.254.169.254 &>/dev/null; then
    echo "检测到：AWS或其他云服务商"
else
    echo "无法自动检测云服务商"
fi