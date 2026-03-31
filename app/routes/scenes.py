"""
场景管理 + 对比分析 + zip上传 API
"""
import asyncio
import csv
import json
import logging
import os
import uuid
import zipfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["scenes"])
logger = logging.getLogger(__name__)
_pool = ThreadPoolExecutor(max_workers=1)  # 串行：一次只跑一个算法进程

# 串行任务队列：存放待执行的 (task_id, scene_id, algo_params)
_queue: list = []
_queue_running = False  # 当前是否有任务在跑

# ── 路径常量 ──────────────────────────────────────────────────
# 用 __file__ 锚定项目根目录，不依赖进程工作目录
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

_data_override = os.environ.get("DATA_DIR_OVERRIDE")
DATA_DIR    = Path(_data_override) if _data_override else _PROJECT_ROOT / "data"
SCENES_JSON = DATA_DIR / "scenes.json"
SCENES_DIR  = DATA_DIR / "scenes"
EXE_PATH    = _PROJECT_ROOT / "cmake-build-debug" / "stable_match.exe"
RESULT_BASE = _PROJECT_ROOT / "cmake-build-debug" / "result"

# ── 任务状态 ─────────────────────────────────────────────────
_tasks: Dict[str, Dict] = {}   # task_id -> task info
_scene_tasks: Dict[str, str] = {}  # scene_id -> latest task_id


# ── 辅助 ─────────────────────────────────────────────────────

def _load_scenes() -> List[Dict]:
    if not SCENES_JSON.exists():
        return []
    return json.loads(SCENES_JSON.read_text(encoding="utf-8"))


def _save_scenes(scenes: List[Dict]):
    SCENES_JSON.write_text(json.dumps(scenes, ensure_ascii=False, indent=2), encoding="utf-8")


def _get_scene(scene_id: str) -> Optional[Dict]:
    for s in _load_scenes():
        if s["id"] == scene_id:
            return s
    return None


def _update_scene(scene_id: str, **kwargs):
    scenes = _load_scenes()
    for s in scenes:
        if s["id"] == scene_id:
            s.update(kwargs)
    _save_scenes(scenes)


def _read_meta(scene_dir: Path) -> Dict:
    meta = {"route_count": 0, "shipment_count": 0}
    for fname, key in [("route.csv", "route_count"), ("shipment.csv", "shipment_count")]:
        f = scene_dir / fname
        if f.exists():
            with open(f, encoding="utf-8") as fp:
                rows = list(csv.reader(fp))
            val = rows[0][1] if rows else "0"
            meta[key] = int(val) if str(val).strip().isdigit() else 0
    return meta


def _parse_result(result_csv: Path) -> Optional[Dict]:
    """解析 stable_matching.csv，返回摘要字典"""
    if not result_csv.exists():
        return None
    try:
        with open(result_csv, encoding="utf-8") as f:
            rows = list(csv.reader(f))
        stats = {}
        for row in rows[2:9]:
            if len(row) >= 2:
                stats[row[0].strip()] = row[1].strip()

        matched_count = sum(1 for v in rows[1][1:] if v.strip() and v.strip() != "Self")
        total_count   = sum(1 for v in rows[1][1:] if v.strip())

        return {
            "total_shipments":          total_count,
            "matched_shipments":        matched_count,
            "unmatched_shipments":      total_count - matched_count,
            "matching_rate":            round(matched_count / total_count, 4) if total_count else 0,
            "total_route_capacity":     int(stats.get("Total capacity in route", 0)),
            "total_container_num":      int(stats.get("Total container number in shipment", 0)),
            "matched_container_num":    int(stats.get("Total matched container number", 0)),
            "is_stable":                stats.get("Stable or not", "False").lower() == "true",
            "iteration_num":            int(stats.get("Iteration num", 0)),
            "restart_num":              int(stats.get("Restart num", 0)),
            "cpu_time":                 float(stats.get("CPU time", 0)),
        }
    except Exception as e:
        logger.error(f"解析结果文件失败 {result_csv}: {e}")
        return None


def _run_scene(task_id: str, scene_id: str, algo_params: Optional[Dict] = None):
    """在线程池中串行执行算法，完成后自动拉取队列下一个"""
    global _queue_running
    import subprocess, time
    task = _tasks[task_id]
    scene = _get_scene(scene_id)
    if not scene:
        task.update(status="failed", error="场景不存在", finished_at=datetime.now().isoformat())
        _dispatch_next()
        return

    scene_dir   = SCENES_DIR / scene_id
    result_dir  = RESULT_BASE / scene_id
    result_dir.mkdir(parents=True, exist_ok=True)
    result_file = result_dir / "stable_matching.csv"

    # 算法参数默认值
    p = algo_params or {}
    max_prefer     = str(int(p.get("max_prefer_list",  1000000)))
    max_iter       = str(int(p.get("max_iter",         2000)))
    max_incomplete = str(int(p.get("max_incomplete",   200)))
    prob_walk      = str(float(p.get("prob_random_walk", 0.5)))

    try:
        _update_scene(scene_id, status="running")
        proc = subprocess.Popen(
            [
                str(EXE_PATH),
                str(scene_dir / "network.csv"),
                str(scene_dir / "shipment.csv"),
                str(scene_dir / "route.csv"),
                str(scene_dir / "cooperation_parameter.csv"),
                str(result_file),
                max_prefer, max_iter, max_incomplete, prob_walk,
            ],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        stdout, stderr = proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"算法返回码 {proc.returncode}: {stderr or stdout}")

        # 等待结果文件
        for _ in range(300):
            if result_file.exists():
                break
            time.sleep(1)
        else:
            raise RuntimeError("结果文件未生成（超时）")

        summary = _parse_result(result_file)
        task.update(status="done", result=summary, finished_at=datetime.now().isoformat())
        _update_scene(scene_id, status="done", result_file=str(result_file), result=summary)

    except Exception as e:
        task.update(status="failed", error=str(e), finished_at=datetime.now().isoformat())
        _update_scene(scene_id, status="failed")
        logger.error(f"场景 {scene_id} 执行失败: {e}")
    finally:
        _dispatch_next()  # 无论成功失败，都拉取下一个


def _dispatch_next():
    """从队列里取下一个任务提交到线程池"""
    global _queue_running
    if not _queue:
        _queue_running = False
        return
    next_task_id, next_scene_id, next_params = _queue.pop(0)
    # 更新任务状态为 running（之前是 queued）
    if next_task_id in _tasks:
        _tasks[next_task_id]["status"] = "running"
        _tasks[next_task_id]["started_at"] = datetime.now().isoformat()
    _queue_running = True
    _pool.submit(_run_scene, next_task_id, next_scene_id, next_params)


# ── 场景列表 ──────────────────────────────────────────────────

@router.get("/scenes")
async def list_scenes():
    scenes = _load_scenes()
    # 附上最新任务状态
    for s in scenes:
        tid = _scene_tasks.get(s["id"])
        if tid and tid in _tasks:
            t = _tasks[tid]
            s["task_status"] = t["status"]
            s["task_id"]     = tid
        elif s.get("status") == "done":
            s["task_status"] = "done"
        else:
            s["task_status"] = "ready"
    return {"status": "success", "data": scenes}


class AlgoParams(BaseModel):
    max_prefer_list:  int   = 1000000  # MaxNum_preferList
    max_iter:         int   = 2000     # MaxNum_iter
    max_incomplete:   int   = 200      # MaxNum_incompleteStable
    prob_random_walk: float = 0.5      # probability_randomWalk


@router.post("/scenes/{scene_id}/run")
async def run_scene(scene_id: str, params: AlgoParams = AlgoParams()):
    """将场景加入串行执行队列"""
    global _queue_running
    scene = _get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"场景不存在: {scene_id}")
    scene_dir = SCENES_DIR / scene_id
    if not (scene_dir / "route.csv").exists():
        raise HTTPException(status_code=400, detail="场景数据文件不完整")

    # 若已在队列或正在运行，拒绝重复提交
    queued_scene_ids = [item[1] for item in _queue]
    running = next((t for t in _tasks.values() if t["scene_id"] == scene_id and t["status"] in ("running", "queued")), None)
    if running or scene_id in queued_scene_ids:
        raise HTTPException(status_code=409, detail="该场景已在队列中或正在运行")

    task_id = str(uuid.uuid4())
    position = len(_queue) + (1 if _queue_running else 0)
    # 如果当前有任务在跑，先标记为 queued
    initial_status = "queued" if _queue_running else "running"
    _tasks[task_id] = {
        "task_id": task_id, "scene_id": scene_id,
        "status": initial_status, "started_at": None,
        "finished_at": None, "result": None, "error": None,
        "queue_position": position,
    }
    _scene_tasks[scene_id] = task_id

    if not _queue_running:
        # 队列空闲，直接跑
        _queue_running = True
        _tasks[task_id]["status"] = "running"
        _tasks[task_id]["started_at"] = datetime.now().isoformat()
        _pool.submit(_run_scene, task_id, scene_id, params.model_dump())
    else:
        # 加入队列等待
        _queue.append((task_id, scene_id, params.model_dump()))

    return {
        "status": "accepted", "task_id": task_id, "scene_id": scene_id,
        "queue_position": position,
        "message": "开始执行" if position == 0 else f"已加入队列，前面还有 {position} 个任务"
    }

@router.get("/scenes/{scene_id}/status")
async def scene_status(scene_id: str):
    tid = _scene_tasks.get(scene_id)
    if tid and tid in _tasks:
        return {"status": "success", "data": _tasks[tid]}
    scene = _get_scene(scene_id)
    if scene and scene.get("status") == "done":
        return {"status": "success", "data": {
            "task_id": None, "scene_id": scene_id,
            "status": "done", "result": scene.get("result"),
        }}
    return {"status": "success", "data": {"task_id": None, "scene_id": scene_id, "status": "ready"}}


@router.post("/scenes/run-all")
async def run_all_scenes():
    """将所有未完成场景加入串行队列，逐个执行"""
    global _queue_running
    scenes = _load_scenes()
    queued_scene_ids = {item[1] for item in _queue}
    running_scene_ids = {t["scene_id"] for t in _tasks.values() if t["status"] in ("running", "queued")}

    submitted = []
    for s in scenes:
        sid = s["id"]
        if sid in running_scene_ids or sid in queued_scene_ids:
            continue  # 跳过已在队列/运行中的
        task_id = str(uuid.uuid4())
        position = len(_queue) + (1 if _queue_running else 0) + len(submitted)
        initial_status = "running" if not _queue_running and not submitted else "queued"
        _tasks[task_id] = {
            "task_id": task_id, "scene_id": sid,
            "status": initial_status, "started_at": None,
            "finished_at": None, "result": None, "error": None,
            "queue_position": position,
        }
        _scene_tasks[sid] = task_id

        if not _queue_running and not submitted:
            # 第一个直接跑
            _queue_running = True
            _tasks[task_id]["status"] = "running"
            _tasks[task_id]["started_at"] = datetime.now().isoformat()
            _pool.submit(_run_scene, task_id, sid, None)
        else:
            _queue.append((task_id, sid, None))
        submitted.append(sid)

    return {
        "status": "accepted",
        "submitted": submitted,
        "count": len(submitted),
        "message": f"已加入队列 {len(submitted)} 个场景，串行逐个执行" if submitted else "没有需要执行的场景"
    }


# ── 横向对比 ──────────────────────────────────────────────────

@router.get("/compare")
async def compare_scenes(scene_ids: str = None):
    """
    返回多场景对比数据。
    scene_ids: 逗号分隔的场景ID，为空则返回全部有结果的场景。
    """
    scenes = _load_scenes()
    if scene_ids:
        ids = [s.strip() for s in scene_ids.split(",")]
        scenes = [s for s in scenes if s["id"] in ids]

    rows = []
    for s in scenes:
        result = s.get("result")
        # 如果 scenes.json 里没有，尝试从磁盘读
        if not result:
            rf = RESULT_BASE / s["id"] / "stable_matching.csv"
            result = _parse_result(rf)
        if not result:
            continue

        # 从 route.csv 读取平均运费（route1 cost1 作为代表性指标）
        avg_cost = _calc_avg_route_cost(SCENES_DIR / s["id"] / "route.csv")

        # 从结果文件读取路线分流量
        route_dist = _calc_route_distribution(RESULT_BASE / s["id"] / "stable_matching.csv")

        rows.append({
            "scene_id":            s["id"],
            "label":               s["label"],
            "group":               s["group"],
            "sub":                 s.get("sub"),
            "matching_rate":       round(result["matching_rate"] * 100, 2),
            "matched_shipments":   result["matched_shipments"],
            "unmatched_shipments": result["unmatched_shipments"],
            "total_shipments":     result["total_shipments"],
            "matched_container_num":  result["matched_container_num"],
            "total_container_num":    result["total_container_num"],
            "container_rate":      round(
                result["matched_container_num"] / result["total_container_num"] * 100, 2
            ) if result["total_container_num"] else 0,
            "is_stable":           result["is_stable"],
            "iteration_num":       result["iteration_num"],
            "restart_num":         result["restart_num"],
            "cpu_time":            result["cpu_time"],
            "avg_route_cost":      avg_cost,
            "route_distribution":  route_dist,  # {route_id: shipment_count}
        })

    return {"status": "success", "data": rows, "count": len(rows)}


def _calc_avg_route_cost(route_csv: Path) -> float:
    """从 route.csv 计算所有路线第一段运费的平均值（作为成本代表指标）"""
    if not route_csv.exists():
        return 0.0
    try:
        with open(route_csv, encoding="utf-8") as f:
            rows = list(csv.reader(f))[2:]  # 跳过元数据和表头
        costs = []
        for row in rows:
            if len(row) > 11:
                v = row[11].strip()
                if v and v != "-1":
                    try:
                        costs.append(float(v))
                    except ValueError:
                        pass
        return round(sum(costs) / len(costs), 2) if costs else 0.0
    except Exception:
        return 0.0


def _calc_route_distribution(result_csv: Path) -> dict:
    """从 stable_matching.csv 统计每条路线分配到的货物数（Self 除外）"""
    if not result_csv.exists():
        return {}
    try:
        with open(result_csv, encoding="utf-8") as f:
            rows = list(csv.reader(f))
        assignments = [r.strip() for r in rows[1][1:] if r.strip()]
        dist = {}
        for r in assignments:
            if r == "Self":
                continue
            dist[r] = dist.get(r, 0) + 1
        return dist
    except Exception:
        return {}


# ── ZIP 上传，自动识别场景 ─────────────────────────────────────

@router.post("/upload/zip")
async def upload_zip(file: UploadFile = File(...)):
    """
    上传 zip 压缩包，自动扫描其中每组包含 route.csv + shipment.csv 的目录，
    注册为新场景（或覆盖同名场景）。
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="只支持 .zip 格式")

    contents = await file.read()
    tmp_zip = DATA_DIR / f"_upload_{uuid.uuid4().hex}.zip"
    tmp_zip.write_bytes(contents)

    try:
        new_scenes, errors = _extract_and_register(tmp_zip)
    finally:
        tmp_zip.unlink(missing_ok=True)

    return {
        "status": "success" if not errors else "partial",
        "message": f"识别到 {len(new_scenes)} 个场景" + (f"，{len(errors)} 个错误" if errors else ""),
        "scenes": new_scenes,
        "errors": errors,
    }


def _extract_and_register(zip_path: Path) -> tuple[List[Dict], List[str]]:
    """解压zip，找出所有包含 shipment.csv+route.csv 的目录，注册场景"""
    REQUIRED = {"shipment.csv", "route.csv"}
    ALL_F    = {"shipment.csv", "route.csv", "network.csv", "cooperation_parameter.csv"}

    new_scenes, errors = [], []
    scenes = _load_scenes()
    existing_ids = {s["id"] for s in scenes}

    with zipfile.ZipFile(zip_path) as zf:
        names = zf.namelist()

        # 找出所有"目录"（取公共前缀）
        dirs: Dict[str, set] = {}
        for n in names:
            p = Path(n)
            parent = str(p.parent) if p.parent != Path(".") else ""
            dirs.setdefault(parent, set()).add(p.name)

        for dir_path, filenames in dirs.items():
            if not REQUIRED.issubset(filenames):
                continue

            # 用目录路径生成 scene_id
            raw_label = dir_path.replace("\\", "/").strip("/") or "上传场景"
            safe_id = (raw_label
                       .replace("/", "_").replace("%", "pct")
                       .replace("+", "plus").replace(" ", "")
                       .strip("_") or "upload_scene")
            # 保证唯一
            base_id, idx = safe_id, 1
            while safe_id in existing_ids:
                safe_id = f"{base_id}_{idx}"; idx += 1

            dest_dir = SCENES_DIR / safe_id
            dest_dir.mkdir(parents=True, exist_ok=True)

            try:
                for fname in ALL_F:
                    member = f"{dir_path}/{fname}".lstrip("/") if dir_path else fname
                    if member in names:
                        data = zf.read(member)
                        # 嗅探是否是 xlsx
                        if data[:2] == b'PK':
                            data = _xlsx_bytes_to_csv(data)
                        (dest_dir / fname).write_bytes(data)
                    elif fname in REQUIRED:
                        raise ValueError(f"缺少必要文件: {fname}")

                meta = _read_meta(dest_dir)
                entry = {
                    "id": safe_id, "label": raw_label,
                    "group": raw_label.split("/")[0] if "/" in raw_label else raw_label,
                    "sub":   raw_label.split("/")[1] if "/" in raw_label else None,
                    "route_count":    meta["route_count"],
                    "shipment_count": meta["shipment_count"],
                    "result_file": None, "status": "ready",
                }
                # 覆盖或追加
                replaced = False
                for i, s in enumerate(scenes):
                    if s["id"] == safe_id:
                        scenes[i] = entry; replaced = True; break
                if not replaced:
                    scenes.append(entry)
                existing_ids.add(safe_id)
                new_scenes.append({"id": safe_id, "label": raw_label})
            except Exception as e:
                errors.append(f"{dir_path}: {e}")

    _save_scenes(scenes)
    return new_scenes, errors


def _xlsx_bytes_to_csv(data: bytes) -> bytes:
    """将 xlsx 二进制转为 csv bytes"""
    import io
    from xml.etree import ElementTree as ET
    ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        strings = []
        if "xl/sharedStrings.xml" in zf.namelist():
            tree = ET.parse(zf.open("xl/sharedStrings.xml"))
            for si in tree.getroot().iter(f"{{{ns}}}si"):
                strings.append("".join(t.text or "" for t in si.iter(f"{{{ns}}}t")))
        tree = ET.parse(zf.open("xl/worksheets/sheet1.xml"))
        rows = []
        for row_el in tree.getroot().iter(f"{{{ns}}}row"):
            row = []
            for c in row_el.iter(f"{{{ns}}}c"):
                t = c.get("t", "")
                v = c.find(f"{{{ns}}}v")
                if v is None:
                    row.append("")
                elif t == "s":
                    row.append(strings[int(v.text)])
                else:
                    row.append(v.text or "")
            rows.append(row)
    buf = io.StringIO()
    csv.writer(buf).writerows(rows)
    return buf.getvalue().encode("utf-8")


# ── 按场景读取原始数据 ─────────────────────────────────────────

def _make_scene_service(scene_id: str):
    """为指定场景创建一个临时的 DataLoader + DataService"""
    from ..services.data_loader import DataLoader
    from ..services.data_service import DataService
    loader = DataLoader(str(SCENES_DIR / scene_id))
    return DataService(loader)


@router.get("/scenes/{scene_id}/shipments")
async def get_scene_shipments(scene_id: str):
    scene = _get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"场景不存在: {scene_id}")
    if not (SCENES_DIR / scene_id / "shipment.csv").exists():
        raise HTTPException(status_code=404, detail="货物数据文件不存在")
    try:
        svc = _make_scene_service(scene_id)
        result = svc.get_all_shipments()
        return {"status": "success", "data": result,
                "scene_id": scene_id, "scene_label": scene["label"]}
    except Exception as e:
        logger.error(f"读取场景 {scene_id} 货物数据失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"读取货物数据失败: {e}")


@router.get("/scenes/{scene_id}/routes")
async def get_scene_routes(scene_id: str):
    scene = _get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"场景不存在: {scene_id}")
    if not (SCENES_DIR / scene_id / "route.csv").exists():
        raise HTTPException(status_code=404, detail="路线数据文件不存在")
    try:
        svc = _make_scene_service(scene_id)
        result = svc.get_all_routes()
        return {"status": "success", "data": result,
                "scene_id": scene_id, "scene_label": scene["label"]}
    except Exception as e:
        logger.error(f"读取场景 {scene_id} 路线数据失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"读取路线数据失败: {e}")


@router.get("/scenes/{scene_id}/matchings")
async def get_scene_matchings(scene_id: str):
    scene = _get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"场景不存在: {scene_id}")
    result_file = RESULT_BASE / scene_id / "stable_matching.csv"
    if not result_file.exists():
        raise HTTPException(status_code=404, detail="该场景尚无匹配结果，请先执行算法")
    try:
        svc = _make_scene_service(scene_id)
        # 用 DataService 加载货物和路线（带城市名映射）
        shipments_data = svc.get_all_shipments()
        routes_data    = svc.get_all_routes()
        shipment_map   = {s["shipment_id"]: s for s in shipments_data["shipments"]}
        route_map      = {r["route_id"]:    r for r in routes_data["routes"]}

        summary = _parse_result(result_file)
        with open(result_file, encoding="utf-8") as f:
            rows = list(csv.reader(f))

        shipment_ids = [int(v) for v in rows[0][1:] if v.strip().isdigit()]
        route_vals   = [v.strip() for v in rows[1][1:len(shipment_ids) + 1]]

        matchings = []
        for sid, rv in zip(shipment_ids, route_vals):
            is_matched = rv not in ("Self", "")
            route_id   = int(rv) if is_matched else None
            s_info     = shipment_map.get(sid, {})
            r_info     = route_map.get(route_id) if route_id else None
            matchings.append({
                "id":          sid,
                "shipment_id": sid,
                "route_id":    route_id,
                "status":      "matched" if is_matched else "unmatched",
                "shipment_info": {
                    "origin_city":           s_info.get("origin_city", "未知"),
                    "destination_city":      s_info.get("destination_city", "未知"),
                    "demand":                s_info.get("demand", 0),
                    "weight":                s_info.get("weight", 0),
                    "volume":                s_info.get("volume", 0),
                    "origin_longitude":      s_info.get("origin_longitude"),
                    "origin_latitude":       s_info.get("origin_latitude"),
                    "destination_longitude": s_info.get("destination_longitude"),
                    "destination_latitude":  s_info.get("destination_latitude"),
                },
                "route_info": {
                    "nodes":             r_info.get("nodes", []),
                    "costs":             r_info.get("costs", []),
                    "travel_times":      r_info.get("travel_times", []),
                    "total_cost":        r_info.get("total_cost", 0),
                    "total_travel_time": r_info.get("total_travel_time", 0),
                    "capacity":          r_info.get("capacity", 0),
                    "route_category":    r_info.get("route_category", "未知"),
                    "node_details":      r_info.get("node_details", []),
                } if r_info else None,
            })

        return {
            "status":      "success",
            "data":        matchings,
            "summary":     summary,
            "scene_id":    scene_id,
            "scene_label": scene["label"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"读取场景 {scene_id} 匹配结果失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"读取匹配结果失败: {e}")
