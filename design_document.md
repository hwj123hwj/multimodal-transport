# 多式联运稳定匹配网站设计文档

## 1. 项目概述

### 1.1 项目背景
本项目旨在构建一个多式联运稳定匹配结果展示网站，通过可视化方式展示货物运输网络中的匹配算法结果，帮助用户直观理解匹配效果和网络性能。

### 1.2 项目目标
- 展示多式联运网络的拓扑结构和节点分布
- 可视化货物分配结果和路径选择
- 提供路线利用率和网络性能分析
- 支持交互式数据查询和筛选功能

## 2. 技术架构

### 2.1 技术栈选择
- **后端**: Python 3.12 + Flask/FastAPI
- **前端**: HTML5 + CSS3 + JavaScript (原生，无框架)
- **数据可视化**: D3.js + Chart.js
- **数据处理**: Pandas + NumPy
- **地图可视化**: Leaflet.js (用于网络拓扑图)

### 2.2 架构设计
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端展示层     │    │   后端服务层     │    │   数据存储层     │
│  HTML+CSS+JS    │◄──►│  Python Flask   │◄──►│   CSV数据文件   │
│  D3.js+Chart.js │    │   RESTful API   │    │   静态文件系统   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 3. 数据模型设计

### 3.1 输入数据结构

#### 3.1.1 网络数据 (network.csv)
```python
class Network:
    nodes_number: int      # 节点数量
    sites: List[str]       # 站点标识列表
    location_indices: List[int]  # 位置索引列表
```

#### 3.1.2 货物数据 (shipment.csv)
```python
class Shipment:
    shipment_index: int    # 货物索引
    origin: int           # 起始节点
    destination: int      # 目标节点
    demand: int           # 需求量(TEU)
    classification: int   # 货物分类
    time_value: int       # 时间价值(CNY/TEU)
```

#### 3.1.3 路线数据 (route.csv)
```python
class Route:
    route_index: int      # 路线索引
    mode: int            # 运输模式
    nodes: List[int]     # 节点序列
    costs: List[int]     # 运费列表
    travel_times: List[int]  # 旅行时间列表
    capacity: int        # 路线容量
```

#### 3.1.4 匹配结果 (stable_matching.csv)
```python
class MatchingResult:
    shipments: List[int]   # 货物索引列表
    routes: List[str]      # 匹配路线列表("Self"表示未匹配)
    total_capacity: int  # 总容量
    total_containers: int # 总集装箱数
    matched_containers: int # 已匹配集装箱数
    is_stable: bool       # 是否稳定
    iteration_num: int   # 迭代次数
    restart_num: int     # 重启次数
    cpu_time: float      # CPU时间
```

## 4. 功能模块设计

### 4.1 数据加载与处理模块

#### 4.1.1 数据加载器 (DataLoader)
```python
class DataLoader:
    def load_network() -> Network
    def load_shipments() -> List[Shipment]
    def load_routes() -> List[Route]
    def load_matching_result() -> MatchingResult
    def load_cooperation_params() -> List[List[int]]
```

#### 4.1.2 数据处理器 (DataProcessor)
```python
class DataProcessor:
    def process_matching_details() -> List[Dict]
    def calculate_route_utilization() -> List[Dict]
    def group_shipments_by_destination() -> Dict[int, List[Shipment]]
    def analyze_unmatched_shipments() -> List[Dict]
```

### 4.2 API接口设计

#### 4.2.1 基础数据接口
- `GET /api/network` - 获取网络拓扑数据
- `GET /api/shipments` - 获取货物数据
- `GET /api/routes` - 获取路线数据
- `GET /api/matching-result` - 获取匹配结果

#### 4.2.2 分析数据接口
- `GET /api/matching-details` - 获取详细匹配信息
- `GET /api/route-utilization` - 获取路线利用率
- `GET /api/destination-analysis` - 按目的地分析
- `GET /api/value-analysis` - 按货物价值分析

#### 4.2.3 筛选查询接口
- `GET /api/search/shipments?origin=&destination=&value=` - 货物搜索
- `GET /api/filter/routes?utilization_min=&utilization_max=` - 路线筛选

### 4.3 前端页面设计

#### 4.3.1 主页面 (index.html)
- **功能**: 总体概览和导航
- **组件**: 
  - 统计卡片组件
  - 快速导航菜单
  - 系统状态显示

#### 4.3.2 网络拓扑页面 (network.html)
- **功能**: 展示网络结构和节点分布
- **可视化**: 
  - 节点分布图
  - 连接关系图
  - 节点信息面板

#### 4.3.3 货物分配页面 (shipments.html)
- **功能**: 展示货物分配详情
- **组件**:
  - 货物列表表格
  - 筛选和搜索功能
  - 分配状态统计

#### 4.3.4 路线分析页面 (routes.html)
- **功能**: 路线利用率和性能分析
- **可视化**:
  - 路线利用率柱状图
  - 路线负载热力图
  - 路线性能对比

#### 4.3.5 匹配结果页面 (matching.html)
- **功能**: 匹配结果详细分析
- **组件**:
  - 匹配成功率图表
  - 未匹配货物分析
  - 算法性能指标

## 5. 数据可视化设计

### 5.1 网络拓扑图
- **技术**: D3.js Force Simulation
- **元素**:
  - 节点: 圆形，大小表示重要性
  - 边: 线条，粗细表示连接强度
  - 标签: 节点名称和索引

### 5.2 货物分配图表
- **饼图**: 匹配状态分布
- **柱状图**: 按目的地分组统计
- **散点图**: 需求量vs时间价值

### 5.3 路线利用率可视化
- **热力图**: 路线负载强度
- **仪表盘**: 利用率百分比
- **趋势线**: 历史利用率变化

### 5.4 匹配结果图表
- **KPI卡片**: 关键指标展示
- **流程图**: 算法执行过程
- **对比图**: 匹配前后效果对比

## 6. 交互功能设计

### 6.1 数据筛选
- **货物筛选**: 按起点、终点、需求量、时间价值
- **路线筛选**: 按利用率、容量、成本
- **时间筛选**: 按创建时间、更新时间

### 6.2 搜索功能
- **货物搜索**: 支持模糊搜索和精确搜索
- **路线搜索**: 按节点序列搜索
- **结果高亮**: 搜索结果高亮显示

### 6.3 详情展示
- **悬停提示**: 鼠标悬停显示详细信息
- **点击展开**: 点击展开更多详情
- **模态框**: 重要信息的弹窗展示

## 7. 性能优化

### 7.1 后端优化
- **数据缓存**: 静态数据内存缓存
- **分页加载**: 大数据分页处理
- **异步处理**: 耗时操作异步执行

### 7.2 前端优化
- **懒加载**: 按需加载可视化组件
- **虚拟滚动**: 大数据表格优化
- **图表缓存**: 图表数据本地缓存

### 7.3 数据传输优化
- **数据压缩**: JSON数据Gzip压缩
- **增量更新**: 只传输变化的数据
- **CDN加速**: 静态资源CDN分发

## 8. 部署方案

### 8.1 开发环境
```bash
# Python环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install flask pandas numpy

# 前端依赖
# 使用CDN引入D3.js, Chart.js, Leaflet.js
```

### 8.2 生产环境
- **Web服务器**: Nginx + Gunicorn
- **容器化**: Docker容器部署
- **监控**: 日志监控和性能监控

### 8.3 目录结构
```
expe_backend/
├── app.py              # Flask应用主文件
├── requirements.txt    # Python依赖
├── static/            # 静态资源
│   ├── css/          # 样式文件
│   ├── js/           # JavaScript文件
│   └── images/       # 图片资源
├── templates/         # HTML模板
├── data/             # 数据文件
├── utils/            # 工具模块
│   ├── data_loader.py
│   ├── data_processor.py
│   └── visualizer.py
└── tests/            # 测试文件
```

## 9. 开发计划

### 9.1 第一阶段 (基础功能)
- [ ] 数据加载模块开发
- [ ] 基础API接口实现
- [ ] 主页面和基础布局
- [ ] 网络拓扑图展示

### 9.2 第二阶段 (核心功能)
- [ ] 货物分配详情页面
- [ ] 路线利用率分析
- [ ] 数据筛选和搜索功能
- [ ] 匹配结果可视化

### 9.3 第三阶段 (高级功能)
- [ ] 交互式图表优化
- [ ] 性能优化和缓存
- [ ] 移动端适配
- [ ] 用户反馈和改进

## 10. 预期效果

### 10.1 用户体验
- 直观的数据可视化展示
- 流畅的交互操作体验
- 快速的数据查询响应
- 清晰的分析结果呈现

### 10.2 技术效果
- 模块化的代码结构
- 高性能的数据处理
- 可扩展的架构设计
- 易于维护的代码质量

### 10.3 业务价值
- 提升匹配结果的可理解性
- 辅助运输网络优化决策
- 支持算法性能分析
- 促进多式联运发展