"""
匹配服务
用于处理货物与路线的匹配逻辑
"""
from typing import List, Dict, Any, Optional

from .data_loader import DataLoader
from ..models.matching import StableMatching


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
