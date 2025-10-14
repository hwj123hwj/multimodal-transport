# 多式联运稳定匹配系统

## 📋 项目简介

这是一个基于稳定匹配算法的多式联运优化系统，通过智能匹配算法实现货物运输需求与运输资源的最优配对，提高物流效率，降低运输成本。

## 🎯 核心功能

### 智能匹配引擎
- **稳定匹配算法**: 基于算法的改进版本，确保货物与路线的最优匹配
- **多维度评估**: 综合考虑货物重量、体积、优先级和路线容量、成本等因素
- **实时计算**: 支持大规模数据的快速匹配计算（测试数据：80个货物，17条路线，毫秒级响应）
- **结果可视化**: 提供直观的匹配结果展示和统计分析，匹配率达到72.5%

### 多式联运支持
- **运输方式**: 多式联运
- **路线优化**: 智能选择最佳运输路径和转运节点
- **成本分析**: 提供详细的运输成本分析和比较

### 数据管理
- **数据导入**: 支持CSV格式的货物、路线数据导入
- **数据验证**: 自动验证数据格式和业务规则的合规性，确保数据质量
- **历史记录**: 完整保存数据上传和算法执行历史，支持历史数据查询和回溯（还未实现，计划开发保存历史算法执行功能）
- **导出功能**: 支持匹配结果、统计数据CSV格式导出

### 可视化界面
- **交互式地图**: 基于高德地图API的网络节点和路线可视化展示
- **实时仪表板**: 动态展示系统运行状态、匹配统计、容量利用率等关键指标
- **数据表格**: 提供排序、筛选、分页、搜索等功能的数据展示

### 系统管理
- **健康监控**: 实时监控系统运行状态和性能指标
- **任务管理**: 支持算法任务的异步执行、状态跟踪和结果查询
- **用户友好**: 直观的操作界面，完整的错误提示和帮助信息
- **扩展性强**: 模块化设计，支持新功能和新算法的快速集成

## 🏗️ 系统架构

### 技术栈
- **后端**: Python + FastAPI + Uvicorn
- **前端**: React + Ant Design + Axios
- **部署**: Docker + Docker Compose + Nginx
- **算法**: C++ 稳定匹配算法
- **地图服务**: 百度地图API


### 项目结构
```
expe_backend/
├── app/                    # 后端应用代码
│   ├── models/            # 数据模型 (Network, Shipment, Route, MatchingResult)
│   ├── routes/            # API路由 (data, matching, query)
│   ├── services/          # 业务逻辑 (MatchingService, DataService)
│   └── utils/             # 工具函数 (文件处理、数据验证)
├── frontend/              # 前端React应用
│   ├── public/            # 静态资源
│   ├── src/
│   │   ├── components/    # 可复用组件 (DataTable, MapViewer)
│   │   ├── pages/         # 页面组件 (Dashboard, DataUpload, Matching, Routes, Shipments)
│   │   ├── services/      # API服务封装 (axios实例、各模块API)
│   │   └── utils/         # 工具函数 (常量、格式化)
├── cmake-build-debug/     # C++算法构建目录
│   └── stable_match.exe   # 稳定匹配算法可执行文件
├── docs/                  # 项目文档
│   └── API接口文档.md     # 详细API文档
├── nginx/                 # Nginx配置
├── data/                  # 数据文件目录
├── docker-compose.yml     # Docker开发环境配置
├── docker-compose.prod.yml # Docker生产环境配置
├── Dockerfile.backend     # 后端Docker镜像
├── Dockerfile.frontend    # 前端Docker镜像
├── pyproject.toml         # Python项目配置
└── requirements.txt       # Python依赖包
```

### 核心模块设计

#### 后端架构
- **数据模型层**: 定义Network、Shipment、Route、MatchingResult等核心数据结构
- **服务层**: MatchingService封装算法调用逻辑，DataService处理数据管理
- **路由层**: 按功能模块划分API接口，支持RESTful设计规范
- **工具层**: 提供文件处理、数据验证、错误处理等通用功能

#### 前端架构
- **组件化设计**: 通用组件(DataTable、MapViewer)与业务组件分离
- **状态管理**: 使用React Hooks进行组件状态管理
- **API封装**: 统一的axios实例，按业务模块组织API方法
- **UI框架**: 基于Ant Design提供一致的交互体验

#### 算法集成
- **独立进程**: C++算法作为独立可执行文件运行
- **文件交互**: 通过CSV文件进行数据输入输出
- **异步处理**: 支持长时间运行的算法任务
- **结果解析**: 自动解析算法输出并更新数据库

## 🚀 快速开始

### 环境要求
- Python 3.12+
- Node.js 18+
- Docker (可选)

### 本地开发部署

1. **克隆项目**
   ```bash
   git clone https://github.com/weijian-huang/expe_backend.git
   cd expe_backend
   ```

2. **后端部署**
   ```bash
   # 创建虚拟环境
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate

   # 安装依赖
    uv sync

   # 编辑.env文件，配置必要的参数(可选)

   # 启动后端服务
   python app.py
   ```

3. **前端部署**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **验证部署**
   成功启动后，可以通过以下地址访问系统：
   - **前端界面**: http://localhost:3000
   - **后端API**: http://localhost:8000
   - **API文档**: http://localhost:8000/docs
   - **系统监控**: http://localhost:8000/api/info

## 📊 API接口

系统提供完整的REST API接口，支持数据查询、匹配算法执行等功能。所有接口统一返回JSON格式数据，采用标准HTTP状态码。

### 📤 数据管理接口

#### 数据上传
```http
POST /api/data/upload
Content-Type: multipart/form-data

文件上传，支持Excel和CSV格式
```

#### 数据预览
```http
GET /api/data/preview/{file_id}
```

#### 历史数据
```http
GET /api/data/history
```

### 🎯 匹配算法接口

#### 执行匹配
```http
POST /api/matching/execute
Content-Type: application/json

{
  "data_id": "uploaded_file_id",
  "parameters": {
    "algorithm": "stable_matching",
    "weights": {
      "cost": 0.4,
      "time": 0.3,
      "reliability": 0.3
    }
  }
}
```

#### 获取匹配结果
```http
GET /api/matching/results/{matching_id}
```

#### 获取所有匹配
```http
GET /api/matching/
```

#### 匹配摘要统计
```http
GET /api/matching/summary
```

### 🔍 查询筛选接口

#### 网络节点数据
```http
GET /api/network
```

#### 货物数据
```http
GET /api/shipments
```

#### 路线数据
```http
GET /api/routes
```

#### 按条件筛选
```http
GET /api/search/shipments?destination={node_id}
GET /api/filter/routes?origin={node_id}&destination={node_id}
GET /api/filter/routes-by-capacity?min_available_capacity={value}&max_utilization_rate={value}
```

### ⚙️ 系统管理接口

#### 健康检查
```http
GET /health
```

#### 系统信息
```http
GET /api/info
```

#### API文档
```http
GET /docs      # Swagger UI
GET /redoc     # ReDoc
```

### 📋 接口规范

#### 响应格式
所有接口统一返回JSON格式数据，错误响应格式如下：
```json
{
    "detail": "错误描述信息"
}
```

#### HTTP状态码
- `200`: 请求成功
- `400`: 请求参数错误
- `404`: 资源未找到
- `500`: 服务器内部错误

#### 匹配状态说明
在匹配结果中，`assigned_route` 字段表示匹配状态：
- **数字值** (如 `5`): 货物成功匹配到对应ID的路线
- **"Self"**: 货物未匹配到任何路线，保持未分配状态

详细API文档请访问：http://localhost:8000/docs