"""
基础数据API路由
提供网络、货物、路线、匹配等基础数据的REST API接口
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any

from ..services.data_loader import DataLoader
from ..services.data_service import DataService

# 创建路由实例
router = APIRouter(prefix="/api", tags=["data"])

# 初始化服务和数据加载器
data_loader = DataLoader("data")
data_service = DataService(data_loader)


@router.get("/network")
async def get_network_data():
    """获取网络数据"""
    try:
        network_data = data_service.get_all_network_nodes()
        return {
            "status": "success",
            "data": network_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取网络数据失败: {str(e)}")


@router.get("/shipments")
async def get_shipments_data():
    """获取货物数据"""
    try:
        shipments_data = data_service.get_all_shipments()
        return {
            "status": "success",
            "data": shipments_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取货物数据失败: {str(e)}")


@router.get("/routes")
async def get_routes_data():
    """获取路线数据"""
    try:
        routes_data = data_service.get_all_routes()
        return {
            "status": "success",
            "data": routes_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取路线数据失败: {str(e)}")


@router.get("/matching-result")
async def get_matching_result():
    """获取匹配结果数据"""
    try:
        matching_data = data_service.get_matching_results()
        return {
            "status": "success",
            "data": matching_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取匹配结果失败: {str(e)}")


@router.get("/summary")
async def get_data_summary():
    """获取数据摘要信息"""
    try:
        summary_data = data_service.get_network_summary()
        return {
            "status": "success",
            "data": summary_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取数据摘要失败: {str(e)}")


@router.get("/health")
async def data_health_check():
    """数据服务健康检查"""
    try:
        # 尝试加载所有数据来检查服务状态
        network_data = data_service.get_all_network_nodes()
        shipments_data = data_service.get_all_shipments()
        routes_data = data_service.get_all_routes()
        
        return {
            "status": "healthy",
            "service": "data",
            "data_status": {
                "network": len(network_data.get("sites", [])) > 0,
                "shipments": shipments_data.get("total_count", 0) > 0,
                "routes": routes_data.get("total_count", 0) > 0
            },
            "counts": {
                "network_nodes": len(network_data.get("sites", [])),
                "shipments": shipments_data.get("total_count", 0),
                "routes": routes_data.get("total_count", 0)
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "data",
            "error": str(e)
        }


@router.post("/cache/clear")
async def clear_cache():
    """清除数据缓存"""
    try:
        data_service.clear_cache()
        return {
            "status": "success",
            "message": "数据缓存已清除"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清除缓存失败: {str(e)}")