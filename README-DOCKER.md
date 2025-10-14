# 多式联运稳定匹配系统 - Docker部署指南

## 🚀 快速开始

### 前置要求
- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少4GB可用内存

### 一键部署

```bash
# 克隆项目后，在项目根目录执行：
chmod +x docker-deploy.sh
./docker-deploy.sh
```

### 手动部署

```bash
# 1. 构建镜像
docker-compose build

# 2. 启动服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 停止服务
docker-compose down
```

## 📋 服务架构

### 容器组成
- **backend**: FastAPI后端服务 (端口8000)
- **frontend**: React前端应用 (端口3000)
- **nginx**: 反向代理 (端口80/443) - 生产环境可选

### 网络配置
- 所有容器通过`expe-network`桥接网络通信
- 前端通过`http://backend:8000`访问后端API

## 🔧 配置说明

### 环境变量

#### 后端环境变量
- `PORT`: 后端服务端口 (默认: 8000)
- `DEBUG`: 调试模式 (默认: false)
- `DATA_DIR`: 数据目录 (默认: /app/data)

#### 前端环境变量
- `REACT_APP_API_URL`: API服务地址 (默认: http://backend:8000)

### 数据持久化
- `./data`: 应用数据目录
- `./logs`: 日志文件目录
- `./nginx/ssl`: SSL证书目录 (生产环境)

## 🌐 访问地址

| 服务 | 开发环境 | 生产环境 |
|------|----------|----------|
| 前端应用 | http://localhost:3000 | http://localhost |
| 后端API | http://localhost:8000 | http://localhost/api |
| API文档 | http://localhost:8000/docs | http://localhost/docs |
| 健康检查 | http://localhost:8000/health | http://localhost/health |

## 📊 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 重建单个服务
docker-compose build backend
docker-compose up -d backend

# 进入容器调试
docker-compose exec backend bash
docker-compose exec frontend sh

# 清理所有数据
docker-compose down -v
```

## 🔒 生产环境部署

### SSL证书配置
1. 将SSL证书文件放入`./nginx/ssl/`目录
2. 修改`nginx/nginx.conf`配置SSL
3. 使用生产环境配置启动：
   ```bash
   docker-compose --profile production up -d
   ```

### 性能优化
- 调整`docker-compose.yml`中的内存限制
- 配置Redis缓存（可选）
- 使用外部数据库（可选）

## 🐛 故障排查

### 常见问题

1. **端口冲突**
   - 检查端口8000、3000、80是否被占用
   - 修改`docker-compose.yml`中的端口映射

2. **构建失败**
   - 检查网络连接
   - 清理Docker缓存：`docker system prune -a`

3. **服务无法访问**
   - 检查防火墙设置
   - 确认服务状态：`docker-compose ps`
   - 查看日志：`docker-compose logs`

### 日志位置
- 应用日志：`./logs/`
- Nginx日志：`./logs/nginx/`
- Docker日志：`docker-compose logs`

## 📈 监控和维护

### 资源监控
```bash
# 查看容器资源使用
docker stats

# 查看系统资源
docker system df
```

### 定期维护
```bash
# 清理无用镜像
docker image prune -a

# 清理无用卷
docker volume prune

# 完整清理
docker system prune -a
```

## 🔧 开发环境

### 本地开发
```bash
# 后端开发
cd backend
pip install -r requirements.txt
python app.py

# 前端开发
cd frontend
npm install
npm start
```

### 热重载
开发模式下支持热重载，代码修改后自动重启服务。

## 📞 支持

如有问题，请检查日志文件或在项目仓库提交Issue。