"""
货物数据模型
用于表示货物运输需求
"""
from dataclasses import dataclass
from typing import List, Optional, Dict, Any


@dataclass
class Shipment:
    """货物模型类"""
    shipment_id: int  # 对应CSV中的"shipment index"
    origin_node: int  # 对应CSV中的"Origin"
    destination_node: int  # 对应CSV中的"destination"
    demand: int  # 对应CSV中的"Demand" (TEU)
    time_value: int  # 对应CSV中的"Time value(CNY/TEU)"

    def __post_init__(self):
        """数据验证和后处理"""

        # 转换节点数据为整数（如果为字符串）
        if isinstance(self.origin_node, str):
            try:
                self.origin_node = int(self.origin_node)
            except ValueError:
                self.origin_node = -1

        if isinstance(self.destination_node, str):
            try:
                self.destination_node = int(self.destination_node)
            except ValueError:
                self.destination_node = -1

        # 验证基本属性
        if self.demand <= 0:
            raise ValueError(f"货物需求量必须大于0，当前值: {self.demand}")

        if self.origin_node < 0 or self.destination_node < 0:
            raise ValueError(f"节点索引不能为负数，起始节点: {self.origin_node}, 目标节点: {self.destination_node}")

        if self.origin_node == self.destination_node:
            raise ValueError(f"起始节点和目标节点不能相同: {self.origin_node}")

        if self.time_value < 0:
            raise ValueError(f"时间价值不能为负数，当前值: {self.time_value}")

    @property
    def weight(self) -> float:
        """估算重量（基于TEU转换，1TEU约等于20吨）"""
        return self.demand * 20.0  # 吨

    @property
    def volume(self) -> float:
        """估算体积（基于TEU转换，1TEU约等于33立方米）"""
        return self.demand * 33.0  # 立方米


    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'shipment_id': self.shipment_id,
            'origin_node': self.origin_node,
            'destination_node': self.destination_node,
            'demand': self.demand,
            'time_value': self.time_value,
            'weight': self.weight,
            'volume': self.volume,
        }

    @classmethod
    def from_csv_row(cls, row: Dict[str, str]) -> 'Shipment':
        """从CSV行数据创建货物实例"""
        # 处理不同的字段名称变体
        shipment_id = int((row.get('shipment index') or
                           row.get('shipment index') or
                           row.get('shipment_index') or
                           row.get('shipment number') or
                           ''))

        origin_node = int((row.get('Origin') or
                           row.get('origin') or
                           ''))

        destination_node = int((row.get('destination') or
                                row.get('Destination') or
                                ''))

        demand = int(row.get('Demand', 0))
        time_value = int(row.get('Time value(CNY/TEU)', 0))

        return cls(
            shipment_id=shipment_id,
            origin_node=origin_node,
            destination_node=destination_node,
            demand=demand,
            time_value=time_value
        )


class ShipmentCollection:
    """货物集合管理类"""

    def __init__(self):
        self.shipments: Dict[int, Shipment] = {}

    def add_shipment(self, shipment: Shipment):
        """添加货物"""
        if shipment.shipment_id in self.shipments:
            raise ValueError(f"货物ID已存在: {shipment.shipment_id}")
        self.shipments[shipment.shipment_id] = shipment

    def get_shipment(self, shipment_id: int) -> Optional[Shipment]:
        """获取指定货物"""
        return self.shipments.get(shipment_id)

    def get_all_shipments(self) -> List[Shipment]:
        """获取所有货物"""
        return list(self.shipments.values())

    def get_shipments_by_origin(self, origin_node: int) -> List[Shipment]:
        """按起始节点获取货物"""
        return [s for s in self.shipments.values() if s.origin_node == origin_node]

    def get_shipments_by_destination(self, destination_node: int) -> List[Shipment]:
        """按目标节点获取货物"""
        return [s for s in self.shipments.values() if s.destination_node == destination_node]

    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        if not self.shipments:
            return {'total_shipments': 0}

        shipments = list(self.shipments.values())

        return {
            'total_shipments': len(shipments),
            'total_demand': sum(s.demand for s in shipments),
            'total_weight': sum(s.weight for s in shipments),
            'total_volume': sum(s.volume for s in shipments),
            'average_time_value': sum(s.time_value for s in shipments) / len(shipments),
            'origin_distribution': {
                str(origin): len(self.get_shipments_by_origin(origin))
                for origin in set(s.origin_node for s in shipments)
            },
            'destination_distribution': {
                str(dest): len(self.get_shipments_by_destination(dest))
                for dest in set(s.destination_node for s in shipments)
            }
        }
