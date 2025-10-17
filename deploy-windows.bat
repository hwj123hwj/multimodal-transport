@echo off
REM Windows服务器部署脚本
echo 🚀 开始部署多式联运后端服务...

REM 1. 检查Python环境
echo 📦 检查Python环境...
python --version
if errorlevel 1 (
    echo ❌ Python未安装，请先安装Python 3.11+
    exit /b 1
)

REM 2. 创建虚拟环境
echo 🐍 创建虚拟环境...
python -m venv venv

REM 3. 激活虚拟环境并安装依赖
echo 📚 安装Python依赖...
call venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt

REM 4. 创建Windows服务
echo 🔧 创建Windows服务...
python -c "
import win32serviceutil
import win32service
import win32event
import servicemanager
import subprocess
import sys

class ExpeBackendService(win32serviceutil.ServiceFramework):
    _svc_name_ = 'ExpeBackendService'
    _svc_display_name_ = '多式联运稳定匹配系统后端'
    _svc_description_ = '多式联运网络稳定匹配算法后端服务'

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.process = None

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        if self.process:
            self.process.terminate()
        win32event.SetEvent(self.hWaitStop)

    def SvcDoRun(self):
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                              servicemanager.PYS_SERVICE_STARTED,
                              (self._svc_name_, ''))
        self.main()

    def main(self):
        # 启动uvicorn服务
        self.process = subprocess.Popen([
            sys.executable, '-m', 'uvicorn', 'app:app',
            '--host', '0.0.0.0', '--port', '8000'
        ], cwd=r'%cd%')
        win32event.WaitForSingleObject(self.hWaitStop, win32event.INFINITE)

if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(ExpeBackendService)
"

REM 5. 安装服务
echo 📋 安装服务...
python service.py install
python service.py start

REM 6. 配置nginx（复制现有配置）
echo ⚙️ 配置nginx...
REM 假设nginx已安装并配置好

REM 7. 健康检查
echo 🏥 健康检查...
timeout /t 5 /nobreak > nul
curl -f http://localhost:8000/health
if errorlevel 1 (
    echo ❌ 服务启动失败
    exit /b 1
)

echo ✅ 部署完成！
echo 🌐 服务地址: http://localhost:8000
echo 📚 API文档: http://localhost:8000/docs
echo 🔍 服务管理: services.msc
echo.
echo 💡 提示: 你可以使用nssm工具来更好地管理Windows服务