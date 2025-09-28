/**
 * 地图模块
 * 处理所有地图相关的功能，包括节点显示、路线绘制、交互等
 */

class LogisticsMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.map = null;
        this.markers = new Map();
        this.routes = new Map();
        this.currentView = 'network';
        this.animationEnabled = true;
        this.animationSpeed = 1000;
        
        // 默认配置
        this.options = {
            center: [31.2304, 121.4737], // 上海
            zoom: 8,
            minZoom: 4,
            maxZoom: 18,
            tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            ...options
        };

        // 颜色配置
        this.colors = {
            node: {
                default: '#3b82f6',
                highlight: '#ef4444',
                selected: '#10b981',
                hover: '#f59e0b'
            },
            route: {
                default: '#6b7280',
                highlight: '#3b82f6',
                selected: '#10b981',
                active: '#ef4444',
                lowCapacity: '#fbbf24',
                highCapacity: '#10b981'
            }
        };

        // 图标配置
        this.icons = {
            warehouse: this.createCustomIcon('warehouse', '#3b82f6'),
            shipment: this.createCustomIcon('shipment', '#f59e0b'),
            route: this.createCustomIcon('route', '#6b7280')
        };

        this.init();
    }

    /**
     * 初始化地图
     */
    init() {
        if (!this.container) {
            console.error(`容器 ${this.containerId} 未找到`);
            return;
        }

        // 初始化 Leaflet 地图
        this.map = L.map(this.containerId, {
            center: this.options.center,
            zoom: this.options.zoom,
            minZoom: this.options.minZoom,
            maxZoom: this.options.maxZoom,
            zoomControl: true,
            attributionControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            trackResize: true,
            worldCopyJump: true
        });

        // 添加瓦片图层
        L.tileLayer(this.options.tileLayer, {
            attribution: this.options.attribution,
            maxZoom: this.options.maxZoom
        }).addTo(this.map);

        // 添加地图控件
        this.addMapControls();

        // 绑定事件
        this.bindMapEvents();

        console.log('地图初始化完成');
    }

    /**
     * 创建自定义图标
     */
    createCustomIcon(type, color) {
        const iconHtml = this.getIconSvg(type, color);
        
        return L.divIcon({
            html: iconHtml,
            className: `custom-marker ${type}-marker`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
        });
    }

    /**
     * 获取图标SVG
     */
    getIconSvg(type, color) {
        const icons = {
            warehouse: `
                <svg width="30" height="30" viewBox="0 0 24 24" fill="${color}">
                    <path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.69L18.31 12H5.69L12 5.69zM6 14v6h12v-6h-2v4h-2v-4h-4v4h-2v-4H6z"/>
                </svg>
            `,
            shipment: `
                <svg width="30" height="30" viewBox="0 0 24 24" fill="${color}">
                    <path d="M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM19.5 9.5L21.46 12H17V9.5h2.5zM6 18.5c.83 0 1.5-.67 1.5-1.5S6.83 15.5 6 15.5 4.5 16.17 4.5 17 5.17 18.5 6 18.5zM20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM5.5 20c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                </svg>
            `,
            route: `
                <svg width="30" height="30" viewBox="0 0 24 24" fill="${color}">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                </svg>
            `
        };

        return icons[type] || icons.warehouse;
    }

    /**
     * 添加地图控件
     */
    addMapControls() {
        // 自定义控件容器
        const controlsContainer = L.control({ position: 'topright' });
        
        controlsContainer.onAdd = () => {
            const div = L.DomUtil.create('div', 'map-controls');
            div.innerHTML = `
                <div class="map-control-group">
                    <button class="map-control-btn" id="reset-view" title="重置视图">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                        </svg>
                    </button>
                    <button class="map-control-btn" id="toggle-animation" title="切换动画">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    <button class="map-control-btn" id="toggle-routes" title="显示/隐藏路线">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                        </svg>
                    </button>
                </div>
            `;
            return div;
        };

        controlsContainer.addTo(this.map);

        // 绑定控件事件
        setTimeout(() => {
            document.getElementById('reset-view').addEventListener('click', () => this.resetView());
            document.getElementById('toggle-animation').addEventListener('click', () => this.toggleAnimation());
            document.getElementById('toggle-routes').addEventListener('click', () => this.toggleRoutesVisibility());
        }, 100);
    }

    /**
     * 绑定地图事件
     */
    bindMapEvents() {
        // 地图缩放事件
        this.map.on('zoomstart', () => {
            this.hideAllPopups();
        });

        // 地图移动事件
        this.map.on('movestart', () => {
            this.hideAllPopups();
        });

        // 地图点击事件
        this.map.on('click', (e) => {
            this.deselectAll();
        });
    }

    /**
     * 显示网络节点
     */
    displayNetworkNodes(nodes) {
        if (!nodes || !Array.isArray(nodes)) return;

        this.clearMarkers();

        nodes.forEach(node => {
            this.addNodeMarker(node);
        });

        // 自动调整视图以包含所有节点
        if (nodes.length > 0) {
            this.fitToNodes(nodes);
        }
    }

    /**
     * 添加节点标记
     */
    addNodeMarker(node) {
        if (!node || !node.location) return;

        const marker = L.marker([node.location.lat, node.location.lng], {
            icon: this.icons.warehouse,
            title: node.node_name,
            alt: node.node_id
        });

        // 创建弹出窗口内容
        const popupContent = this.createNodePopupContent(node);
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'node-popup'
        });

        // 绑定事件
        marker.on('click', (e) => {
            e.originalEvent.stopPropagation();
            this.selectNode(node.node_id);
            this.onNodeClick(node);
        });

        marker.on('mouseover', () => {
            this.highlightNode(node.node_id);
        });

        marker.on('mouseout', () => {
            this.unhighlightNode(node.node_id);
        });

        // 添加到地图和标记集合
        marker.addTo(this.map);
        this.markers.set(node.node_id, marker);
    }

    /**
     * 创建节点弹出窗口内容
     */
    createNodePopupContent(node) {
        return `
            <div class="node-popup-content">
                <h3 class="node-name">${node.node_name}</h3>
                <div class="node-details">
                    <div class="detail-item">
                        <span class="label">节点ID:</span>
                        <span class="value">${node.node_id}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">节点类型:</span>
                        <span class="value">${node.node_type || '未知'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">处理能力:</span>
                        <span class="value">${node.capacity || '未设置'}</span>
                    </div>
                </div>
                <div class="popup-actions">
                    <button class="popup-btn primary" onclick="window.dispatchEvent(new CustomEvent('viewNodeDetails', { detail: { nodeId: '${node.node_id}' } }))">
                        查看详情
                    </button>
                    <button class="popup-btn secondary" onclick="window.dispatchEvent(new CustomEvent('viewConnectedRoutes', { detail: { nodeId: '${node.node_id}' } }))">
                        查看路线
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 显示路线
     */
    displayRoutes(routes) {
        if (!routes || !Array.isArray(routes)) return;

        this.clearRoutes();

        routes.forEach(route => {
            this.addRoute(route);
        });
    }

    /**
     * 添加路线
     */
    addRoute(route) {
        if (!route.nodes || route.nodes.length < 2) return;

        // 获取路线的坐标点
        const coordinates = route.nodes.map(node => {
            const marker = this.markers.get(node);
            if (marker) {
                return marker.getLatLng();
            }
            return null;
        }).filter(coord => coord !== null);

        if (coordinates.length < 2) return;

        // 创建路线
        const routeLine = L.polyline(coordinates, {
            color: this.getRouteColor(route),
            weight: this.getRouteWeight(route),
            opacity: 0.8,
            smoothFactor: 1,
            className: 'logistics-route'
        });

        // 创建路线弹出窗口内容
        const popupContent = this.createRoutePopupContent(route);
        routeLine.bindPopup(popupContent, {
            maxWidth: 350,
            className: 'route-popup'
        });

        // 绑定事件
        routeLine.on('click', (e) => {
            e.originalEvent.stopPropagation();
            this.selectRoute(route.route_id);
            this.onRouteClick(route);
        });

        routeLine.on('mouseover', () => {
            this.highlightRoute(route.route_id);
        });

        routeLine.on('mouseout', () => {
            this.unhighlightRoute(route.route_id);
        });

        // 添加到地图和路线集合
        routeLine.addTo(this.map);
        this.routes.set(route.route_id, routeLine);

        // 添加动画效果
        if (this.animationEnabled) {
            this.animateRoute(routeLine);
        }
    }

    /**
     * 获取路线颜色
     */
    getRouteColor(route) {
        if (route.utilization_rate >= 0.9) return this.colors.route.highCapacity;
        if (route.utilization_rate >= 0.7) return this.colors.route.lowCapacity;
        return this.colors.route.default;
    }

    /**
     * 获取路线宽度
     */
    getRouteWeight(route) {
        const baseWeight = 3;
        const capacityMultiplier = Math.min(route.capacity / 100, 2);
        return baseWeight + capacityMultiplier;
    }

    /**
     * 创建路线弹出窗口内容
     */
    createRoutePopupContent(route) {
        const utilizationColor = this.getRouteColor(route);
        
        return `
            <div class="route-popup-content">
                <h3 class="route-name">路线 ${route.route_id}</h3>
                <div class="route-details">
                    <div class="detail-item">
                        <span class="label">起点:</span>
                        <span class="value">${route.origin_node || '未知'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">终点:</span>
                        <span class="value">${route.destination_node || '未知'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">总容量:</span>
                        <span class="value">${dataFormatter.formatNumber(route.capacity)} 吨</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">已使用:</span>
                        <span class="value">${dataFormatter.formatNumber(route.current_load)} 吨</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">利用率:</span>
                        <span class="value" style="color: ${utilizationColor}">
                            ${dataFormatter.formatPercentage(route.utilization_rate)}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="label">成本:</span>
                        <span class="value">${dataFormatter.formatCost(route.cost)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">时间:</span>
                        <span class="value">${dataFormatter.formatTime(route.travel_time)}</span>
                    </div>
                </div>
                <div class="popup-actions">
                    <button class="popup-btn primary" onclick="window.dispatchEvent(new CustomEvent('viewRouteDetails', { detail: { routeId: '${route.route_id}' } }))">
                        查看详情
                    </button>
                    <button class="popup-btn secondary" onclick="window.dispatchEvent(new CustomEvent('viewRouteShipments', { detail: { routeId: '${route.route_id}' } }))">
                        查看货物
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 路线动画
     */
    animateRoute(routeLine) {
        const element = routeLine.getElement();
        if (!element) return;

        // 创建动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes dash {
                to {
                    stroke-dashoffset: 0;
                }
            }
            
            .logistics-route {
                stroke-dasharray: 10, 5;
                stroke-dashoffset: 100;
                animation: dash 2s linear infinite;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 高亮节点
     */
    highlightNode(nodeId) {
        const marker = this.markers.get(nodeId);
        if (marker) {
            marker.getElement().classList.add('highlighted');
        }
    }

    /**
     * 取消高亮节点
     */
    unhighlightNode(nodeId) {
        const marker = this.markers.get(nodeId);
        if (marker) {
            marker.getElement().classList.remove('highlighted');
        }
    }

    /**
     * 选择节点
     */
    selectNode(nodeId) {
        this.deselectAll();
        
        const marker = this.markers.get(nodeId);
        if (marker) {
            marker.getElement().classList.add('selected');
            this.selectedNode = nodeId;
        }
    }

    /**
     * 高亮路线
     */
    highlightRoute(routeId) {
        const routeLine = this.routes.get(routeId);
        if (routeLine) {
            routeLine.setStyle({
                color: this.colors.route.highlight,
                weight: this.getRouteWeight(routeLine.options) + 2,
                opacity: 1
            });
        }
    }

    /**
     * 取消高亮路线
     */
    unhighlightRoute(routeId) {
        const routeLine = this.routes.get(routeId);
        if (routeLine && !routeLine.options.selected) {
            routeLine.setStyle({
                color: this.colors.route.default,
                weight: this.getRouteWeight(routeLine.options),
                opacity: 0.8
            });
        }
    }

    /**
     * 选择路线
     */
    selectRoute(routeId) {
        this.deselectAll();
        
        const routeLine = this.routes.get(routeId);
        if (routeLine) {
            routeLine.setStyle({
                color: this.colors.route.selected,
                weight: this.getRouteWeight(routeLine.options) + 3,
                opacity: 1
            });
            routeLine.options.selected = true;
            this.selectedRoute = routeId;
        }
    }

    /**
     * 取消所有选择
     */
    deselectAll() {
        // 取消节点选择
        this.markers.forEach((marker, nodeId) => {
            marker.getElement().classList.remove('selected');
        });
        this.selectedNode = null;

        // 取消路线选择
        this.routes.forEach((routeLine, routeId) => {
            if (routeLine.options.selected) {
                routeLine.setStyle({
                    color: this.colors.route.default,
                    weight: this.getRouteWeight(routeLine.options),
                    opacity: 0.8
                });
                routeLine.options.selected = false;
            }
        });
        this.selectedRoute = null;
    }

    /**
     * 隐藏所有弹出窗口
     */
    hideAllPopups() {
        this.markers.forEach(marker => marker.closePopup());
        this.routes.forEach(routeLine => routeLine.closePopup());
    }

    /**
     * 清除所有标记
     */
    clearMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers.clear();
    }

    /**
     * 清除所有路线
     */
    clearRoutes() {
        this.routes.forEach(routeLine => this.map.removeLayer(routeLine));
        this.routes.clear();
    }

    /**
     * 重置视图
     */
    resetView() {
        this.map.setView(this.options.center, this.options.zoom);
    }

    /**
     * 适应节点视图
     */
    fitToNodes(nodes) {
        if (!nodes || nodes.length === 0) return;

        const bounds = L.latLngBounds();
        nodes.forEach(node => {
            if (node.location) {
                bounds.extend([node.location.lat, node.location.lng]);
            }
        });

        if (bounds.isValid()) {
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    /**
     * 切换动画
     */
    toggleAnimation() {
        this.animationEnabled = !this.animationEnabled;
        const btn = document.getElementById('toggle-animation');
        if (btn) {
            btn.classList.toggle('active', this.animationEnabled);
        }
    }

    /**
     * 切换路线可见性
     */
    toggleRoutesVisibility() {
        const isVisible = this.routes.size > 0;
        
        if (isVisible) {
            this.routes.forEach(routeLine => this.map.removeLayer(routeLine));
        } else {
            this.routes.forEach(routeLine => routeLine.addTo(this.map));
        }

        const btn = document.getElementById('toggle-routes');
        if (btn) {
            btn.classList.toggle('active', !isVisible);
        }
    }

    /**
     * 节点点击事件处理
     */
    onNodeClick(node) {
        // 触发全局事件
        window.dispatchEvent(new CustomEvent('nodeSelected', { detail: node }));
    }

    /**
     * 路线点击事件处理
     */
    onRouteClick(route) {
        // 触发全局事件
        window.dispatchEvent(new CustomEvent('routeSelected', { detail: route }));
    }

    /**
     * 查看节点详情
     */
    viewNodeDetails(nodeId) {
        window.dispatchEvent(new CustomEvent('viewNodeDetails', { detail: { nodeId } }));
    }

    /**
     * 查看连接路线
     */
    viewConnectedRoutes(nodeId) {
        window.dispatchEvent(new CustomEvent('viewConnectedRoutes', { detail: { nodeId } }));
    }

    /**
     * 查看路线详情
     */
    viewRouteDetails(routeId) {
        window.dispatchEvent(new CustomEvent('viewRouteDetails', { detail: { routeId } }));
    }

    /**
     * 查看路线货物
     */
    viewRouteShipments(routeId) {
        window.dispatchEvent(new CustomEvent('viewRouteShipments', { detail: { routeId } }));
    }

    /**
     * 销毁地图
     */
    destroy() {
        this.clearMarkers();
        this.clearRoutes();
        
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}

/**
 * 热力图图层
 */
class HeatmapLayer {
    constructor(map) {
        this.map = map;
        this.layer = null;
        this.data = [];
    }

    /**
     * 设置热力图数据
     */
    setData(data) {
        this.data = data;
        this.update();
    }

    /**
     * 更新热力图
     */
    update() {
        if (this.layer) {
            this.map.removeLayer(this.layer);
        }

        if (this.data.length === 0) return;

        // 创建热力图配置
        const cfg = {
            radius: 25,
            maxOpacity: 0.8,
            scaleRadius: true,
            useLocalExtrema: true,
            latField: 'lat',
            lngField: 'lng',
            valueField: 'intensity'
        };

        // 创建热力图图层
        this.layer = new HeatmapOverlay(cfg);
        this.layer.setData({
            max: Math.max(...this.data.map(d => d.intensity)),
            data: this.data
        });

        this.layer.addTo(this.map);
    }

    /**
     * 显示/隐藏
     */
    toggle() {
        if (!this.layer) return;

        if (this.map.hasLayer(this.layer)) {
            this.map.removeLayer(this.layer);
        } else {
            this.map.addLayer(this.layer);
        }
    }

    /**
     * 销毁
     */
    destroy() {
        if (this.layer) {
            this.map.removeLayer(this.layer);
            this.layer = null;
        }
    }
}

// 创建全局地图实例
let logisticsMap;

/**
 * 初始化地图
 */
function initMap(containerId, options = {}) {
    logisticsMap = new LogisticsMap(containerId, options);
    // 将地图实例设置为全局变量，供HTML中的onclick事件使用
    window.logisticsMap = logisticsMap;
    return logisticsMap;
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LogisticsMap, HeatmapLayer, initMap };
}