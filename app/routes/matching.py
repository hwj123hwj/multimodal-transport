"""
匹配API路由
提供货物匹配相关的REST API接口
"""
from fastapi import APIRouter, HTTPException

from ..services.data_loader import DataLoader
from ..services.matching_service import MatchingService

# 创建路由实例
router = APIRouter(prefix="/api/matching", tags=["matching"])

# 初始化服务和数据加载器
data_loader = DataLoader("data")
matching_service = MatchingService(data_loader)


@router.get("/")
async def get_all_matchings():
    """获取所有匹配结果"""
    try:
        matchings = matching_service.get_all_matchings()
        return {
            "status": "success",
            "data": matchings,
            "count": len(matchings)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取匹配数据失败: {str(e)}")


@router.get("/summary")
async def get_matching_summary():
    """获取匹配摘要信息"""
    try:
        summary = matching_service.get_matching_summary()
        return {
            "status": "success",
            "data": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取匹配摘要失败: {str(e)}")


@router.get("/shipment/{shipment_id}")
async def get_matching_by_shipment(shipment_id: int):
    """根据货物ID获取匹配结果"""
    try:
        matching = matching_service.get_matching_by_shipment(shipment_id)
        if matching is None:
            raise HTTPException(status_code=404, detail=f"未找到货物ID {shipment_id} 的匹配结果")

        return {
            "status": "success",
            "data": matching
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取匹配结果失败: {str(e)}")


@router.get("/route/{route_id}")
async def get_matching_by_route(route_id: int):
    """根据路线ID获取匹配结果"""
    try:
        matchings = matching_service.get_matching_by_route(route_id)
        return {
            "status": "success",
            "data": matchings,
            "count": len(matchings)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取匹配结果失败: {str(e)}")


@router.get("/health")
async def health_check():
    """健康检查接口"""
    try:
        # 尝试加载数据来检查服务状态
        matchings = matching_service.load_matchings()
        return {
            "status": "healthy",
            "service": "matching",
            "data_loaded": len(matchings) > 0,
            "matching_count": len(matchings)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "matching",
            "error": str(e)
        }
