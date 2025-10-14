#!/bin/bash

# 多式联运稳定匹配系统Docker部署脚本
# 支持开发环境和生产环境部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Docker环境
check_docker() {
    log_info "检查Docker环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    # 检查Docker服务是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker服务未运行，请启动Docker服务"
        exit 1
    fi
    
    log_success "Docker环境检查通过"
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    
    mkdir -p data logs nginx/ssl backups
    
    # 创建日志子目录
    mkdir -p logs/backend logs/frontend logs/nginx
    
    log_success "目录创建完成"
}

# 导出Python依赖
export_requirements() {
    log_info "导出Python依赖..."
    
    if [ -f "pyproject.toml" ]; then
        # 如果存在pyproject.toml，导出requirements.txt
        if command -v python &> /dev/null; then
            python -c "import tomllib; print('\n'.join([f'{k}{v}' if isinstance(v, str) else f'{k}{v.get('version', '')}' for k, v in tomllib.load(open('pyproject.toml', 'rb'))['project']['dependencies'].items()]))" > requirements.txt 2>/dev/null || true
            log_success "Python依赖导出完成"
        else
            log_warning "Python未安装，使用预定义的requirements.txt"
        fi
    else
        log_warning "未找到pyproject.toml文件"
    fi
}

# 构建镜像
build_images() {
    log_info "构建Docker镜像..."
    
    # 根据参数选择构建环境
    if [ "$1" = "prod" ]; then
        log_info "构建生产环境镜像..."
        docker-compose -f docker-compose.prod.yml build --no-cache
    else
        log_info "构建开发环境镜像..."
        docker-compose build --no-cache
    fi
    
    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    if [ "$1" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml up -d
    else
        docker-compose up -d
    fi
    
    log_success "服务启动完成"
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."
    
    # 等待服务启动
    sleep 10
    
    # 检查后端服务
    if curl -f http://localhost:8000/health &> /dev/null; then
        log_success "后端服务运行正常"
    else
        log_warning "后端服务可能未完全启动，请稍后检查"
    fi
    
    # 检查前端服务
    if curl -f http://localhost:3000 &> /dev/null; then
        log_success "前端服务运行正常"
    else
        log_warning "前端服务可能未完全启动，请稍后检查"
    fi
}

# 显示访问信息
show_access_info() {
    if [ "$1" = "prod" ]; then
        log_success "🎉 生产环境部署完成！"
        log_info "访问地址:"
        log_info "  前端应用: http://localhost"
        log_info "  后端API: http://localhost/api"
        log_info "  API文档: http://localhost/docs"
        log_info "  健康检查: http://localhost/health"
    else
        log_success "🎉 开发环境部署完成！"
        log_info "访问地址:"
        log_info "  前端应用: http://localhost:3000"
        log_info "  后端API: http://localhost:8000"
        log_info "  API文档: http://localhost:8000/docs"
        log_info "  健康检查: http://localhost:8000/health"
    fi
    
    log_info ""
    log_info "查看日志: docker-compose logs -f"
    log_info "停止服务: docker-compose down"
}

# 显示帮助信息
show_help() {
    echo "多式联运稳定匹配系统Docker部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  dev       部署开发环境 (默认)"
    echo "  prod      部署生产环境"
    echo "  stop      停止所有服务"
    echo "  restart   重启服务"
    echo "  status    查看服务状态"
    echo "  logs      查看实时日志"
    echo "  clean     清理所有容器和镜像"
    echo "  backup    备份数据"
    echo "  help      显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0        # 部署开发环境"
    echo "  $0 prod   # 部署生产环境"
    echo "  $0 stop   # 停止服务"
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    docker-compose down -v
    log_success "服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    docker-compose restart
    log_success "服务已重启"
}

# 查看状态
show_status() {
    log_info "服务状态:"
    docker-compose ps
}

# 查看日志
show_logs() {
    docker-compose logs -f
}

# 清理环境
clean_environment() {
    log_info "清理Docker环境..."
    docker-compose down -v --remove-orphans
    docker system prune -af
    log_success "环境清理完成"
}

# 备份数据
backup_data() {
    log_info "备份数据..."
    mkdir -p backups
    tar -czf "backups/expe-data-$(date +%Y%m%d-%H%M%S).tar.gz" data/ logs/ 2>/dev/null || true
    log_success "数据备份完成"
}

# 主函数
main() {
    case "${1:-dev}" in
        "dev")
            check_docker
            create_directories
            export_requirements
            build_images dev
            start_services dev
            check_services
            show_access_info dev
            ;;
        "prod")
            check_docker
            create_directories
            export_requirements
            build_images prod
            start_services prod
            check_services
            show_access_info prod
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "clean")
            clean_environment
            ;;
        "backup")
            backup_data
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi