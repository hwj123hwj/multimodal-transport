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
    allow_origins=["http://localhost:*", "http://127.0.0.1:*"],  # 更具体的CORS配置
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("✅ CORS中间件配置完成")


# 健康检查接口
@app.get("/")
async def root():
    logger.info("📡 收到根路径请求")
    return {
        "message": "多式联运稳定匹配系统后端服务",
        "version": "0.1.0",
        "status": "running"
    }


# 健康检查接口
@app.get("/health")
async def health_check():
    logger.info("💓 健康检查请求")
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# 导入路由
from app.routes.matching import router as matching_router
from app.routes.data_routes import router as data_router
from app.routes.query_routes import router as query_router

# 导入错误处理
from app.utils.error_handlers import register_exception_handlers

# 注册异常处理
register_exception_handlers(app)

# 注册路由
app.include_router(matching_router)
app.include_router(data_router)
app.include_router(query_router)


# 获取系统信息
@app.get("/api/info")
async def get_info():
    return {
        "app_name": "多式联运稳定匹配系统",
        "version": "0.1.0",
        "python_version": os.sys.version,
        "debug_mode": os.getenv("DEBUG", "false").lower() == "true"
    }


# 获取匹配结果 - 已迁移到专用路由
# @app.get("/api/matching")
# async def get_matching():
#     """获取稳定匹配结果"""
#     try:
#         import csv
#         from app.models.matching import StableMatching
#         
#         # 读取CSV文件
#         csv_path = "data/stable_matching.csv"
#         with open(csv_path, 'r', encoding='utf-8') as f:
#             reader = csv.reader(f)
#             rows = list(reader)
#         
#         # 解析匹配结果
#         matching = StableMatching.from_csv_rows(rows)
#         
#         return {
#             "status": "success",
#             "data": matching.to_dict()
#         }
#     except Exception as e:
#         logger.error(f"获取匹配结果失败: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"获取匹配结果失败: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("DEBUG", "false").lower() == "true"

    logger.info(f"🌐 启动服务器 - 端口: {port}, 调试模式: {debug}")

    uvicorn.run(
        "__main__:app",  # 从当前文件直接导入app实例
        host="0.0.0.0",
        port=port,
        reload=debug,
        log_level="info" if debug else "warning"
    )
