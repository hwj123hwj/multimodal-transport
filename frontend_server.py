from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

# 创建FastAPI应用实例
app = FastAPI(
    title="多式联运稳定匹配系统",
    description="多式联运网络稳定匹配算法后端服务",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# 获取当前文件所在目录
current_dir = Path(__file__).parent
templates_dir = current_dir / "templates"
static_dir = current_dir / "static"

# 检查模板目录是否存在
if templates_dir.exists():
    # 配置静态文件服务 - 使用正确的static目录
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
    else:
        app.mount("/static", StaticFiles(directory=str(templates_dir)), name="static")
    
    @app.get("/", response_class=HTMLResponse)
    async def index():
        """主页路由"""
        index_file = templates_dir / "index.html"
        if index_file.exists():
            with open(index_file, "r", encoding="utf-8") as f:
                return HTMLResponse(content=f.read())
        else:
            return HTMLResponse(content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>多式联运稳定匹配系统</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .container { max-width: 600px; margin: 0 auto; }
                    h1 { color: #2c3e50; }
                    .info { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
                    .links { margin-top: 30px; }
                    .links a { display: inline-block; margin: 10px; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; }
                    .links a:hover { background: #2980b9; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚛 多式联运稳定匹配系统</h1>
                    <div class="info">
                        <p>后端服务运行正常</p>
                        <p>前端界面文件未找到，请确保templates/index.html文件存在</p>
                    </div>
                    <div class="links">
                        <a href="/docs">📚 API文档</a>
                        <a href="/api/matching/health">🔍 健康检查</a>
                        <a href="/api/matching/summary">📊 匹配摘要</a>
                    </div>
                </div>
            </body>
            </html>
            """)
    
    @app.get("/api/frontend/status")
    async def frontend_status():
        """前端状态检查"""
        index_file = templates_dir / "index.html"
        styles_file = templates_dir / "styles.css"
        script_file = templates_dir / "script.js"
        
        return {
            "status": "success",
            "frontend_available": index_file.exists(),
            "files": {
                "index_html": index_file.exists(),
                "styles_css": styles_file.exists(),
                "script_js": script_file.exists()
            },
            "template_directory": str(templates_dir),
            "static_files_enabled": True
        }

else:
    @app.get("/", response_class=HTMLResponse)
    async def index_fallback():
        """备用主页路由"""
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head>
            <title>多式联运稳定匹配系统</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .container { max-width: 600px; margin: 0 auto; }
                h1 { color: #2c3e50; }
                .warning { background: #fff3cd; color: #856404; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #ffeaa7; }
                .links { margin-top: 30px; }
                .links a { display: inline-block; margin: 10px; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; }
                .links a:hover { background: #2980b9; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚛 多式联运稳定匹配系统</h1>
                <div class="warning">
                    <p><strong>⚠️ 前端界面未配置</strong></p>
                    <p>templates目录不存在，请创建templates目录并添加前端文件</p>
                </div>
                <div class="links">
                    <a href="/docs">📚 API文档</a>
                    <a href="/api/matching/health">🔍 健康检查</a>
                    <a href="/api/matching/summary">📊 匹配摘要</a>
                </div>
            </div>
        </body>
        </html>
        """)

# 其他API路由保持不变
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/info")
async def get_info():
    return {
        "app_name": "多式联运稳定匹配系统",
        "version": "0.1.0",
        "frontend_available": templates_dir.exists() if 'templates_dir' in locals() else False
    }