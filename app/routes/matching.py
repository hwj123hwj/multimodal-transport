"""
匹配算法API路由
提供匹配算法的REST API接口
"""
import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, HTTPException

from ..services import data_loader, data_service, matching_service

router = APIRouter(prefix="/api", tags=["matching"])
thread_pool = ThreadPoolExecutor(max_workers=4)
logger = logging.getLogger(__name__)

# ── 任务状态存储（进程内单例，够用）────────────────────────────
# task_id -> { status, started_at, finished_at, result, error }
_tasks: Dict[str, Dict[str, Any]] = {}
_CURRENT_TASK_KEY = "__current__"   # 永远指向最新的 task_id


@router.get("/shipment-route-mapping")
async def get_shipment_route_mapping():
    """获取货物与路线映射关系"""
    try:
        matchings = matching_service.get_all_matchings()
        shipment_route_list = []
        for matching in matchings:
            for shipment in matching.get("shipments", []):
                shipment_route_list.append({
                    "id": len(shipment_route_list) + 1,
                    "route_id": shipment.get("assigned_route"),
                    "shipment_id": shipment.get("shipment_id")
                })
        return {"status": "success", "data": shipment_route_list, "count": len(shipment_route_list)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取货物路线映射失败: {str(e)}")


@router.get("/matchings")
async def get_all_matchings():
    try:
        matchings = matching_service.get_all_matchings()
        return {"status": "success", "data": matchings, "count": len(matchings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取匹配数据失败: {str(e)}")


@router.get("/summary")
async def get_matching_summary():
    try:
        summary = matching_service.get_matching_summary()
        return {"status": "success", "data": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 异步执行算法（立即返回 task_id）────────────────────────────
@router.post("/matching/execute")
async def execute_matching_algorithm():
    """提交算法执行任务，立即返回 task_id，前端轮询 /matching/status 获取进度"""
    task_id = str(uuid.uuid4())
    _tasks[task_id] = {
        "status": "running",
        "started_at": datetime.now().isoformat(),
        "finished_at": None,
        "result": None,
        "error": None,
    }
    _tasks[_CURRENT_TASK_KEY] = task_id

    loop = asyncio.get_event_loop()
    loop.run_in_executor(thread_pool, _run_and_record, task_id)

    return {"status": "accepted", "task_id": task_id}


def _run_and_record(task_id: str):
    """在线程池中执行算法并更新任务状态"""
    try:
        result = matching_service.execute_matching_algorithm()
        _tasks[task_id]["status"] = "done"
        _tasks[task_id]["result"] = result
    except Exception as e:
        _tasks[task_id]["status"] = "failed"
        _tasks[task_id]["error"] = str(e)
    finally:
        _tasks[task_id]["finished_at"] = datetime.now().isoformat()


# ── 轮询任务状态 ────────────────────────────────────────────────
@router.get("/matching/status")
async def get_task_status(task_id: str = None):
    """查询任务状态。不传 task_id 则返回最新任务状态。"""
    if task_id is None:
        task_id = _tasks.get(_CURRENT_TASK_KEY)

    if task_id is None or task_id not in _tasks:
        # 没有任何任务记录时，尝试从文件判断是否已有结果
        try:
            summary = matching_service.get_matching_summary()
            if summary.get("total_shipments", 0) > 0:
                return {
                    "status": "done",
                    "task_id": None,
                    "started_at": None,
                    "finished_at": None,
                    "result": {"status": "success", "summary": summary},
                    "error": None,
                }
        except Exception:
            pass
        return {"status": "idle", "task_id": None}

    task = _tasks[task_id]

    # 如果已完成，附上摘要
    if task["status"] == "done" and task["result"]:
        summary = task["result"].get("summary") or {}
        return {
            "status": "done",
            "task_id": task_id,
            "started_at": task["started_at"],
            "finished_at": task["finished_at"],
            "result": {"status": "success", "summary": summary},
            "error": None,
        }

    return {
        "status": task["status"],
        "task_id": task_id,
        "started_at": task["started_at"],
        "finished_at": task["finished_at"],
        "result": task["result"],
        "error": task["error"],
    }


@router.get("/shipment/{shipment_id}")
async def get_matching_by_shipment(shipment_id: int):
    try:
        matching = matching_service.get_matching_by_shipment(shipment_id)
        if matching is None:
            raise HTTPException(status_code=404, detail=f"未找到货物ID {shipment_id} 的匹配结果")
        return {"status": "success", "data": matching}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取匹配结果失败: {str(e)}")


@router.get("/route/{route_id}")
async def get_matching_by_route(route_id: int):
    try:
        matchings = matching_service.get_matching_by_route(route_id)
        return {"status": "success", "data": matchings, "count": len(matchings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取匹配结果失败: {str(e)}")


@router.get("/matchings/detailed")
async def get_detailed_matchings():
    try:
        matchings = matching_service.get_all_matchings()
        shipments_data = data_service.get_all_shipments()
        routes_data = data_service.get_all_routes()
        shipment_map = {s["shipment_id"]: s for s in shipments_data["shipments"]}
        route_map = {r["route_id"]: r for r in routes_data["routes"]}

        detailed_matchings = []
        for matching in matchings:
            for shipment in matching.get("shipments", []):
                shipment_id = shipment.get("shipment_id")
                route_id = shipment.get("assigned_route")
                shipment_info = shipment_map.get(shipment_id, {})
                route_info = route_map.get(route_id, {}) if route_id != "Self" else None
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
                        "destination_latitude": shipment_info.get("destination_latitude"),
                    },
                    "route_info": {
                        "nodes": route_info.get("nodes", []) if route_info else [],
                        "node_details": route_info.get("node_details", []) if route_info else [],
                        "costs": route_info.get("costs", []) if route_info else [],
                        "travel_times": route_info.get("travel_times", []) if route_info else [],
                        "total_cost": route_info.get("total_cost", 0) if route_info else 0,
                        "total_travel_time": route_info.get("total_travel_time", 0) if route_info else 0,
                        "capacity": route_info.get("capacity", 0) if route_info else 0,
                        "route_category": route_info.get("route_category", "未知") if route_info else "未知",
                        "utilization": route_utilization,
                    } if route_info else None,
                    "status": "matched" if route_id != "Self" else "unmatched",
                })

        return {"status": "success", "data": detailed_matchings, "count": len(detailed_matchings)}
    except Exception as e:
        logger.error(f"获取详细匹配结果失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取详细匹配结果失败: {str(e)}")
