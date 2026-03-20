"""
查询API路由
提供货物搜索和路线筛选的REST API接口
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from ..services import data_service

# 创建路由实例
router = APIRouter(prefix="/api", tags=["query"])


@router.get("/search/shipments")
async def search_shipments_by_destination(
        destination: str = Query(..., description="目的地节点", example="6")
):
    """按目的地搜索货物

    Args:
        destination: 目的地节点编号
    """
    try:
        matching_shipments = data_service.search_shipments_by_destination(destination)

        return {
            "status": "success",
            "destination": destination,
            "count": len(matching_shipments),
            "shipments": matching_shipments
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索货物失败: {str(e)}")


@router.get("/filter/routes")
async def filter_routes_by_nodes(
        origin: Optional[str] = Query(None, description="起点节点", example="1"),
        destination: Optional[str] = Query(None, description="终点节点", example="9")
):
    """按起点和终点筛选路线

    Args:
        origin: 起点节点编号（可选）
        destination: 终点节点编号（可选）
    """
    try:
        # 验证参数
        if not origin and not destination:
            raise HTTPException(
                status_code=400,
                detail="至少需要提供origin或destination参数"
            )

        matching_routes = data_service.filter_routes_by_nodes(origin, destination)

        return {
            "status": "success",
            "filters": {
                "origin": origin,
                "destination": destination
            },
            "count": len(matching_routes),
            "routes": matching_routes
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"筛选路线失败: {str(e)}")


@router.get("/filter/routes-by-capacity")
async def filter_routes_by_capacity(
        min_available_capacity: Optional[float] = Query(None, description="最小可用容量", example=10.0),
        max_utilization_rate: Optional[float] = Query(None, description="最大利用率", example=0.8)
):
    """按容量条件筛选路线

    Args:
        min_available_capacity: 最小可用容量（可选）
        max_utilization_rate: 最大利用率（可选）
    """
    try:
        # 获取所有路线数据
        routes_data = data_service.get_all_routes()

        # 筛选路线
        filtered_routes = []
        for route in routes_data["routes"]:
            # 检查最小可用容量条件
            capacity_match = not min_available_capacity or route["available_capacity"] >= min_available_capacity
            # 检查最大利用率条件
            utilization_match = not max_utilization_rate or route["utilization_rate"] <= max_utilization_rate

            if capacity_match and utilization_match:
                filtered_routes.append(route)

        return {
            "status": "success",
            "filters": {
                "min_available_capacity": min_available_capacity,
                "max_utilization_rate": max_utilization_rate
            },
            "count": len(filtered_routes),
            "routes": filtered_routes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"按容量筛选路线失败: {str(e)}")


@router.get("/routes/{route_id}")
async def get_route_by_id(route_id: int):
    """根据路线ID获取单条路线详情

    Args:
        route_id: 路线ID
    """
    try:
        route = data_service.get_route_by_id(route_id)

        if not route:
            raise HTTPException(
                status_code=404,
                detail=f"路线ID {route_id} 不存在"
            )

        return {
            "status": "success",
            "route": route
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取路线详情失败: {str(e)}")
