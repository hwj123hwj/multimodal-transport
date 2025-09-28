"""
数据服务层
提供基础数据查询和统计服务
"""
import logging
from typing import Dict, Any, List, Optional

from ..services.data_loader import DataLoader

logger = logging.getLogger(__name__)


class DataService:
    """数据服务类"""

    def __init__(self, data_loader: DataLoader):
        """初始化数据服务
        
        Args:
            data_loader: 数据加载器实例
        """
        self.data_loader = data_loader
        self._cached_data = {}

    @staticmethod
    def get_all_network_nodes() -> Dict[str, Any]:
        """获取所有网络节点数据
        
        Returns:
            Dict[str, Any]: 网络节点数据
        """
        # 定义地名与编号的对应关系
        node_mapping = [
            {"name": "成都", "id": 0},
            {"name": "重庆", "id": 1},
            {"name": "贵阳", "id": 2},
            {"name": "怀化", "id": 3},
            {"name": "北部湾", "id": 4},
            {"name": "上海", "id": 5},
            {"name": "胡志明", "id": 6},
            {"name": "曼谷", "id": 7},
            {"name": "新加坡", "id": 8}
        ]

        return {
            "nodes_number": 9,
            "nodes": node_mapping
        }

    def get_all_shipments(self) -> Dict[str, Any]:
        """获取所有货物数据
        
        Returns:
            Dict[str, Any]: 货物数据
        """
        try:
            if 'shipments' not in self._cached_data:
                shipments = self.data_loader.load_shipments()
                self._cached_data['shipments'] = shipments

            shipments = self._cached_data['shipments']

            # 获取统计信息
            stats = shipments.get_statistics()

            # 获取所有货物详情
            all_shipments = []
            for shipment in shipments.shipments.values():
                all_shipments.append({
                    "shipment_id": shipment.shipment_id,
                    "origin_node": shipment.origin_node,
                    "destination_node": shipment.destination_node,
                    "demand": shipment.demand,
                    "weight": shipment.weight,
                    "volume": shipment.volume,
                    "priority": shipment.priority,
                    "status": shipment.status.value if hasattr(shipment.status, 'value') else str(shipment.status)
                })

            return {
                "total_count": stats["total_shipments"],
                "status_breakdown": stats.get("status_breakdown", stats.get("status_distribution", {})),
                "shipments": all_shipments
            }
        except Exception as e:
            logger.error(f"获取货物数据失败: {str(e)}")
            raise

    def get_all_routes(self) -> Dict[str, Any]:
        """获取所有路线数据

        Returns:
            Dict[str, Any]: 路线数据
        """
        try:
            if 'routes' not in self._cached_data:
                routes = self.data_loader.load_routes()
                self._cached_data['routes'] = routes

            routes = self._cached_data['routes']

            # 获取统计信息
            stats = routes.get_statistics()

            # 获取所有路线详情
            all_routes = []
            for route in routes.routes.values():
                all_routes.append({
                    "route_id": route.route_id,
                    "nodes": route.nodes,
                    "costs": route.costs,
                    "travel_times": route.travel_times,
                    "capacity": route.capacity,
                    "available_capacity": route.available_capacity,
                    "utilization_rate": route.utilization_rate,
                    "efficiency_score": route.efficiency_score
                })

            return {
                "total_count": stats["total_routes"],
                "capacity_stats": {
                    "total_capacity": stats["total_capacity"],
                    "avg_utilization": stats.get("average_utilization_rate", 0.0)
                },
                "routes": all_routes
            }
        except Exception as e:
            logger.error(f"获取路线数据失败: {str(e)}")
            raise

    def get_matching_results(self) -> Dict[str, Any]:
        """获取匹配结果数据
        
        Returns:
            Dict[str, Any]: 匹配结果数据
        """
        try:
            if 'matchings' not in self._cached_data:
                matchings = self.data_loader.load_matchings()
                self._cached_data['matchings'] = matchings

            matchings = self._cached_data['matchings']

            if not matchings:
                return {
                    "matching_count": 0,
                    "matchings": []
                }

            # 获取第一个匹配结果的详细信息
            matching = matchings[0]
            matching_dict = matching.to_dict()

            return {
                "matching_count": len(matchings),
                "matchings": [matching_dict]
            }
        except Exception as e:
            logger.error(f"获取匹配结果数据失败: {str(e)}")
            raise


    def search_shipments_by_destination(self, destination: str) -> List[Dict[str, Any]]:
        """按目的地搜索货物
        
        Args:
            destination: 目的地节点
            
        Returns:
            List[Dict[str, Any]]: 匹配的货物列表
        """
        try:
            shipments_data = self.get_all_shipments()

            matching_shipments = []
            for shipment in shipments_data["shipments"]:
                if shipment["destination_node"] == int(destination):
                    matching_shipments.append(shipment)

            return matching_shipments
        except Exception as e:
            logger.error(f"按目的地搜索货物失败: {str(e)}")
            raise

    def filter_routes_by_nodes(self, origin: Optional[str] = None,
                               destination: Optional[str] = None) -> List[Dict[str, Any]]:
        """按起点和终点筛选路线
        
        Args:
            origin: 起点节点（可选）
            destination: 终点节点（可选）
            
        Returns:
            List[Dict[str, Any]]: 匹配的路线列表
        """
        try:
            routes_data = self.get_all_routes()

            matching_routes = []
            for route in routes_data["routes"]:
                # 检查起点条件
                origin_match = not origin or (route["nodes"] and route["nodes"][0] == int(origin))
                # 检查终点条件
                dest_match = not destination or (route["nodes"] and route["nodes"][-1] == int(destination))

                if origin_match and dest_match:
                    matching_routes.append(route)

            return matching_routes
        except Exception as e:
            logger.error(f"按节点筛选路线失败: {str(e)}")
            raise

    def clear_cache(self):
        """清除缓存数据"""
        self._cached_data.clear()
        logger.info("数据服务缓存已清除")
