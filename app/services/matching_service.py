"""
匹配服务
用于处理货物与路线的匹配逻辑
"""
from typing import List, Dict, Any, Optional
from ..models.shipment import Shipment, ShipmentCollection
from ..models.route import Route
from ..models.matching import StableMatching
from .data_loader import DataLoader


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
        
        for matching in self.matchings:
            if matching.shipment.shipment_id == shipment_id:
                return matching.to_dict()
        
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
        
        return [
            matching.to_dict() 
            for matching in self.matchings 
            if matching.route.route_id == route_id
        ]
    
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
                'avg_matching_score': 0,
                'total_demand': 0,
                'total_capacity': 0
            }
        
        total_demand = sum(m.shipment.demand for m in self.matchings)
        total_capacity = sum(m.route.capacity for m in self.matchings)
        avg_score = sum(m.matching_score for m in self.matchings) / len(self.matchings)
        
        return {
            'total_matchings': len(self.matchings),
            'avg_matching_score': round(avg_score, 2),
            'total_demand': total_demand,
            'total_capacity': total_capacity,
            'utilization_rate': round(total_demand / total_capacity * 100, 2) if total_capacity > 0 else 0
        }
    
    def validate_matching(self, matching: StableMatching) -> Dict[str, Any]:
        """验证匹配的有效性
        
        Args:
            matching: 匹配对象
            
        Returns:
            Dict[str, Any]: 验证结果
        """
        shipment = matching.shipment
        route = matching.route
        
        # 检查容量约束
        capacity_ok = shipment.demand <= route.capacity
        
        # 检查路线是否包含起点和终点
        route_nodes = set(route.nodes)
        route_ok = (shipment.origin_node in route_nodes and 
                   shipment.destination_node in route_nodes)
        
        # 检查时间约束（简化版本）
        time_ok = True  # 这里可以添加更复杂的时间约束检查
        
        return {
            'is_valid': capacity_ok and route_ok and time_ok,
            'capacity_ok': capacity_ok,
            'route_ok': route_ok,
            'time_ok': time_ok,
            'issues': [
                '货物需求超过路线容量' if not capacity_ok else None,
                '路线不包含货物起点或终点' if not route_ok else None,
                '时间约束不满足' if not time_ok else None
            ]
        }