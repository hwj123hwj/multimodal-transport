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

        # 城市坐标信息（直接在程序中定义）
        self.city_coordinates = {
            0: {"name": "成都", "longitude": 104.0668, "latitude": 30.5728},
            1: {"name": "重庆", "longitude": 106.5516, "latitude": 29.5630},
            2: {"name": "贵阳", "longitude": 106.7074, "latitude": 26.5982},
            3: {"name": "怀化", "longitude": 110.0016, "latitude": 27.5501},
            4: {"name": "北部湾", "longitude": 108.3277, "latitude": 21.9733},
            5: {"name": "上海", "longitude": 121.4737, "latitude": 31.2304},
            6: {"name": "胡志明", "longitude": 106.6951, "latitude": 10.8231},
            7: {"name": "曼谷", "longitude": 100.5018, "latitude": 13.7563},
            8: {"name": "新加坡", "longitude": 103.8198, "latitude": 1.3521}
        }

    def get_all_network_nodes(self) -> Dict[str, Any]:
        """获取所有网络节点数据（包含经纬度）

        Returns:
            Dict[str, Any]: 网络节点数据
        """
        # 构建包含经纬度的节点信息
        nodes = []
        for node_id, coord_info in self.city_coordinates.items():
            nodes.append({
                "id": node_id,
                "name": coord_info["name"],
                "longitude": coord_info["longitude"],
                "latitude": coord_info["latitude"]
            })

        return {
            "nodes_number": len(nodes),
            "nodes": nodes
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

            # 获取所有货物详情（包含经纬度信息）
            all_shipments = []
            for shipment in shipments.shipments.values():
                origin_coord = self.city_coordinates.get(shipment.origin_node, {})
                dest_coord = self.city_coordinates.get(shipment.destination_node, {})

                all_shipments.append({
                    "shipment_id": shipment.shipment_id,
                    "origin_node": shipment.origin_node,
                    "origin_city": origin_coord.get("name", f"未知城市({shipment.origin_node})"),
                    "origin_longitude": origin_coord.get("longitude"),
                    "origin_latitude": origin_coord.get("latitude"),
                    "destination_node": shipment.destination_node,
                    "destination_city": dest_coord.get("name", f"未知城市({shipment.destination_node})"),
                    "destination_longitude": dest_coord.get("longitude"),
                    "destination_latitude": dest_coord.get("latitude"),
                    "demand": shipment.demand,
                    "weight": shipment.weight,
                    "volume": shipment.volume,
                    "time_value": shipment.time_value
                })

            return {
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

            # 获取所有路线详情（包含经纬度信息）
            all_routes = []
            for route in routes.routes.values():
                # 构建包含经纬度的节点信息
                node_details = []
                for node_id in route.nodes:
                    coord_info = self.city_coordinates.get(node_id, {})
                    node_details.append({
                        "node_id": node_id,
                        "city_name": coord_info.get("name", f"未知城市({node_id})"),
                        "longitude": coord_info.get("longitude"),
                        "latitude": coord_info.get("latitude")
                    })

                # 计算路线的地理距离（基于经纬度）
                total_distance = self._calculate_route_distance(node_details)

                all_routes.append({
                    "route_id": route.route_id,
                    "nodes": [self.city_coordinates.get(node_id, {}).get("name", f"未知城市({node_id})") for node_id in
                              route.nodes],
                    "node_details": node_details,
                    "costs": route.costs,
                    "travel_times": route.travel_times,
                    "total_travel_time": route.total_travel_time,
                    "total_cost": route.total_cost,
                    "total_distance": total_distance,
                    "capacity": route.capacity,
                    "route_category": route.route_category
                })

            return {
                "routes": all_routes
            }
        except Exception as e:
            logger.error(f"获取路线数据失败: {str(e)}")
            raise

    def get_matching_results(self) -> Dict[str, Any]:
        """获取匹配结果数据（包含经纬度信息）

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

            # 确保货物数据已加载
            if 'shipments' not in self._cached_data:
                self._cached_data['shipments'] = self.data_loader.load_shipments()
            shipments_data = self._cached_data['shipments']

            # 为匹配结果添加地理信息
            enriched_shipments = []
            for shipment_info in matching_dict.get('shipments', []):
                shipment_id = shipment_info.get('shipment_id')
                assigned_route = shipment_info.get('assigned_route')

                # 获取货物信息以添加地理坐标
                if shipments_data and shipment_id in shipments_data.shipments:
                    shipment = shipments_data.shipments[shipment_id]
                    origin_coord = self.city_coordinates.get(shipment.origin_node, {})
                    dest_coord = self.city_coordinates.get(shipment.destination_node, {})

                    enriched_shipments.append({
                        "shipment_id": shipment_id,
                        "assigned_route": assigned_route,
                        "origin_node": shipment.origin_node,
                        "origin_city": origin_coord.get("name"),
                        "origin_longitude": origin_coord.get("longitude"),
                        "origin_latitude": origin_coord.get("latitude"),
                        "destination_node": shipment.destination_node,
                        "destination_city": dest_coord.get("name"),
                        "destination_longitude": dest_coord.get("longitude"),
                        "destination_latitude": dest_coord.get("latitude"),
                        "demand": shipment.demand,
                        "time_value": shipment.time_value
                    })
                else:
                    enriched_shipments.append(shipment_info)

            matching_dict['shipments'] = enriched_shipments

            return {
                "matching_count": len(matchings),
                "matchings": [matching_dict]
            }
        except Exception as e:
            logger.error(f"获取匹配结果数据失败: {str(e)}")
            raise

    def _calculate_route_distance(self, node_details: List[Dict[str, Any]]) -> float:
        """计算路线的地理距离（基于经纬度，使用Haversine公式）

        Args:
            node_details: 包含经纬度的节点详情列表

        Returns:
            float: 总距离（公里）
        """
        import math

        if len(node_details) < 2:
            return 0.0

        total_distance = 0.0

        for i in range(len(node_details) - 1):
            current = node_details[i]
            next_node = node_details[i + 1]

            # 获取经纬度
            lat1, lon1 = current.get("latitude"), current.get("longitude")
            lat2, lon2 = next_node.get("latitude"), next_node.get("longitude")

            if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
                continue

            # 转换为弧度
            lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

            # Haversine公式
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
            c = 2 * math.asin(math.sqrt(a))

            # 地球半径（公里）
            r = 6371
            distance = c * r

            total_distance += distance

        return round(total_distance, 2)

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

            # 获取城市映射
            network_nodes = self.get_all_network_nodes()
            node_mapping = {node["id"]: node["name"] for node in network_nodes["nodes"]}

            # 为匹配的货物添加城市名称和经纬度信息
            for shipment in matching_shipments:
                origin_coord = self.city_coordinates.get(shipment["origin_node"], {})
                dest_coord = self.city_coordinates.get(shipment["destination_node"], {})

                shipment["origin_city"] = origin_coord.get("name", f"未知城市({shipment['origin_node']})")
                shipment["origin_longitude"] = origin_coord.get("longitude")
                shipment["origin_latitude"] = origin_coord.get("latitude")
                shipment["destination_city"] = dest_coord.get("name", f"未知城市({shipment['destination_node']})")
                shipment["destination_longitude"] = dest_coord.get("longitude")
                shipment["destination_latitude"] = dest_coord.get("latitude")

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
                # 检查起点条件 - 比较城市名称而不是节点ID
                origin_match = not origin or (route["nodes"] and route["nodes"][0] == origin)
                # 检查终点条件 - 比较城市名称而不是节点ID
                dest_match = not destination or (route["nodes"] and route["nodes"][-1] == destination)

                if origin_match and dest_match:
                    matching_routes.append(route)

            # 按利用率降序排序，优先展示高利用率路线
            matching_routes.sort(key=lambda r: r.get("utilization_rate", 0), reverse=True)
            return matching_routes
        except Exception as e:
            logger.error(f"按节点筛选路线失败: {str(e)}")
            raise

    def get_route_by_id(self, route_id: int) -> Optional[Dict[str, Any]]:
        """根据路线ID获取单条路线详情

        Args:
            route_id: 路线ID

        Returns:
            Optional[Dict[str, Any]]: 路线详情数据，如果不存在返回None
        """
        try:
            routes_data = self.get_all_routes()

            for route in routes_data["routes"]:
                if route["route_id"] == route_id:
                    return route

            return None
        except Exception as e:
            logger.error(f"根据路线ID获取路线详情失败: {str(e)}")
            raise

    def clear_cache(self):
        """清除缓存数据"""
        self._cached_data.clear()
        logger.info("数据服务缓存已清除")
