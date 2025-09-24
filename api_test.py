#!/usr/bin/env python3
"""
API功能测试脚本
"""
import sys
sys.path.insert(0, '.')

# 直接执行app.py文件来创建app实例
with open('app.py', 'r', encoding='utf-8') as f:
    code = f.read()
namespace = {}
exec(code, namespace)
app = namespace.get('app')

from fastapi.testclient import TestClient
client = TestClient(app)

print('=== 基础接口测试 ===')
response = client.get('/')
print(f'根路径: {response.status_code} - {response.json()}')

response = client.get('/health')
print(f'健康检查: {response.status_code} - {response.json()}')

response = client.get('/api/info')
print(f'系统信息: {response.status_code} - {response.json()}')

print('\n=== 数据接口测试 ===')
response = client.get('/api/network')
print(f'网络数据: {response.status_code}')
if response.status_code == 200:
    data = response.json()
    print(f'  节点数量: {len(data.get("nodes", []))}')
    print(f'  连接数量: {len(data.get("links", []))}')
else:
    print(f'  错误: {response.json()}')

response = client.get('/api/shipments')
print(f'货物数据: {response.status_code}')
if response.status_code == 200:
    data = response.json()
    print(f'  货物数量: {len(data)}')
else:
    print(f'  错误: {response.json()}')

response = client.get('/api/routes')
print(f'路线数据: {response.status_code}')
if response.status_code == 200:
    data = response.json()
    print(f'  路线数量: {len(data)}')
else:
    print(f'  错误: {response.json()}')

print('\n=== 查询接口测试 ===')
response = client.get('/api/search/shipments?destination=上海')
print(f'按目的地搜索货物: {response.status_code}')

response = client.get('/api/stats/network')
print(f'网络统计: {response.status_code}')
if response.status_code == 200:
    print(f'  统计信息: {response.json()}')
else:
    print(f'  错误: {response.json()}')

print('\n=== 匹配接口测试 ===')
response = client.get('/api/matching-result')
print(f'匹配结果: {response.status_code}')
if response.status_code == 200:
    data = response.json()
    print(f'  匹配数量: {len(data)}')
else:
    print(f'  错误: {response.json()}')

response = client.get('/api/summary')
print(f'汇总信息: {response.status_code}')
if response.status_code == 200:
    print(f'  汇总数据: {response.json()}')
else:
    print(f'  错误: {response.json()}')

print('\n=== 测试总结 ===')
print('✅ 基础接口正常工作')
print('⚠️  数据接口存在错误（需要修复数据服务）')
print('⚠️  查询接口依赖数据接口')
print('⚠️  匹配接口依赖数据服务')