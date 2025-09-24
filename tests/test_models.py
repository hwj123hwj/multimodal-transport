"""
数据模型单元测试
"""
import pytest
import sys
import os
from datetime import datetime, timedelta

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import (
    Network, NetworkTopology,
    Shipment, ShipmentStatus, ShipmentCollection,
    Route, RouteStatus, RouteCollection,
    Match, MatchStatus, MatchPriority, MatchResult, MatchCollection
)


class TestNetworkModel:
    """测试网络模型"""
    
    def test_network_creation(self):
        """测试网络创建"""
        network = Network(
            nodes_number=5,
            sites=[1, 2, 3, 4, 5],
            location_indices=[0, 1, 2, 3, 4]
        )
        
        assert network.node_count == 5
        assert len(network.sites) == 5
        assert network.get_location_by_site(1) == 0
        assert network.get_site_by_location(0) == 1
    
    def test_network_validation(self):
        """测试网络验证"""
        # 测试节点数量不匹配
        with pytest.raises(ValueError):
            Network(
                nodes_number=3,
                sites=[1, 2, 3, 4],
                location_indices=[0, 1, 2]
            )
    
    def test_network_topology(self):
        """测试网络拓扑分析"""
        network = Network(
            nodes_number=3,
            sites=[1, 2, 3],
            location_indices=[0, 1, 2]
        )
        
        topology = NetworkTopology(network)
        
        # 构建邻接矩阵
        routes = [[1, 2], [2, 3]]
        matrix = topology.build_adjacency_matrix(routes)
        
        assert len(matrix) == 3
        assert len(matrix[0]) == 3
        
        # 测试节点重要性
        importance = topology.calculate_node_importance(routes)
        assert len(importance) == 3


class TestShipmentModel:
    """测试货物模型"""
    
    def test_shipment_creation(self):
        """测试货物创建"""
        shipment = Shipment(
            shipment_id=1,
            origin_node=0,
            destination_node=2,
            demand=5,  # 5 TEU
            time_value=1000,
            classification=1
        )
        
        assert shipment.shipment_id == 1
        assert shipment.demand == 5
        assert shipment.weight == 100.0  # 5 * 20吨
        assert shipment.volume == 165.0  # 5 * 33立方米
        assert shipment.status == ShipmentStatus.PENDING
    
    def test_shipment_validation(self):
        """测试货物验证"""
        # 测试需求为负
        with pytest.raises(ValueError):
            Shipment(
                shipment_id=1,
                origin_node=0,
                destination_node=2,
                demand=-5,
                time_value=1000
            )
        
        # 测试时间价值为负
        with pytest.raises(ValueError):
            Shipment(
                shipment_id=1,
                origin_node=0,
                destination_node=2,
                demand=5,
                time_value=-1000
            )
        
        # 测试起始节点相同
        with pytest.raises(ValueError):
            Shipment(
                shipment_id=1,
                origin_node=1,
                destination_node=1,
                demand=5,
                time_value=1000
            )
    
    def test_shipment_status_transition(self):
        """测试货物状态转换"""
        shipment = Shipment(
            shipment_id=1,
            origin_node=0,
            destination_node=2,
            demand=5,
            time_value=1000
        )
        
        # 正常状态转换
        assert shipment.update_status(ShipmentStatus.MATCHED) == True
        assert shipment.status == ShipmentStatus.MATCHED
        
        # 无效状态转换
        assert shipment.update_status(ShipmentStatus.PENDING) == False
    
    def test_shipment_collection(self):
        """测试货物集合"""
        collection = ShipmentCollection()
        
        shipment1 = Shipment(
            shipment_id=1,
            origin_node=0,
            destination_node=2,
            demand=5,
            time_value=1000
        )
        
        shipment2 = Shipment(
            shipment_id=2,
            origin_node=1,
            destination_node=3,
            demand=10,
            time_value=2000
        )
        
        collection.add_shipment(shipment1)
        collection.add_shipment(shipment2)
        
        assert len(collection.get_all_shipments()) == 2
        assert len(collection.get_pending_shipments()) == 2
        
        stats = collection.get_statistics()
        assert stats['total_shipments'] == 2
        assert stats['total_weight'] == 300.0  # 5*20 + 10*20
        assert stats['total_volume'] == 495.0  # 5*33 + 10*33


class TestRouteModel:
    """测试路线模型"""
    
    def test_route_creation(self):
        """测试路线创建"""
        route = Route(
            route_id=1,
            nodes=[0, 1, 2],
            capacity=50,  # 50 TEU
            total_travel_time=24.0,
            total_cost=1000.0,
            costs=[400.0, 600.0],
            travel_times=[10.0, 14.0]
        )
        
        assert route.route_id == 1
        assert route.nodes == [0, 1, 2]
        assert route.capacity == 50
        assert route.origin_node == 0
        assert route.destination_node == 2
    
    def test_route_validation(self):
        """测试路线验证"""
        # 测试容量为负
        with pytest.raises(ValueError):
            Route(
                route_id=1,
                nodes=[0, 1, 2],
                capacity=-50,
                costs=[400.0, 600.0],
                travel_times=[10.0, 14.0]
            )
        
        # 测试节点数量不足
        with pytest.raises(ValueError):
            Route(
                route_id=1,
                nodes=[0],
                capacity=50,
                costs=[400.0],
                travel_times=[10.0]
            )
    
    def test_route_capacity_management(self):
        """测试路线容量管理"""
        route = Route(
            route_id=1,
            nodes=[0, 1, 2],
            capacity=50,  # 50 TEU
            costs=[400.0, 600.0],
            travel_times=[10.0, 14.0]
        )
        
        # 测试添加负载
        assert route.add_load(15) == True
        assert route.current_load == 15
        assert route.utilization_rate == 30.0  # 15/50 * 100
        
        # 测试剩余容量
        assert route.available_capacity == 35
        
        # 测试容量不足
        assert route.add_load(40) == False
        
        # 测试移除负载
        assert route.remove_load(5) == True
        assert route.current_load == 10
    
    def test_route_efficiency_score(self):
        """测试路线效率评分"""
        route = Route(
            route_id=1,
            nodes=[0, 1, 2],
            capacity=50,
            total_travel_time=12.0,  # 12小时
            total_cost=800.0,  # 800元总成本
            costs=[300.0, 500.0],
            travel_times=[5.0, 7.0]
        )
        
        # 添加一些负载
        route.add_load(20)  # 40%利用率
        
        efficiency_score = route.calculate_efficiency_score()
        assert 0 <= efficiency_score <= 100
        
        # 验证效率评分计算（移除距离因素）
        utilization_score = 40.0 / 100 * 50  # 利用率权重50%
        cost_efficiency = max(0, (10000 - 800) / 10000 * 50)  # 成本效率权重50%（基于10000元基准）
        expected_score = utilization_score + cost_efficiency
        assert abs(efficiency_score - expected_score) < 1.0


class TestMatchModel:
    """测试匹配模型"""
    
    def test_match_creation(self):
        """测试匹配创建"""
        match = Match.create_match(
            match_id=1,
            shipment_id=101,
            route_id=201,
            match_score=0.85,
            stability_score=0.75,
            priority=MatchPriority.HIGH
        )
        
        assert match.match_id == 1
        assert match.shipment_id == 101
        assert match.route_id == 201
        assert match.match_score == 0.85
        assert match.stability_score == 0.75
        assert match.priority == MatchPriority.HIGH
        assert match.status == MatchStatus.MATCHED
    
    def test_match_validation(self):
        """测试匹配验证"""
        # 测试评分超出范围
        with pytest.raises(ValueError):
            Match.create_match(
                match_id=1,
                shipment_id=101,
                route_id=201,
                match_score=1.5,  # 超出范围
                stability_score=0.75
            )
    
    def test_match_status_update(self):
        """测试匹配状态更新"""
        match = Match.create_match(
            match_id=1,
            shipment_id=101,
            route_id=201,
            match_score=0.85,
            stability_score=0.75
        )
        
        # 更新状态
        result = match.update_status(MatchStatus.IN_TRANSIT, "开始运输")
        assert "matched -> in_transit" in result.lower()
        assert match.status == MatchStatus.IN_TRANSIT
        assert "开始运输" in match.notes
    
    def test_match_quality_score(self):
        """测试匹配质量评分"""
        match = Match.create_match(
            match_id=1,
            shipment_id=101,
            route_id=201,
            match_score=0.9,
            stability_score=0.8,
            priority=MatchPriority.HIGH
        )
        
        # 模拟完成时间（12小时）
        match.actual_completion_time = match.created_at + timedelta(hours=12)
        
        quality_score = match.get_match_quality_score()
        assert 0 <= quality_score <= 1
        
        # 验证质量评分计算
        base_score = (0.9 + 0.8) / 2
        priority_multiplier = 3.0 / 4.0  # HIGH priority
        time_factor = 1.0  # 12小时 <= 24小时
        expected_score = base_score * priority_multiplier * time_factor
        assert abs(quality_score - expected_score) < 0.01
    
    def test_match_collection(self):
        """测试匹配集合"""
        collection = MatchCollection()
        
        # 创建匹配
        match1 = collection.create_match(
            shipment_id=101,
            route_id=201,
            match_score=0.85,
            stability_score=0.75,
            priority=MatchPriority.HIGH
        )
        
        match2 = collection.create_match(
            shipment_id=102,
            route_id=202,
            match_score=0.75,
            stability_score=0.65,
            priority=MatchPriority.MEDIUM
        )
        
        assert len(collection.get_all_matches()) == 2
        assert len(collection.get_active_matches()) == 2
        
        # 更新状态
        collection.update_match_status(match1.match_id, MatchStatus.COMPLETED)
        
        assert len(collection.get_active_matches()) == 1
        assert len(collection.get_matches_by_status(MatchStatus.COMPLETED)) == 1
        
        stats = collection.get_matching_statistics()
        assert stats['total_matches'] == 2
        assert stats['success_rate'] == 0.5  # 1个完成，总共2个


class TestIntegration:
    """集成测试"""
    
    def test_end_to_end_workflow(self):
        """测试端到端工作流"""
        # 创建网络
        network = Network(
            nodes_number=3,
            sites=[1, 2, 3],
            location_indices=[0, 1, 2]
        )
        
        # 创建货物
        shipment_collection = ShipmentCollection()
        shipment = Shipment(
            shipment_id=101,
            origin_node=0,
            destination_node=2,
            demand=25,  # 25个标准箱
            time_value=1000.0,
            classification=1  # 使用默认值
        )
        shipment_collection.add_shipment(shipment)
        
        # 创建路线
        route_collection = RouteCollection()
        route = Route(
            route_id=1,
            nodes=[0, 1, 2],
            capacity=50,  # 50个标准箱
            total_travel_time=12.0,  # 12小时
            total_cost=800.0,  # 800元总成本
            costs=[300.0, 500.0],  # 各段成本
            travel_times=[5.0, 7.0]  # 各段时间
        )
        route_collection.add_route(route)
        
        # 创建匹配
        match_collection = MatchCollection()
        match = match_collection.create_match(
            shipment_id=shipment.shipment_id,
            route_id=route.route_id,
            match_score=0.9,
            stability_score=0.8,
            priority=MatchPriority.HIGH,
            estimated_completion_time=datetime.now() + timedelta(hours=48)
        )
        
        # 验证匹配
        assert match.shipment_id == shipment.shipment_id
        assert match.route_id == route.route_id
        assert match.status == MatchStatus.MATCHED
        
        # 模拟运输过程
        match.update_status(MatchStatus.IN_TRANSIT)
        shipment.update_status(ShipmentStatus.MATCHED)  # 先设置为匹配状态
        shipment.update_status(ShipmentStatus.IN_TRANSIT)  # 然后设置为运输中
        
        # 模拟完成
        match.update_status(MatchStatus.COMPLETED)
        shipment.update_status(ShipmentStatus.DELIVERED)
        
        assert match.is_completed
        assert shipment.status == ShipmentStatus.DELIVERED