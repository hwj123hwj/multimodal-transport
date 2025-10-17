#!/bin/bash

# 传统Linux服务器部署脚本
set -e

echo "🚀 开始传统方式部署多式联运后端..."

# 1. 安装依赖
echo "📦 安装系统依赖..."
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip nginx curl

# 2. 创建应用目录
echo "📁 创建应用目录..."
sudo mkdir -p /opt/expe_backend
cd /opt/expe_backend

# 3. 复制代码
echo "📂 复制应用代码..."
sudo cp -r $PWD/app .
sudo cp $PWD/app.py .
sudo cp $PWD/requirements.txt .

# 4. 创建虚拟环境
echo "🐍 创建Python虚拟环境..."
sudo python3.11 -m venv venv
source venv/bin/activate

# 5. 安装Python依赖
echo "📚 安装Python依赖..."
pip install --upgrade pip
pip install -r requirements.txt

# 6. 创建systemd服务
echo "🔧 创建systemd服务..."
sudo tee /etc/systemd/system/expe-backend.service > /dev/null <<EOF
[Unit]
Description=多式联运稳定匹配系统后端
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/opt/expe_backend
Environment="PATH=/opt/expe_backend/venv/bin"
Environment="PORT=8000"
Environment="DEBUG=false"
ExecStart=/opt/expe_backend/venv/bin/python -m uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 7. 配置nginx
echo "⚙️ 配置nginx..."
sudo tee /etc/nginx/sites-available/expe-backend > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    location / {
        root /var/www/expe_frontend;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host \$host;
    }

    location /redoc {
        proxy_pass http://127.0.0.1:8000/redoc;
        proxy_set_header Host \$host;
    }
}
EOF

# 8. 启用nginx配置
sudo ln -sf /etc/nginx/sites-available/expe-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 9. 启动后端服务
sudo systemctl daemon-reload
sudo systemctl enable expe-backend
sudo systemctl start expe-backend

# 10. 健康检查
echo "🏥 健康检查..."
sleep 5
curl -f http://localhost/health || {
    echo "❌ 服务启动失败"
    sudo journalctl -u expe-backend -n 50
    exit 1
}

echo "✅ 部署完成！"
echo "🌐 请配置你的域名解析到服务器IP"
echo "📚 API文档: http://your-domain.com/docs"
echo "🔍 服务状态: sudo systemctl status expe-backend"