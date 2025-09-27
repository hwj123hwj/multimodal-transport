"""
数据模型单元测试
"""
import os
import sys

import pytest

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import (
    Network, NetworkTopology,
    Shipment, ShipmentStatus, ShipmentCollection,
    Route, StableMatching, MatchingCollection
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


class TestStableMatchingModel:
    """测试稳定匹配模型"""

    def test_stable_matching_creation(self):
        """测试稳定匹配创建"""
        matching = StableMatching(
            shipment_indices=[101, 102, 103],
            route_assignments=[201, 202, "Self"],
            total_capacity=1000,
            total_container_number=150,
            total_matched_container_number=120,
            is_stable=True,
            iteration_num=5,
            restart_num=1,
            cpu_time=2.5
        )

        assert matching.total_shipments == 3
        assert matching.matched_shipments == 2
        assert matching.unmatched_shipments == 1
        assert matching.matching_rate == 2 / 3
        assert matching.container_matching_rate == 120 / 150
        assert matching.is_stable == True

    def test_stable_matching_validation(self):
        """测试稳定匹配验证"""
        # 测试数据不一致
        with pytest.raises(ValueError):
            StableMatching(
                shipment_indices=[101, 102],
                route_assignments=[201, 202, 203],  # 数量不一致
                total_capacity=1000,
                total_container_number=150,
                total_matched_container_number=120,
                is_stable=True,
                iteration_num=5,
                restart_num=1,
                cpu_time=2.5
            )

        # 测试匹配数超过总数
        with pytest.raises(ValueError):
            StableMatching(
                shipment_indices=[101, 102, 103],
                route_assignments=[201, 202, "Self"],
                total_capacity=1000,
                total_container_number=150,
                total_matched_container_number=160,  # 超过总数
                is_stable=True,
                iteration_num=5,
                restart_num=1,
                cpu_time=2.5
            )

        # 测试负CPU时间
        with pytest.raises(ValueError):
            StableMatching(
                shipment_indices=[101, 102, 103],
                route_assignments=[201, 202, "Self"],
                total_capacity=1000,
                total_container_number=150,
                total_matched_container_number=120,
                is_stable=True,
                iteration_num=5,
                restart_num=1,
                cpu_time=-1.0  # 负数
            )

    def test_stable_matching_route_usage(self):
        """测试路线使用统计"""
        matching = StableMatching(
            shipment_indices=[101, 102, 103, 104],
            route_assignments=[201, 202, 201, "Self"],
            total_capacity=1000,
            total_container_number=200,
            total_matched_container_number=180,
            is_stable=True,
            iteration_num=3,
            restart_num=0,
            cpu_time=1.8
        )

        usage = matching.get_route_usage()
        assert usage[201] == 2  # 路线201被使用2次
        assert usage[202] == 1  # 路线202被使用1次
        assert usage["Self"] == 1  # 未匹配1次

    def test_stable_matching_queries(self):
        """测试稳定匹配查询方法"""
        matching = StableMatching(
            shipment_indices=[101, 102, 103],
            route_assignments=[201, 202, "Self"],
            total_capacity=1000,
            total_container_number=150,
            total_matched_container_number=120,
            is_stable=True,
            iteration_num=5,
            restart_num=1,
            cpu_time=2.5
        )

        # 测试按路线查询
        route_201_matches = matching.get_matches_by_route(201)
        assert 101 in route_201_matches

        route_202_matches = matching.get_matches_by_route(202)
        assert 102 in route_202_matches

        # 测试货物分配查询
        assert matching.get_shipment_assignment(101) == 201
        assert matching.get_shipment_assignment(102) == 202
        assert matching.get_shipment_assignment(103) == "Self"
        assert matching.get_shipment_assignment(999) is None  # 不存在的货物

    def test_stable_matching_to_dict(self):
        """测试稳定匹配转字典"""
        matching = StableMatching(
            shipment_indices=[101, 102, 103],
            route_assignments=[201, 202, "Self"],
            total_capacity=1000,
            total_container_number=150,
            total_matched_container_number=120,
            is_stable=True,
            iteration_num=5,
            restart_num=1,
            cpu_time=2.5
        )

        result = matching.to_dict()

        assert result['total_shipments'] == 3
        assert result['matched_shipments'] == 2
        assert result['unmatched_shipments'] == 1
        assert result['matching_rate'] == 2 / 3
        assert result['container_matching_rate'] == 120 / 150
        assert result['is_stable'] == True
        assert result['cpu_time'] == 2.5
        assert 'route_usage' in result
        assert 'shipments' in result
        assert len(result['shipments']) == 3


class TestIntegration:
    """集成测试"""

    def test_stable_matching_workflow(self):
        """测试稳定匹配工作流"""
        # 创建匹配集合
        matching_collection = MatchingCollection()

        # 创建第一个稳定匹配结果
        matching1 = StableMatching(
            shipment_indices=[101, 102, 103, 104],
            route_assignments=[201, 202, 201, "Self"],
            total_capacity=1000,
            total_container_number=200,
            total_matched_container_number=180,
            is_stable=True,
            iteration_num=5,
            restart_num=1,
            cpu_time=2.5
        )
        matching_collection.add_matching(matching1)

        # 创建第二个稳定匹配结果（模拟不同参数）
        matching2 = StableMatching(
            shipment_indices=[105, 106, 107],
            route_assignments=[203, "Self", 204],
            total_capacity=800,
            total_container_number=150,
            total_matched_container_number=120,
            is_stable=False,  # 不稳定
            iteration_num=8,
            restart_num=2,
            cpu_time=3.2
        )
        matching_collection.add_matching(matching2)

        # 验证匹配集合
        assert len(matching_collection.get_all_matchings()) == 2
        latest = matching_collection.get_latest_matching()
        assert latest == matching2

        # 验证统计摘要
        stats = matching_collection.get_statistics_summary()
        assert stats['total_runs'] == 2
        assert stats['latest_matching'] is not None
        assert stats['stable_matchings'] == 1  # 只有第一个是稳定的
        assert 2.5 <= stats['average_cpu_time'] <= 3.2
        assert 0.5 <= stats['average_matching_rate'] <= 1.0

        # 验证第一个匹配的详细信息
        latest_dict = matching1.to_dict()
        assert latest_dict['total_shipments'] == 4
        assert latest_dict['matched_shipments'] == 3
        assert latest_dict['unmatched_shipments'] == 1
        assert latest_dict['matching_rate'] == 0.75
        assert latest_dict['is_stable'] == True

        # 验证路线使用统计
        route_usage = matching1.get_route_usage()
        assert route_usage[201] == 2
        assert route_usage[202] == 1
        assert route_usage["Self"] == 1

        # 验证查询方法
        route_201_matches = matching1.get_matches_by_route(201)
        assert len(route_201_matches) == 2
        assert 101 in route_201_matches
        assert 103 in route_201_matches

        # 验证货物分配查询
        assert matching1.get_shipment_assignment(101) == 201
        assert matching1.get_shipment_assignment(102) == 202
        assert matching1.get_shipment_assignment(104) == "Self"  # 未匹配
