@echo off
REM Windows脚本：上传Docker镜像到Linux服务器

echo 🚀 准备上传Docker镜像到服务器...

REM 设置变量
set SERVER_IP=%1
set USERNAME=%2
set REMOTE_PATH=/opt

if "%SERVER_IP%"=="" (
    echo ❌ 请提供服务器IP地址
    echo 使用方法: upload-to-server.bat SERVER_IP USERNAME
    echo 示例: upload-to-server.bat 192.168.1.100 root
    exit /b 1
)

if "%USERNAME%"=="" (
    echo ❌ 请提供用户名
    echo 使用方法: upload-to-server.bat SERVER_IP USERNAME
    exit /b 1
)

echo 📦 保存Docker镜像...
docker save expe_backend-backend:latest > backend.tar

if %errorlevel% neq 0 (
    echo ❌ 保存Docker镜像失败
    exit /b 1
)

echo 📤 上传镜像到服务器...
scp backend.tar %USERNAME%@%SERVER_IP%:%REMOTE_PATH%/

if %errorlevel% neq 0 (
    echo ❌ 上传失败，请检查网络连接和SSH配置
    exit /b 1
)

echo 🧹 清理本地文件...
del backend.tar

echo ✅ 上传完成！
echo.
echo 🔧 请在服务器上执行以下命令：
echo ssh %USERNAME%@%SERVER_IP%
echo cd %REMOTE_PATH%
echo docker load ^< backend.tar
echo docker images
echo.
echo 然后运行部署脚本：
echo chmod +x deploy-production.sh
echo ./deploy-production.sh

pause