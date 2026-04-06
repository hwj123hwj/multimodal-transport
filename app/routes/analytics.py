"""
数据分析 API
提供可视化所需的聚合分析数据，支持 scene_id 参数切换场景
"""
import csv
import json
import logging
from pathlib import Path
from typing import Dict, Optional

from fastapi import APIRouter, Query
from ..services import data_service as _default_ds
from ..services import matching_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
corridor_router = APIRouter(prefix="/api", tags=["analytics"])
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
APP_ROOT = Path("/app") if Path("/app").exists() else _PROJECT_ROOT
_data_override = None
try:
    import os
    _data_override = os.environ.get("DATA_DIR_OVERRIDE")
except Exception:
    pass

DATA_DIR    = Path(_data_override) if _data_override else APP_ROOT / "data"
SCENES_JSON = DATA_DIR / "scenes.json"
SCENES_DIR  = DATA_DIR / "scenes"
RESULT_BASE = APP_ROOT / "cmake-build-debug" / "result"

CORRIDOR_ROUTES = {
    "西部陆海新通道": set(range(1, 10)),
    "长江经济带": set(range(10, 13)),
    "跨境公路": set(range(13, 18)),
}
CORRIDOR_CAPACITIES = {
    "西部陆海新通道": 2700,
    "长江经济带": 1200,
    "跨境公路": 5000,
}
ROUTE_TO_CORRIDOR = {
    route_id: corridor
    for corridor, route_ids in CORRIDOR_ROUTES.items()
    for route_id in route_ids
}


def _get_scene_ds(scene_id: Optional[str]):
    """返回 (data_svc, matchings)。scene_id=None 时使用默认服务和 matching_service。"""
    if not scene_id:
        return _default_ds, matching_service.get_all_matchings()

    # 按场景加载独立的 DataService
    from ..services.data_loader import DataLoader
    from ..services.data_service import DataService

    scene_dir = SCENES_DIR / scene_id
    if not scene_dir.exists():
        return _default_ds, matching_service.get_all_matchings()

    loader = DataLoader(str(scene_dir))
    ds = DataService(loader)

    # 从该场景的结果目录读取匹配数据
    result_csv = RESULT_BASE / scene_id / "stable_matching.csv"
    matchings = _parse_matchings(result_csv, ds) if result_csv.exists() else []

    return ds, matchings


def _parse_matchings(result_csv: Path, ds) -> list:
    """从 stable_matching.csv 构造 matchings 列表（模拟 matching_service 格式）。"""
    try:
        with open(result_csv, encoding="utf-8") as f:
            rows = list(csv.reader(f))

        shipment_ids = [v.strip() for v in rows[0][1:] if v.strip()]
        route_ids    = [v.strip() for v in rows[1][1:] if v.strip()]

        # 统计数字
        stats = {}
        for row in rows[2:]:
            if len(row) >= 2:
                key = row[0].strip()
                val = row[1].strip()
                stats[key] = val

        total   = len(shipment_ids)
        matched = sum(1 for r in route_ids if r != "Self")

        shipments_list = []
        for sid, rid in zip(shipment_ids, route_ids):
            try:
                sid_int = int(sid)
                rid_val = None if rid == "Self" else int(rid)
            except ValueError:
                continue
            shipments_list.append({
                "shipment_id": sid_int,
                "assigned_route": "Self" if rid == "Self" else rid_val,
            })

        def _float(s):
            try: return float(s)
            except Exception: return 0

        return [{
            "is_stable":    stats.get("Stable or not", "False").strip() == "True",
            "iteration_num": int(_float(stats.get("Iteration num", 0))),
            "restart_num":   int(_float(stats.get("Restart num", 0))),
            "cpu_time":      round(_float(stats.get("CPU time", 0)), 4),
            "matching_rate": matched / total if total else 0,
            "total_shipments":    total,
            "matched_shipments":  matched,
            "total_capacity":     int(_float(stats.get("Total capacity in route", 0))),
            "total_container_number": int(_float(stats.get("Total container number in shipment", 0))),
            "total_matched_container_number": int(_float(stats.get("Total matched container number", 0))),
            "shipments": shipments_list,
        }]
    except Exception as e:
        logger.error(f"解析结果文件失败 {result_csv}: {e}")
        return []


def _load_scene_labels() -> Dict[str, str]:
    if not SCENES_JSON.exists():
        return {}

    try:
        scenes = json.loads(SCENES_JSON.read_text(encoding="utf-8"))
    except Exception as e:
        logger.error(f"读取场景元数据失败 {SCENES_JSON}: {e}")
        return {}

    return {
        scene.get("id"): scene.get("label", scene.get("id"))
        for scene in scenes
        if scene.get("id")
    }


def _iter_executed_scene_ids() -> list:
    scene_labels = _load_scene_labels()
    scene_ids = []

    for scene_id in scene_labels:
        if (RESULT_BASE / scene_id / "stable_matching.csv").exists():
            scene_ids.append(scene_id)

    for result_csv in sorted(RESULT_BASE.glob("*/stable_matching.csv")):
        scene_id = result_csv.parent.name
        if scene_id not in scene_ids:
            scene_ids.append(scene_id)

    return scene_ids


def _load_shipment_demands(scene_id: str) -> Dict[int, int]:
    shipment_csv = SCENES_DIR / scene_id / "shipment.csv"
    if not shipment_csv.exists():
        return {}

    demands = {}
    try:
        with open(shipment_csv, "r", encoding="utf-8") as f:
            next(f, None)
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    shipment_id = int((row.get("shipment index") or "").strip())
                    demands[shipment_id] = int((row.get("Demand") or "0").strip())
                except (TypeError, ValueError):
                    continue
    except Exception as e:
        logger.error(f"读取货物需求失败 {shipment_csv}: {e}")
        return {}

    return demands


def _build_corridor_utilization(scene_id: str) -> Optional[Dict[str, Dict[str, float]]]:
    result_csv = RESULT_BASE / scene_id / "stable_matching.csv"
    if not result_csv.exists():
        return None

    shipment_demands = _load_shipment_demands(scene_id)
    corridor_teu = {corridor: 0 for corridor in CORRIDOR_CAPACITIES}

    try:
        with open(result_csv, "r", encoding="utf-8") as f:
            rows = list(csv.reader(f))
    except Exception as e:
        logger.error(f"读取匹配结果失败 {result_csv}: {e}")
        return None

    if len(rows) < 2:
        return None

    shipment_ids = [int(v.strip()) for v in rows[0][1:] if v.strip().isdigit()]
    route_vals = [v.strip() for v in rows[1][1:len(shipment_ids) + 1]]

    for shipment_id, route_val in zip(shipment_ids, route_vals):
        if route_val == "Self":
            continue
        try:
            route_id = int(route_val)
        except ValueError:
            continue

        corridor = ROUTE_TO_CORRIDOR.get(route_id)
        if not corridor:
            continue

        corridor_teu[corridor] += shipment_demands.get(shipment_id, 0)

    return {
        corridor: {
            "matched_teu": matched_teu,
            "capacity": capacity,
            "utilization": round(matched_teu / capacity * 100, 1) if capacity > 0 else 0,
        }
        for corridor, capacity in CORRIDOR_CAPACITIES.items()
        for matched_teu in [corridor_teu[corridor]]
    }


# ── 端点 ─────────────────────────────────────────────────────

@corridor_router.get("/corridor-utilization")
async def get_corridor_utilization():
    scene_labels = _load_scene_labels()
    scenes = []

    for scene_id in _iter_executed_scene_ids():
        corridors = _build_corridor_utilization(scene_id)
        if not corridors:
            continue

        scenes.append({
            "scene_id": scene_id,
            "label": scene_labels.get(scene_id, scene_id),
            "corridors": corridors,
        })

    return {"scenes": scenes}

@router.get("/route-utilization")
async def get_route_utilization(scene_id: Optional[str] = Query(None)):
    try:
        ds, matchings = _get_scene_ds(scene_id)
        routes_data  = ds.get_all_routes()
        shipments_data = ds.get_all_shipments()
        shipment_map = {s["shipment_id"]: s for s in shipments_data["shipments"]}

        demand_by_route: dict = {}
        for matching in matchings:
            for s in matching.get("shipments", []):
                route_id   = s.get("assigned_route")
                shipment_id = s.get("shipment_id")
                if route_id == "Self" or route_id is None:
                    continue
                demand = shipment_map.get(shipment_id, {}).get("demand", 0)
                demand_by_route[route_id] = demand_by_route.get(route_id, 0) + demand

        result = []
        for route in routes_data["routes"]:
            rid      = route["route_id"]
            capacity = route.get("capacity", 0)
            used     = demand_by_route.get(rid, 0)
            result.append({
                "route_id":       rid,
                "label":          f"路线{rid}",
                "nodes":          " → ".join(route.get("nodes", [])),
                "category":       route.get("route_category", "未知"),
                "capacity":       capacity,
                "used":           used,
                "available":      max(capacity - used, 0),
                "utilization_pct": round(used / capacity * 100, 1) if capacity > 0 else 0,
            })

        result.sort(key=lambda x: x["route_id"])
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"路线利用率分析失败: {e}")
        return {"status": "success", "data": []}


@router.get("/od-flow")
async def get_od_flow(scene_id: Optional[str] = Query(None)):
    try:
        ds, matchings = _get_scene_ds(scene_id)
        shipments_data = ds.get_all_shipments()
        shipment_map   = {s["shipment_id"]: s for s in shipments_data["shipments"]}

        matched_ids = set()
        for matching in matchings:
            for s in matching.get("shipments", []):
                if s.get("assigned_route") != "Self":
                    matched_ids.add(s.get("shipment_id"))

        od: dict = {}
        for s in shipments_data["shipments"]:
            origin = s.get("origin_city", "未知")
            dest   = s.get("destination_city", "未知")
            demand = s.get("demand", 0)
            is_matched = s["shipment_id"] in matched_ids
            key = (origin, dest)
            if key not in od:
                od[key] = {"origin": origin, "destination": dest,
                           "total_demand": 0, "matched_demand": 0, "shipment_count": 0}
            od[key]["total_demand"]    += demand
            od[key]["shipment_count"]  += 1
            if is_matched:
                od[key]["matched_demand"] += demand

        nodes_set = set()
        links = []
        for v in od.values():
            nodes_set.add(v["origin"])
            nodes_set.add(v["destination"])
            links.append({
                "source":         v["origin"],
                "target":         v["destination"],
                "value":          v["total_demand"],
                "matched":        v["matched_demand"],
                "shipment_count": v["shipment_count"],
            })

        nodes = [{"name": n} for n in sorted(nodes_set)]
        return {"status": "success", "data": {"nodes": nodes, "links": links}}
    except Exception as e:
        logger.error(f"OD流量分析失败: {e}")
        return {"status": "success", "data": None}


@router.get("/time-value")
async def get_time_value_analysis(scene_id: Optional[str] = Query(None)):
    try:
        ds, matchings = _get_scene_ds(scene_id)
        shipments_data = ds.get_all_shipments()

        matched_ids = set()
        for matching in matchings:
            for s in matching.get("shipments", []):
                if s.get("assigned_route") != "Self":
                    matched_ids.add(s.get("shipment_id"))

        stats: dict = {
            100:  {"label": "普通(100)",    "total": 0, "matched": 0, "total_demand": 0, "matched_demand": 0},
            1700: {"label": "较高(1700)",   "total": 0, "matched": 0, "total_demand": 0, "matched_demand": 0},
            2500: {"label": "高价值(2500)", "total": 0, "matched": 0, "total_demand": 0, "matched_demand": 0},
        }
        for s in shipments_data["shipments"]:
            tv   = s.get("time_value", 0)
            tier = tv if tv in stats else 100
            stats[tier]["total"]        += 1
            stats[tier]["total_demand"] += s.get("demand", 0)
            if s["shipment_id"] in matched_ids:
                stats[tier]["matched"]        += 1
                stats[tier]["matched_demand"] += s.get("demand", 0)

        result = []
        for tv, d in stats.items():
            result.append({
                "time_value":          tv,
                "label":               d["label"],
                "total_shipments":     d["total"],
                "matched_shipments":   d["matched"],
                "unmatched_shipments": d["total"] - d["matched"],
                "match_rate":          round(d["matched"] / d["total"] * 100, 1) if d["total"] > 0 else 0,
                "total_demand":        d["total_demand"],
                "matched_demand":      d["matched_demand"],
            })

        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"时间价值分析失败: {e}")
        return {"status": "success", "data": []}


@router.get("/algorithm-quality")
async def get_algorithm_quality(scene_id: Optional[str] = Query(None)):
    try:
        _, matchings = _get_scene_ds(scene_id)
        if not matchings:
            return {"status": "success", "data": {}}

        m = matchings[0]
        return {
            "status": "success",
            "data": {
                "is_stable":             m.get("is_stable", False),
                "iteration_num":         m.get("iteration_num", 0),
                "restart_num":           m.get("restart_num", 0),
                "cpu_time":              m.get("cpu_time", 0),
                "matching_rate":         round(m.get("matching_rate", 0) * 100, 2),
                "total_shipments":       m.get("total_shipments", 0),
                "matched_shipments":     m.get("matched_shipments", 0),
                "total_route_capacity":  m.get("total_capacity", 0),
                "total_container_num":   m.get("total_container_number", 0),
                "matched_container_num": m.get("total_matched_container_number", 0),
            }
        }
    except Exception as e:
        logger.error(f"算法质量分析失败: {e}")
        return {"status": "success", "data": {}}
