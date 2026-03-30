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

router = APIRouter(prefix="/api", tags=["scenes"])
logger = logging.getLogger(__name__)
_pool = ThreadPoolExecutor(max_workers=4)

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


def _run_scene(task_id: str, scene_id: str):
    """在线程池中执行算法"""
    import subprocess, time
    task = _tasks[task_id]
    scene = _get_scene(scene_id)
    if not scene:
        task.update(status="failed", error="场景不存在", finished_at=datetime.now().isoformat())
        return

    scene_dir   = SCENES_DIR / scene_id
    result_dir  = RESULT_BASE / scene_id
    result_dir.mkdir(parents=True, exist_ok=True)
    result_file = result_dir / "stable_matching.csv"

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


@router.post("/scenes/{scene_id}/run")
async def run_scene(scene_id: str):
    """提交单个场景算法任务"""
    scene = _get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"场景不存在: {scene_id}")
    scene_dir = SCENES_DIR / scene_id
    if not (scene_dir / "route.csv").exists():
        raise HTTPException(status_code=400, detail="场景数据文件不完整")

    task_id = str(uuid.uuid4())
    _tasks[task_id] = {
        "task_id": task_id, "scene_id": scene_id,
        "status": "running", "started_at": datetime.now().isoformat(),
        "finished_at": None, "result": None, "error": None,
    }
    _scene_tasks[scene_id] = task_id

    loop = asyncio.get_event_loop()
    loop.run_in_executor(_pool, _run_scene, task_id, scene_id)

    return {"status": "accepted", "task_id": task_id, "scene_id": scene_id}


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
    """批量提交所有 ready 场景"""
    scenes = _load_scenes()
    submitted = []
    for s in scenes:
        if s.get("status") in ("running",):
            continue
        task_id = str(uuid.uuid4())
        sid = s["id"]
        _tasks[task_id] = {
            "task_id": task_id, "scene_id": sid,
            "status": "running", "started_at": datetime.now().isoformat(),
            "finished_at": None, "result": None, "error": None,
        }
        _scene_tasks[sid] = task_id
        loop = asyncio.get_event_loop()
        loop.run_in_executor(_pool, _run_scene, task_id, sid)
        submitted.append(sid)
    return {"status": "accepted", "submitted": submitted, "count": len(submitted)}


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

@router.get("/scenes/{scene_id}/shipments")
async def get_scene_shipments(scene_id: str):
    """读取指定场景的货物数据"""
    scene = _get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"场景不存在: {scene_id}")
    scene_dir = SCENES_DIR / scene_id
    shipment_file = scene_dir / "shipment.csv"
    if not shipment_file.exists():
        raise HTTPException(status_code=404, detail="货物数据文件不存在")
    try:
        from ..services import data_loader as _dl
        col = _dl.load_shipments(str(shipment_file))
        shipments = [s.to_dict() for s in col.shipments]
        return {"status": "success", "data": {"shipments": shipments}, "scene_id": scene_id, "scene_label": scene["label"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取货物数据失败: {e}")


@router.get("/scenes/{scene_id}/routes")
async def get_scene_routes(scene_id: str):
    """读取指定场景的路线数据"""
    scene = _get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"场景不存在: {scene_id}")
    scene_dir = SCENES_DIR / scene_id
    route_file = scene_dir / "route.csv"
    if not route_file.exists():
        raise HTTPException(status_code=404, detail="路线数据文件不存在")
    try:
        from ..services import data_loader as _dl
        col = _dl.load_routes(str(route_file))
        routes = [r.to_dict() for r in col.routes]
        return {"status": "success", "data": {"routes": routes}, "scene_id": scene_id, "scene_label": scene["label"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取路线数据失败: {e}")


@router.get("/scenes/{scene_id}/matchings")
async def get_scene_matchings(scene_id: str):
    """读取指定场景的匹配结果"""
    scene = _get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"场景不存在: {scene_id}")
    result_file = RESULT_BASE / scene_id / "stable_matching.csv"
    if not result_file.exists():
        raise HTTPException(status_code=404, detail="该场景尚无匹配结果，请先执行算法")
    try:
        from ..services import data_loader as _dl, data_service as _ds, matching_service as _ms
        # 加载该场景的输入数据用于 join
        scene_dir = SCENES_DIR / scene_id
        shipments_col = _dl.load_shipments(str(scene_dir / "shipment.csv"))
        routes_col    = _dl.load_routes(str(scene_dir / "route.csv"))
        shipment_map  = {s.shipment_id: s.to_dict() for s in shipments_col.shipments}
        route_map     = {r.route_id:    r.to_dict() for r in routes_col.routes}

        # 解析结果文件
        summary = _parse_result(result_file)
        matchings = []
        with open(result_file, encoding="utf-8") as f:
            rows = list(csv.reader(f))
        shipment_ids = [int(v) for v in rows[0][1:] if v.strip().isdigit()]
        route_vals   = [v.strip() for v in rows[1][1:len(shipment_ids)+1]]

        for sid, rv in zip(shipment_ids, route_vals):
            is_matched = rv != "Self" and rv != ""
            route_id   = int(rv) if is_matched else None
            s_info = shipment_map.get(sid, {})
            r_info = route_map.get(route_id) if route_id else None
            matchings.append({
                "id": sid,
                "shipment_id": sid,
                "route_id": route_id,
                "status": "matched" if is_matched else "unmatched",
                "shipment_info": {
                    "origin_city":            s_info.get("origin_city", "未知"),
                    "destination_city":       s_info.get("destination_city", "未知"),
                    "demand":                 s_info.get("demand", 0),
                    "weight":                 s_info.get("weight", 0),
                    "volume":                 s_info.get("volume", 0),
                    "origin_longitude":       s_info.get("origin_longitude"),
                    "origin_latitude":        s_info.get("origin_latitude"),
                    "destination_longitude":  s_info.get("destination_longitude"),
                    "destination_latitude":   s_info.get("destination_latitude"),
                },
                "route_info": {
                    "nodes":            r_info.get("nodes", []) if r_info else [],
                    "costs":            r_info.get("costs", []) if r_info else [],
                    "travel_times":     r_info.get("travel_times", []) if r_info else [],
                    "total_cost":       r_info.get("total_cost", 0) if r_info else 0,
                    "total_travel_time":r_info.get("total_travel_time", 0) if r_info else 0,
                    "capacity":         r_info.get("capacity", 0) if r_info else 0,
                    "route_category":   r_info.get("route_category", "未知") if r_info else "未知",
                } if r_info else None,
            })

        return {
            "status": "success",
            "data": matchings,
            "summary": summary,
            "scene_id": scene_id,
            "scene_label": scene["label"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取匹配结果失败: {e}")
