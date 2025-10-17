@echo off
echo ====================================
echo 前端项目部署到本地Nginx脚本
echo ====================================

REM 设置路径变量
set NGINX_PATH=D:\develop\deploy\nginx-1.28.0
set FRONTEND_PATH=%cd%
set BUILD_DIR=%FRONTEND_PATH%\build
set NGINX_HTML=%NGINX_PATH%\html\expe-frontend

echo.
echo 1. 构建前端项目...
call npm run build

if %errorlevel% neq 0 (
    echo 错误: 前端构建失败！
    pause
    exit /b 1
)

echo.
echo 2. 创建nginx目标目录...
if not exist "%NGINX_HTML%" (
    mkdir "%NGINX_HTML%"
)

echo.
echo 3. 复制构建文件到nginx目录...
xcopy /E /Y /I "%BUILD_DIR%\*" "%NGINX_HTML%"

echo.
echo 4. 复制nginx配置文件...
copy /Y "%FRONTEND_PATH%\nginx.conf" "%NGINX_PATH%\conf\nginx.conf"

echo.
echo 5. 检查nginx是否运行...
tasklist /FI "IMAGENAME eq nginx.exe" 2>NUL | find /I /N "nginx.exe">NUL
if %errorlevel%==0 (
    echo nginx正在运行，重新加载配置...
    "%NGINX_PATH%\nginx.exe" -s reload
) else (
    echo nginx未运行，启动nginx...
    start "" "%NGINX_PATH%\nginx.exe"
)

echo.
echo ====================================
echo 部署完成！
echo 访问地址: http://localhost
echo 后端API代理: http://localhost/api/
echo ====================================
echo.
pause