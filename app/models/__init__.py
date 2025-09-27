"""
数据模型包

包含多式联运物流网络的所有数据模型：
- Shipment: 货物模型
- Route: 路线模型  
- StableMatching: 稳定匹配模型（原Match模型）
"""

from .matching import StableMatching
from .route import Route
from .shipment import Shipment, ShipmentStatus, ShipmentCollection

__all__ = [
    # 货物模型
    'Shipment',
    'ShipmentStatus',
    'ShipmentCollection',

    # 路线模型
    'Route',

    # 匹配模型（新名称）
    'StableMatching',
]
