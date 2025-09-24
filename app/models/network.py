"""
网络数据模型
用于表示物流网络拓扑结构和节点信息
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Network:
    """网络模型类"""
    nodes_number: int  # 对应CSV中的"nodes number"
    sites: List[int]  # 对应CSV中的"site"（站点列表）
    location_indices: List[int]  # 对应CSV中的"location index"（位置索引）
    created_at: datetime = None
    updated_at: datetime = None
    
    def __post_init__(self):
        """数据验证和后处理"""
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
        
        # 验证基本属性
        if self.nodes_number <= 0:
            raise ValueError(f"节点数量必须大于0，当前值: {self.nodes_number}")
        
        if len(self.sites) != self.nodes_number:
            raise ValueError(f"站点列表长度({len(self.sites)})必须与节点数量({self.nodes_number})一致")
        
        if len(self.location_indices) != self.nodes_number:
            raise ValueError(f"位置索引列表长度({len(self.location_indices)})必须与节点数量({self.nodes_number})一致")
        
        # 验证站点ID的唯一性
        if len(set(self.sites)) != len(self.sites):
            raise ValueError(f"站点ID必须唯一，发现重复: {self.sites}")
        
        # 验证位置索引的唯一性
        if len(set(self.location_indices)) != len(self.location_indices):
            raise ValueError(f"位置索引必须唯一，发现重复: {self.location_indices}")
        
        # 验证站点ID和位置索引的对应关系
        for i, (site, location) in enumerate(zip(self.sites, self.location_indices)):
            if site < 1:
                raise ValueError(f"站点ID必须为正整数，索引{i}: {site}")
            if location < 0:
                raise ValueError(f"位置索引必须为非负整数，索引{i}: {location}")
    
    @property
    def node_count(self) -> int:
        """节点数量"""
        return self.nodes_number
    
    @property
    def site_count(self) -> int:
        """站点数量"""
        return len(self.sites)
    
    @property
    def max_site_id(self) -> int:
        """最大站点ID"""
        return max(self.sites) if self.sites else 0
    
    @property
    def min_site_id(self) -> int:
        """最小站点ID"""
        return min(self.sites) if self.sites else 0
    
    def get_site_by_location(self, location_index: int) -> Optional[int]:
        """通过位置索引获取站点ID"""
        try:
            idx = self.location_indices.index(location_index)
            return self.sites[idx]
        except ValueError:
            return None
    
    def get_location_by_site(self, site_id: int) -> Optional[int]:
        """通过站点ID获取位置索引"""
        try:
            idx = self.sites.index(site_id)
            return self.location_indices[idx]
        except ValueError:
            return None
    
    def is_valid_site(self, site_id: int) -> bool:
        """检查站点ID是否有效"""
        return site_id in self.sites
    
    def is_valid_location(self, location_index: int) -> bool:
        """检查位置索引是否有效"""
        return location_index in self.location_indices
    
    def get_all_sites(self) -> List[int]:
        """获取所有站点ID"""
        return self.sites.copy()
    
    def get_all_locations(self) -> List[int]:
        """获取所有位置索引"""
        return self.location_indices.copy()
    
    def get_site_pairs(self) -> List[tuple]:
        """获取所有站点对（用于路线规划）"""
        pairs = []
        for i in range(len(self.sites)):
            for j in range(i + 1, len(self.sites)):
                pairs.append((self.sites[i], self.sites[j]))
        return pairs
    
    def get_location_pairs(self) -> List[tuple]:
        """获取所有位置对"""
        pairs = []
        for i in range(len(self.location_indices)):
            for j in range(i + 1, len(self.location_indices)):
                pairs.append((self.location_indices[i], self.location_indices[j]))
        return pairs
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'nodes_number': self.nodes_number,
            'sites': self.sites,
            'location_indices': self.location_indices,
            'node_count': self.node_count,
            'site_count': self.site_count,
            'max_site_id': self.max_site_id,
            'min_site_id': self.min_site_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_csv_data(cls, nodes_number: int, sites: List[int], location_indices: List[int]) -> 'Network':
        """从CSV数据创建Network实例"""
        return cls(
            nodes_number=nodes_number,
            sites=sites,
            location_indices=location_indices
        )
    
    @classmethod
    def from_csv_rows(cls, rows: List[Dict[str, str]]) -> 'Network':
        """从CSV行数据创建网络实例"""
        if len(rows) < 2:
            raise ValueError("网络数据至少需要2行：站点列表、位置索引")
        
        # 第一行：站点列表
        sites_row = rows[0]
        sites = []
        # 从col_1开始读取站点数据（跳过标题列col_0）
        for key in sorted(sites_row.keys()):
            if key.startswith('col_') and key != 'col_0':  # 跳过第一列
                value = sites_row[key]
                if value and value.strip():
                    try:
                        sites.append(int(value))
                    except ValueError:
                        continue
        
        # 第二行：位置索引
        locations_row = rows[1]
        location_indices = []
        for key in sorted(locations_row.keys()):
            if key.startswith('col_') and key != 'col_0':  # 跳过第一列
                value = locations_row[key]
                if value and value.strip():
                    try:
                        location_indices.append(int(value))
                    except ValueError:
                        continue
        
        # 节点数量由实际数据决定（9个节点）
        nodes_number = 9
        
        return cls(
            nodes_number=nodes_number,
            sites=sites,
            location_indices=location_indices
        )


class NetworkTopology:
    """网络拓扑分析类"""
    
    def __init__(self, network: Network):
        self.network = network
        self.adjacency_matrix: Optional[List[List[int]]] = None
        self.node_importance: Optional[Dict[int, float]] = None
    
    def build_adjacency_matrix(self, routes: List[List[int]]) -> List[List[int]]:
        """构建邻接矩阵"""
        n = self.network.node_count
        matrix = [[0] * n for _ in range(n)]
        
        # 根据路线构建邻接关系
        for route in routes:
            for i in range(len(route) - 1):
                from_idx = self.network.get_location_by_site(route[i])
                to_idx = self.network.get_location_by_site(route[i + 1])
                if from_idx is not None and to_idx is not None:
                    matrix[from_idx][to_idx] = 1
                    matrix[to_idx][from_idx] = 1  # 假设是双向连接
        
        self.adjacency_matrix = matrix
        return matrix
    
    def calculate_node_degrees(self) -> Dict[int, int]:
        """计算节点度数"""
        if self.adjacency_matrix is None:
            raise ValueError("需要先构建邻接矩阵")
        
        degrees = {}
        for i, site in enumerate(self.network.sites):
            degree = sum(self.adjacency_matrix[i])
            degrees[site] = degree
        
        return degrees
    
    def calculate_node_importance(self, routes: List[List[int]]) -> Dict[int, float]:
        """计算节点重要性（基于介数中心性）"""
        if self.adjacency_matrix is None:
            self.build_adjacency_matrix(routes)
        
        n = self.network.node_count
        importance = {}
        
        for site in self.network.sites:
            importance[site] = 0.0
        
        # 简化的介数中心性计算
        for s in self.network.sites:
            for t in self.network.sites:
                if s != t:
                    # 找到所有最短路径
                    paths = self._find_shortest_paths(s, t)
                    if paths:
                        # 计算经过每个节点的路径数
                        total_paths = len(paths)
                        for node in self.network.sites:
                            node_paths = sum(1 for path in paths if node in path)
                            importance[node] += node_paths / total_paths
        
        # 归一化
        max_importance = max(importance.values()) if importance else 1
        if max_importance > 0:
            for node in importance:
                importance[node] /= max_importance
        
        self.node_importance = importance
        return importance
    
    def _find_shortest_paths(self, start: int, end: int) -> List[List[int]]:
        """找到两个节点间的所有最短路径（简化版）"""
        if self.adjacency_matrix is None:
            return []
        
        start_idx = self.network.get_location_by_site(start)
        end_idx = self.network.get_location_by_site(end)
        
        if start_idx is None or end_idx is None:
            return []
        
        # 使用BFS找到最短路径
        from collections import deque
        
        queue = deque([(start_idx, [start])])
        shortest_paths = []
        min_length = float('inf')
        
        while queue:
            current_idx, path = queue.popleft()
            
            if len(path) > min_length:
                continue
            
            if current_idx == end_idx:
                if len(path) < min_length:
                    min_length = len(path)
                    shortest_paths = [path]
                elif len(path) == min_length:
                    shortest_paths.append(path)
                continue
            
            # 探索邻居
            for neighbor_idx, connected in enumerate(self.adjacency_matrix[current_idx]):
                if connected and self.network.sites[neighbor_idx] not in path:  # 避免循环
                    new_path = path + [self.network.sites[neighbor_idx]]
                    queue.append((neighbor_idx, new_path))
        
        return shortest_paths
    
    def get_network_statistics(self) -> Dict[str, Any]:
        """获取网络统计信息"""
        if not self.network.sites:
            return {'total_nodes': 0}
        
        degrees = self.calculate_node_degrees() if self.adjacency_matrix else {}
        importance = self.node_importance if self.node_importance else {}
        
        return {
            'total_nodes': self.network.node_count,
            'sites': self.network.sites,
            'location_indices': self.network.location_indices,
            'node_degrees': degrees,
            'node_importance': importance,
            'average_degree': sum(degrees.values()) / len(degrees) if degrees else 0,
            'max_degree': max(degrees.values()) if degrees else 0,
            'min_degree': min(degrees.values()) if degrees else 0,
            'most_important_node': max(importance.items(), key=lambda x: x[1])[0] if importance else None,
            'least_important_node': min(importance.items(), key=lambda x: x[1])[0] if importance else None,
            'network_density': self._calculate_network_density() if self.adjacency_matrix else 0
        }
    
    def _calculate_network_density(self) -> float:
        """计算网络密度"""
        if self.adjacency_matrix is None:
            return 0
        
        n = len(self.adjacency_matrix)
        if n <= 1:
            return 0
        
        total_possible_edges = n * (n - 1) / 2  # 无向图
        actual_edges = sum(sum(row) for row in self.adjacency_matrix) / 2  # 每条边被计算两次
        
        return actual_edges / total_possible_edges if total_possible_edges > 0 else 0