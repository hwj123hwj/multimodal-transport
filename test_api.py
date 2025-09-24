import requests
import json

# 测试相关API端点
apis = [
    'http://localhost:8000/api/stats/network',
    'http://localhost:8000/api/matching/summary', 
    'http://localhost:8000/api/matching/'
]

for api in apis:
    try:
        response = requests.get(api)
        data = response.json()
        print(f'=== {api} ===')
        print(f'状态码: {response.status_code}')
        
        # 检查响应结构
        if isinstance(data, dict):
            if 'data' in data:
                print(f'响应有data属性，类型: {type(data["data"])}')
                if isinstance(data['data'], dict) and 'shipments' in data['data']:
                    print('✓ 找到shipments属性')
                elif isinstance(data['data'], dict):
                    print(f'✗ data中无shipments属性，可用属性: {list(data["data"].keys())}')
                else:
                    print(f'✗ data不是字典类型，实际类型: {type(data["data"])}')
            else:
                print('✗ 响应中无data属性')
                print(f'可用顶层属性: {list(data.keys())}')
        else:
            print(f'✗ 响应不是字典类型，实际类型: {type(data)}')
            
    except Exception as e:
        print(f'错误访问 {api}: {str(e)}')