"""
稳定匹配结果数据模型
用于解析和处理stable_matching.csv文件
"""
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Union


@dataclass
class StableMatching:
    """稳定匹配结果模型"""
    shipment_indices: List[int]  # 货物索引列表
    route_assignments: List[Union[int, str]]  # 路线分配（"Self"表示未匹配）
    total_capacity: int  # 路线总容量
    total_container_number: int  # 货物总集装箱数
    total_matched_container_number: int  # 已匹配的集装箱总数
    is_stable: bool  # 匹配是否稳定
    iteration_num: int  # 迭代次数
    restart_num: int  # 重启次数
    cpu_time: float  # CPU执行时间（秒）

    def __post_init__(self):
        """数据验证"""
        if len(self.shipment_indices) != len(self.route_assignments):
            raise ValueError("货物索引和路线分配数量必须一致")

        if self.total_matched_container_number > self.total_container_number:
            raise ValueError("已匹配集装箱数不能超过总集装箱数")

        if self.cpu_time < 0:
            raise ValueError("CPU时间不能为负数")

    @property
    def total_shipments(self) -> int:
        """总货物数量"""
        return len(self.shipment_indices)

    @property
    def matched_shipments(self) -> int:
        """已匹配的货物数量"""
        return sum(1 for route in self.route_assignments if route != "Self")

    @property
    def unmatched_shipments(self) -> int:
        """未匹配的货物数量"""
        return sum(1 for route in self.route_assignments if route == "Self")

    @property
    def matching_rate(self) -> float:
        """匹配率"""
        return self.matched_shipments / self.total_shipments if self.total_shipments > 0 else 0.0

    @property
    def container_matching_rate(self) -> float:
        """集装箱匹配率"""
        return self.total_matched_container_number / self.total_container_number if self.total_container_number > 0 else 0.0

    def get_route_usage(self) -> Dict[Union[int, str], int]:
        """获取路线使用情况统计"""
        usage = {}
        for route in self.route_assignments:
            usage[route] = usage.get(route, 0) + 1
        return usage

    def get_matches_by_route(self, route_id: Union[int, str]) -> List[int]:
        """获取指定路线的所有货物索引"""
        return [
            shipment_idx for shipment_idx, assigned_route
            in zip(self.shipment_indices, self.route_assignments)
            if assigned_route == route_id
        ]

    def get_shipment_assignment(self, shipment_id: int) -> Optional[Union[int, str]]:
        """获取指定货物的路线分配"""
        try:
            index = self.shipment_indices.index(shipment_id)
            return self.route_assignments[index]
        except ValueError:
            return None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'total_shipments': self.total_shipments,
            'matched_shipments': self.matched_shipments,
            'unmatched_shipments': self.unmatched_shipments,
            'matching_rate': self.matching_rate,
            'total_capacity': self.total_capacity,
            'total_container_number': self.total_container_number,
            'total_matched_container_number': self.total_matched_container_number,
            'container_matching_rate': self.container_matching_rate,
            'is_stable': self.is_stable,
            'iteration_num': self.iteration_num,
            'restart_num': self.restart_num,
            'cpu_time': self.cpu_time,
            'route_usage': self.get_route_usage(),
            'shipments': [
                {
                    'shipment_id': sid,
                    'assigned_route': route
                }
                for sid, route in zip(self.shipment_indices, self.route_assignments)
            ]
        }

    @classmethod
    def from_csv_rows(cls, shipment_row: List[str], route_row: List[str],
                      statistics_rows: List[str]) -> 'StableMatching':
        """从CSV行创建稳定匹配对象"""
        # 解析货物索引（跳过第一列"Shipment"）
        shipment_indices = [int(x) for x in shipment_row[1:] if x.strip()]

        # 解析路线分配（跳过第一列"Route"）
        route_assignments = []
        for route in route_row[1:]:
            if route.strip():
                if route == "Self":
                    route_assignments.append("Self")
                else:
                    route_assignments.append(int(route))

        # 解析统计信息
        stats = {}
        for row in statistics_rows:
            if isinstance(row, str):
                parts = row.split(',')
            else:
                parts = row

            key = parts[0].strip()
            value = parts[1].strip()

            if key == 'Total capacity in route':
                stats['total_capacity'] = int(value)
            elif key == 'Total container number in shipment':
                stats['total_container_number'] = int(value)
            elif key == 'Total matched container number':
                stats['total_matched_container_number'] = int(value)
            elif key == 'Stable or not':
                stats['is_stable'] = value.lower() == 'true'
            elif key == 'Iteration num':
                stats['iteration_num'] = int(value)
            elif key == 'Restart num':
                stats['restart_num'] = int(value)
            elif key == 'CPU time':
                stats['cpu_time'] = float(value)

        return cls(
            shipment_indices=shipment_indices,
            route_assignments=route_assignments,
            total_capacity=stats.get('total_capacity', 0),
            total_container_number=stats.get('total_container_number', 0),
            total_matched_container_number=stats.get('total_matched_container_number', 0),
            is_stable=stats.get('is_stable', False),
            iteration_num=stats.get('iteration_num', 0),
            restart_num=stats.get('restart_num', 0),
            cpu_time=stats.get('cpu_time', 0.0)
        )


class MatchingCollection:
    """匹配结果集合管理类"""

    def __init__(self):
        self.matchings: List[StableMatching] = []

    def add_matching(self, matching: StableMatching):
        """添加匹配结果"""
        self.matchings.append(matching)

    def get_latest_matching(self) -> Optional[StableMatching]:
        """获取最新的匹配结果"""
        return self.matchings[-1] if self.matchings else None

    def get_all_matchings(self) -> List[StableMatching]:
        """获取所有匹配结果"""
        return self.matchings.copy()

    def get_statistics_summary(self) -> Dict[str, Any]:
        """获取统计摘要"""
        if not self.matchings:
            return {'total_runs': 0}

        latest = self.get_latest_matching()

        return {
            'total_runs': len(self.matchings),
            'latest_matching': latest.to_dict() if latest else None,
            'average_cpu_time': sum(m.cpu_time for m in self.matchings) / len(self.matchings),
            'average_matching_rate': sum(m.matching_rate for m in self.matchings) / len(self.matchings),
            'stable_matchings': sum(1 for m in self.matchings if m.is_stable)
        }
