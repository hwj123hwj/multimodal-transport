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
    """上传数据文件

    Args:
        file: 上传的文件
        file_type: 文件类型 (shipment, route)
        description: 文件描述

    Returns:
        Dict[str, Any]: 上传结果信息
    """
    try:
        # 验证文件类型
        if file_type not in ["shipment", "route"]:
            raise HTTPException(
                status_code=400,
                detail=f"无效的文件类型: {file_type}. 支持的类型: shipment, route"
            )

        # 验证文件扩展名
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=400,
                detail="只支持CSV格式的文件"
            )

        # 固定文件名：route类型为route.csv，shipment类型为shipment.csv
        filename = f"{file_type}.csv"

        # 文件保存在data目录下（不是uploads子目录）
        data_dir = Path(get_data_dir())
        file_path = data_dir / filename

        # 保存文件（直接覆盖）
        contents = await file.read()
        print(f"保存文件到: {file_path}")
        print(f"文件大小: {len(contents)} 字节")
        with open(file_path, 'wb') as f:
            f.write(contents)

        # 确认文件已保存
        if file_path.exists():
            print(f"文件已成功保存，大小: {file_path.stat().st_size} 字节")
        else:
            print("文件保存失败！")

        # 验证文件内容格式
        try:
            if file_type == "shipment":
                # 验证货物文件格式 - 使用完整路径
                print(f"验证货物文件格式: {file_path}")
                data_loader.load_shipments(str(file_path.resolve()))  # 使用绝对路径
            elif file_type == "route":
                # 验证路线文件格式 - 使用完整路径
                print(f"验证路线文件格式: {file_path}")
                data_loader.load_routes(str(file_path.resolve()))  # 使用绝对路径
        except Exception as e:
            # 验证失败，删除文件
            print(f"文件验证失败: {e}")
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(
                status_code=400,
                detail=f"文件格式验证失败: {str(e)}"
            )

        # 记录真实上传时间
        import json as _json
        upload_record_path = data_dir / ".upload_records.json"
        upload_records: dict = {}
        if upload_record_path.exists():
            try:
                upload_records = _json.loads(upload_record_path.read_text(encoding="utf-8"))
            except Exception:
                upload_records = {}
        upload_records[filename] = datetime.now().isoformat()
        upload_record_path.write_text(_json.dumps(upload_records, ensure_ascii=False), encoding="utf-8")

        # 上传后清除服务缓存，确保下次读取新文件
        from ..services import data_service
        data_service.clear_cache()

        # 获取文件大小
        file_size = file_path.stat().st_size

        return {
            "status": "success",
            "message": "文件上传成功",
            "data": {
                "filename": filename,
                "original_filename": file.filename,
                "file_type": file_type,
                "file_size": file_size,
                "file_path": str(file_path),
                "upload_time": datetime.now().isoformat(),
                "description": description
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"文件上传失败: {str(e)}"
        )


@router.get("/uploads")
async def get_upload_history() -> Dict[str, Any]:
    """获取上传历史记录（只显示用户实际上传过的文件）"""
    try:
        data_dir = Path(get_data_dir())
        # 用一个 JSON 记录文件追踪真实上传时间，避免用文件系统mtime
        upload_record_path = data_dir / ".upload_records.json"
        upload_records: dict = {}
        if upload_record_path.exists():
            import json
            try:
                upload_records = json.loads(upload_record_path.read_text(encoding="utf-8"))
            except Exception:
                upload_records = {}

        files = []
        for file_type, filename in [("route", "route.csv"), ("shipment", "shipment.csv")]:
            file_path = data_dir / filename
            # 只有在上传记录里才算用户上传过
            if file_path.exists() and filename in upload_records:
                try:
                    stat = file_path.stat()
                    files.append({
                        "filename": filename,
                        "file_type": file_type,
                        "file_size": stat.st_size,
                        "upload_time": upload_records[filename],
                        "file_path": str(file_path)
                    })
                except Exception as e:
                    print(f"处理文件 {file_path} 时出错: {e}")
                    continue

        return {
            "status": "success",
            "data": {
                "total_files": len(files),
                "files": files
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取上传历史失败: {str(e)}"
        )


@router.get("/uploads/preview/{filename}")
async def preview_uploaded_file(filename: str) -> Dict[str, Any]:
    """预览上传的文件内容"""
    try:
        # 只允许预览固定的两个文件
        if filename not in ["route.csv", "shipment.csv"]:
            raise HTTPException(
                status_code=404,
                detail=f"不允许预览的文件: {filename}"
            )

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
        # 只允许删除固定的两个文件
        if filename not in ["route.csv", "shipment.csv"]:
            raise HTTPException(
                status_code=404,
                detail=f"不允许删除的文件: {filename}"
            )

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
