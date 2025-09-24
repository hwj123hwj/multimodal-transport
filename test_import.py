#!/usr/bin/env python3
"""
测试导入app实例
"""
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    # 直接执行app.py文件来创建app实例
    import sys
    import os
    
    # 读取并执行app.py文件
    with open('app.py', 'r', encoding='utf-8') as f:
        code = f.read()
    
    # 创建一个命名空间来执行代码
    namespace = {}
    exec(code, namespace)
    
    # 获取app实例
    app_instance = namespace.get('app')
    print(f"✅ App实例创建成功")
    print(f"App实例类型: {type(app_instance)}")
    print(f"App实例ID: {id(app_instance)}")
    
    # 测试FastAPI应用
    from fastapi.testclient import TestClient
    client = TestClient(app_instance)
    
    # 测试根路径
    response = client.get("/")
    print(f"✅ 根路径测试成功: {response.status_code}")
    print(f"响应数据: {response.json()}")
    
except Exception as e:
    print(f"❌ 导入失败: {e}")
    import traceback
    traceback.print_exc()