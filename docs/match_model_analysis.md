# 数据模型分析文档

## 概述

本文档分析了多式联运稳定匹配系统的数据模型，主要聚焦于 `StableMatching` 模型，该模型用于处理和解析 `stable_matching.csv` 文件中的匹配结果数据。

## StableMatching 模型分析

### 数据来源与字段分类

#### 直接来源于CSV文件的字段

`StableMatching` 模型中的以下字段直接从 `stable_matching.csv` 文件解析获得：

| 字段名 | CSV来源 | 数据描述 | 示例值 |
|--------|---------|----------|---------|
| `shipment_indices` | 第一行"Shipment" | 货物索引列表（1-80） | [1, 2, 3, ..., 80] |
| `route_assignments` | 第二行"Route" | 路线分配（数字或"Self"） | [10, 10, 4, "Self", ...] |
| `total_capacity` | 第三行"Total capacity in route" | 路线总容量 | 8900 TEU |
| `total_container_number` | 第四行"Total container number in shipment" | 货物总集装箱数 | 3198 TEU |
| `total_matched_container_number` | 第五行"Total matched container number" | 已匹配集装箱总数 | 2519 TEU |
| `is_stable` | 第六行"Stable or not" | 匹配稳定性 | True |
| `iteration_num` | 第七行"Iteration num" | 迭代次数 | 53 |
| `restart_num` | 第八行"Restart num" | 重启次数 | 21 |
| `cpu_time` | 第九行"CPU time" | CPU执行时间 | 3.562秒 |

#### 计算字段（属性方法）

以下字段通过计算得出，提供业务统计信息：

| 属性名 | 计算方法 | 业务含义 |
|--------|----------|----------|
| `total_shipments` | `len(shipment_indices)` | 总货物数量 |
| `matched_shipments` | 统计非"Self"路线数量 | 已匹配的货物数量 |
| `unmatched_shipments` | 统计"Self"路线数量 | 未匹配的货物数量 |
| `matching_rate` | 已匹配货物/总货物 | 货物匹配率 |
| `container_matching_rate` | 已匹配集装箱/总集装箱 | 集装箱匹配率 |

### 核心方法分析

#### 1. 数据验证 (`__post_init__`)

**功能**：确保数据完整性和逻辑一致性

**验证规则**：
- 货物索引数量与路线分配数量必须一致
- 已匹配集装箱数不能超过总集装箱数
- CPU时间不能为负数

**重要性**：防止无效数据进入系统，保证后续计算的准确性。

#### 2. 路线使用统计 (`get_route_usage`)

**功能**：统计每条路线的使用频率

**返回值示例**：
```python
{
    10: 15,    # 路线10被使用15次
    1: 8,      # 路线1被使用8次
    "Self": 23  # 23个货物未匹配
}
```

**应用场景**：分析路线利用率，识别高频使用路线。

#### 3. 路线货物查询 (`get_matches_by_route`)

**功能**：获取分配到特定路线的所有货物

**参数**：路线ID（支持"Self"）
**返回值**：货物索引列表

**应用场景**：
- 分析特定路线的货物分配情况
- 计算路线负载
- 优化路线配置

#### 4. 货物分配查询 (`get_shipment_assignment`)

**功能**：查询单个货物的路线分配情况

**参数**：货物ID
**返回值**：分配的路线或"Self"

**应用场景**：
- 单个货物跟踪
- 异常处理
- 客户服务查询

#### 5. 数据序列化 (`to_dict`)

**功能**：将模型转换为字典格式，便于API响应和前端展示

**输出结构**：
```python
{
    'total_shipments': 80,
    'matched_shipments': 57,
    'unmatched_shipments': 23,
    'matching_rate': 0.7125,
    'total_capacity': 8900,
    'total_container_number': 3198,
    'total_matched_container_number': 2519,
    'container_matching_rate': 0.7877,
    'is_stable': True,
    'iteration_num': 53,
    'restart_num': 21,
    'cpu_time': 3.562,
    'route_usage': {...},
    'shipments': [
        {'shipment_id': 1, 'assigned_route': 10},
        // ... 详细分配数据
    ]
}
```

#### 6. CSV解析工厂方法 (`from_csv_rows`)

**功能**：从CSV行数据创建模型实例

**输入参数**：
- `shipment_row`: 货物索引行
- `route_row`: 路线分配行
- `statistics_rows`: 统计信息行

**处理逻辑**：
1. 跳过标题列（第一列）
2. 将数字字符串转换为整数
3. 保留"Self"作为字符串标识
4. 解析统计信息到对应字段

**设计优势**：
- 解耦数据解析与业务逻辑
- 支持批量处理
- 便于单元测试

### MatchingCollection 管理类

#### 功能概述

`MatchingCollection` 类用于管理多个匹配结果，支持历史数据追踪和统计分析。

#### 核心方法

##### 统计摘要 (`get_statistics_summary`)

**输出指标**：
- 总运行次数
- 最新匹配结果
- 平均CPU时间
- 平均匹配率
- 稳定匹配次数

**应用场景**：
- 系统性能监控
- 算法效果评估
- 历史趋势分析

## 业务价值分析

### 1. 匹配效果评估

通过计算字段可以评估匹配算法的效果：
- **匹配率**：71.25%（57/80货物匹配成功）
- **集装箱匹配率**：78.77%（2519/3198集装箱匹配成功）
- **稳定性**：匹配结果稳定（True）

### 2. 系统性能指标

- **迭代次数**：53次（算法收敛速度）
- **重启次数**：21次（算法鲁棒性）
- **CPU时间**：3.562秒（执行效率）

### 3. 资源配置优化

通过路线使用统计，可以：
- 识别高频使用路线
- 优化路线容量配置
- 发现未充分利用的路线

## 扩展性设计

### 1. 数据类型灵活性

- 支持整数路线ID和"Self"字符串
- 使用 `Union[int, str]` 类型注解
- 便于处理特殊情况

### 2. 错误处理机制

- 数据验证确保数据质量
- 异常处理防止系统崩溃
- 提供详细的错误信息

### 3. 序列化支持

- `to_dict()` 方法支持JSON序列化
- 包含完整的业务数据
- 便于API响应和前端展示

## 使用建议

### 1. 数据加载流程

```python
# 1. 读取CSV文件
# 2. 解析为行数据
# 3. 使用from_csv_rows创建模型
# 4. 进行业务处理
# 5. 使用to_dict返回API响应
```

### 2. 性能优化建议

- 缓存频繁查询的计算结果
- 批量处理多个货物查询
- 使用索引优化大数据集查询

### 3. 监控指标

建议监控的关键指标：
- 匹配成功率
- 平均匹配时间
- 系统稳定性
- 路线利用率

## 总结

`StableMatching` 模型设计合理，很好地平衡了数据完整性和业务灵活性。通过直接字段和计算属性的分离，既保证了数据准确性，又提供了丰富的业务洞察。模型的扩展性设计使其能够适应未来业务需求的变化。