import requests
import time

# 等待服务器启动
time.sleep(2)

# 测试查询API
print('测试查询API...')
try:
    response = requests.get('http://localhost:8000/api/search/shipments?status=pending')
    print(f'查询API状态码: {response.status_code}')
    data = response.json()
    print(f'查询API响应: {data}')
except Exception as e:
    print(f'查询API错误: {e}')

# 测试统计API
print('\n测试统计API...')
try:
    response = requests.get('http://localhost:8000/api/stats/network')
    print(f'统计API状态码: {response.status_code}')
    data = response.json()
    print(f'统计API响应状态: {data.get("status", "unknown")}')
    print(f'统计API是否有data: {"data" in data}')
    if "data" in data:
        print(f'统计API data是否有shipments: {"shipments" in data["data"]}')
except Exception as e:
    print(f'统计API错误: {e}')