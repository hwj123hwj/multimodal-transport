"""
基础数据API路由
提供网络、货物、路线、匹配等基础数据的REST API接口，以及文件上传功能
"""
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from ..config import get_data_dir
from ..services.data_loader import DataLoader
from ..services.data_service import DataService

# 创建路由实例
router = APIRouter(prefix="/api", tags=["data"])

# 初始化服务和数据加载器 - 使用配置中的数据目录
data_loader = DataLoader(get_data_dir())
data_service = DataService(data_loader)


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

        # 生成唯一文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_id = str(uuid.uuid4())[:8]
        filename = f"{file_type}_{timestamp}_{file_id}.csv"

        # 确保上传目录存在
        upload_dir = Path(get_data_dir()) / "uploads"
        upload_dir.mkdir(exist_ok=True)

        file_path = upload_dir / filename

        # 保存文件
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

        # 获取文件大小
        file_size = file_path.stat().st_size

        return {
            "status": "success",
            "message": "文件上传成功",
            "data": {
                "file_id": file_id,
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
    """获取上传历史记录"""
    try:
        upload_dir = Path(get_data_dir()) / "uploads"

        if not upload_dir.exists():
            return {
                "status": "success",
                "data": {
                    "total_files": 0,
                    "files": []
                }
            }

        files = []
        for file_path in upload_dir.glob("*.csv"):
            try:
                stat = file_path.stat()
                filename = file_path.name

                # 从文件名解析文件类型
                if filename.startswith("shipment"):
                    file_type = "shipment"
                elif filename.startswith("route"):
                    file_type = "route"
                else:
                    file_type = "unknown"

                files.append({
                    "filename": filename,
                    "file_type": file_type,
                    "file_size": stat.st_size,
                    "upload_time": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "file_path": str(file_path)
                })
            except Exception as e:
                print(f"处理文件 {file_path} 时出错: {e}")
                continue

        # 按上传时间排序（最新的在前）
        files.sort(key=lambda x: x["upload_time"], reverse=True)

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
        upload_dir = Path(get_data_dir()) / "uploads"
        file_path = upload_dir / filename

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

        # 从文件名解析文件类型
        if filename.startswith("shipment"):
            file_type = "shipment"
        elif filename.startswith("route"):
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
        upload_dir = Path(get_data_dir()) / "uploads"
        file_path = upload_dir / filename

        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"文件不存在: {filename}"
            )

        # 删除文件
        file_path.unlink()

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
