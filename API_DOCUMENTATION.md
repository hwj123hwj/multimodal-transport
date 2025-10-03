# 多式联运稳定匹配系统 - API接口文档

## 系统概述
本文档描述了多式联运稳定匹配系统的后端API接口，支持前端三个核心功能模块：原始路线查看、货物信息查看、匹配结果查看。

## 接口总览

| 功能模块 | 接口路径 | 方法 | 描述 |
|---------|---------|------|------|
| 原始路线查看 | `/api/routes` | GET | 获取所有路线列表 |
| 原始路线查看 | `/api/routes/{route_id}` | GET | 根据路线ID获取单条路线详情 |
| 货物信息查看 | `/api/shipments` | GET | 获取所有货物列表 |
| 匹配结果查看 | `/api/matchings` | GET | 获取所有匹配结果 |
| 匹配结果查看 | `/api/shipment/{shipment_id}` | GET | 根据货物ID获取匹配结果 |
| 匹配结果查看 | `/api/route/{route_id}` | GET | 根据路线ID获取匹配的货物列表 |
| 辅助查询 | `/api/search/shipments` | GET | 按目的地搜索货物 |
| 辅助查询 | `/api/filter/routes` | GET | 按起点终点筛选路线 |

## 核心接口详细说明

### 1. 原始路线查看功能

#### 1.1 获取所有路线列表
**接口路径**: `GET /api/routes`

**功能描述**: 获取系统中所有运输路线的完整列表，包含路线节点、成本、时间等详细信息。

**响应示例**:
```json
{
  "status": "success",
  "total_count": 20,
  "capacity_stats": {
    "total_capacity": 4000,
    "avg_utilization": 0.65
  },
  "routes": [
    {
      "route_id": 1,
      "nodes": [0, 2, 4, 6],
      "node_details": [
        {
          "node_id": 0,
          "city_name": "重庆",
          "longitude": 106.5306,
          "latitude": 29.5643
        }
      ],
      "costs": [6588.0, 5033.0, 3910.0, 774.0],
      "travel_times": [5.0, 5.0, 5.0, 3.0],
      "total_travel_time": 18.0,
      "total_cost": 16305.0,
      "total_distance": 2385.98,
      "capacity": 200.0,
      "current_load": 0,
      "available_capacity": 200.0,
      "utilization_rate": 0.0,
      "efficiency_score": 0.0,
      "is_full": false
    }
  ]
}
```

#### 1.2 获取单条路线详情
**接口路径**: `GET /api/routes/{route_id}`

**功能描述**: 根据路线ID获取特定路线的详细信息，用于地图展示和路线详情查看。

**路径参数**:
- `route_id` (integer): 路线ID

**响应示例**:
```json
{
  "status": "success",
  "route": {
    "route_id": 1,
    "nodes": [0, 2, 4, 6],
    "node_details": [
      {
        "node_id": 0,
        "city_name": "重庆",
        "longitude": 106.5306,
        "latitude": 29.5643
      },
      {
        "node_id": 2,
        "city_name": "贵阳",
        "longitude": 106.7074,
        "latitude": 26.5982
      }
    ],
    "costs": [6588.0, 5033.0, 3910.0, 774.0],
    "travel_times": [5.0, 5.0, 5.0, 3.0],
    "total_travel_time": 18.0,
    "total_cost": 16305.0,
    "total_distance": 2385.98,
    "capacity": 200.0,
    "current_load": 0,
    "available_capacity": 200.0,
    "utilization_rate": 0.0,
    "efficiency_score": 0.0,
    "is_full": false
  }
}
```

### 2. 货物信息查看功能

#### 2.1 获取所有货物列表
**接口路径**: `GET /api/shipments`

**功能描述**: 获取系统中所有货物的完整列表，以表格形式展示货物信息。

**响应示例**:
```json
{
  "status": "success",
  "total_count": 81,
  "shipments": [
    {
      "shipment_id": 1,
      "origin_node": 0,
      "origin_city": "重庆",
      "origin_longitude": 106.5306,
      "origin_latitude": 29.5643,
      "destination_node": 6,
      "destination_city": "海防",
      "destination_longitude": 106.6951,
      "destination_latitude": 10.8231,
      "demand": 49,
      "weight": 980.0,
      "volume": 1617.0,
      "time_value": 100
    }
  ]
}
```

### 3. 匹配结果查看功能

#### 3.1 获取所有匹配结果
**接口路径**: `GET /api/matchings`

**功能描述**: 获取系统中所有的匹配结果，包含匹配率、稳定性等关键指标。

**响应示例**:
```json
{
  "status": "success",
  "matching_count": 1,
  "matchings": [
    {
      "matching_rate": 0.725,
      "is_stable": true,
      "shipments": [
        {
          "shipment_id": 68,
          "assigned_route": 17,
          "origin_node": 0,
          "origin_city": "重庆",
          "origin_longitude": 106.5306,
          "origin_latitude": 29.5643,
          "destination_node": 6,
          "destination_city": "海防",
          "destination_longitude": 106.6951,
          "destination_latitude": 10.8231,
          "demand": 49,
          "time_value": 100
        }
      ],
      "routes": [
        {
          "route_id": 1,
          "matching_rate": 0.725,
          "is_stable": true,
          "shipments": [6, 8, 11, 12, 13]
        }
      ]
    }
  ],
  "count": 1
}
```

#### 3.2 根据货物ID获取匹配结果
**接口路径**: `GET /api/shipment/{shipment_id}`

**功能描述**: 根据货物ID获取该货物的匹配详情，包括分配的路线信息。

**路径参数**:
- `shipment_id` (integer): 货物ID

**响应示例**:
```json
{
  "status": "success",
  "shipment_id": 1,
  "assigned_route": 10,
  "matching_rate": 0.725,
  "is_stable": true
}
```

#### 3.3 根据路线ID获取匹配的货物列表
**接口路径**: `GET /api/route/{route_id}`

**功能描述**: 根据路线ID获取该路线匹配的所有货物，用于地图展示和路线详情分析。

**路径参数**:
- `route_id` (integer): 路线ID

**响应示例**:
```json
{
  "status": "success",
  "route_id": 1,
  "shipments": [6, 8, 11, 12, 13],
  "matching_rate": 0.725,
  "is_stable": true,
  "count": 5
}
```

## 前端功能与接口对应关系

| 前端功能 | 主要接口 | 辅助接口 | 备注 |
|---------|---------|----------|------|
| **原始路线查看** | `/api/routes` | `/api/routes/{route_id}` | 支持表格展示和地图可视化 |
| **货物信息查看** | `/api/shipments` | `/api/search/shipments` | 表格展示，支持搜索筛选 |
| **匹配结果查看** | `/api/matchings` | `/api/shipment/{id}`<br>`/api/route/{id}` | 表格+地图展示，支持详情查看 |

## 数据格式说明

### 地理坐标
所有涉及地理位置的数据都包含经纬度信息：
- `longitude`: 经度（-180到180）
- `latitude`: 纬度（-90到90）

### 匹配指标
- `matching_rate`: 匹配率（0-1之间的小数）
- `is_stable`: 匹配稳定性（布尔值）

### 路线容量
- `capacity`: 总容量
- `current_load`: 当前负载
- `available_capacity`: 可用容量
- `utilization_rate`: 利用率（0-1之间的小数）

## 错误处理

所有接口统一返回格式：
```json
{
  "status": "error",
  "detail": "错误详情信息"
}
```

HTTP状态码：
- `200`: 请求成功
- `400`: 请求参数错误
- `404`: 资源未找到
- `500`: 服务器内部错误

## 版本信息
- API版本: v1.0
- 最后更新: 2025-10-03
- 文档编写: 多式联运稳定匹配系统开发团队