"""
错误处理模块
提供统一的错误处理和异常定义
"""
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class AppException(Exception):
    """应用基础异常类"""
    
    def __init__(self, message: str, error_code: str = "GENERIC_ERROR", 
                 status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class DataNotFoundException(AppException):
    """数据未找到异常"""
    
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"未找到{resource}: {identifier}",
            error_code="DATA_NOT_FOUND",
            status_code=404,
            details={"resource": resource, "identifier": identifier}
        )


class DataValidationException(AppException):
    """数据验证异常"""
    
    def __init__(self, message: str, field: str = None, value: Any = None):
        details = {}
        if field:
            details["field"] = field
        if value is not None:
            details["value"] = value
            
        super().__init__(
            message=message,
            error_code="DATA_VALIDATION_ERROR",
            status_code=400,
            details=details
        )


class DataLoadingException(AppException):
    """数据加载异常"""
    
    def __init__(self, filename: str, error: str):
        super().__init__(
            message=f"加载数据文件失败: {filename}",
            error_code="DATA_LOADING_ERROR",
            status_code=500,
            details={"filename": filename, "error": error}
        )


class BusinessLogicException(AppException):
    """业务逻辑异常"""
    
    def __init__(self, message: str, operation: str = None):
        details = {}
        if operation:
            details["operation"] = operation
            
        super().__init__(
            message=message,
            error_code="BUSINESS_LOGIC_ERROR",
            status_code=422,
            details=details
        )


def create_error_response(exception: AppException) -> Dict[str, Any]:
    """创建错误响应
    
    Args:
        exception: 应用异常实例
        
    Returns:
        Dict[str, Any]: 错误响应数据
    """
    return {
        "status": "error",
        "error": {
            "code": exception.error_code,
            "message": exception.message,
            "details": exception.details
        },
        "timestamp": None  # 将在中间件中添加
    }


def create_generic_error_response(message: str, error: Exception) -> Dict[str, Any]:
    """创建通用错误响应
    
    Args:
        message: 错误消息
        error: 原始异常
        
    Returns:
        Dict[str, Any]: 错误响应数据
    """
    return {
        "status": "error",
        "error": {
            "code": "INTERNAL_ERROR",
            "message": message,
            "details": {"original_error": str(error)}
        },
        "timestamp": None  # 将在中间件中添加
    }


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """应用异常处理中间件"""
    logger.error(f"应用异常 - {exc.error_code}: {exc.message}")
    if exc.details:
        logger.error(f"异常详情: {exc.details}")
    
    error_response = create_error_response(exc)
    from datetime import datetime
    error_response["timestamp"] = datetime.now().isoformat()
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """通用异常处理中间件"""
    logger.error(f"未处理的异常: {type(exc).__name__}: {str(exc)}")
    
    error_response = create_generic_error_response("服务器内部错误", exc)
    from datetime import datetime
    error_response["timestamp"] = datetime.now().isoformat()
    
    return JSONResponse(
        status_code=500,
        content=error_response
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """HTTP异常处理中间件"""
    logger.warning(f"HTTP异常 - {exc.status_code}: {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "details": {}
            },
            "timestamp": None  # 将在响应中添加
        }
    )


def register_exception_handlers(app):
    """注册异常处理中间件
    
    Args:
        app: FastAPI应用实例
    """
    from fastapi import FastAPI
    
    # 注册应用异常处理
    app.add_exception_handler(AppException, app_exception_handler)
    
    # 注册HTTP异常处理
    app.add_exception_handler(HTTPException, http_exception_handler)
    
    # 注册通用异常处理（最后注册，作为兜底）
    app.add_exception_handler(Exception, generic_exception_handler)
    
    logger.info("异常处理中间件注册完成")