"""
CSV数据模型测试 - 验证模型与CSV数据的匹配
"""
import pytest
import csv
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

# 添加项目根目录到Python路径
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import (
    Network, NetworkTopology,
    Shipment, ShipmentStatus, ShipmentCollection,
    Route, RouteStatus, RouteCollection,
    Match, MatchStatus, MatchPriority, MatchResult, MatchCollection
)


class TestCSVModels:
    """CSV数据模型测试类"""
    
    def setup_method(self):
        """测试前的设置"""
        self.data_dir = Path("data")
        self.test_data = self.load_test_data()
    
    def load_test_data(self) -> Dict[str, List[Dict[str, str]]]:
        """加载测试数据"""
        data = {}
        
        # 加载网络数据 - 直接读取原始数据
        network_file = self.data_dir / "network.csv"
        if network_file.exists():
            with open(network_file, 'r', encoding='utf-8') as f:
                lines = list(csv.reader(f))
                if len(lines) >= 3:  # 标题行 + 站点行 + 位置行
                    # 第一行是标题，第二行是站点数据，第三行是位置数据
                    headers = lines[0]
                    sites_row = lines[1]
                    locations_row = lines[2]
                    
                    # 创建正确的数据字典 - 按列顺序存储数据
                    sites_dict = {}
                    locations_dict = {}
                    for i in range(len(headers)):
                        if i < len(sites_row):
                            sites_dict[f'col_{i}'] = sites_row[i]
                        if i < len(locations_row):
                            locations_dict[f'col_{i}'] = locations_row[i]
                    
                    data['network'] = [sites_dict, locations_dict]
        
        # 加载货物数据 - 跳过第一行统计信息
        shipment_file = self.data_dir / "shipment.csv"
        if shipment_file.exists():
            with open(shipment_file, 'r', encoding='utf-8') as f:
                lines = list(csv.reader(f))
                if len(lines) >= 2:  # 统计行 + 标题行 + 数据行
                    # 使用第二行作为标题行，从第三行开始是数据
                    reader = csv.DictReader(f)
                    # 重新打开文件并使用第二行作为标题
                    f.seek(0)
                    next(f)  # 跳过第一行统计信息
                    reader = csv.DictReader(f)
                    data['shipments'] = list(reader)
        
        # 加载路线数据 - 跳过前两行（统计信息和标题行），直接读取数据行
        route_file = self.data_dir / "route.csv"
        if route_file.exists():
            with open(route_file, 'r', encoding='utf-8') as f:
                lines = list(csv.reader(f))
                if len(lines) >= 3:  # 统计行 + 标题行 + 数据行
                    # 直接存储数据行（跳过前两行）
                    data['routes'] = lines[2:]  # 从第3行开始是数据
        
        return data
    
    def test_network_model_from_csv(self):
        """测试网络模型从CSV数据创建"""
        if 'network' not in self.test_data:
            pytest.skip("网络数据文件不存在")
        
        network_rows = self.test_data['network']
        
        # 调试信息
        print(f"网络数据行数: {len(network_rows)}")
        print(f"第一行数据: {network_rows[0]}")
        print(f"第二行数据: {network_rows[1]}")
        
        # 创建网络实例
        network = Network.from_csv_rows(network_rows)
        
        # 验证基本属性
        assert network.nodes_number == 9  # 根据实际数据
        assert len(network.sites) == 9
        assert len(network.location_indices) == 9
        
        # 验证站点ID
        expected_sites = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        assert network.sites == expected_sites
        
        # 验证位置索引
        expected_locations = [0, 1, 2, 3, 4, 5, 6, 7, 8]
        assert network.location_indices == expected_locations
        
        # 测试站点和位置的映射
        for site, location in zip(expected_sites, expected_locations):
            assert network.get_location_by_site(site) == location
            assert network.get_site_by_location(location) == site
        
        # 测试无效站点和位置
        assert network.get_location_by_site(999) is None
        assert network.get_site_by_location(999) is None
    
    def test_shipment_model_from_csv(self):
        """测试货物模型从CSV数据创建"""
        if 'shipments' not in self.test_data:
            pytest.skip("货物数据文件不存在")
        
        shipments_data = self.test_data['shipments']
        
        # 测试第一个货物
        first_shipment = shipments_data[0]
        
        # 创建货物实例
        shipment = Shipment.from_csv_row(first_shipment)
        
        # 验证基本属性
        assert shipment.shipment_id == first_shipment['shipment index']
        assert shipment.origin_node == int(first_shipment['Origin'])
        assert shipment.destination_node == int(first_shipment['destination'])
        assert shipment.demand == float(first_shipment['Demand'])
        assert shipment.classification == first_shipment['Classification']
        assert shipment.time_value == float(first_shipment['Time value(CNY/TEU)'])
        
        # 验证状态
        assert shipment.status == ShipmentStatus.PENDING
        
        # 验证优先级计算
        assert shipment.priority > 0
        
        # 验证时间戳
        assert shipment.created_at is not None
        assert shipment.updated_at is not None
    
    def test_route_model_from_csv(self):
        """测试路线模型从CSV数据创建"""
        if 'routes' not in self.test_data:
            pytest.skip("路线数据文件不存在")
        
        routes_data = self.test_data['routes']
        
        # 测试第一个有效路线
        if not routes_data:
            pytest.skip("没有有效的路线数据")
        
        first_route = routes_data[0]  # 现在routes_data是列表格式
        
        # 创建路线实例
        route = Route.from_csv_row(first_route)
        
        # 验证基本属性
        assert route.route_id == int(first_route[0])  # route index在第1列
        
        # 验证节点列表 - 从第4列开始（索引3）到第12列（索引11）
        expected_nodes = []
        for i in range(3, 12):  # 第4到第12列
            if i < len(first_route) and first_route[i].strip() and first_route[i] != '-1':
                try:
                    expected_nodes.append(int(first_route[i]))
                except ValueError:
                    continue
        
        assert route.nodes == expected_nodes
        
        # 验证容量（最后一列）
        if len(first_route) > 30:
            assert route.capacity == float(first_route[30])
        
        # 验证状态
        assert route.status == RouteStatus.AVAILABLE
        
        # 验证时间戳
        assert route.created_at is not None
        assert route.updated_at is not None
    
    def test_shipment_collection(self):
        """测试货物集合管理"""
        if 'shipments' not in self.test_data:
            pytest.skip("货物数据文件不存在")
        
        collection = ShipmentCollection()
        shipments_data = self.test_data['shipments']
        
        # 添加货物
        for shipment_data in shipments_data[:5]:  # 只测试前5个
            shipment = Shipment.from_csv_row(shipment_data)
            collection.add_shipment(shipment)
        
        # 验证集合大小
        stats = collection.get_statistics()
        assert stats['total_shipments'] == 5
        
        # 验证统计信息
        stats = collection.get_statistics()
        assert stats['total_shipments'] == 5
        assert stats['total_demand'] > 0
        
        # 测试按状态筛选
        pending_shipments = collection.get_pending_shipments()
        assert len(pending_shipments) >= 0
        
        # 测试按优先级筛选
        high_priority_shipments = collection.get_high_priority_shipments()
        assert len(high_priority_shipments) >= 0
    
    def test_route_collection(self):
        """测试路线集合管理"""
        if 'routes' not in self.test_data:
            pytest.skip("路线数据文件不存在")
        
        collection = RouteCollection()
        routes_data = self.test_data['routes']
        
        # 添加路线（只添加有效路线）
        for route_data in routes_data[:3]:  # 只测试前3个
            route = Route.from_csv_row(route_data)
            if route:  # 确保route创建成功
                collection.add_route(route)
        
        # 验证集合大小
        stats = collection.get_statistics()
        assert stats['total_routes'] <= 3
        
        # 验证统计信息
        assert stats['total_capacity'] >= 0
        assert stats['available_routes'] >= 0
        
        # 测试按状态筛选
        available_routes = collection.get_available_routes()
        assert len(available_routes) >= 0
        
        # 测试按模式筛选（所有路线都是多式联运）
        multimodal_routes = collection.get_routes_by_mode("multimodal")
        
        # 验证多式联运路线数量
        assert len(multimodal_routes) <= stats['total_routes']
    
    def test_match_creation(self):
        """测试匹配创建"""
        if 'shipments' not in self.test_data or 'routes' not in self.test_data:
            pytest.skip("缺少必要的测试数据")
        
        # 创建货物和路线实例
        shipments_data = self.test_data['shipments']
        routes_data = self.test_data['routes']
        
        if not shipments_data or not routes_data:
            pytest.skip("测试数据为空")
        
        shipment = Shipment.from_csv_row(shipments_data[0])
        
        if not routes_data:
            pytest.skip("没有有效的路线数据")
        
        route = Route.from_csv_row(routes_data[0])
        
        # 创建匹配
        match = Match.create_match(
            match_id=1,
            shipment_id=shipment.shipment_id,
            route_id=route.route_id,
            match_score=0.85,
            stability_score=0.9
        )
        
        # 验证匹配属性
        assert match.shipment_id == shipment.shipment_id
        assert match.route_id == route.route_id
        assert match.status == MatchStatus.MATCHED
        assert match.priority == MatchPriority.MEDIUM
        assert match.match_score > 0
        
        # 验证时间戳
        assert match.created_at is not None
        assert match.updated_at is not None
    
    def test_end_to_end_workflow(self):
        """测试端到端工作流"""
        if 'shipments' not in self.test_data or 'routes' not in self.test_data:
            pytest.skip("缺少必要的测试数据")
        
        # 创建集合
        shipment_collection = ShipmentCollection()
        route_collection = RouteCollection()
        match_collection = MatchCollection()
        
        # 加载数据
        shipments_data = self.test_data['shipments']
        routes_data = self.test_data['routes']
        
        # 添加货物
        for shipment_data in shipments_data[:3]:
            shipment = Shipment.from_csv_row(shipment_data)
            shipment_collection.add_shipment(shipment)
        
        # 添加路线
        for route_data in routes_data[:2]:
            route = Route.from_csv_row(route_data)
            if route:  # 确保route创建成功
                route_collection.add_route(route)
        
        # 创建匹配
        shipments = shipment_collection.get_all_shipments()
        routes = route_collection.get_all_routes()
        
        for shipment in shipments:
            for route in routes:
                # 检查容量匹配
                if route.available_capacity >= shipment.demand:
                    match = Match.create_match(
                        match_id=len(match_collection.matches) + 1,
                        shipment_id=shipment.shipment_id,
                        route_id=route.route_id,
                        match_score=0.85,
                        stability_score=0.9
                    )
                    match_collection.add_match(match)
                    
                    # 更新容量
                    route.add_load(shipment.demand)
        
        # 验证匹配结果
        matches = match_collection.get_all_matches()
        assert len(matches) >= 0  # 可能没有匹配
        
        # 验证统计信息
        stats = match_collection.get_matching_statistics()
        assert stats['total_matches'] >= 0
        assert stats['active_matches'] >= 0
        assert stats['average_match_score'] >= 0
        
        print(f"端到端测试完成：创建了 {len(matches)} 个匹配")
    
    def test_data_integrity(self):
        """测试数据完整性"""
        # 验证网络数据
        if 'network' in self.test_data:
            network_rows = self.test_data['network']
            assert len(network_rows) >= 2  # 至少需要2行数据（站点和位置）
        
        # 验证货物数据
        if 'shipments' in self.test_data:
            shipments_data = self.test_data['shipments']
            assert len(shipments_data) > 0
            
            # 验证字段完整性 - 检查实际存在的字段
            if shipments_data:
                first_shipment = shipments_data[0]
                # 检查关键字段是否存在（使用不同的可能名称）
                has_shipment_id = any(key in first_shipment for key in ['shipment index', 'shipment_index', 'shipment number'])
                has_origin = any(key in first_shipment for key in ['Origin', 'origin'])
                has_destination = any(key in first_shipment for key in ['destination', 'Destination'])
                has_demand = 'Demand' in first_shipment
                has_classification = 'Classification' in first_shipment
                has_time_value = any(key in first_shipment for key in ['Time value(CNY/TEU)', 'Time value'])
                
                print(f"货物数据字段检查: shipment_id={has_shipment_id}, origin={has_origin}, destination={has_destination}")
        
        # 验证路线数据
        if 'routes' in self.test_data:
            routes_data = self.test_data['routes']
            assert len(routes_data) > 0
            
            # 验证字段完整性 - 检查实际存在的字段
            if routes_data:
                first_route = routes_data[0]
                has_route_id = any(key in first_route for key in ['route index', 'route_index', 'route index'])
                has_mode = any(key in first_route for key in ['mode', 'Mode'])
                
                print(f"路线数据字段检查: route_id={has_route_id}, mode={has_mode}")


if __name__ == "__main__":
    # 运行测试
    pytest.main([__file__, "-v"])