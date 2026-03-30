"""
基础数据API路由
提供网络、货物、路线、匹配等基础数据的REST API接口，以及文件上传功能
"""
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from ..config import get_data_dir
from ..services import data_loader, data_service

# 创建路由实例
router = APIRouter(prefix="/api", tags=["data"])


@router.get("/network")
async def get_network_data():
    """获取网络数据"""
    try:
        network_data = data_service.get_all_network_nodes()
        return {
            "status": "success",
            "data": network_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取网络数据失败: {str(e)}")


@router.get("/shipments")
async def get_shipments_data():
    """获取货物数据"""
    try:
        shipments_data = data_service.get_all_shipments()
        return {
            "status": "success",
            "data": shipments_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取货物数据失败: {str(e)}")


@router.get("/routes")
async def get_routes_data():
    """获取路线数据"""
    try:
        routes_data = data_service.get_all_routes()
        return {
            "status": "success",
            "data": routes_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取路线数据失败: {str(e)}")


@router.post("/upload")
async def upload_data_file(
        file: UploadFile = File(...),
        file_type: str = Form(..., description="文件类型: shipment, route"),
        description: str = Form("", description="文件描述")
) -> Dict[str, Any]:
    """上传单个数据文件（保留向后兼容）"""
    return await _save_one_file(file, file_type)


@router.post("/upload/batch")
async def upload_batch(
        shipment: UploadFile = File(None),
        route: UploadFile = File(None),
        network: UploadFile = File(None),
        cooperation_parameter: UploadFile = File(None),
) -> Dict[str, Any]:
    """一次上传最多4个数据文件（全部可选，至少提供一个）"""
    file_map = {
        "shipment": shipment,
        "route": route,
        "network": network,
        "cooperation_parameter": cooperation_parameter,
    }
    provided = {k: v for k, v in file_map.items() if v is not None}
    if not provided:
        raise HTTPException(status_code=400, detail="至少提供一个文件")

    saved, errors = [], []
    for file_type, upload in provided.items():
        try:
            info = await _save_one_file(upload, file_type)
            saved.append(info["data"])
        except HTTPException as e:
            errors.append({"file_type": file_type, "error": e.detail})
        except Exception as e:
            errors.append({"file_type": file_type, "error": str(e)})

    return {
        "status": "success" if not errors else "partial",
        "message": f"成功上传 {len(saved)} 个文件" + (f"，{len(errors)} 个失败" if errors else ""),
        "saved": saved,
        "errors": errors,
    }


async def _save_one_file(file: UploadFile, file_type: str) -> Dict[str, Any]:
    """内部：保存单个文件到 data/ 并刷新缓存"""
    ALLOWED = {
        "shipment":              "shipment.csv",
        "route":                 "route.csv",
        "network":               "network.csv",
        "cooperation_parameter": "cooperation_parameter.csv",
    }
    if file_type not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"无效的文件类型: {file_type}")
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="只支持 CSV 格式")

    filename = ALLOWED[file_type]
    data_dir = Path(get_data_dir())
    file_path = data_dir / filename

    contents = await file.read()
    file_path.write_bytes(contents)

    # 对 shipment / route 做格式验证
    try:
        if file_type == "shipment":
            data_loader.load_shipments(str(file_path.resolve()))
        elif file_type == "route":
            data_loader.load_routes(str(file_path.resolve()))
    except Exception as e:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"文件格式验证失败: {e}")

    # 记录上传时间
    import json as _json
    rec_path = data_dir / ".upload_records.json"
    records: dict = {}
    if rec_path.exists():
        try:
            records = _json.loads(rec_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    records[filename] = datetime.now().isoformat()
    rec_path.write_text(_json.dumps(records, ensure_ascii=False), encoding="utf-8")

    data_service.clear_cache()

    return {
        "status": "success",
        "message": "文件上传成功",
        "data": {
            "filename": filename,
            "original_filename": file.filename,
            "file_type": file_type,
            "file_size": file_path.stat().st_size,
            "upload_time": datetime.now().isoformat(),
        },
    }


@router.get("/uploads")
async def get_upload_history() -> Dict[str, Any]:
    """获取上传历史记录（只显示用户实际上传过的文件）"""
    try:
        data_dir = Path(get_data_dir())
        upload_record_path = data_dir / ".upload_records.json"
        upload_records: dict = {}
        if upload_record_path.exists():
            import json
            try:
                upload_records = json.loads(upload_record_path.read_text(encoding="utf-8"))
            except Exception:
                pass

        FILE_TYPES = [
            ("shipment",              "shipment.csv"),
            ("route",                 "route.csv"),
            ("network",               "network.csv"),
            ("cooperation_parameter", "cooperation_parameter.csv"),
        ]

        files = []
        for file_type, filename in FILE_TYPES:
            file_path = data_dir / filename
            if file_path.exists() and filename in upload_records:
                try:
                    stat = file_path.stat()
                    files.append({
                        "filename": filename,
                        "file_type": file_type,
                        "file_size": stat.st_size,
                        "upload_time": upload_records[filename],
                    })
                except Exception as e:
                    print(f"处理文件 {file_path} 时出错: {e}")

        return {"status": "success", "data": {"total_files": len(files), "files": files}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取上传历史失败: {str(e)}")


@router.get("/uploads/preview/{filename}")
async def preview_uploaded_file(filename: str) -> Dict[str, Any]:
    """预览上传的文件内容"""
    try:
        # 只允许预览4个已知文件
        ALLOWED = ["route.csv", "shipment.csv", "network.csv", "cooperation_parameter.csv"]
        if filename not in ALLOWED:
            raise HTTPException(status_code=404, detail=f"不允许预览的文件: {filename}")

        data_dir = Path(get_data_dir())
        file_path = data_dir / filename

        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"文件不存在: {filename}"
            )

        # 读取文件前几行进行预览
        preview_lines = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for i, line in enumerate(f):
                    if i >= 10:  # 最多显示10行
                        break
                    preview_lines.append(line.strip())
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"读取文件失败: {str(e)}"
            )

        # 从文件名确定文件类型
        if filename == "shipment.csv":
            file_type = "shipment"
        elif filename == "route.csv":
            file_type = "route"
        else:
            file_type = "unknown"

        return {
            "status": "success",
            "data": {
                "filename": filename,
                "file_type": file_type,
                "preview_lines": preview_lines,
                "total_lines": len(preview_lines),
                "file_path": str(file_path)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"预览文件失败: {str(e)}"
        )


@router.delete("/uploads/{filename}")
async def delete_uploaded_file(filename: str) -> Dict[str, Any]:
    """删除上传的文件"""
    try:
        # 只允许删除4个已知文件
        ALLOWED = ["route.csv", "shipment.csv", "network.csv", "cooperation_parameter.csv"]
        if filename not in ALLOWED:
            raise HTTPException(status_code=404, detail=f"不允许删除的文件: {filename}")

        data_dir = Path(get_data_dir())
        file_path = data_dir / filename

        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"文件不存在: {filename}"
            )

        # 删除文件
        file_path.unlink()

        # 清除上传记录
        import json as _json
        upload_record_path = data_dir / ".upload_records.json"
        if upload_record_path.exists():
            try:
                records = _json.loads(upload_record_path.read_text(encoding="utf-8"))
                records.pop(filename, None)
                upload_record_path.write_text(_json.dumps(records, ensure_ascii=False), encoding="utf-8")
            except Exception:
                pass

        # 清除服务缓存
        from ..services import data_service
        data_service.clear_cache()

        return {
            "status": "success",
            "message": f"文件 {filename} 删除成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"删除文件失败: {str(e)}"
        )
