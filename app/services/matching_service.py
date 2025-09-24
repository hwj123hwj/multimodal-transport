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
    
    def validate_matching(self, matching: StableMatching) -> Dict[str, Any]:
        """验证匹配的有效性
        
        Args:
            matching: 匹配对象
            
        Returns:
            Dict[str, Any]: 验证结果
        """
        # 检查匹配是否稳定
        is_stable = matching.is_stable
        
        # 检查匹配率
        matching_rate = matching.matching_rate
        
        # 检查迭代次数是否合理
        reasonable_iterations = matching.iteration_num < 1000
        
        # 检查CPU时间是否合理
        reasonable_time = matching.cpu_time < 3600  # 1小时
        
        return {
            'is_valid': is_stable and matching_rate > 0,
            'is_stable': is_stable,
            'matching_rate': matching_rate,
            'reasonable_iterations': reasonable_iterations,
            'reasonable_time': reasonable_time,
            'issues': [
                '匹配不稳定' if not is_stable else None,
                '匹配率为0' if matching_rate == 0 else None,
                '迭代次数过多' if not reasonable_iterations else None,
                '执行时间过长' if not reasonable_time else None
            ]
        }