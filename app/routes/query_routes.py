"""
筛选查询API路由
提供按条件筛选数据的REST API接口
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from ..services.data_loader import DataLoader
from ..services.data_service import DataService

# 创建路由实例
router = APIRouter(prefix="/api", tags=["query"])

# 初始化服务和数据加载器
data_loader = DataLoader("data")
data_service = DataService(data_loader)


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


@router.get("/filter/shipments")
async def filter_shipments(
    origin: Optional[str] = Query(None, description="起点节点", example="1"),
    destination: Optional[str] = Query(None, description="终点节点", example="9"),
    status: Optional[str] = Query(None, description="货物状态", example="pending")
):
    """按多个条件筛选货物
    
    Args:
        origin: 起点节点编号（可选）
        destination: 终点节点编号（可选）
        status: 货物状态（可选）
    """
    try:
        # 获取所有货物数据
        shipments_data = data_service.get_all_shipments()
        
        # 筛选货物
        filtered_shipments = []
        for shipment in shipments_data["shipments"]:
            # 检查起点条件
            origin_match = not origin or shipment["origin_node"] == origin
            # 检查终点条件
            dest_match = not destination or shipment["destination_node"] == destination
            # 检查状态条件
            status_match = not status or shipment["status"] == status
            
            if origin_match and dest_match and status_match:
                filtered_shipments.append(shipment)
        
        return {
            "status": "success",
            "filters": {
                "origin": origin,
                "destination": destination,
                "status": status
            },
            "count": len(filtered_shipments),
            "shipments": filtered_shipments
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"筛选货物失败: {str(e)}")


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