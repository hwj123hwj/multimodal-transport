"""
数据加载服务
用于从CSV文件加载各种数据模型
"""
import csv
import os
from typing import List, Dict, Any, Optional
from pathlib import Path

from ..models.shipment import Shipment, ShipmentCollection
from ..models.route import Route, RouteCollection
from ..models.network import Network
from ..models.matching import StableMatching


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
        self.network: Optional[Network] = None
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
    
    def load_routes(self, filename: str = "route.csv") -> RouteCollection:
        """加载路线数据
        
        Args:
            filename: CSV文件名
            
        Returns:
            RouteCollection: 路线集合
        """
        file_path = self.data_dir / filename
        
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")
        
        collection = RouteCollection()
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # 跳过第一行元数据
            next(reader)  # 跳过字段标题行
            
            for row in reader:
                if row:  # 跳过空行
                    try:
                        route = Route.from_csv_row(row)
                        if route:  # 确保route不是None
                            collection.add_route(route)
                    except Exception as e:
                        print(f"跳过无效行: {row[:3]}... 错误: {e}")
                        continue
        
        self.routes = collection
        return self.routes
    
    def load_network(self, filename: str = "network.csv") -> Network:
        """加载网络数据
        
        Args:
            filename: CSV文件名
            
        Returns:
            Network: 网络对象
        """
        file_path = self.data_dir / filename
        
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            rows = list(reader)
            
            if len(rows) < 3:
                raise ValueError("网络数据至少需要3行：节点数、站点列表、位置索引")
            
            # 第一行：节点数
            nodes_number = int(rows[0][1]) if rows[0][1].strip() else 9
            
            # 第二行：站点列表（跳过第一列标题）
            sites = []
            for i in range(1, len(rows[1])):
                site_val = rows[1][i].strip()
                if site_val and site_val != '':
                    try:
                        sites.append(int(site_val))
                    except ValueError:
                        continue
            
            # 第三行：位置索引（跳过第一列标题）
            location_indices = []
            for i in range(1, len(rows[2])):
                loc_val = rows[2][i].strip()
                if loc_val and loc_val != '':
                    try:
                        location_indices.append(int(loc_val))
                    except ValueError:
                        continue
            
            # 创建网络对象
            self.network = Network.from_csv_data(
                nodes_number=nodes_number,
                sites=sites,
                location_indices=location_indices
            )
            
        return self.network
    
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
        
        if self.network:
            summary['network'] = {
                'nodes': self.network.node_count,
                'sites': self.network.site_count,
                'max_site_id': self.network.max_site_id
            }
        
        if self.matchings:
            summary['matchings'] = {
                'total': len(self.matchings),
                'avg_matching_score': sum(m.matching_score for m in self.matchings) / len(self.matchings) if self.matchings else 0
            }
        
        return summary