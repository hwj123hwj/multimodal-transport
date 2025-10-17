@echo off
echo ====================================
echo 快速部署脚本 - expe_frontend到nginx
echo ====================================

REM 设置路径变量
set NGINX_PATH=D:\develop\deploy\nginx-1.28.0
set FRONTEND_PATH=D:\develop\expe_backend\frontend
set BUILD_DIR=%FRONTEND_PATH%\build
set NGINX_HTML=%NGINX_PATH%\html\expe-frontend

echo.
echo 步骤1: 构建前端项目...
cd /d "%FRONTEND_PATH%"
call npm run build

if %errorlevel% neq 0 (
    echo 错误: 前端构建失败！
    pause
    exit /b 1
)

echo.
echo 步骤2: 复制文件到nginx目录...
if not exist "%NGINX_HTML%" (
    mkdir "%NGINX_HTML%"
)

xcopy /E /Y /I "%BUILD_DIR%\*" "%NGINX_HTML%"

echo.
echo 步骤3: 重新加载nginx配置...
"%NGINX_PATH%\nginx.exe" -s reload

echo.
echo ====================================
echo ✅ 部署完成！
echo ====================================
echo 访问地址: http://localhost
echo 后端API: http://localhost/api/
echo ====================================
echo.
pause