#!/usr/bin/env python3
"""
调试Network对象属性访问问题
"""
import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.data_loader import DataLoader

def test_network_attributes():
    """测试Network对象的属性"""
    print("=== 调试Network对象属性 ===")
    
    # 创建数据加载器
    data_loader = DataLoader("data")
    
    try:
        # 加载网络数据
        print("1. 加载网络数据...")
        network = data_loader.load_network()
        print(f"   Network类型: {type(network)}")
        print(f"   Network类: {network.__class__}")
        
        # 检查基本属性
        print("\n2. 检查基本属性:")
        print(f"   nodes_number: {network.nodes_number}")
        print(f"   sites: {len(network.sites)} 个")
        print(f"   location_indices: {len(network.location_indices)} 个")
        print(f"   node_count: {network.node_count}")
        
        # 检查是否有matching_rate属性
        print("\n3. 检查matching_rate属性:")
        if hasattr(network, 'matching_rate'):
            print(f"   ✓ 存在matching_rate属性: {network.matching_rate}")
        else:
            print("   ✗ 不存在matching_rate属性")
            print(f"   可用属性: {[attr for attr in dir(network) if not attr.startswith('_')]}")
        
        # 检查数据服务会访问的属性
        print("\n4. 数据服务会访问的属性:")
        attrs_to_check = ['nodes_number', 'sites', 'location_indices', 'node_count', 'matching_rate']
        for attr in attrs_to_check:
            if hasattr(network, attr):
                value = getattr(network, attr)
                print(f"   ✓ {attr}: {value}")
            else:
                print(f"   ✗ {attr}: 不存在")
        
        # 加载匹配数据看看是否能获取matching_rate
        print("\n5. 加载匹配数据:")
        try:
            matchings = data_loader.load_matchings()
            if matchings:
                matching = matchings[0]
                print(f"   ✓ 匹配数据加载成功")
                print(f"   匹配率: {matching.matching_rate}")
                print(f"   货物数量: {matching.total_shipments}")
                print(f"   已匹配: {matching.matched_shipments}")
            else:
                print("   ! 没有匹配数据")
        except Exception as e:
            print(f"   ✗ 匹配数据加载失败: {e}")
        
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_network_attributes()