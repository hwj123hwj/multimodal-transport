# 多式联运稳定数据文件说明

### 输入数据文件说明

#### 1. network.csv - 网络数据

- **nodes number**：网络中的节点数量（本例中为9个）
- **site**：网络中的站点标识
- **location index**：节点的位置索引（0-8）

#### 2. shipment.csv - 货物运输需求数据

- **shipment index**：货物索引
- **Origin**：起始节点
- **destination**：目标节点
- **Demand**：需求量（TEU，即标准集装箱单位）
- **Classification**：货物分类（冗余字段，填-1）
- **Time value(CNY/TEU)**：时间价值（元/TEU）

#### 3. route.csv - 运输路径数据

每一行代表一条路径，包含以下字段：

- **route index**（第1列）：路线索引号（示例：1表示第1号路线）
- **mode**（第2列）：运输模式（冗余字段，统一填-1）
- **Nodes**（第3列）：该路线经过的有效节点数（记为a）
- **节点索引列表**（第4-12列）：路线经过的节点索引，前a列为有效节点，其余用-1填充（示例：0,1,2,4,6,-1,-1,-1,-1）
- **运费列表**（第13-21列）：从相应节点到目的地的运费，前a列为有效值，其余用-1填充（示例：6588,5033,3910,774,-1,-1,-1,-1,-1）
- **旅行时间列表**（第22-30列）：从相应节点到目的地的旅行时间，前a列为有效值，其余用-1填充（示例：5,5,5,3,-1,-1,-1,-1,-1）
- **Capacity**（第31列）：该路线的容量（TEU）（示例：200）

#### 4. cooperation_parameter.csv - 合作参数

- 行代表路径，列代表货物
- 数值表示路径与货物之间的合作参数（本例中所有值均为1）

### 输出数据格式

输出文件：**stable_matching.csv**

#### 主要数据部分

- **Shipment**：货物索引（对应shipment.csv中的索引，从1到80）
- **Route**：匹配的路线索引（数字表示具体路线，"Self"表示未匹配）

#### 统计信息部分

- **Total capacity in route**：路线总容量
- **Total container number in shipment**：货物总集装箱数
- **Total matched container number**：已匹配的集装箱总数
- **Stable or not**：匹配是否稳定
- **Iteration num**：迭代次数
- **Restart num**：重启次数
- **CPU time**：CPU执行时间