#!/usr/bin/env python3
"""测试所有数据加载功能"""

from app.services.data_loader import DataLoader


def test_all_loading():
    data_loader = DataLoader()

    print('=== 测试所有数据加载功能 ===')

    # 加载货物数据
    print('\n1. 加载货物数据...')
    shipments = data_loader.load_shipments()
    stats = shipments.get_statistics()
    print(f'   成功加载 {stats["total_shipments"]} 条货物数据')
    print(f'   总需求: {stats["total_demand"]} TEU')
    print(f'   平均时间价值: {stats["average_time_value"]:.2f} CNY/TEU')

    # 加载路线数据
    print('\n2. 加载路线数据...')
    routes = data_loader.load_routes()
    route_stats = routes.get_statistics()
    print(f'   成功加载 {route_stats["total_routes"]} 条路线数据')
    print(f'   总运力: {route_stats["total_capacity"]} TEU')
    print(f'   平均运输时间: {route_stats["average_travel_time"]:.1f} 小时')

    # 加载网络数据
    print('\n3. 加载网络数据...')
    network = data_loader.load_network()
    print(f'   成功加载 {network.node_count} 个节点, {network.site_count} 个站点')
    print(f'   最大站点ID: {network.max_site_id}')
    
    # 加载匹配数据
    print('\n4. 加载匹配数据...')
    matchings = data_loader.load_matchings()
    print(f'   成功加载 {len(matchings)} 个匹配结果')
    if matchings:
        matching = matchings[0]
        print(f'   匹配率: {matching.matching_rate:.2f}%')
        print(f'   稳定状态: {matching.is_stable}')

    print('\n=== 数据加载测试完成 ===')


if __name__ == '__main__':
    test_all_loading()