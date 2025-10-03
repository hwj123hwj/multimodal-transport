# 多式联运稳定匹配系统 - 完整技术开发文档

## 📋 文档概述
本文档整合了前端需求和后端接口，为多式联运稳定匹配系统的完整开发提供技术指导，涵盖三大核心功能模块：原始路线查看、货物信息管理、匹配结果展示。

## 🏗️ 系统架构

### 技术栈总览
| 层级 | 技术选型 | 版本要求 |
|------|----------|----------|
| **后端** | Python + FastAPI | Python 3.8+ |
| **前端** | React + JavaScript | React 18+ |
| **地图服务** | 百度地图JavaScript API | v3.0 |
| **UI组件库** | Ant Design | 5.0+ |
| **状态管理** | React Context + useReducer | - |
| **HTTP客户端** | Axios | 最新版 |
| **构建工具** | Vite | 最新版 |


## 🔗 前后端接口对接

### 功能一：原始路线查看模块

#### 前端界面需求
- **双地图模式**：百度地图模式 + SVG矢量模式
- **路线可视化**：完整显示所有运输路线，不同颜色标识
- **交互功能**：点击路线高亮、悬停显示信息、轨迹动画
- **数据表格**：分页展示、列排序、关键字搜索
- **筛选功能**：按起点/终点城市、成本范围、时间范围筛选

#### 后端接口对接
| 前端功能 | API接口 | 请求参数 | 响应数据 |
|----------|---------|----------|----------|
| 获取路线列表 | `GET /api/routes` | 无 | 所有路线数据含地理坐标 |
| 获取单条路线 | `GET /api/routes/{route_id}` | route_id | 单条路线详细信息 |
| 路线筛选 | `GET /api/filter/routes` | origin, destination | 筛选后的路线列表 |

#### 关键数据结构
```javascript
// 路线数据格式
const routeData = {
  route_id: 1,
  node_details: [
    {
      node_id: 0,
      city_name: "重庆",
      longitude: 106.5306,
      latitude: 29.5643
    }
  ],
  costs: [6588.0, 5033.0, 3910.0, 774.0],
  travel_times: [5.0, 5.0, 5.0, 3.0],
  total_travel_time: 18.0,
  total_cost: 16305.0,
  total_distance: 2385.98,
  capacity: 200.0
};
```

#### 前端实现代码示例
```javascript
// 百度地图路线绘制
const drawRouteOnMap = (map, routeData) => {
  const points = routeData.node_details.map(node => 
    new BMap.Point(node.longitude, node.latitude)
  );
  
  const polyline = new BMap.Polyline(points, {
    strokeColor: getRouteColor(routeData.route_id),
    strokeWeight: 4,
    strokeOpacity: 0.8
  });
  
  map.addOverlay(polyline);
  
  // 添加点击事件
  polyline.addEventListener("click", () => {
    showRouteDetails(routeData);
  });
};

// 获取路线数据
const fetchRoutes = async () => {
  try {
    const response = await axios.get('/api/routes');
    return response.data.routes;
  } catch (error) {
    message.error('获取路线数据失败');
    return [];
  }
};
```

### 功能二：货物信息管理模块

#### 前端界面需求
- **数据表格**：完整货物信息展示，支持列排序
- **搜索筛选**：按起点/终点城市、货物ID、关键字搜索
- **货物操作**：查看详情、编辑信息、删除、批量操作
- **数据导入导出**：Excel导入、CSV导出
- **统计信息**：总数量、总重量、总体积、平均时间价值

#### 后端接口对接
| 前端功能 | API接口 | 请求参数 | 响应数据 |
|----------|---------|----------|----------|
| 获取货物列表 | `GET /api/shipments` | 无 | 所有货物详细信息 |
| 搜索货物 | `GET /api/search/shipments` | destination | 按目的地筛选的货物 |

#### 关键数据结构
```javascript
// 货物数据格式
const shipmentData = {
  shipment_id: 1,
  origin_node: 0,
  origin_city: "重庆",
  origin_longitude: 106.5306,
  origin_latitude: 29.5643,
  destination_node: 6,
  destination_city: "海防",
  destination_longitude: 106.6951,
  destination_latitude: 10.8231,
  demand: 49,
  weight: 980.0,
  volume: 1617.0,
  time_value: 100
};
```

#### 前端实现代码示例
```javascript
// 货物表格列配置
const shipmentColumns = [
  {
    title: '货物ID',
    dataIndex: 'shipment_id',
    key: 'shipment_id',
    sorter: (a, b) => a.shipment_id - b.shipment_id,
  },
  {
    title: '起点城市',
    dataIndex: 'origin_city',
    key: 'origin_city',
    filters: cityFilters,
    onFilter: (value, record) => record.origin_city === value,
  },
  {
    title: '重量(kg)',
    dataIndex: 'weight',
    key: 'weight',
    sorter: (a, b) => a.weight - b.weight,
  },
  {
    title: '体积(m³)',
    dataIndex: 'volume',
    key: 'volume',
    sorter: (a, b) => a.volume - b.volume,
  },
  {
    title: '时间价值',
    dataIndex: 'time_value',
    key: 'time_value',
    sorter: (a, b) => a.time_value - b.time_value,
  },
  {
    title: '操作',
    key: 'action',
    render: (text, record) => (
      <Space size="middle">
        <Button onClick={() => showShipmentDetails(record)}>查看</Button>
        <Button onClick={() => editShipment(record)}>编辑</Button>
        <Button danger onClick={() => deleteShipment(record)}>删除</Button>
      </Space>
    ),
  }
];

// 获取货物数据
const fetchShipments = async (filters) => {
  try {
    const response = await axios.get('/api/shipments', {
      params: filters
    });
    return response.data.shipments;
  } catch (error) {
    message.error('获取货物数据失败');
    return [];
  }
};
```

### 功能三：匹配结果展示模块

#### 前端界面需求
- **双视图模式**：地图视图 + 表格视图
- **地图可视化**：匹配路线、已匹配货物、未匹配货物
- **交互功能**：点击路线显示货物列表、点击货物显示分配详情
- **统计分析**：整体匹配率、稳定性状态、各路线匹配情况
- **数据导出**：匹配结果、路线分配详情、统计分析报告

#### 后端接口对接
| 前端功能 | API接口 | 请求参数 | 响应数据 |
|----------|---------|----------|----------|
| 获取匹配结果 | `GET /api/matchings` | 无 | 所有匹配结果数据 |
| 获取货物匹配详情 | `GET /api/shipment/{shipment_id}` | shipment_id | 单货物匹配详情 |
| 获取路线匹配货物 | `GET /api/route/{route_id}` | route_id | 路线匹配的货物列表 |

#### 关键数据结构
```javascript
// 匹配结果数据格式
const matchingData = {
  matching_rate: 0.725,
  is_stable: true,
  shipments: [
    {
      shipment_id: 68,
      assigned_route: 17,
      origin_city: "重庆",
      destination_city: "海防",
      demand: 49,
      time_value: 100
    }
  ],
  routes: [
    {
      route_id: 1,
      matching_rate: 0.725,
      is_stable: true,
      shipments: [6, 8, 11, 12, 13]
    }
  ]
};
```

#### 前端实现代码示例
```javascript
// 匹配结果地图展示
const displayMatchingResults = (map, matchingData) => {
  // 绘制匹配路线
  matchingData.routes.forEach(route => {
    drawMatchingRoute(map, route);
  });
  
  // 标记货物
  matchingData.shipments.forEach(shipment => {
    if (shipment.assigned_route === "Self") {
      // 自营货物 - 灰色标记
      addShipmentMarker(map, shipment, 'gray');
    } else {
      // 已匹配货物 - 绿色标记
      addShipmentMarker(map, shipment, 'green');
    }
  });
};

// 路线点击事件处理
const handleRouteClick = async (routeData) => {
  // 高亮路线
  highlightRoute(routeData.route_id);
  
  // 获取匹配的货物
  try {
    const response = await axios.get(`/api/route/${routeData.route_id}`);
    setSelectedShipments(response.data.shipments);
    setShowDetailPanel(true);
  } catch (error) {
    message.error('获取路线货物数据失败');
  }
};
```

## 🎯 开发实施指南

### 项目初始化
```bash
# 创建React项目
npm create vite@latest frontend --template react

# 安装依赖
npm install antd axios react-router-dom @ant-design/icons

# 百度地图API引入
# 在index.html中添加
<script type="text/javascript" src="https://api.map.baidu.com/api?v=3.0&ak=您的密钥"></script>
```

### 项目结构建议
```
src/
├── components/          # 通用组件
│   ├── MapViewer/      # 地图查看器组件
│   ├── DataTable/      # 数据表格组件
│   ├── FilterPanel/    # 筛选面板组件
│   └── Charts/         # 图表组件
├── pages/              # 页面组件
│   ├── RoutesView/     # 路线查看页面
│   ├── ShipmentsView/  # 货物管理页面
│   └── MatchingView/   # 匹配结果页面
├── services/           # API服务
│   ├── api.js          # API请求封装
│   └── mapService.js   # 地图相关服务
├── hooks/              # 自定义Hooks
│   ├── useMap.js       # 地图操作Hook
│   └── useData.js      # 数据管理Hook
├── utils/              # 工具函数
│   ├── formatters.js   # 数据格式化
│   └── constants.js    # 常量定义
└── App.jsx             # 主应用组件
```

### 路由配置
```javascript
// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RoutesView from './pages/RoutesView';
import ShipmentsView from './pages/ShipmentsView';
import MatchingView from './pages/MatchingView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/routes" element={<RoutesView />} />
        <Route path="/shipments" element={<ShipmentsView />} />
        <Route path="/matching" element={<MatchingView />} />
        <Route path="/" element={<MatchingView />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### API服务封装
```javascript
// services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      message.error(error.response.data.detail || '请求失败');
    } else if (error.request) {
      message.error('网络连接失败');
    } else {
      message.error('请求配置错误');
    }
    return Promise.reject(error);
  }
);

// API方法
export const routesAPI = {
  getAll: () => api.get('/routes'),
  getById: (id) => api.get(`/routes/${id}`),
  filter: (params) => api.get('/filter/routes', { params }),
};

export const shipmentsAPI = {
  getAll: () => api.get('/shipments'),
  search: (params) => api.get('/search/shipments', { params }),
};

export const matchingAPI = {
  getAll: () => api.get('/matchings'),
  getShipment: (id) => api.get(`/shipment/${id}`),
  getRoute: (id) => api.get(`/route/${id}`),
};
```

### 地图服务封装
```javascript
// services/mapService.js
export class MapService {
  constructor(containerId) {
    this.map = new BMap.Map(containerId);
    this.map.centerAndZoom(new BMap.Point(106.5, 26.0), 7);
    this.map.enableScrollWheelZoom(true);
    this.polylines = new Map();
    this.markers = new Map();
  }

  // 绘制路线
  drawRoute(routeData, color = '#1890ff') {
    const points = routeData.node_details.map(node => 
      new BMap.Point(node.longitude, node.latitude)
    );
    
    const polyline = new BMap.Polyline(points, {
      strokeColor: color,
      strokeWeight: 4,
      strokeOpacity: 0.8
    });
    
    this.map.addOverlay(polyline);
    this.polylines.set(routeData.route_id, polyline);
    
    return polyline;
  }

  // 添加标记
  addMarker(point, options = {}) {
    const marker = new BMap.Marker(point, options);
    this.map.addOverlay(marker);
    return marker;
  }

  // 清除所有覆盖物
  clearOverlays() {
    this.map.clearOverlays();
    this.polylines.clear();
    this.markers.clear();
  }

  // 高亮路线
  highlightRoute(routeId) {
    const polyline = this.polylines.get(routeId);
    if (polyline) {
      polyline.setStrokeColor('#ff4d4f');
      polyline.setStrokeWeight(6);
    }
  }

  // 重置路线样式
  resetRouteStyle(routeId) {
    const polyline = this.polylines.get(routeId);
    if (polyline) {
      polyline.setStrokeColor('#1890ff');
      polyline.setStrokeWeight(4);
    }
  }
}
```

## 📊 数据流设计

### 路线数据流
```
后端数据库 → API接口(/api/routes) → 前端获取 → 地图展示/表格展示
```

### 货物数据流
```
后端数据库 → API接口(/api/shipments) → 前端获取 → 表格展示/搜索筛选
```

### 匹配结果数据流
```
后端算法 → API接口(/api/matchings) → 前端获取 → 地图标记/表格展示
```

