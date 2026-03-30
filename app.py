import logging
import os
from datetime import datetime

from dotenv import load_dotenv  # 导入第三方库
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

logger.info("🚀 多式联运稳定匹配系统后端服务启动中...")

# 创建FastAPI应用实例
app = FastAPI(
    title="多式联运稳定匹配系统",
    description="多式联运网络稳定匹配算法后端服务",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

logger.info("✅ FastAPI应用实例创建完成")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],  # 明确指定前端端口，包括3001
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("✅ CORS中间件配置完成")

# 健康检查接口
@app.get("/health")
async def health_check():
    logger.info("💓 健康检查请求")
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# 导入路由
from app.routes.matching import router as matching_router
from app.routes.data_routes import router as data_router
from app.routes.query_routes import router as query_router
from app.routes.analytics import router as analytics_router

# 导入错误处理
from app.utils.error_handlers import register_exception_handlers

# 注册异常处理
register_exception_handlers(app)

# 注册路由
app.include_router(matching_router)
app.include_router(data_router)
app.include_router(query_router)
app.include_router(analytics_router)


# 获取系统信息
@app.get("/api/info")
async def get_info():
    from app.config import DEBUG, DATA_DIR
    return {
        "app_name": "多式联运稳定匹配系统",
        "version": "0.1.0",
        "python_version": os.sys.version,
        "debug_mode": DEBUG,
        "data_directory": DATA_DIR
    }


if __name__ == "__main__":
    import uvicorn
    from app.config import PORT, DEBUG

    logger.info(f"🌐 启动服务器 - 端口: {PORT}, 调试模式: {DEBUG}")

    uvicorn.run(
        "__main__:app",  # 从当前文件直接导入app实例
        host="0.0.0.0",
        port=PORT,
        reload=DEBUG,
        log_level="info" if DEBUG else "warning"
    )
