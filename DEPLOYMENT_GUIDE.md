# 🚀 生产环境部署指南

## 📋 部署前准备

### 1. 服务器要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 10+
- **内存**: 最少 2GB RAM (推荐 4GB+)
- **存储**: 最少 10GB 可用空间
- **网络**: 80端口和443端口可用

### 2. 安装依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 3. 准备代码

```bash
# 克隆项目到服务器
git clone <你的仓库地址> expe_backend
cd expe_backend

# 确保数据文件存在
mkdir -p data
cp -r cmake-build-debug/data/* data/ || true
```

## 🚀 快速部署

### 方法一：使用一键部署脚本

```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

### 方法二：手动部署

```bash
# 1. 构建前端
cd frontend
npm install
npm run build
cd ..

# 2. 启动服务
docker-compose -f docker-compose.production.yml up -d

# 3. 检查状态
docker-compose -f docker-compose.production.yml ps
```

## 📊 验证部署

部署完成后，访问以下地址验证服务：

- **主应用**: http://your-server-ip
- **健康检查**: http://your-server-ip/health
- **API文档**: http://your-server-ip/docs
- **匹配数据**: http://your-server-ip/api/matchings

## 🔧 配置说明

### 环境变量

在 `.env.production` 文件中配置：

```bash
# 服务器配置
PORT=8000
DEBUG=false

# 数据文件配置
DATA_DIR=/app/data
SHIPMENT_FILE=shipment.csv
ROUTE_FILE=route.csv
MATCHING_FILE=stable_matching.csv

# 数据库配置（可选）
DATABASE_URL=sqlite:///app/data/app.db

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=/app/logs/app.log
```

### 数据文件

确保以下文件存在于 `data/` 目录：

- `shipment.csv` - 货物数据
- `route.csv` - 路线数据  
- `stable_matching.csv` - 匹配结果
- `network.csv` - 网络数据（可选）
- `cooperation_parameter.csv` - 合作参数（可选）

## 🛡️ 安全配置

### 1. 防火墙配置

```bash
# 允许HTTP和HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. SSL证书（推荐）

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. 反向代理配置

编辑 `frontend/nginx-docker.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # 其他配置...
}
```

## 📈 性能优化

### 1. 资源限制

在 `docker-compose.production.yml` 中设置资源限制：

```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
    reservations:
      memory: 512M
      cpus: '0.25'
```

### 2. 缓存配置

启用Redis缓存提高性能：

```bash
# 在docker-compose.production.yml中启用redis服务
docker-compose -f docker-compose.production.yml up -d redis
```

### 3. 日志管理

```bash
# 创建日志目录
mkdir -p logs/nginx

# 配置日志轮转
sudo tee /etc/logrotate.d/expe-app << EOF
/path/to/expe_backend/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
}
EOF
```

## 🔍 监控与维护

### 1. 查看日志

```bash
# 应用日志
docker-compose logs -f backend

# Nginx日志
docker-compose logs -f nginx

# 实时日志
tail -f logs/app.log
```

### 2. 监控状态

```bash
# 容器状态
docker-compose ps

# 资源使用
docker stats

# 健康检查
curl -f http://localhost/health
curl -f http://localhost/api/matchings
```

### 3. 备份数据

```bash
# 备份数据文件
tar -czf backup-$(date +%Y%m%d).tar.gz data/ logs/

# 备份数据库（如果使用）
docker-compose exec backend sqlite3 /app/data/app.db ".backup backup.db"
```

### 4. 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重新构建和部署
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build

# 清理旧镜像
docker image prune -f
```

## 🚨 常见问题

### 1. 容器无法启动
```bash
# 检查日志
docker-compose logs backend

# 重新构建
docker-compose build --no-cache
```

### 2. 数据文件缺失
```bash
# 检查数据目录
ls -la data/

# 重新生成示例数据
python scripts/generate_sample_data.py
```

### 3. 端口冲突
```bash
# 检查端口占用
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :8000

# 修改端口映射
# 编辑 docker-compose.production.yml 中的 ports 部分
```

## 📞 技术支持

如果遇到问题，请检查：

1. **日志文件**: `logs/` 目录下的日志
2. **容器状态**: `docker-compose ps`
3. **系统资源**: `docker stats` 和 `htop`
4. **网络连接**: `curl -v http://localhost/health`

## 🎯 下一步

部署完成后，你可以：

1. **上传数据**: 通过Web界面上传shipment.csv和route.csv
2. **运行匹配**: 使用C++算法进行货物路线匹配
3. **查看结果**: 在Web界面查看匹配结果和统计信息
4. **配置域名**: 设置自己的域名和SSL证书

祝部署顺利！🎉