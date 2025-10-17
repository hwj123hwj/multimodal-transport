@echo off
echo ====================================
echo Nginx部署脚本 - expe_frontend项目
echo ====================================

REM 设置路径变量
set NGINX_PATH=D:\develop\deploy\nginx-1.28.0
set FRONTEND_PATH=D:\develop\expe_backend\frontend
set BUILD_DIR=%FRONTEND_PATH%\build
set NGINX_HTML=%NGINX_PATH%\html\expe-frontend
set NGINX_CONF=%NGINX_PATH%\conf\nginx.conf

echo.
echo 步骤1: 检查nginx是否运行...
tasklist /FI "IMAGENAME eq nginx.exe" 2>NUL | find /I /N "nginx.exe">NUL
if %errorlevel%==0 (
    echo nginx正在运行，准备停止...
    "%NGINX_PATH%\nginx.exe" -s stop
    timeout /t 2 /nobreak > NUL
)

echo.
echo 步骤2: 构建前端项目...
cd /d "%FRONTEND_PATH%"
call npm run build

if %errorlevel% neq 0 (
    echo 错误: 前端构建失败！
    pause
    exit /b 1
)

echo.
echo 步骤3: 备份原始nginx配置...
if not exist "%NGINX_CONF%.backup" (
    copy /Y "%NGINX_CONF%" "%NGINX_CONF%.backup"
    echo 已备份原始配置到nginx.conf.backup
)

echo.
echo 步骤4: 创建前端目录...
if not exist "%NGINX_HTML%" (
    mkdir "%NGINX_HTML%"
    echo 创建目录: %NGINX_HTML%
)

echo.
echo 步骤5: 复制构建文件到nginx...
if exist "%BUILD_DIR%" (
    echo 正在复制文件...
    xcopy /E /Y /I "%BUILD_DIR%\*" "%NGINX_HTML%"
    echo 文件复制完成
) else (
    echo 错误: 构建目录不存在: %BUILD_DIR%
    pause
    exit /b 1
)

echo.
echo 步骤6: 应用nginx配置...
copy /Y "%FRONTEND_PATH%\nginx-complete.conf" "%NGINX_CONF%"
if %errorlevel% neq 0 (
    echo 错误: 配置文件复制失败！
    pause
    exit /b 1
)

echo.
echo 步骤7: 检查nginx配置...
"%NGINX_PATH%\nginx.exe" -t
if %errorlevel% neq 0 (
    echo 错误: nginx配置检查失败！
    pause
    exit /b 1
)

echo.
echo 步骤8: 启动nginx...
start "" "%NGINX_PATH%\nginx.exe"
timeout /t 2 /nobreak > NUL

echo.
echo 步骤9: 验证部署...
echo 正在检查nginx状态...
tasklist /FI "IMAGENAME eq nginx.exe" 2>NUL | find /I /N "nginx.exe">NUL
if %errorlevel%==0 (
    echo ✅ nginx启动成功！
) else (
    echo ❌ nginx启动失败！
    pause
    exit /b 1
)

echo.
echo ====================================
echo 🎉 部署完成！
echo ====================================
echo 访问地址: http://localhost
echo API代理: http://localhost/api/
echo 日志文件: %NGINX_PATH%\logs\
echo ====================================
echo.
echo 常用命令:
echo - 重新加载配置: nginx.exe -s reload
echo - 停止nginx: nginx.exe -s stop
echo - 检查配置: nginx.exe -t
echo.
pause