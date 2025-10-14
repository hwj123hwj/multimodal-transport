# 物流网络匹配系统 API 接口文档

## 概述
本文档描述了物流网络匹配系统的所有REST API接口，提供网络数据、货物管理、路线查询和匹配算法等功能。

## 基础信息
- **基础URL**: `http://localhost:8000`
- **API前缀**: `/api`
- **数据格式**: JSON
- **字符编码**: UTF-8

## 接口分类

### 📊 基础数据接口 (`/api`)

#### 1. 获取网络节点数据
```http
GET /api/network
```

**描述**: 获取所有网络节点数据

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "nodes": [
            {
                "node_id": 1,
                "node_name": "南京",
                "node_type": "city"
            }
        ],
        "total_count": 20
    }
}
```

---

#### 2. 获取货物数据
```http
GET /api/shipments
```

**描述**: 获取所有货物数据，包含城市名称映射

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "shipments": [
            {
                "shipment_id": 1,
                "origin_node": 1,
                "origin_city": "南京",
                "destination_node": 6,
                "destination_city": "苏州",
                "weight": 10.5,
                "volume": 20.0,
                "priority": 1
            }
        ],
        "total_count": 80,
        "priority_breakdown": {
            "1": 30,
            "2": 25,
            "3": 25
        }
    }
}
```

---

#### 3. 获取路线数据
```http
GET /api/routes
```

**描述**: 获取所有路线数据，包含城市名称映射

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "routes": [
            {
                "route_id": 1,
                "nodes": [1, 6],
                "node_cities": ["南京", "苏州"],
                "capacity": 100.0,
                "available_capacity": 75.5,
                "utilization_rate": 0.245
            }
        ],
        "total_count": 30
    }
}
```

---

#### 4. 获取匹配结果数据
```http
GET /api/matching-result
```

**描述**: 获取稳定匹配算法的结果数据

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "matchings": [
            {
                "shipment_id": 1,
                "assigned_route": 5
            },
            {
                "shipment_id": 2,
                "assigned_route": "Self"
            }
        ],
        "statistics": {
            "total_shipments": 80,
            "matched_shipments": 65,
            "unmatched_shipments": 15,
            "matching_rate": 0.812
        }
    }
}
```

### 🔍 查询筛选接口 (`/api`)

#### 5. 按目的地搜索货物
```http
GET /api/search/shipments?destination={node_id}
```

**描述**: 根据目的地节点ID搜索货物

**参数**:
- `destination` (必填): 目的地节点编号

**响应示例**:
```json
{
    "status": "success",
    "destination": "6",
    "count": 15,
    "shipments": [
        {
            "shipment_id": 1,
            "origin_node": 1,
            "origin_city": "南京",
            "destination_node": 6,
            "destination_city": "苏州",
            "weight": 10.5,
            "volume": 20.0,
            "priority": 1
        }
    ]
}
```

---

#### 6. 按节点筛选路线
```http
GET /api/filter/routes?origin={node_id}&destination={node_id}
```

**描述**: 根据起点和/或终点节点ID筛选路线

**参数**:
- `origin` (可选): 起点节点编号
- `destination` (可选): 终点节点编号

**注意**: 至少需要提供origin或destination参数中的一个

**响应示例**:
```json
{
    "status": "success",
    "filters": {
        "origin": "1",
        "destination": "6"
    },
    "count": 3,
    "routes": [
        {
            "route_id": 1,
            "nodes": [1, 6],
            "node_cities": ["南京", "苏州"],
            "capacity": 100.0,
            "available_capacity": 75.5,
            "utilization_rate": 0.245
        }
    ]
}
```

---

#### 7. 按容量条件筛选路线
```http
GET /api/filter/routes-by-capacity?min_available_capacity={value}&max_utilization_rate={value}
```

**描述**: 根据容量条件筛选路线

**参数**:
- `min_available_capacity` (可选): 最小可用容量
- `max_utilization_rate` (可选): 最大利用率 (0-1之间)

**响应示例**:
```json
{
    "status": "success",
    "filters": {
        "min_available_capacity": 50.0,
        "max_utilization_rate": 0.8
    },
    "count": 12,
    "routes": [
        {
            "route_id": 2,
            "nodes": [2, 7],
            "node_cities": ["无锡", "常州"],
            "capacity": 120.0,
            "available_capacity": 80.0,
            "utilization_rate": 0.333
        }
    ]
}
```

### 🎯 匹配算法接口 (`/api/matching`)

#### 8. 获取所有匹配结果
```http
GET /api/matching/
```

**描述**: 获取所有货物的匹配结果

**响应示例**:
```json
{
    "status": "success",
    "data": [
        {
            "shipment_id": 1,
            "assigned_route": 5,
            "route_details": {
                "route_id": 5,
                "nodes": [1, 6],
                "node_cities": ["南京", "苏州"]
            }
        }
    ],
    "count": 80
}
```

---

#### 9. 获取匹配摘要
```http
GET /api/matching/summary
```

**描述**: 获取匹配的统计摘要信息

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "total_shipments": 80,
        "matched_shipments": 65,
        "unmatched_shipments": 15,
        "matching_rate": 0.812,
        "average_utilization": 0.675,
        "route_usage_distribution": {
            "highly_used": 10,
            "moderately_used": 15,
            "lightly_used": 5
        }
    }
}
```

---

#### 10. 根据货物ID获取匹配结果
```http
GET /api/matching/shipment/{shipment_id}
```

**描述**: 根据特定货物ID获取其匹配结果

**路径参数**:
- `shipment_id`: 货物ID (整数)

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "shipment_id": 1,
        "assigned_route": 5,
        "route_details": {
            "route_id": 5,
            "capacity": 100.0,
            "available_capacity": 75.5,
            "utilization_rate": 0.245
        },
        "matching_score": 0.85
    }
}
```

**错误响应**:
```json
{
    "detail": "未找到货物ID 999 的匹配结果"
}
```

---

#### 11. 根据路线ID获取匹配结果
```http
GET /api/matching/route/{route_id}
```

**描述**: 根据特定路线ID获取所有匹配到该路线的货物

**路径参数**:
- `route_id`: 路线ID (整数)

**响应示例**:
```json
{
    "status": "success",
    "data": [
        {
            "shipment_id": 1,
            "shipment_details": {
                "weight": 10.5,
                "volume": 20.0,
                "priority": 1
            },
            "matching_score": 0.85
        },
        {
            "shipment_id": 3,
            "assigned_route": "Self",
            "shipment_details": {
                "weight": 15.0,
                "volume": 25.0,
                "priority": 2
            }
        }
    ],
    "count": 8
}
```

## 匹配状态说明

在匹配结果中，`assigned_route` 字段表示匹配状态：

- **数字值** (如 `5`): 表示货物成功匹配到对应ID的路线
- **"Self"**: 表示货物未匹配到任何路线，保持未分配状态

## 错误处理

所有接口统一使用以下错误响应格式：

```json
{
    "detail": "错误描述信息"
}
```

常见HTTP状态码：
- `200`: 请求成功
- `400`: 请求参数错误
- `404`: 资源未找到
- `500`: 服务器内部错误


