"""
数据分析 API
提供可视化所需的聚合分析数据
"""
import logging
from fastapi import APIRouter, HTTPException
from ..services import data_service, matching_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)


@router.get("/route-utilization")
async def get_route_utilization():
    """每条路线的容量 vs 已用容量（用于柱状图）"""
    try:
        routes_data = data_service.get_all_routes()
        route_map = {r["route_id"]: r for r in routes_data["routes"]}

        # 统计每条路线分配到的总需求量
        demand_by_route: dict[int, float] = {}
        matchings = matching_service.get_all_matchings()
        shipments_data = data_service.get_all_shipments()
        shipment_map = {s["shipment_id"]: s for s in shipments_data["shipments"]}

        for matching in matchings:
            for s in matching.get("shipments", []):
                route_id = s.get("assigned_route")
                shipment_id = s.get("shipment_id")
                if route_id == "Self" or route_id is None:
                    continue
                demand = shipment_map.get(shipment_id, {}).get("demand", 0)
                demand_by_route[route_id] = demand_by_route.get(route_id, 0) + demand

        result = []
        for route in routes_data["routes"]:
            rid = route["route_id"]
            capacity = route.get("capacity", 0)
            used = demand_by_route.get(rid, 0)
            result.append({
                "route_id": rid,
                "label": f"路线{rid}",
                "nodes": " → ".join(route.get("nodes", [])),
                "category": route.get("route_category", "未知"),
                "capacity": capacity,
                "used": used,
                "available": max(capacity - used, 0),
                "utilization_pct": round(used / capacity * 100, 1) if capacity > 0 else 0,
            })

        result.sort(key=lambda x: x["route_id"])
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"路线利用率分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/od-flow")
async def get_od_flow():
    """OD 货流矩阵（用于 Sankey 图）"""
    try:
        shipments_data = data_service.get_all_shipments()
        matchings = matching_service.get_all_matchings()
        shipment_map = {s["shipment_id"]: s for s in shipments_data["shipments"]}

        # 收集每票货物的匹配状态
        matched_ids = set()
        for matching in matchings:
            for s in matching.get("shipments", []):
                if s.get("assigned_route") != "Self":
                    matched_ids.add(s.get("shipment_id"))

        # 按 OD 对聚合流量
        od: dict[tuple, dict] = {}
        for s in shipments_data["shipments"]:
            origin = s.get("origin_city", "未知")
            dest = s.get("destination_city", "未知")
            demand = s.get("demand", 0)
            is_matched = s["shipment_id"] in matched_ids
            key = (origin, dest)
            if key not in od:
                od[key] = {"origin": origin, "destination": dest,
                           "total_demand": 0, "matched_demand": 0, "shipment_count": 0}
            od[key]["total_demand"] += demand
            od[key]["shipment_count"] += 1
            if is_matched:
                od[key]["matched_demand"] += demand

        # 转换为 Sankey links 格式
        nodes_set = set()
        links = []
        for v in od.values():
            nodes_set.add(v["origin"])
            nodes_set.add(v["destination"])
            links.append({
                "source": v["origin"],
                "target": v["destination"],
                "value": v["total_demand"],
                "matched": v["matched_demand"],
                "shipment_count": v["shipment_count"],
            })

        nodes = [{"name": n} for n in sorted(nodes_set)]
        return {"status": "success", "data": {"nodes": nodes, "links": links}}
    except Exception as e:
        logger.error(f"OD流量分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/time-value")
async def get_time_value_analysis():
    """时间价值分布与匹配情况（用于饼图 + 分组柱状图）"""
    try:
        shipments_data = data_service.get_all_shipments()
        matchings = matching_service.get_all_matchings()

        matched_ids = set()
        for matching in matchings:
            for s in matching.get("shipments", []):
                if s.get("assigned_route") != "Self":
                    matched_ids.add(s.get("shipment_id"))

        # 按时间价值分档统计
        TIERS = {100: "普通(100)", 1700: "较高(1700)", 2500: "高价值(2500)"}
        stats: dict[int, dict] = {
            100:  {"label": "普通(100)",     "total": 0, "matched": 0, "total_demand": 0, "matched_demand": 0},
            1700: {"label": "较高(1700)",    "total": 0, "matched": 0, "total_demand": 0, "matched_demand": 0},
            2500: {"label": "高价值(2500)",  "total": 0, "matched": 0, "total_demand": 0, "matched_demand": 0},
        }

        for s in shipments_data["shipments"]:
            tv = s.get("time_value", 0)
            tier = tv if tv in stats else 100
            stats[tier]["total"] += 1
            stats[tier]["total_demand"] += s.get("demand", 0)
            if s["shipment_id"] in matched_ids:
                stats[tier]["matched"] += 1
                stats[tier]["matched_demand"] += s.get("demand", 0)

        result = []
        for tv, d in stats.items():
            result.append({
                "time_value": tv,
                "label": d["label"],
                "total_shipments": d["total"],
                "matched_shipments": d["matched"],
                "unmatched_shipments": d["total"] - d["matched"],
                "match_rate": round(d["matched"] / d["total"] * 100, 1) if d["total"] > 0 else 0,
                "total_demand": d["total_demand"],
                "matched_demand": d["matched_demand"],
            })

        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"时间价值分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/algorithm-quality")
async def get_algorithm_quality():
    """算法质量指标（用于仪表盘 + 统计卡）"""
    try:
        matchings = matching_service.get_all_matchings()
        if not matchings:
            return {"status": "success", "data": {}}

        m = matchings[0]
        stats = m.get("statistics", {})

        return {
            "status": "success",
            "data": {
                "is_stable":             stats.get("is_stable", False),
                "iteration_num":         stats.get("iteration_num", 0),
                "restart_num":           stats.get("restart_num", 0),
                "cpu_time":              stats.get("cpu_time", 0),
                "matching_rate":         round(m.get("matching_rate", 0) * 100, 2),
                "total_shipments":       stats.get("total_shipments", 0),
                "matched_shipments":     stats.get("matched_shipments", 0),
                "total_route_capacity":  stats.get("total_route_capacity", 0),
                "total_container_num":   stats.get("total_container_num", 0),
                "matched_container_num": stats.get("matched_container_num", 0),
            }
        }
    except Exception as e:
        logger.error(f"算法质量分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
