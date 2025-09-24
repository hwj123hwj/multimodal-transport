# 多式联运稳定匹配系统 - API接口文档

## 📋 概述

本文档描述了多式联运稳定匹配系统的REST API接口，提供网络、货物、路线、匹配等数据的访问和查询功能。

## 🚀 基础信息

- **基础URL**: `http://localhost:5000`
- **API版本**: v0.1.0
- **认证方式**: 暂无（开发阶段）
- **数据格式**: JSON

## 📡 系统接口

### 系统信息

#### GET /
获取系统基本信息

**响应示例**:
```json
{
    "message": "多式联运稳定匹配系统后端服务",
    "version": "0.1.0",
    "status": "running"
}
```

#### GET /health
系统健康检查

**响应示例**:
```json
{
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000000"
}
```

#### GET /api/info
获取系统详细信息

**响应示例**:
```json
{
    "app_name": "多式联运稳定匹配系统",
    "version": "0.1.0",
    "python_version": "3.9.0",
    "debug_mode": false
}
```

## 📊 数据接口

### 网络数据

#### GET /api/network
获取网络节点数据

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "nodes_number": 9,
        "sites": [1, 2, 3, 4, 5, 6, 7, 8, 9],
        "location_indices": [0, 1, 2, 3, 4, 5, 6, 7, 8],
        "node_count": 9,
        "matching_rate": 0.0
    }
}
```

### 货物数据

#### GET /api/shipments
获取所有货物数据

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "total_count": 80,
        "status_breakdown": {
            "pending": 40,
            "matched": 40,
            "in_transit": 0,
            "delivered": 0,
            "cancelled": 0
        },
        "shipments": [
            {
                "shipment_id": 1,
                "origin_node": "1",
                "destination_node": "9",
                "demand": 10.0,
                "weight": 1.0,
                "volume": 1.0,
                "priority": 5.0,
                "status": "pending"
            }
            // ... 更多货物数据
        ]
    }
}
```

### 路线数据

#### GET /api/routes
获取所有路线数据

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "total_count": 17,
        "capacity_stats": {
            "total_capacity": 850.0,
            "avg_utilization": 0.0
        },
        "routes": [
            {
                "route_id": 10,
                "nodes": ["1", "2", "3", "9"],
                "costs": [0, 10, 15, 35],
                "travel_times": [0, 2, 3, 7],
                "capacities": [50, 50, 50, 50],
                "available_capacity": 50,
                "utilization_rate": 0.0,
                "efficiency_score": 0.8
            }
            // ... 更多路线数据
        ]
    }
}
```

### 匹配结果

#### GET /api/matching-result
获取匹配结果数据

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "matching_count": 1,
        "matchings": [
            {
                "shipment_indices": [1, 2, 3, 4, 5, 6, 7, 8, 9],
                "route_assignments": [10, 10, 10, 4, 4, 4, 7, 7, 7],
                "statistics": {
                    "total_shipments": 9,
                    "total_routes": 4,
                    "matching_rate": 1.0,
                    "avg_route_utilization": 0.5,
                    "total_cost": 180.0,
                    "avg_cost_per_shipment": 20.0,
                    "total_time": 36.0
                }
            }
        ]
    }
}
```

### 数据摘要

#### GET /api/summary
获取所有数据的摘要信息

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "network": {
            "total_nodes": 9,
            "sites": [1, 2, 3, 4, 5, 6, 7, 8, 9]
        },
        "shipments": {
            "total": 80,
            "status_breakdown": {
                "pending": 40,
                "matched": 40,
                "in_transit": 0,
                "delivered": 0,
                "cancelled": 0
            }
        },
        "routes": {
            "total": 17,
            "total_capacity": 850.0,
            "avg_utilization": 0.0
        },
        "matching": {
            "total_matchings": 1
        }
    }
}
```

## 🔍 查询接口

### 货物搜索

#### GET /api/search/shipments
按目的地搜索货物

**参数**:
- `destination` (必填): 目的地节点编号

**请求示例**:
```
GET /api/search/shipments?destination=9
```

**响应示例**:
```json
{
    "status": "success",
    "destination": "9",
    "count": 10,
    "shipments": [
        {
            "shipment_id": 1,
            "origin_node": "1",
            "destination_node": "9",
            "demand": 10.0,
            "weight": 1.0,
            "volume": 1.0,
            "priority": 5.0,
            "status": "pending"
        }
        // ... 更多匹配货物
    ]
}
```

### 路线筛选

#### GET /api/filter/routes
按起点和终点筛选路线

**参数**:
- `origin` (可选): 起点节点编号
- `destination` (可选): 终点节点编号

**注意**: 至少需要提供一个参数

**请求示例**:
```
GET /api/filter/routes?origin=1&destination=9
GET /api/filter/routes?origin=1
GET /api/filter/routes?destination=9
```

**响应示例**:
```json
{
    "status": "success",
    "filters": {
        "origin": "1",
        "destination": "9"
    },
    "count": 2,
    "routes": [
        {
            "route_id": 10,
            "nodes": ["1", "2", "3", "9"],
            "costs": [0, 10, 15, 35],
            "travel_times": [0, 2, 3, 7],
            "capacities": [50, 50, 50, 50],
            "available_capacity": 50,
            "utilization_rate": 0.0,
            "efficiency_score": 0.8
        }
        // ... 更多匹配路线
    ]
}
```

### 多条件货物筛选

#### GET /api/filter/shipments
按多个条件筛选货物

**参数**:
- `origin` (可选): 起点节点编号
- `destination` (可选): 终点节点编号
- `status` (可选): 货物状态

**请求示例**:
```
GET /api/filter/shipments?origin=1&destination=9
GET /api/filter/shipments?status=pending
```

**响应示例**:
```json
{
    "status": "success",
    "filters": {
        "origin": "1",
        "destination": "9",
        "status": null
    },
    "count": 5,
    "shipments": [
        {
            "shipment_id": 1,
            "origin_node": "1",
            "destination_node": "9",
            "demand": 10.0,
            "weight": 1.0,
            "volume": 1.0,
            "priority": 5.0,
            "status": "pending"
        }
        // ... 更多匹配货物
    ]
}
```

### 路线容量筛选

#### GET /api/filter/routes-by-capacity
按容量条件筛选路线

**参数**:
- `min_available_capacity` (可选): 最小可用容量
- `max_utilization_rate` (可选): 最大利用率

**请求示例**:
```
GET /api/filter/routes-by-capacity?min_available_capacity=10
GET /api/filter/routes-by-capacity?max_utilization_rate=0.8
```

**响应示例**:
```json
{
    "status": "success",
    "filters": {
        "min_available_capacity": 10,
        "max_utilization_rate": null
    },
    "count": 15,
    "routes": [
        {
            "route_id": 10,
            "nodes": ["1", "2", "3", "9"],
            "costs": [0, 10, 15, 35],
            "travel_times": [0, 2, 3, 7],
            "capacities": [50, 50, 50, 50],
            "available_capacity": 50,
            "utilization_rate": 0.0,
            "efficiency_score": 0.8
        }
        // ... 更多匹配路线
    ]
}
```

### 网络统计

#### GET /api/stats/network
获取网络统计信息

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "network": {
            "total_nodes": 9,
            "sites": [1, 2, 3, 4, 5, 6, 7, 8, 9]
        },
        "shipments": {
            "total": 80,
            "status_breakdown": {
                "pending": 40,
                "matched": 40,
                "in_transit": 0,
                "delivered": 0,
                "cancelled": 0
            }
        },
        "routes": {
            "total": 17,
            "avg_utilization": 0.0,
            "total_capacity": 850.0
        },
        "connectivity": {
            "node_coverage": 9,
            "route_coverage": 9
        }
    }
}
```

## 🎯 匹配接口

### 匹配数据

#### GET /api/matching/
获取所有匹配结果

**响应示例**:
```json
{
    "status": "success",
    "data": [
        {
            "shipment_indices": [1, 2, 3, 4, 5, 6, 7, 8, 9],
            "route_assignments": [10, 10, 10, 4, 4, 4, 7, 7, 7],
            "statistics": {
                "total_shipments": 9,
                "total_routes": 4,
                "matching_rate": 1.0,
                "avg_route_utilization": 0.5,
                "total_cost": 180.0,
                "avg_cost_per_shipment": 20.0,
                "total_time": 36.0
            }
        }
    ],
    "count": 1
}
```

#### GET /api/matching/summary
获取匹配摘要信息

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "total_matchings": 1,
        "total_shipments": 9,
        "total_routes": 4,
        "matching_rate": 1.0,
        "avg_utilization": 0.5
    }
}
```

#### GET /api/matching/shipment/{shipment_id}
根据货物ID获取匹配结果

**响应示例**:
```json
{
    "status": "success",
    "data": {
        "shipment_index": 1,
        "route_assignment": 10,
        "cost": 35,
        "time": 7
    }
}
```

#### GET /api/matching/route/{route_id}
根据路线ID获取匹配结果

**响应示例**:
```json
{
    "status": "success",
    "data": [
        {
            "shipment_index": 1,
            "route_assignment": 10,
            "cost": 35,
            "time": 7
        }
    ],
    "count": 3
}
```

#### GET /api/matching/health
匹配服务健康检查

**响应示例**:
```json
{
    "status": "healthy",
    "service": "matching",
    "data_loaded": true,
    "matching_count": 1
}
```

## 🔧 工具接口

### 缓存管理

#### POST /api/cache/clear
清除数据缓存

**响应示例**:
```json
{
    "status": "success",
    "message": "数据缓存已清除"
}
```

## ⚠️ 错误处理

### 错误响应格式

所有错误响应都遵循以下格式：

```json
{
    "status": "error",
    "error": {
        "code": "ERROR_CODE",
        "message": "错误描述信息",
        "details": {
            // 额外的错误详情
        }
    },
    "timestamp": "2024-01-01T12:00:00.000000"
}
```

### 常见错误代码

| 错误代码 | HTTP状态码 | 描述 |
|---------|------------|------|
| DATA_NOT_FOUND | 404 | 请求的数据不存在 |
| DATA_VALIDATION_ERROR | 400 | 数据验证失败 |
| DATA_LOADING_ERROR | 500 | 数据加载失败 |
| BUSINESS_LOGIC_ERROR | 422 | 业务逻辑错误 |
| HTTP_400 | 400 | HTTP错误 - 错误请求 |
| HTTP_404 | 404 | HTTP错误 - 未找到 |
| HTTP_500 | 500 | HTTP错误 - 服务器内部错误 |
| INTERNAL_ERROR | 500 | 未处理的内部错误 |

## 📈 性能考虑

- 数据缓存：系统会自动缓存加载的数据，可通过 `/api/cache/clear` 清除缓存
- 分页：当前版本暂不支持分页，所有数据一次性返回
- 响应时间：预期响应时间 < 500ms（基于本地数据）

## 🔒 安全说明

当前为开发版本，暂无认证和授权机制。生产环境建议：
- 添加API密钥认证
- 实现用户权限管理
- 添加请求频率限制
- 启用HTTPS加密

## 📞 支持

如有问题请联系开发团队或提交Issue。