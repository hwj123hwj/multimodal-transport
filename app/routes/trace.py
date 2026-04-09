"""
匹配溯源 API - 展示货物匹配的决策过程
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.data_service import data_service
from app.services.matching_service import matching_service


router = APIRouter(prefix="/api/shipment", tags=["溯源"])


class TraceResponse(BaseModel):
    """溯源响应"""
    shipment_id: int
    shipment_info: dict
    routes: List[dict]
    selected_route_id: Optional[int]


@router.get("/{shipment_id}/trace", response_model=TraceResponse)
async def trace_shipment(shipment_id: int):
    """
    查找货物 ID 的溯源信息：
    - 货物基础信息
    - 所有候选路线（包含评分）
    - 最终选中的路线
    """
    # 获取货物信息
    try:
        shipment = data_service.get_shipment_by_id(shipment_id)
        if not shipment:
            raise HTTPException(status_code=404, detail=f"货物 {shipment_id} 不存在")
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"获取货物失败: {str(e)}")

    # 获取所有候选路线
    try:
        routes_data = data_service.get_all_routes()

        # 直接使用 DataLoader 的原始 RouteCollection（整数节点ID）
        matching_service.data_loader.load_routes()
        route_collection = matching_service.data_loader.routes

        if route_collection is None:
            raise HTTPException(status_code=500, detail="路线数据未加载")

        # 查找该货物的所有可行路线
        possible_routes = route_collection.find_routes_for_shipment(
            shipment_id,
            routes_data,
            shipment
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查找路线失败: {str(e)}")

    # 获取该货物的匹配结果，确定最终选中的路线
    try:
        detailed_matchings = matching_service.get_detailed_matchings()
        selected_route_id = None

        for m in detailed_matchings:
            if m.get('shipment_id') == shipment_id and m.get('status') == 'matched':
                selected_route_id = m.get('route_id')
                break
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取匹配结果失败: {str(e)}")

    # 构建响应
    routes = []
    for route_info in possible_routes:
        route_id = route_info.get('route_id')
        route_data = routes_data.get(str(route_id), {})

        # 确保所有路线都有 node_details（含经纬度）
        if 'node_details' not in route_data:
            # Fallback：使用默认值（实际应该从 DataLoader 的完整数据中获取）
            nodes = route_info.get('nodes', [])
            route_data['node_details'] = [
                {'city': node, 'longitude': 0.0, 'latitude': 0.0}
                for node in nodes
            ]

        # 使用算法的真实评分逻辑
        score = compute_algorithm_score(
            shipment,
            route_data,
            route_collection
        )

        routes.append({
            'route_id': route_id,
            'score': score,
            'route_info': route_data,
        })

    # 按评分排序（成本最低的排最前面）
    routes.sort(key=lambda x: x['score'])

    return TraceResponse(
        shipment_id=shipment_id,
        shipment_info=shipment,
        routes=routes,
        selected_route_id=selected_route_id
    )


def compute_algorithm_score(shipment, route_data, route_collection):
    """
    计算算法的真实评分（匹配成本）

    公式：matched_cost = freight[originPos] * demand * cooperation + length[originPos] * demand * time_value

    注意：这里使用的是起点位置对应的**分段**成本，不是路线总成本
    """
    try:
        demand = shipment.get('demand', 1.0)
        time_value = shipment.get('time_value', 10.0)  # 货物时间价值
        cooperation = 1.0  # 合作系数（简化为1）

        # 获取路线的起止城市
        origin_city = shipment.get('origin_city')
        dest_city = shipment.get('destination_city')

        # 从 route_data 获取节点信息
        nodes = route_data.get('nodes', [])
        if not nodes:
            return float('inf')

        # 找到起点和终点的位置索引
        try:
            origin_pos = nodes.index(origin_city)
            dest_pos = nodes.index(dest_city)
        except ValueError:
            return float('inf')

        # 获取起点位置对应的分段运费和时间
        # 注意：这是 origin -> origin+1 这个分段的成本
        freight = route_data.get('freight', [0.0] * (len(nodes) - 1))
        length = route_data.get('length', [0.0] * (len(nodes) - 1))

        # 确保数组长度正确
        if origin_pos >= len(freight) or origin_pos >= len(length):
            return float('inf')

        origin_freight = freight[origin_pos]
        origin_length = length[origin_pos]

        # 计算匹配成本
        matched_cost = (
            origin_freight * demand * cooperation +
            origin_length * demand * time_value
        )

        return matched_cost
    except Exception as e:
        print(f"计算评分失败: {e}")
        return float('inf')
