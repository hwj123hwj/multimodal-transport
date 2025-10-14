# 多式联运稳定匹配系统Docker部署Makefile

.PHONY: help build up down logs clean restart deploy-dev deploy-prod

# 默认目标
help:
	@echo "🚀 多式联运稳定匹配系统Docker部署工具"
	@echo ""
	@echo "可用命令:"
	@echo "  make build       - 构建所有Docker镜像"
	@echo "  make up          - 启动开发环境服务"
	@echo "  make down        - 停止服务"
	@echo "  make logs        - 查看实时日志"
	@echo "  make clean       - 清理所有容器和镜像"
	@echo "  make restart     - 重启服务"
	@echo "  make deploy-dev  - 部署开发环境"
	@echo "  make deploy-prod - 部署生产环境"
	@echo "  make status      - 查看服务状态"
	@echo "  make shell-backend - 进入后端容器"
	@echo "  make shell-frontend - 进入前端容器"

# 构建镜像
build:
	@echo "🏗️  构建Docker镜像..."
	docker-compose build --no-cache

# 启动开发环境
up:
	@echo "🚀 启动开发环境..."
	docker-compose up -d
	@echo "✅ 开发环境启动完成！"
	@echo "🌐 访问地址: http://localhost:3000"

# 停止服务
down:
	@echo "🛑 停止服务..."
	docker-compose down

# 查看日志
logs:
	@echo "📋 查看实时日志..."
	docker-compose logs -f

# 清理所有
clean:
	@echo "🧹 清理所有容器和镜像..."
	docker-compose down -v --remove-orphans
	docker system prune -af

# 重启服务
restart:
	@echo "🔄 重启服务..."
	docker-compose restart

# 部署开发环境
deploy-dev:
	@echo "🚀 部署开发环境..."
	@mkdir -p data logs nginx/ssl
	$(MAKE) build
	$(MAKE) up
	@echo "⏳ 等待服务启动..."
	@sleep 10
	$(MAKE) status

# 部署生产环境
deploy-prod:
	@echo "🏭 部署生产环境..."
	@mkdir -p data logs nginx/ssl
	@echo "🏗️  构建生产环境镜像..."
	docker-compose -f docker-compose.prod.yml build --no-cache
	@echo "🚀 启动生产环境服务..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "⏳ 等待服务启动..."
	@sleep 15
	@echo "✅ 生产环境部署完成！"
	@echo "🌐 访问地址: http://localhost"
	$(MAKE) status-prod

# 查看状态
status:
	@echo "📊 服务状态:"
	docker-compose ps

# 查看生产环境状态
status-prod:
	@echo "📊 生产环境服务状态:"
	docker-compose -f docker-compose.prod.yml ps

# 进入后端容器
shell-backend:
	@echo "🐳 进入后端容器..."
	docker-compose exec backend bash

# 进入前端容器
shell-frontend:
	@echo "🐳 进入前端容器..."
	docker-compose exec frontend sh

# 查看后端日志
logs-backend:
	@echo "📋 查看后端日志..."
	docker-compose logs -f backend

# 查看前端日志
logs-frontend:
	@echo "📋 查看前端日志..."
	docker-compose logs -f frontend

# 备份数据
backup:
	@echo "💾 备份数据..."
	@mkdir -p backups
	@tar -czf backups/expe-data-$$(date +%Y%m%d-%H%M%S).tar.gz data/ logs/ 2>/dev/null || true
	@echo "✅ 数据备份完成: backups/expe-data-$$(date +%Y%m%d-%H%M%S).tar.gz"

# 恢复数据
restore:
	@echo "📂 恢复数据..."
	@ls -la backups/
	@echo "请使用: tar -xzf backups/备份文件.tar.gz"

# 更新镜像
update:
	@echo "🔄 更新镜像并重启服务..."
	$(MAKE) build
	$(MAKE) restart
	@echo "✅ 更新完成！"