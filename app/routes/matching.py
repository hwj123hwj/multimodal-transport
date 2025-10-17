"""
匹配算法API路由
提供匹配算法的REST API接口
"""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter
from fastapi import HTTPException, BackgroundTasks

from ..config import get_data_dir
from ..services.data_loader import DataLoader
from ..services.data_service import DataService
from ..services.matching_service import MatchingService

# 创建线程池（根据服务器CPU核心数调整）
thread_pool = ThreadPoolExecutor(max_workers=4)

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
async def execute_matching_algorithm(background_tasks: BackgroundTasks):
    """执行匹配算法（异步线程池版本）"""
    try:
        # 将同步函数放入线程池执行
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            thread_pool,
            matching_service.execute_matching_algorithm
        )
        return {"status": "completed", "result": result}
    except FileNotFoundError as e:
        logger.error(f"执行匹配算法失败 - 文件缺失: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"执行匹配算法失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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


@router.get("/matchings/detailed")
async def get_detailed_matchings():
    """获取包含货物和路线详细信息的匹配结果"""
    try:
        # 获取匹配数据
        matchings = matching_service.get_all_matchings()

        # 获取货物和路线详细信息
        shipments_data = data_service.get_all_shipments()
        routes_data = data_service.get_all_routes()

        # 构建货物和路线映射
        shipment_map = {s["shipment_id"]: s for s in shipments_data["shipments"]}
        route_map = {r["route_id"]: r for r in routes_data["routes"]}

        # 构建详细的匹配结果
        detailed_matchings = []
        for matching in matchings:
            for shipment in matching.get("shipments", []):
                shipment_id = shipment.get("shipment_id")
                route_id = shipment.get("assigned_route")

                shipment_info = shipment_map.get(shipment_id, {})
                route_info = route_map.get(route_id, {}) if route_id != "Self" else None

                # 计算路线利用率（仅对已匹配的路线）
                route_utilization = 0.0
                if route_id != "Self":
                    route_utilization = matching_service.calculate_route_utilization(route_id)

                detailed_matchings.append({
                    "id": len(detailed_matchings) + 1,
                    "shipment_id": shipment_id,
                    "route_id": route_id,
                    "shipment_info": {
                        "origin_city": shipment_info.get("origin_city", "未知"),
                        "destination_city": shipment_info.get("destination_city", "未知"),
                        "demand": shipment_info.get("demand", 0),
                        "weight": shipment_info.get("weight", 0),
                        "volume": shipment_info.get("volume", 0),
                        "origin_longitude": shipment_info.get("origin_longitude"),
                        "origin_latitude": shipment_info.get("origin_latitude"),
                        "destination_longitude": shipment_info.get("destination_longitude"),
                        "destination_latitude": shipment_info.get("destination_latitude")
                    },
                    "route_info": {
                        "nodes": route_info.get("nodes", []) if route_info else [],
                        "node_details": route_info.get("node_details", []) if route_info else [],
                        "costs": route_info.get("costs", []) if route_info else [],
                        "travel_times": route_info.get("travel_times", []) if route_info else [],
                        "total_cost": route_info.get("total_cost", 0) if route_info else 0,
                        "total_travel_time": route_info.get("total_travel_time", 0) if route_info else 0,
                        "capacity": route_info.get("capacity", 0) if route_info else 0,
                        "available_capacity": route_info.get("available_capacity", 0) if route_info else 0,
                        "route_category": route_info.get("route_category", "未知") if route_info else "未知",
                        "utilization": route_utilization  # 添加路线利用率
                    } if route_info else None,
                    "status": "matched" if route_id != "Self" else "unmatched",
                })

        return {
            "status": "success",
            "data": detailed_matchings,
            "count": len(detailed_matchings)
        }
    except Exception as e:
        logger.error(f"获取详细匹配结果失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取详细匹配结果失败: {str(e)}")
