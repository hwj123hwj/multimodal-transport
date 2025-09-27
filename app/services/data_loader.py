"""
数据加载服务
用于从CSV文件加载各种数据模型
"""
import csv
from pathlib import Path
from typing import List, Dict, Any, Optional

from ..models.matching import StableMatching
from ..models.route import Route
from ..models.shipment import Shipment, ShipmentCollection


class DataLoader:
    """数据加载器类"""

    def __init__(self, data_dir: str = "data"):
        """初始化数据加载器
        
        Args:
            data_dir: 数据目录路径
        """
        self.data_dir = Path(data_dir)
        self.shipments: Optional[ShipmentCollection] = None
        self.routes: Optional[List[Route]] = None
        self.matchings: Optional[List[StableMatching]] = None

    def load_shipments(self, filename: str = "shipment.csv") -> ShipmentCollection:
        """加载货物数据

        Args:
            filename: CSV文件名

        Returns:
            ShipmentCollection: 货物集合
        """
        file_path = self.data_dir / filename

        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        collection = ShipmentCollection()
        with open(file_path, 'r', encoding='utf-8') as file:
            # 跳过第一行（元数据）
            next(file)
            reader = csv.DictReader(file)
            for row in reader:
                try:
                    shipment = Shipment.from_csv_row(row)
                    collection.add_shipment(shipment)
                except Exception as e:
                    print(f"跳过无效行: {row} 错误: {e}")
                    continue

        self.shipments = collection
        return self.shipments

    def load_routes(self, filename: str = "route.csv") -> Route:
        """加载路线数据

        Args:
            filename: CSV文件名

        Returns:
            Route: 路线对象
        """
        file_path = self.data_dir / filename

        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # 跳过第一行元数据
            next(reader)  # 跳过字段标题行

            for row in reader:
                if row:  # 跳过空行
                    try:
                        route = Route.from_csv_row(row)
                        if route:  # 确保route不是None
                            self.routes = route
                            return route
                    except Exception as e:
                        print(f"跳过无效行: {row[:3]}... 错误: {e}")
                        continue

        # 如果没有找到有效的路线，返回None或抛出异常
        raise ValueError("未找到有效的路线数据")

    def load_matchings(self, filename: str = "stable_matching.csv") -> List[StableMatching]:
        """加载稳定匹配数据
        
        Args:
            filename: CSV文件名
            
        Returns:
            List[StableMatching]: 匹配列表
        """
        file_path = self.data_dir / filename

        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        matchings = []
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            rows = list(reader)

            if len(rows) < 9:  # 至少需要9行数据
                raise ValueError("CSV文件格式不正确，至少需要9行数据")

            # 行1: 货物索引（Shipment,1,2,3...）
            shipment_row = rows[0]
            # 行2: 路线分配（Route,10,10,4...）
            route_row = rows[1]
            # 行3-9: 统计信息
            statistics_rows = rows[2:9]

            try:
                matching = StableMatching.from_csv_rows(shipment_row, route_row, statistics_rows)
                matchings.append(matching)
            except Exception as e:
                print(f"解析匹配数据失败: {e}")
                raise

        self.matchings = matchings
        return self.matchings

    def load_all(self) -> Dict[str, Any]:
        """加载所有数据
        
        Returns:
            Dict[str, Any]: 包含所有数据的字典
        """
        return {
            'shipments': self.load_shipments(),
            'routes': self.load_routes(),
            'network': self.load_network(),
            'matchings': self.load_matchings()
        }

    def get_summary(self) -> Dict[str, Any]:
        """获取数据加载摘要
        
        Returns:
            Dict[str, Any]: 数据摘要信息
        """
        summary = {}

        if self.shipments:
            summary['shipments'] = {
                'total': len(self.shipments.shipments),
                'by_status': self.shipments.get_status_summary(),
                'total_demand': sum(s.demand for s in self.shipments.shipments)
            }

        if self.routes:
            summary['routes'] = {
                'total': len(self.routes),
                'avg_capacity': sum(r.capacity for r in self.routes) / len(self.routes) if self.routes else 0
            }

        if self.matchings:
            summary['matchings'] = {
                'total': len(self.matchings),
                'avg_matching_score': sum(m.matching_score for m in self.matchings) / len(
                    self.matchings) if self.matchings else 0
            }

        return summary
