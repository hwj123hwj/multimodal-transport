# 多式联运稳定匹配展示平台

这是一个围绕多式联运稳定匹配算法搭建的实验与展示平台：
- 前端负责页面展示、数据上传、结果查看和分析对比
- FastAPI 后端负责接口、文件管理、场景管理和结果解析
- C++ `stable_match.exe` 负责真正的匹配算法计算
- CSV 文件是系统的主要输入输出介质

如果你是第一次接触这个仓库，先看这份 README 就够了；需要深入再进入 `docs/`。

## 3 分钟上手

### 1. 先理解项目结构
建议按下面顺序阅读文档：
- [`docs/系统总说明.md`](./docs/系统总说明.md)
- [`docs/前端界面说明.md`](./docs/前端界面说明.md)
- [`docs/后端逻辑说明.md`](./docs/后端逻辑说明.md)
- [`docs/后续展示优化建议.md`](./docs/后续展示优化建议.md)
- [`docs/API接口文档.md`](./docs/API接口文档.md)

### 2. 记住这个项目的核心闭环
系统主链路是：

1. 上传默认数据或导入场景数据
2. 后端调用 `stable_match.exe`
3. 生成 `stable_matching.csv`
4. Python 解析结果并提供 API
5. 前端展示总览、明细、分析和对比

### 3. 找到最关键的文件
- 前端入口：[`frontend/src/App.js`](./frontend/src/App.js)
- 后端入口：[`app.py`](./app.py)
- 场景核心：[`app/routes/scenes.py`](./app/routes/scenes.py)
- 默认算法执行：[`app/services/matching_service.py`](./app/services/matching_service.py)
- 单场景分析：[`app/routes/analytics.py`](./app/routes/analytics.py)
- 场景注册表：[`data/scenes.json`](./data/scenes.json)
- 算法可执行文件：[`cmake-build-debug/stable_match.exe`](./cmake-build-debug/stable_match.exe)

## 项目结构

### 前端
- `frontend/`
- React + Ant Design + Recharts
- 负责仪表板、路线管理、货物管理、匹配结果、数据上传、数据分析、对比分析

### 后端
- `app/`
- FastAPI 提供 API
- 负责数据读取、场景管理、任务状态、exe 调用、结果聚合

### 算法
- `cmake-build-debug/stable_match.exe`
- 核心匹配算法不在 Python 中，而是在这个可执行文件中

### 数据
- `data/`：默认数据集
- `data/scenes/`：多场景实验数据
- `data/scenes.json`：场景注册表
- `cmake-build-debug/result/`：算法输出结果

## 系统是怎么串起来的

### 前端做什么
前端不是算法本体，而是控制台和看板。

它负责：
- 上传 CSV 或 ZIP
- 触发默认数据执行或场景执行
- 查看路线、货物、匹配结果
- 看单场景分析和多场景对比

### 后端做什么
后端不是核心求解器，而是组织层。

它负责：
- 暴露 API
- 保存上传文件
- 管理 `scenes.json`
- 调用 `stable_match.exe`
- 解析 `stable_matching.csv`
- 输出前端能直接消费的 JSON

### C++ exe 做什么
真正有业务含金量的部分在：
- `cmake-build-debug/stable_match.exe`

它负责：
- 根据输入 CSV 做稳定匹配计算
- 输出 `stable_matching.csv`

### 数据文件做什么
这个系统基本是 CSV 驱动的，而不是数据库驱动的。

主要输入：
- `shipment.csv`
- `route.csv`
- `network.csv`
- `cooperation_parameter.csv`

主要输出：
- `stable_matching.csv`

## 两种运行模式

### 默认数据模式
面向：
- `data/` 根目录的一组默认数据

常见接口：
- `/api/shipments`
- `/api/routes`
- `/api/matchings`
- `/api/matching/execute`

输出结果：
- `cmake-build-debug/result/stable_matching.csv`

### 场景模式
面向：
- `data/scenes/<scene_id>/` 中的多组实验数据

常见接口：
- `/api/scenes`
- `/api/scenes/{scene_id}/run`
- `/api/scenes/{scene_id}/shipments`
- `/api/scenes/{scene_id}/routes`
- `/api/scenes/{scene_id}/matchings`
- `/api/compare`
- `/api/analytics/*`

输出结果：
- `cmake-build-debug/result/<scene_id>/stable_matching.csv`

## 本地开发

### 启动前端
```bash
cd frontend
npm install
npm start
```

### 启动后端
如果你已经有虚拟环境：

```bash
.venv/bin/python app.py
```

### 常见本地地址
- 前端：`http://localhost:3000`
- 后端：`http://localhost:8000`
- API 文档：`http://localhost:8000/docs`

## Docker 部署

关键文件：
- [`Dockerfile.backend`](./Dockerfile.backend)
- [`docker-compose.yml`](./docker-compose.yml)
- [`docker-entrypoint.sh`](./docker-entrypoint.sh)

生产部署思路：
- 后端容器运行 FastAPI 和 `stable_match.exe`
- Nginx 容器托管前端构建产物并转发 API
- `/app/data` 和 `/app/cmake-build-debug/result` 通过 volume 持久化

## 当前最需要记住的几个注意点

### 1. 核心算法不在 Python 里
不要在 `matching_service.py` 里找求解逻辑，Python 主要是包装和调度，真正求解在 exe。

### 2. 默认数据链路和场景链路是两套实现
这不是同一个接口换个参数那么简单：
- 默认链路主要走 `app/services/matching_service.py`
- 场景链路主要走 `app/routes/scenes.py`

### 3. 结果文件是系统事实来源
大多数前端页面展示的数据，本质上都来自 `stable_matching.csv` 的二次解析。

### 4. 本地路径和 Docker 路径存在差异
调试时一定要确认当前模块到底在读：
- 项目根下的 `data/`
- 还是容器内的 `/app/data`
- 还是 `cmake-build-debug/result/`

### 5. 场景机制本质是“多套 CSV + 一份注册表”
不是复杂数据库建模，而是：
- 每个场景一套输入 CSV
- 每个场景一份结果 CSV
- `scenes.json` 统一登记

## 如果你是后续 agent，建议这样读

### 第一步：看总说明
- [`docs/系统总说明.md`](./docs/系统总说明.md)

### 第二步：看前端页面到底展示什么
- [`docs/前端界面说明.md`](./docs/前端界面说明.md)

### 第三步：看后端如何接算法
- [`docs/后端逻辑说明.md`](./docs/后端逻辑说明.md)

### 第四步：读关键代码
- [`app.py`](./app.py)
- [`frontend/src/App.js`](./frontend/src/App.js)
- [`app/routes/scenes.py`](./app/routes/scenes.py)
- [`app/services/matching_service.py`](./app/services/matching_service.py)
- [`app/routes/analytics.py`](./app/routes/analytics.py)

## 当前文档地图

- [`README.md`](./README.md)：仓库入口
- [`docs/系统总说明.md`](./docs/系统总说明.md)：系统级总览
- [`docs/前端界面说明.md`](./docs/前端界面说明.md)：前端页面与展示逻辑
- [`docs/后端逻辑说明.md`](./docs/后端逻辑说明.md)：后端、场景、exe 和数据链路
- [`docs/后续展示优化建议.md`](./docs/后续展示优化建议.md)：后续业务化展示方向与技术注意点
- [`docs/API接口文档.md`](./docs/API接口文档.md)：接口文档

## 一句话总结

这是一个以 `stable_match.exe` 为算法核心、以 CSV 为数据载体、以 FastAPI 为组织层、以 React 为展示层的多场景多式联运匹配分析平台。
