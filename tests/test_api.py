"""
API测试模块
测试基础数据API和筛选查询API功能
"""
import pytest
import httpx
from fastapi.testclient import TestClient
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 直接执行app.py文件来创建app实例
with open('app.py', 'r', encoding='utf-8') as f:
    code = f.read()
namespace = {}
exec(code, namespace)
app = namespace.get('app')

# 创建测试客户端
client = TestClient(app)


class TestDataAPIs:
    """数据API测试类"""
    
    def test_network_api(self):
        """测试网络数据API"""
        response = client.get("/api/network")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert "nodes_number" in data["data"]
        assert "sites" in data["data"]
        assert "location_indices" in data["data"]
    
    def test_shipments_api(self):
        """测试货物数据API"""
        response = client.get("/api/shipments")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert "total_count" in data["data"]
        assert "shipments" in data["data"]
        assert isinstance(data["data"]["shipments"], list)
    
    def test_routes_api(self):
        """测试路线数据API"""
        response = client.get("/api/routes")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert "total_count" in data["data"]
        assert "routes" in data["data"]
        assert isinstance(data["data"]["routes"], list)
    
    def test_matching_result_api(self):
        """测试匹配结果API"""
        response = client.get("/api/matching-result")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert "matching_count" in data["data"]
    
    def test_data_summary_api(self):
        """测试数据摘要API"""
        response = client.get("/api/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert "network" in data["data"]
        assert "shipments" in data["data"]
        assert "routes" in data["data"]
        assert "matching" in data["data"]
    
    def test_data_health_api(self):
        """测试数据健康检查API"""
        response = client.get("/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data["service"] == "data"
        assert "data_status" in data
        assert "counts" in data
    
    def test_cache_clear_api(self):
        """测试缓存清除API"""
        response = client.post("/api/cache/clear")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "message" in data


class TestQueryAPIs:
    """查询API测试类"""
    
    def test_search_shipments_by_destination(self):
        """测试按目的地搜索货物"""
        response = client.get("/api/search/shipments?destination=9")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["destination"] == "9"
        assert "count" in data
        assert "shipments" in data
        assert isinstance(data["shipments"], list)
    
    def test_filter_routes_by_nodes(self):
        """测试按节点筛选路线"""
        response = client.get("/api/filter/routes?origin=1&destination=9")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "filters" in data
        assert data["filters"]["origin"] == "1"
        assert data["filters"]["destination"] == "9"
        assert "count" in data
        assert "routes" in data
        assert isinstance(data["routes"], list)
    
    def test_filter_routes_by_origin_only(self):
        """测试仅按起点筛选路线"""
        response = client.get("/api/filter/routes?origin=1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["filters"]["origin"] == "1"
        assert data["filters"]["destination"] is None
    
    def test_filter_routes_by_destination_only(self):
        """测试仅按终点筛选路线"""
        response = client.get("/api/filter/routes?destination=9")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["filters"]["origin"] is None
        assert data["filters"]["destination"] == "9"
    
    def test_filter_routes_no_params(self):
        """测试无参数的路线筛选（应该失败）"""
        response = client.get("/api/filter/routes")
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
    
    def test_filter_shipments_by_multiple_conditions(self):
        """测试多条件筛选货物"""
        response = client.get("/api/filter/shipments?origin=1&destination=9")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "filters" in data
        assert "count" in data
        assert "shipments" in data
        assert isinstance(data["shipments"], list)
    
    def test_filter_shipments_by_status(self):
        """测试按状态筛选货物"""
        response = client.get("/api/filter/shipments?status=pending")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["filters"]["status"] == "pending"
    
    def test_filter_routes_by_capacity(self):
        """测试按容量筛选路线"""
        response = client.get("/api/filter/routes-by-capacity?min_available_capacity=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "filters" in data
        assert "count" in data
        assert "routes" in data
        assert isinstance(data["routes"], list)
    
    def test_network_statistics_api(self):
        """测试网络统计API"""
        response = client.get("/api/stats/network")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert "network" in data["data"]
        assert "shipments" in data["data"]
        assert "routes" in data["data"]
        assert "connectivity" in data["data"]


class TestMatchingAPIs:
    """匹配API测试类"""
    
    def test_matching_all_api(self):
        """测试获取所有匹配结果API"""
        response = client.get("/api/matching/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert "count" in data
    
    def test_matching_summary_api(self):
        """测试匹配摘要API"""
        response = client.get("/api/matching/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
    
    def test_matching_by_shipment_api(self):
        """测试按货物ID获取匹配结果API"""
        response = client.get("/api/matching/shipment/1")
        # 可能返回404如果货物不存在，但API应该正常工作
        assert response.status_code in [200, 404]
    
    def test_matching_by_route_api(self):
        """测试按路线ID获取匹配结果API"""
        response = client.get("/api/matching/route/10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert "count" in data
    
    def test_matching_health_api(self):
        """测试匹配服务健康检查API"""
        response = client.get("/api/matching/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data["service"] == "matching"


class TestErrorHandling:
    """错误处理测试类"""
    
    def test_404_handler(self):
        """测试404错误处理"""
        response = client.get("/api/nonexistent")
        assert response.status_code == 404
        
        data = response.json()
        assert "error" in data
        assert "timestamp" in data
    
    def test_invalid_shipment_id(self):
        """测试无效货物ID处理"""
        response = client.get("/api/matching/shipment/99999")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
    
    def test_invalid_route_params(self):
        """测试无效路线参数处理"""
        response = client.get("/api/filter/routes")
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data


class TestSystemAPIs:
    """系统API测试类"""
    
    def test_root_api(self):
        """测试根路径API"""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "status" in data
    
    def test_health_api(self):
        """测试系统健康检查API"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "timestamp" in data
    
    def test_info_api(self):
        """测试系统信息API"""
        response = client.get("/api/info")
        assert response.status_code == 200
        
        data = response.json()
        assert "app_name" in data
        assert "version" in data
        assert "python_version" in data


if __name__ == "__main__":
    # 运行测试
    pytest.main([__file__, "-v"])