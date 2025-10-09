"""
匹配服务
用于处理货物与路线的匹配逻辑
"""
import logging
import subprocess
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

from .data_loader import DataLoader
from ..models.matching import StableMatching

logger = logging.getLogger(__name__)


class MatchingService:
    """匹配服务类"""

    def __init__(self, data_loader: DataLoader):
        """初始化匹配服务
        
        Args:
            data_loader: 数据加载器实例
        """
        self.data_loader = data_loader
        self.matchings: Optional[List[StableMatching]] = None

    def load_matchings(self) -> List[StableMatching]:
        """加载匹配数据
        
        Returns:
            List[StableMatching]: 匹配列表
        """
        self.matchings = self.data_loader.load_matchings()
        return self.matchings

    def get_all_matchings(self) -> List[Dict[str, Any]]:
        """获取所有匹配结果
        
        Returns:
            List[Dict[str, Any]]: 匹配结果列表
        """
        if not self.matchings:
            self.load_matchings()

        return [matching.to_dict() for matching in self.matchings] if self.matchings else []

    def get_matching_by_shipment(self, shipment_id: int) -> Optional[Dict[str, Any]]:
        """根据货物ID获取匹配结果
        
        Args:
            shipment_id: 货物ID
            
        Returns:
            Optional[Dict[str, Any]]: 匹配结果或None
        """
        if not self.matchings:
            self.load_matchings()

        if not self.matchings:
            return None

        # 在StableMatching中查找货物分配
        for matching in self.matchings:
            if shipment_id in matching.shipment_indices:
                index = matching.shipment_indices.index(shipment_id)
                assigned_route = matching.route_assignments[index]
                return {
                    'shipment_id': shipment_id,
                    'assigned_route': assigned_route,
                    'matching_rate': matching.matching_rate,
                    'is_stable': matching.is_stable
                }

        return None

    def get_matching_by_route(self, route_id: int) -> List[Dict[str, Any]]:
        """根据路线ID获取匹配结果
        
        Args:
            route_id: 路线ID
            
        Returns:
            List[Dict[str, Any]]: 匹配结果列表
        """
        if not self.matchings:
            self.load_matchings()

        if not self.matchings:
            return []

        result = []
        for matching in self.matchings:
            # 查找使用该路线的所有货物
            shipments_on_route = matching.get_matches_by_route(route_id)
            if shipments_on_route:
                result.append({
                    'route_id': route_id,
                    'shipments': shipments_on_route,
                    'matching_rate': matching.matching_rate,
                    'is_stable': matching.is_stable
                })

        return result

    def get_matching_summary(self) -> Dict[str, Any]:
        """获取匹配摘要信息
        
        Returns:
            Dict[str, Any]: 摘要信息
        """
        if not self.matchings:
            self.load_matchings()

        if not self.matchings:
            return {
                'total_matchings': 0,
                'avg_matching_rate': 0,
                'total_shipments': 0,
                'matched_shipments': 0,
                'unmatched_shipments': 0,
                'avg_cpu_time': 0
            }

        total_shipments = sum(m.total_shipments for m in self.matchings)
        matched_shipments = sum(m.matched_shipments for m in self.matchings)
        avg_matching_rate = sum(m.matching_rate for m in self.matchings) / len(self.matchings)
        avg_cpu_time = sum(m.cpu_time for m in self.matchings) / len(self.matchings)

        return {
            'total_matchings': len(self.matchings),
            'avg_matching_rate': round(avg_matching_rate, 4),
            'total_shipments': total_shipments,
            'matched_shipments': matched_shipments,
            'unmatched_shipments': total_shipments - matched_shipments,
            'avg_cpu_time': round(avg_cpu_time, 2)
        }

    def execute_matching_algorithm(self) -> Dict[str, Any]:
        """执行匹配算法

        Returns:
            Dict[str, Any]: 执行结果
        """
        try:
            # 获取数据目录路径
            data_dir = Path(self.data_loader.data_dir)

            # 检查必要的输入文件是否存在
            route_file = data_dir / "route.csv"
            shipment_file = data_dir / "shipment.csv"
            data_network_file = "data/network.csv"
            data_cooperation_file = "data/cooperation_parameter.csv"

            if not route_file.exists():
                raise FileNotFoundError(f"路线数据文件不存在: {route_file}")

            if not shipment_file.exists():
                raise FileNotFoundError(f"货物数据文件不存在: {shipment_file}")

            # 构建可执行文件路径
            exe_path = Path("cmake-build-debug") / "stable_match.exe"
            if not exe_path.exists():
                raise FileNotFoundError(f"算法可执行文件不存在: {exe_path}")

            # 构建输出文件路径 - C++程序输出到cmake-build-debug/result目录
            output_file = Path("cmake-build-debug") / "result" / "stable_matching.csv"

            # 执行算法
            process = subprocess.Popen(
                [str(exe_path), str(data_network_file), str(shipment_file), str(route_file),
                 str(data_cooperation_file), str(output_file)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=Path.cwd()  # 确保在工作目录执行
            )

            # 等待进程完成并获取输出
            stdout, stderr = process.communicate()

            # 记录算法执行输出，用于调试
            logger.info(f"算法执行返回码: {process.returncode}")
            if stdout:
                logger.info(f"算法标准输出: {stdout}")
            if stderr:
                logger.info(f"算法错误输出: {stderr}")

            # 基于返回码判断执行是否成功
            if process.returncode != 0:
                error_details = stderr if stderr else stdout
                raise RuntimeError(
                    f"算法执行失败，返回码: {process.returncode}, 错误信息: {error_details}")

            # 等待输出文件生成（增加容错机制）
            max_wait_time = 300  # 最大等待时间（秒）
            check_interval = 1  # 检查间隔（秒）
            elapsed_time = 0

            while elapsed_time < max_wait_time:
                if output_file.exists():
                    break
                time.sleep(check_interval)
                elapsed_time += check_interval
            else:
                # 超时处理
                error_details = stderr if stderr else stdout
                raise RuntimeError(
                    f"算法输出文件未生成或生成超时。返回码: {process.returncode}, 详细信息: {error_details}")

            logger.info(f"算法执行完成，输出文件已生成: {output_file}")

            # 重新加载匹配结果
            self.load_matchings()

            # 获取执行统计信息
            summary = self.get_matching_summary()

            return {
                "status": "success",
                "message": "算法执行成功",
                "output_file": str(output_file),
                "summary": summary,
                "algorithm_output": stdout if stdout else "",
                "return_code": process.returncode
            }

        except FileNotFoundError as e:
            raise RuntimeError(f"文件缺失: {str(e)}")
        except subprocess.SubprocessError as e:
            raise RuntimeError(f"算法执行错误: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"执行匹配算法失败: {str(e)}")
