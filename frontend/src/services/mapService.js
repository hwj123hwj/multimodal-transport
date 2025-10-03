// 地图服务封装
export class MapService {
  constructor(containerId) {
    this.map = null;
    this.containerId = containerId;
    this.polylines = new Map();
    this.markers = new Map();
    this.initMap();
  }

  // 初始化地图
  initMap() {
    if (typeof window.BMap === 'undefined') {
      console.error('百度地图API未加载');
      return;
    }
    
    this.map = new window.BMap.Map(this.containerId);
    this.map.centerAndZoom(new window.BMap.Point(106.5, 26.0), 7);
    this.map.enableScrollWheelZoom(true);
    this.map.addControl(new window.BMap.NavigationControl());
    this.map.addControl(new window.BMap.ScaleControl());
    this.map.addControl(new window.BMap.OverviewMapControl());
  }

  // 绘制路线
  drawRoute(routeData, options = {}) {
    if (!this.map) return null;

    const points = routeData.node_details.map(node => 
      new window.BMap.Point(node.longitude, node.latitude)
    );
    
    const polyline = new window.BMap.Polyline(points, {
      strokeColor: options.color || '#1890ff',
      strokeWeight: options.weight || 4,
      strokeOpacity: options.opacity || 0.8
    });
    
    this.map.addOverlay(polyline);
    this.polylines.set(routeData.route_id, polyline);
    
    // 添加点击事件
    if (options.onClick) {
      polyline.addEventListener('click', () => {
        options.onClick(routeData);
      });
    }
    
    return polyline;
  }

  // 添加路线标记点
  addRouteMarkers(routeData) {
    if (!this.map) return;

    routeData.node_details.forEach((node, index) => {
      const point = new window.BMap.Point(node.longitude, node.latitude);
      const marker = new window.BMap.Marker(point, {
        title: `${node.city_name} (${index + 1})`
      });
      
      // 创建标签
      const label = new window.BMap.Label(`${index + 1}. ${node.city_name}`, {
        offset: new window.BMap.Size(15, -25)
      });
      label.setStyle({
        border: '1px solid #1890ff',
        background: '#fff',
        padding: '2px 5px',
        fontSize: '12px',
        borderRadius: '3px'
      });
      
      marker.setLabel(label);
      this.map.addOverlay(marker);
      this.markers.set(`route-${routeData.route_id}-${index}`, marker);
    });
  }

  // 添加货物标记
  addShipmentMarker(shipment, options = {}) {
    if (!this.map) return null;

    const point = new window.BMap.Point(
      shipment.origin_longitude, 
      shipment.origin_latitude
    );
    
    const marker = new window.BMap.Marker(point, {
      title: `货物${shipment.shipment_id}: ${shipment.origin_city} → ${shipment.destination_city}`,
      icon: options.icon || null
    });
    
    // 创建信息窗口
    const infoWindow = new window.BMap.InfoWindow(`
      <div style="padding: 10px; min-width: 200px;">
        <h4 style="margin: 0 0 10px 0; color: #1890ff;">货物详情</h4>
        <p><strong>货物ID:</strong> ${shipment.shipment_id}</p>
        <p><strong>起点:</strong> ${shipment.origin_city}</p>
        <p><strong>终点:</strong> ${shipment.destination_city}</p>
        <p><strong>需求量:</strong> ${shipment.demand}</p>
        <p><strong>重量:</strong> ${shipment.weight}kg</p>
        <p><strong>体积:</strong> ${shipment.volume}m³</p>
        ${shipment.assigned_route ? `<p><strong>分配路线:</strong> ${shipment.assigned_route}</p>` : ''}
      </div>
    `, {
      width: 250,
      height: 200,
      title: ''
    });
    
    marker.addEventListener('click', () => {
      this.map.openInfoWindow(infoWindow, point);
      if (options.onClick) {
        options.onClick(shipment);
      }
    });
    
    this.map.addOverlay(marker);
    this.markers.set(`shipment-${shipment.shipment_id}`, marker);
    
    return marker;
  }

  // 高亮路线
  highlightRoute(routeId) {
    const polyline = this.polylines.get(routeId);
    if (polyline) {
      polyline.setStrokeColor('#ff4d4f');
      polyline.setStrokeWeight(6);
      
      // 将路线置于最上层
      this.map.getOverlays().forEach(overlay => {
        if (overlay === polyline) {
          this.map.setTop(overlay);
        }
      });
    }
  }

  // 重置路线样式
  resetRouteStyle(routeId) {
    const polyline = this.polylines.get(routeId);
    if (polyline) {
      polyline.setStrokeColor('#1890ff');
      polyline.setStrokeWeight(4);
    }
  }

  // 清除所有覆盖物
  clearOverlays() {
    if (!this.map) return;
    this.map.clearOverlays();
    this.polylines.clear();
    this.markers.clear();
  }

  // 清除路线
  clearRoutes() {
    this.polylines.forEach((polyline, routeId) => {
      this.map.removeOverlay(polyline);
    });
    this.polylines.clear();
    
    // 清除路线相关标记
    this.markers.forEach((marker, key) => {
      if (key.startsWith('route-')) {
        this.map.removeOverlay(marker);
        this.markers.delete(key);
      }
    });
  }

  // 清除货物标记
  clearShipments() {
    this.markers.forEach((marker, key) => {
      if (key.startsWith('shipment-')) {
        this.map.removeOverlay(marker);
        this.markers.delete(key);
      }
    });
  }

  // 设置地图中心
  setCenter(longitude, latitude, zoom = 7) {
    if (!this.map) return;
    this.map.centerAndZoom(new window.BMap.Point(longitude, latitude), zoom);
  }

  // 获取地图范围
  getBounds() {
    if (!this.map) return null;
    return this.map.getBounds();
  }

  // 自适应显示所有路线
  fitRoutes(routes) {
    if (!this.map || !routes || routes.length === 0) return;

    const allPoints = [];
    routes.forEach(route => {
      route.node_details.forEach(node => {
        allPoints.push(new window.BMap.Point(node.longitude, node.latitude));
      });
    });

    if (allPoints.length > 0) {
      this.map.setViewport(allPoints, {
        margins: [50, 50, 50, 50]
      });
    }
  }

  // 销毁地图
  destroy() {
    if (this.map) {
      this.map.clearOverlays();
      this.map = null;
    }
    this.polylines.clear();
    this.markers.clear();
  }
}

export default MapService;