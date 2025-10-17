#!/bin/bash
# 网络连接调试脚本

echo "🔍 开始网络连接诊断..."

# 1. 检查容器状态
echo "📋 容器状态："
docker-compose ps

# 2. 检查端口监听
echo "🔌 端口监听状态："
netstat -tulnp | grep -E ":80|:8000"

# 3. 检查防火墙状态
echo "🔥 防火墙状态："
if command -v ufw &> /dev/null; then
    ufw status
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --state
    firewall-cmd --list-all
else
    echo "未检测到防火墙管理工具"
fi

# 4. 检查iptables规则
echo "🛡️  iptables规则："
iptables -L -n | grep -E "80|8000"

# 5. 测试本地连接
echo "🏠 本地连接测试："
curl -I http://localhost:80 || echo "❌ 本地80端口连接失败"
curl -I http://localhost:8000 || echo "❌ 本地8000端口连接失败"

# 6. 测试容器内部
echo "🐳 容器内部测试："
docker exec expe_nginx curl -I http://localhost || echo "❌ nginx容器内部连接失败"
docker exec expe_backend curl -I http://localhost:8000 || echo "❌ backend容器内部连接失败"

# 7. 检查nginx配置
echo "⚙️  nginx配置检查："
docker exec expe_nginx nginx -t

# 8. 检查安全组/云防火墙（如果是云服务器）
echo "☁️  云服务器安全组检查："
echo "请手动检查云服务商控制台的安全组设置"
echo "确保入站规则允许 TCP 80端口"

# 9. 检查SELinux（如果启用）
echo "🔒 SELinux状态："
if command -v getenforce &> /dev/null; then
    getenforce
    if [ "$(getenforce)" = "Enforcing" ]; then
        echo "SELinux可能阻止了端口访问"
        echo "尝试: setsebool -P httpd_can_network_connect 1"
    fi
fi

# 10. 检查监听地址
echo "🌐 监听地址检查："
ss -tulnp | grep -E ":80|:8000"

echo ""
echo "🔧 常见解决方案："
echo "1. 如果是云服务器，检查安全组设置"
echo "2. 检查本地防火墙：ufw allow 80/tcp"
echo "3. 检查SELinux：setenforce 0 (临时关闭测试)"
echo "4. 检查nginx配置是否正确"
echo "5. 确认服务器公网IP是否正确"

# 11. 获取服务器IP
echo "📝 服务器信息："
ip addr show | grep -E "inet.*eth0|inet.*ens" | head -1
echo "公网IP: $(curl -s ifconfig.me || echo '无法获取')"