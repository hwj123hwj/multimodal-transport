"""
货物数据模型
用于表示货物运输需求
"""
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Dict, Any


class ShipmentStatus(Enum):
    """货物状态枚举"""
    PENDING = "pending"  # 待匹配
    MATCHED = "matched"  # 已匹配


@dataclass
class Shipment:
    """货物模型类"""
    shipment_id: int  # 对应CSV中的"shipment index"
    origin_node: int  # 对应CSV中的"Origin"
    destination_node: int  # 对应CSV中的"destination"
    demand: int  # 对应CSV中的"Demand" (TEU)
    time_value: int  # 对应CSV中的"Time value(CNY/TEU)"
    classification: int = -1  # 对应CSV中的"Classification" (冗余字段，默认为-1)
    status: ShipmentStatus = ShipmentStatus.PENDING

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

    @property
    def priority(self) -> int:
        """基于时间价值计算优先级（1-4级）"""
        if self.time_value >= 2500:
            return 4  # 最高优先级
        elif self.time_value >= 1700:
            return 3  # 高优先级
        elif self.time_value >= 500:
            return 2  # 中等优先级
        else:
            return 1  # 低优先级

    def get_priority_name(self) -> str:
        """获取优先级名称"""
        priority_names = {
            1: "低优先级",
            2: "中等优先级",
            3: "高优先级",
            4: "最高优先级"
        }
        return priority_names.get(self.priority, "未知优先级")

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'shipment_id': self.shipment_id,
            'origin_node': self.origin_node,
            'destination_node': self.destination_node,
            'demand': self.demand,
            'time_value': self.time_value,
            'classification': self.classification,
            'status': self.status.value,
            'weight': self.weight,
            'volume': self.volume,
            'priority': self.priority,
            'priority_name': self.get_priority_name(),
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
        classification = int(row.get('Classification', '-1'))
        time_value = int(row.get('Time value(CNY/TEU)', 0))

        return cls(
            shipment_id=shipment_id,
            origin_node=origin_node,
            destination_node=destination_node,
            demand=demand,
            classification=classification,
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

    def get_shipments_by_status(self, status: ShipmentStatus) -> List[Shipment]:
        """按状态获取货物"""
        return [s for s in self.shipments.values() if s.status == status]

    def get_pending_shipments(self) -> List[Shipment]:
        """获取待匹配货物"""
        return self.get_shipments_by_status(ShipmentStatus.PENDING)

    def get_matched_shipments(self) -> List[Shipment]:
        """获取已匹配货物"""
        return self.get_shipments_by_status(ShipmentStatus.MATCHED)

    def get_high_priority_shipments(self) -> List[Shipment]:
        """获取高优先级货物（优先级>=3）"""
        return [s for s in self.shipments.values() if s.priority >= 3]

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
            'status_distribution': {
                status.value: len(self.get_shipments_by_status(status))
                for status in ShipmentStatus
            },
            'priority_distribution': {
                'priority_1': len([s for s in shipments if s.priority == 1]),
                'priority_2': len([s for s in shipments if s.priority == 2]),
                'priority_3': len([s for s in shipments if s.priority == 3]),
                'priority_4': len([s for s in shipments if s.priority == 4])
            },
            'origin_distribution': {
                str(origin): len(self.get_shipments_by_origin(origin))
                for origin in set(s.origin_node for s in shipments)
            },
            'destination_distribution': {
                str(dest): len(self.get_shipments_by_destination(dest))
                for dest in set(s.destination_node for s in shipments)
            }
        }
