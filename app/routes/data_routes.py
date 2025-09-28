"""
基础数据API路由
提供网络、货物、路线、匹配等基础数据的REST API接口
"""
from fastapi import APIRouter, HTTPException

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
