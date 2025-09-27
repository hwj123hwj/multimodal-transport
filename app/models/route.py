"""
路线数据模型
用于表示运输路线和容量信息
"""
from dataclasses import dataclass
from typing import List, Dict, Any, Optional


@dataclass
class Route:
    """路线模型类"""
    route_id: int  # 对应CSV中的"route index"
    nodes: List[int]  # 节点序列
    costs: List[float]  # 运费列表（每段路线的运费）
    travel_times: List[float]  # 旅行时间列表（每段路线的旅行时间）
    capacity: int = 0  # 容量
    current_load: int = 0  # 当前负载
    efficiency_score: float = 0.0  # 效率评分
    total_travel_time: float = 0.0  # 总旅行时间（小时）
    total_cost: float = 0.0  # 总成本

    def __post_init__(self):
        """数据验证和后处理"""
        # 验证基本属性
        if self.capacity < 0:
            raise ValueError(f"路线容量不能为负数，当前值: {self.capacity}")

        if self.current_load < 0:
            raise ValueError(f"当前负载不能为负数，当前值: {self.current_load}")

        if self.current_load > self.capacity:
            raise ValueError(f"当前负载({self.current_load})不能超过容量({self.capacity})")

        if len(self.nodes) < 2:
            raise ValueError(f"路线必须至少包含2个节点，当前节点数: {len(self.nodes)}")

        if len(self.costs) != len(self.nodes) - 1:
            raise ValueError(f"运费列表长度({len(self.costs)})应该比节点数({len(self.nodes)})少1")

        if len(self.travel_times) != len(self.nodes) - 1:
            raise ValueError(f"旅行时间列表长度({len(self.travel_times)})应该比节点数({len(self.nodes)})少1")

        if self.total_travel_time < 0:
            raise ValueError(f"总旅行时间不能为负数，当前值: {self.total_travel_time}")

        if self.total_cost < 0:
            raise ValueError(f"总成本不能为负数，当前值: {self.total_cost}")

    @property
    def available_capacity(self) -> int:
        """可用容量"""
        return max(0, self.capacity - self.current_load)

    @property
    def utilization_rate(self) -> float:
        """利用率（百分比）"""
        if self.capacity == 0:
            return 0.0
        return (self.current_load / self.capacity) * 100

    @property
    def is_full(self) -> bool:
        """是否满载"""
        return self.current_load >= self.capacity

    @property
    def origin_node(self) -> int:
        """起始节点"""
        return self.nodes[0] if self.nodes else None

    @property
    def destination_node(self) -> int:
        """目标节点"""
        return self.nodes[-1] if self.nodes else None

    def can_accommodate(self, demand: int) -> bool:
        """检查是否可以容纳指定需求"""
        return self.available_capacity >= demand

    def calculate_efficiency_score(self) -> float:
        """计算效率评分（基于利用率和成本，移除距离因素）"""
        # 基础分数：利用率权重50%，成本效率权重50%
        utilization_score = self.utilization_rate / 100 * 50

        # 成本效率（假设10000元为基准总成本）
        cost_efficiency = max(0.0, (10000 - self.total_cost) / 10000 * 50)

        self.efficiency_score = utilization_score + cost_efficiency
        return self.efficiency_score

    def get_mode_name(self) -> str:
        """获取运输方式中文名称（多式联运）"""
        return "多式联运"

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'route_id': self.route_id,
            'mode': 'multimodal',  # 多式联运
            'mode_name': self.get_mode_name(),
            'nodes': self.nodes,
            'origin_node': self.origin_node,
            'destination_node': self.destination_node,
            'capacity': self.capacity,
            'current_load': self.current_load,
            'available_capacity': self.available_capacity,
            'utilization_rate': self.utilization_rate,
            'is_full': self.is_full,
            'efficiency_score': self.efficiency_score,
            'travel_time': self.total_travel_time,
            'total_cost': self.total_cost,
            'costs': self.costs,
            'travel_times': self.travel_times,
        }

    @classmethod
    def from_csv_row(cls, row_data: List[str]) -> Optional['Route']:
        """从CSV行数据创建路线实例（基于实际CSV结构）"""
        # 跳过标题行和字段名行
        if len(row_data) < 30 or not row_data[0].strip() or row_data[0] == 'route number':
            return None

        try:
            # 解析路线ID（第1列）
            route_id = int(row_data[0])

            # 跳过mode字段（第2列，冗余字段，固定为-1）

            # 解析节点数（第3列）
            nodes_count = int(row_data[2]) if row_data[2].strip() else 0

            # 解析节点列表（第4-12列，共9个字段）
            nodes = []
            for i in range(3, 12):  # CSV数组索引从3开始（第4列到第12列）
                node_val = row_data[i].strip()
                if node_val and node_val != '-1':
                    try:
                        nodes.append(int(node_val))
                    except (ValueError, TypeError):
                        continue

            # 如果解析的节点数与nodes_count不一致，使用实际解析的节点
            if len(nodes) != nodes_count:
                nodes = nodes[:nodes_count] if len(nodes) > nodes_count else nodes

            # 解析运费列表（第13-21列，共9个字段）
            costs = []
            for i in range(12, 21):  # CSV数组索引从12开始（第13列到第21列）
                cost_val = row_data[i].strip()
                if cost_val and cost_val != '-1':
                    try:
                        costs.append(float(cost_val))
                    except (ValueError, TypeError):
                        continue

            # 解析旅行时间列表（第22-30列，共9个字段）
            travel_times = []
            for i in range(21, 30):  # CSV数组索引从21开始（第22列到第30列）
                time_val = row_data[i].strip()
                if time_val and time_val != '-1':
                    try:
                        travel_times.append(float(time_val))
                    except (ValueError, TypeError):
                        continue

            # 解析容量（第31列，索引30）
            capacity = float(row_data[30]) if len(row_data) > 30 and row_data[30].strip() else 200

            # 计算总旅行时间、总成本
            total_travel_time = sum(travel_times) if travel_times else 0
            total_cost = sum(costs) if costs else 0

            return cls(
                route_id=route_id,
                nodes=nodes,
                costs=costs,
                travel_times=travel_times,
                capacity=capacity,
                total_travel_time=total_travel_time,
                total_cost=total_cost
            )
        except (ValueError, IndexError, TypeError) as e:
            print(f"解析CSV行失败: {e}, 数据: {row_data[:5]}...")
            return None
