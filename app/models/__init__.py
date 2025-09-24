"""
数据模型包

包含多式联运物流网络的所有数据模型：
- Network: 网络模型（拓扑结构）
- Shipment: 货物模型
- Route: 路线模型  
- StableMatching: 稳定匹配模型（原Match模型）
"""

from .network import Network, NetworkTopology
from .shipment import Shipment, ShipmentStatus, ShipmentCollection
from .route import Route, RouteStatus, RouteCollection
from .matching import StableMatching, MatchingCollection

# 向后兼容性别名
Match = StableMatching
MatchStatus = None  # 这个模型中没有定义，为了兼容性
MatchPriority = None  # 这个模型中没有定义，为了兼容性  
MatchResult = StableMatching  # 结果模型就是StableMatching
MatchCollection = MatchingCollection

__all__ = [
    # 网络模型
    'Network',
    'NetworkTopology',
    
    # 货物模型
    'Shipment',
    'ShipmentStatus', 
    'ShipmentCollection',
    
    # 路线模型
    'Route',
    'RouteStatus',
    'RouteCollection',
    
    # 匹配模型（新名称）
    'StableMatching',
    'MatchingCollection',
    
    # 向后兼容性（旧名称）
    'Match',
    'MatchStatus',
    'MatchPriority',
    'MatchResult',
    'MatchCollection'
]