"""
匹配算法API路由
提供匹配算法的REST API接口
"""
from fastapi import APIRouter, HTTPException
import logging

from ..config import get_data_dir
from ..services.data_loader import DataLoader
from ..services.data_service import DataService
from ..services.matching_service import MatchingService

logger = logging.getLogger(__name__)

# 创建路由实例
router = APIRouter(prefix="/api", tags=["matching"])

# 初始化服务和数据加载器 - 使用配置中的数据目录
data_loader = DataLoader(get_data_dir())
data_service = DataService(data_loader)
matching_service = MatchingService(data_loader)


@router.get("/shipment-route-mapping")
async def get_shipment_route_mapping():
    """获取货物与路线映射关系"""
    try:
        matchings = matching_service.get_all_matchings()

        # 构建货物-路线映射数组
        shipment_route_list = []
        for matching in matchings:
            for shipment in matching.get("shipments", []):
                shipment_route_list.append({
                    "id": len(shipment_route_list) + 1,  # 自增ID
                    "route_id": shipment.get("assigned_route"),
                    "shipment_id": shipment.get("shipment_id")
                })

        return {
            "status": "success",
            "data": shipment_route_list,
            "count": len(shipment_route_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取货物路线映射失败: {str(e)}")


@router.get("/matchings")
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
        logger.error(f"获取匹配摘要失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/matching/execute")
async def execute_matching_algorithm():
    """执行匹配算法"""
    try:
        result = matching_service.execute_matching_algorithm()
        return result
    except FileNotFoundError as e:
        logger.error(f"执行匹配算法失败 - 文件缺失: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        logger.error(f"执行匹配算法失败 - 运行时错误: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"执行匹配算法失败 - 未知错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"执行匹配算法失败: {str(e)}")


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
