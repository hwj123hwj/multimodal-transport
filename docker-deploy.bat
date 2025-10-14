@echo off
REM 多式联运稳定匹配系统Docker部署脚本 (Windows版本)

setlocal enabledelayedexpansion

REM 颜色定义
set "RED=[31m"
set "GREEN=[32m"
set "YELLOW=[33m"
set "BLUE=[34m"
set "NC=[0m"

REM 日志函数
:log_info
echo %BLUE%[INFO]%NC% %~1
goto :eof

:log_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:log_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:log_error
echo %RED%[ERROR]%NC% %~1
goto :eof

REM 检查Docker环境
:check_docker
call :log_info "检查Docker环境..."

where docker >nul 2>nul
if %errorlevel% neq 0 (
    call :log_error "Docker未安装，请先安装Docker"
    exit /b 1
)

where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    call :log_error "Docker Compose未安装，请先安装Docker Compose"
    exit /b 1
)

REM 检查Docker服务是否运行
docker info >nul 2>nul
if %errorlevel% neq 0 (
    call :log_error "Docker服务未运行，请启动Docker服务"
    exit /b 1
)

call :log_success "Docker环境检查通过"
goto :eof

REM 创建必要目录
:create_directories
call :log_info "创建必要目录..."

if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "nginx\ssl" mkdir nginx\ssl
if not exist "backups" mkdir backups

REM 创建日志子目录
if not exist "logs\backend" mkdir logs\backend
if not exist "logs\frontend" mkdir logs\frontend
if not exist "logs\nginx" mkdir logs\nginx

call :log_success "目录创建完成"
goto :eof

REM 导出Python依赖
:export_requirements
call :log_info "导出Python依赖..."

if exist "pyproject.toml" (
    if exist "requirements.txt" (
        call :log_info "requirements.txt已存在，跳过导出"
    ) else (
        call :log_warning "未找到Python环境，使用预定义的requirements.txt"
    )
) else (
    call :log_warning "未找到pyproject.toml文件"
)

goto :eof

REM 构建镜像
:build_images
call :log_info "构建Docker镜像..."

if "%1"=="prod" (
    call :log_info "构建生产环境镜像..."
    docker-compose -f docker-compose.prod.yml build --no-cache
) else (
    call :log_info "构建开发环境镜像..."
    docker-compose build --no-cache
)

call :log_success "镜像构建完成"
goto :eof

REM 启动服务
:start_services
call :log_info "启动服务..."

if "%1"=="prod" (
    docker-compose -f docker-compose.prod.yml up -d
) else (
    docker-compose up -d
)

call :log_success "服务启动完成"
goto :eof

REM 检查服务状态
:check_services
call :log_info "检查服务状态..."

REM 等待服务启动
timeout /t 10 /nobreak >nul

REM 检查后端服务
curl -f http://localhost:8000/health >nul 2>nul
if %errorlevel% equ 0 (
    call :log_success "后端服务运行正常"
) else (
    call :log_warning "后端服务可能未完全启动，请稍后检查"
)

REM 检查前端服务
curl -f http://localhost:3000 >nul 2>nul
if %errorlevel% equ 0 (
    call :log_success "前端服务运行正常"
) else (
    call :log_warning "前端服务可能未完全启动，请稍后检查"
)

goto :eof

REM 显示访问信息
:show_access_info
if "%1"=="prod" (
    call :log_success "🎉 生产环境部署完成！"
    call :log_info "访问地址:"
    call :log_info "  前端应用: http://localhost"
    call :log_info "  后端API: http://localhost/api"
    call :log_info "  API文档: http://localhost/docs"
    call :log_info "  健康检查: http://localhost/health"
) else (
    call :log_success "🎉 开发环境部署完成！"
    call :log_info "访问地址:"
    call :log_info "  前端应用: http://localhost:3000"
    call :log_info "  后端API: http://localhost:8000"
    call :log_info "  API文档: http://localhost:8000/docs"
    call :log_info "  健康检查: http://localhost:8000/health"
)

call :log_info ""
call :log_info "查看日志: docker-compose logs -f"
call :log_info "停止服务: docker-compose down"
goto :eof

REM 显示帮助信息
:show_help
echo 多式联运稳定匹配系统Docker部署脚本
echo.
echo 用法: %0 [选项]
echo.
echo 选项:
echo   dev       部署开发环境 (默认)
echo   prod      部署生产环境
echo   stop      停止所有服务
echo   restart   重启服务
echo   status    查看服务状态
echo   logs      查看实时日志
echo   clean     清理所有容器和镜像
echo   backup    备份数据
echo   help      显示帮助信息
echo.
echo 示例:
echo   %0        # 部署开发环境
echo   %0 prod   # 部署生产环境
echo   %0 stop   # 停止服务
goto :eof

REM 停止服务
:stop_services
call :log_info "停止服务..."
docker-compose down -v
call :log_success "服务已停止"
goto :eof

REM 重启服务
:restart_services
call :log_info "重启服务..."
docker-compose restart
call :log_success "服务已重启"
goto :eof

REM 查看状态
:show_status
call :log_info "服务状态:"
docker-compose ps
goto :eof

REM 查看日志
:show_logs
docker-compose logs -f
goto :eof

REM 清理环境
:clean_environment
call :log_info "清理Docker环境..."
docker-compose down -v --remove-orphans
docker system prune -af
call :log_success "环境清理完成"
goto :eof

REM 备份数据
:backup_data
call :log_info "备份数据..."
if not exist "backups" mkdir backups

REM 获取当前日期时间
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (
    set "datestr=%%c%%a%%b"
)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
    set "timestr=%%a%%b"
)

if exist "data" (
    tar -czf "backups/expe-data-%datestr%-%timestr%.tar.gz" data logs 2>nul
    if %errorlevel% equ 0 (
        call :log_success "数据备份完成: backups/expe-data-%datestr%-%timestr%.tar.gz"
    ) else (
        call :log_warning "数据备份失败，请手动备份data和logs目录"
    )
) else (
    call :log_warning "未找到data目录，跳过备份"
)
goto :eof

REM 主函数
:main
if "%1"=="" set "1=dev"

if "%1"=="dev" (
    call :check_docker
    call :create_directories
    call :export_requirements
    call :build_images dev
    call :start_services dev
    call :check_services
    call :show_access_info dev
) else if "%1"=="prod" (
    call :check_docker
    call :create_directories
    call :export_requirements
    call :build_images prod
    call :start_services prod
    call :check_services
    call :show_access_info prod
) else if "%1"=="stop" (
    call :stop_services
) else if "%1"=="restart" (
    call :restart_services
) else if "%1"=="status" (
    call :show_status
) else if "%1"=="logs" (
    call :show_logs
) else if "%1"=="clean" (
    call :clean_environment
) else if "%1"=="backup" (
    call :backup_data
) else if "%1"=="help" (
    call :show_help
) else (
    call :log_error "未知选项: %1"
    call :show_help
    exit /b 1
)
goto :eof

REM 脚本入口
call :main %*