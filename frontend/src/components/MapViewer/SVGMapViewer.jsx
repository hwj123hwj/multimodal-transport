import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Button} from 'antd';
import './MapViewer.css';

const SVGMapViewer = ({
                          routes = [],
                          shipments = [],
                          matchings = [],
                          mode = 'routes',
                          onRouteClick,
                          onShipmentClick,
                          height = '100%',
                          showLegend = true,
                      }) => {
    const svgRef = useRef(null);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [selectedShipment, setSelectedShipment] = useState(null);

    const cityCoordinates = useMemo(() => ({
        0: {"name": "成都", "longitude": 104.0668, "latitude": 30.5728},
        1: {"name": "重庆", "longitude": 106.5516, "latitude": 29.5630},
        2: {"name": "贵阳", "longitude": 106.7074, "latitude": 26.5982},
        3: {"name": "怀化", "longitude": 110.0016, "latitude": 27.5501},
        4: {"name": "北部湾", "longitude": 108.3277, "latitude": 21.9733},
        5: {"name": "上海", "longitude": 121.4737, "latitude": 31.2304},
        6: {"name": "胡志明", "longitude": 106.6951, "latitude": 10.8231},
        7: {"name": "曼谷", "longitude": 100.5018, "latitude": 13.7563},
        8: {"name": "新加坡", "longitude": 103.8198, "latitude": 1.3521}
    }), []); // 空依赖数组，确保对象只创建一次


    // 获取所有涉及的城市
    const getRequiredCities = useCallback(() => {
        const cities = new Set();

        // 从路线数据中提取城市
        routes.forEach(route => {
            if (route.nodes) {
                route.nodes.forEach(nodeId => {
                    if (cityCoordinates[nodeId]) {
                        cities.add(nodeId);
                    }
                });
            }
        });

        // 从货物数据中提取城市
        shipments.forEach(shipment => {
            if (shipment.origin !== undefined && cityCoordinates[shipment.origin]) {
                cities.add(shipment.origin);
            }
            if (shipment.destination !== undefined && cityCoordinates[shipment.destination]) {
                cities.add(shipment.destination);
            }
        });

        return Array.from(cities);
    }, [routes, shipments, cityCoordinates]);

    // 将经纬度转换为SVG坐标
    const convertToSVGCoordinates = useCallback((longitude, latitude) => {
        // 找到所有城市的经纬度范围
        const longitudes = Object.values(cityCoordinates).map(city => city.longitude);
        const latitudes = Object.values(cityCoordinates).map(city => city.latitude);

        const minLon = Math.min(...longitudes);
        const maxLon = Math.max(...longitudes);
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);

        // SVG画布尺寸
        const svgWidth = 700;
        const svgHeight = 500;
        const padding = 50;

        // 转换公式：将经纬度映射到SVG坐标
        const x = padding + (longitude - minLon) / (maxLon - minLon) * (svgWidth - 2 * padding);
        const y = padding + (maxLat - latitude) / (maxLat - minLat) * (svgHeight - 2 * padding);

        return {x, y};
    }, [cityCoordinates]);

    // 获取城市信息
    const getCityInfo = useCallback((cityId) => {
        return cityCoordinates[cityId] || {name: '未知城市', longitude: 0, latitude: 0};
    }, [cityCoordinates]);

    // 获取路线颜色
    const getRouteColor = useCallback((index) => {
        const colors = ['#ff4444', '#4444ff', '#44ff44', '#ff44ff', '#ffff44', '#44ffff'];
        return colors[index % colors.length];
    }, []);

    // 绘制城市标记
    const drawCities = useCallback((requiredCities) => {
        requiredCities.forEach(cityId => {
            const city = getCityInfo(cityId);
            const coords = convertToSVGCoordinates(city.longitude, city.latitude);

            // 城市圆点
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', coords.x);
            circle.setAttribute('cy', coords.y);
            circle.setAttribute('r', '8');
            circle.setAttribute('fill', '#1890ff');
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '2');

            // 城市标签
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', coords.x);
            text.setAttribute('y', coords.y - 15);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', '#333');
            text.textContent = city.name;

            svgRef.current.appendChild(circle);
            svgRef.current.appendChild(text);
        });
    }, [getCityInfo, convertToSVGCoordinates]);

    // 绘制路线
    const drawRoutes = useCallback(() => {
        if (!routes || routes.length === 0) return;

        routes.forEach((route, index) => {
            // 优先用 node_details（含经纬度），兜底用 nodes（数字ID）
            const nodeList = route.node_details && route.node_details.length >= 2
                ? route.node_details
                : null;
            if (!nodeList && (!route.nodes || route.nodes.length < 2)) return;

            const color = getRouteColor(index);

            // 根据数据来源生成坐标点
            const points = nodeList
                ? nodeList.map(nd => {
                    const coords = convertToSVGCoordinates(nd.longitude, nd.latitude);
                    return `${coords.x},${coords.y}`;
                }).join(' ')
                : route.nodes.map(nodeId => {
                    const city = getCityInfo(nodeId);
                    const coords = convertToSVGCoordinates(city.longitude, city.latitude);
                    return `${coords.x},${coords.y}`;
                }).join(' ');

            // 绘制路线折线
            const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polyline.setAttribute('points', points);
            polyline.setAttribute('fill', 'none');
            polyline.setAttribute('stroke', color);
            polyline.setAttribute('stroke-width', '3');
            polyline.setAttribute('stroke-opacity', '0.8');
            polyline.setAttribute('stroke-linejoin', 'round');
            polyline.style.cursor = 'pointer';

            // 添加点击事件
            polyline.addEventListener('click', () => {
                setSelectedRoute(route);
                if (onRouteClick) {
                    onRouteClick(route);
                }
            });

            // 添加悬停效果
            polyline.addEventListener('mouseenter', () => {
                polyline.setAttribute('stroke-width', '5');
                polyline.setAttribute('stroke-opacity', '1');
            });

            polyline.addEventListener('mouseleave', () => {
                polyline.setAttribute('stroke-width', '3');
                polyline.setAttribute('stroke-opacity', '0.8');
            });

            svgRef.current.appendChild(polyline);

            // 绘制节点标记
            const nodesToDraw = nodeList || route.nodes.map(id => getCityInfo(id));
            nodesToDraw.forEach((nd, nodeIndex) => {
                const lon = nd.longitude !== undefined ? nd.longitude : nd.longitude;
                const lat = nd.latitude !== undefined ? nd.latitude : nd.latitude;
                const coords = convertToSVGCoordinates(lon, lat);

                // 节点圆圈
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', coords.x);
                circle.setAttribute('cy', coords.y);
                circle.setAttribute('r', '6');
                circle.setAttribute('fill', color);
                circle.setAttribute('stroke', '#fff');
                circle.setAttribute('stroke-width', '2');
                circle.style.cursor = 'pointer';

                // 添加序号标签
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', coords.x);
                label.setAttribute('y', coords.y - 15);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('font-size', '12');
                label.setAttribute('font-weight', 'bold');
                label.setAttribute('fill', '#fff');
                label.textContent = nodeIndex + 1;

                svgRef.current.appendChild(circle);
                svgRef.current.appendChild(label);
            });
        });
    }, [routes, onRouteClick, getCityInfo, convertToSVGCoordinates, getRouteColor]);

    // 绘制货物
    const drawShipments = useCallback(() => {
        if (!shipments || shipments.length === 0) return;

        shipments.forEach((shipment, index) => {
            const originCity = getCityInfo(shipment.origin);
            const destCity = getCityInfo(shipment.destination);

            const originCoords = convertToSVGCoordinates(originCity.longitude, originCity.latitude);
            const destCoords = convertToSVGCoordinates(destCity.longitude, destCity.latitude);

            // 货物起点标记
            const originCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            originCircle.setAttribute('cx', originCoords.x);
            originCircle.setAttribute('cy', originCoords.y);
            originCircle.setAttribute('r', '8');
            originCircle.setAttribute('fill', '#52c41a');
            originCircle.setAttribute('stroke', '#fff');
            originCircle.setAttribute('stroke-width', '2');
            originCircle.style.cursor = 'pointer';

            // 货物终点标记
            const destCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            destCircle.setAttribute('cx', destCoords.x);
            destCircle.setAttribute('cy', destCoords.y);
            destCircle.setAttribute('r', '6');
            destCircle.setAttribute('fill', '#f5222d');
            destCircle.setAttribute('stroke', '#fff');
            destCircle.setAttribute('stroke-width', '2');
            destCircle.style.cursor = 'pointer';

            // 连接线
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', originCoords.x);
            line.setAttribute('y1', originCoords.y);
            line.setAttribute('x2', destCoords.x);
            line.setAttribute('y2', destCoords.y);
            line.setAttribute('stroke', '#1890ff');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '5,5');
            line.setAttribute('opacity', '0.6');

            // 添加点击事件
            const handleClick = () => {
                setSelectedShipment(shipment);
                if (onShipmentClick) {
                    onShipmentClick(shipment);
                }
            };

            originCircle.addEventListener('click', handleClick);
            destCircle.addEventListener('click', handleClick);

            svgRef.current.appendChild(line);
            svgRef.current.appendChild(originCircle);
            svgRef.current.appendChild(destCircle);

            // 添加标签
            const originLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            originLabel.setAttribute('x', originCoords.x);
            originLabel.setAttribute('y', originCoords.y - 15);
            originLabel.setAttribute('text-anchor', 'middle');
            originLabel.setAttribute('font-size', '10');
            originLabel.setAttribute('fill', '#333');
            originLabel.textContent = originCity.name;

            const destLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            destLabel.setAttribute('x', destCoords.x);
            destLabel.setAttribute('y', destCoords.y - 15);
            destLabel.setAttribute('text-anchor', 'middle');
            destLabel.setAttribute('font-size', '10');
            destLabel.setAttribute('fill', '#333');
            destLabel.textContent = destCity.name;

            svgRef.current.appendChild(originLabel);
            svgRef.current.appendChild(destLabel);
        });
    }, [shipments, onShipmentClick, getCityInfo, convertToSVGCoordinates]);

    // 绘制匹配结果
    const drawMatchingResults = useCallback(() => {
        // 先绘制路线
        drawRoutes();

        // 再绘制货物（带颜色区分）
        if (shipments && shipments.length > 0) {
            shipments.forEach((shipment) => {
                const originCity = getCityInfo(shipment.origin);
                const originCoords = convertToSVGCoordinates(originCity.longitude, originCity.latitude);

                let color = '#1890ff'; // 默认蓝色
                let status = '未匹配';

                if (shipment.assigned_route === 'Self') {
                    color = '#faad14'; // 自营 - 橙色
                    status = '自营';
                } else if (shipment.assigned_route) {
                    color = '#52c41a'; // 已匹配 - 绿色
                    status = '已匹配';
                } else {
                    color = '#f5222d'; // 未匹配 - 红色
                    status = '未匹配';
                }

                // 货物标记
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', originCoords.x);
                circle.setAttribute('cy', originCoords.y);
                circle.setAttribute('r', '8');
                circle.setAttribute('fill', color);
                circle.setAttribute('stroke', '#fff');
                circle.setAttribute('stroke-width', '2');
                circle.style.cursor = 'pointer';

                // 状态标签
                const statusLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                statusLabel.setAttribute('x', originCoords.x);
                statusLabel.setAttribute('y', originCoords.y - 15);
                statusLabel.setAttribute('text-anchor', 'middle');
                statusLabel.setAttribute('font-size', '10');
                statusLabel.setAttribute('font-weight', 'bold');
                statusLabel.setAttribute('fill', color);
                statusLabel.textContent = status;

                circle.addEventListener('click', () => {
                    setSelectedShipment(shipment);
                    if (onShipmentClick) {
                        onShipmentClick(shipment);
                    }
                });

                svgRef.current.appendChild(circle);
                svgRef.current.appendChild(statusLabel);
            });
        }
    }, [shipments, drawRoutes, onShipmentClick, getCityInfo, convertToSVGCoordinates]);

    // 绘制SVG地图
    const drawSVGMap = useCallback(() => {
        if (!svgRef.current) return;

        const svg = svgRef.current;
        const container = svg.parentElement;
        const width = container ? (container.clientWidth || 800) : 800;
        const heightPx = container ? (container.clientHeight || 500) : 500;

        // 清空SVG内容
        svg.innerHTML = '';

        // 设置SVG尺寸和视图框
        const viewBoxWidth = 800;
        const viewBoxHeight = 600;

        svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
        svg.setAttribute('width', width);
        svg.setAttribute('height', heightPx);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // 创建背景
        const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        background.setAttribute('width', viewBoxWidth);
        background.setAttribute('height', viewBoxHeight);
        background.setAttribute('fill', '#f0f8ff');
        background.setAttribute('stroke', '#ccc');
        background.setAttribute('stroke-width', '1');
        svg.appendChild(background);

        // 获取需要显示的城市
        const requiredCities = getRequiredCities();

        // 绘制城市标记
        drawCities(requiredCities);

        // 根据模式绘制数据
        switch (mode) {
            case 'routes':
                drawRoutes();
                break;
            case 'shipments':
                drawShipments();
                break;
            case 'matching':
                drawMatchingResults();
                break;
            case 'combined':
                drawRoutes();
                drawShipments();
                break;
            default:
                drawRoutes();
        }
    }, [mode, drawRoutes, drawShipments, drawMatchingResults, drawCities, getRequiredCities]);

    // 初始化及数据变化时重绘
    useEffect(() => {
        const timer = setTimeout(() => drawSVGMap(), 100);
        const handleResize = () => setTimeout(drawSVGMap, 100);
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [drawSVGMap]);

    useEffect(() => {
        drawSVGMap();
    }, [routes, shipments, matchings, mode, drawSVGMap]);

    // 渲染：只输出 SVG 容器，不包 Card
    return (
        <div style={{position: 'relative', width: '100%', height: height || '100%'}}>
            <svg
                ref={svgRef}
                style={{width: '100%', height: '100%', background: '#EFF6FF', display: 'block'}}
            />

            {showLegend && (
                <div className="map-legend">
                    <div className="legend-title">图例</div>
                    <div className="legend-items">
                        {(mode === 'routes' || mode === 'matching') && (
                            <div className="legend-item">
                                <span className="legend-line" style={{borderColor: '#1890ff'}}/>
                                <span>运输路线</span>
                            </div>
                        )}
                        {mode === 'matching' && (
                            <>
                                <div className="legend-item">
                                    <span className="legend-marker" style={{background: '#52c41a'}}/>
                                    <span>已匹配</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-marker" style={{background: '#f5222d'}}/>
                                    <span>未匹配</span>
                                </div>
                            </>
                        )}
                        {mode === 'shipments' && (
                            <>
                                <div className="legend-item">
                                    <span className="legend-marker" style={{background: '#52c41a'}}/>
                                    <span>起点</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-marker" style={{background: '#f5222d'}}/>
                                    <span>终点</span>
                                </div>
                            </>
                        )}
                        <div className="legend-item">
                            <span className="legend-marker" style={{background: '#1890ff'}}/>
                            <span>路线节点</span>
                        </div>
                    </div>
                </div>
            )}

            {(selectedRoute || selectedShipment) && (
                <div className="map-legend" style={{top: 'auto', bottom: 16}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
                        <span style={{fontWeight: 600, fontSize: 12}}>选中信息</span>
                        <Button type="text" size="small" style={{padding: 0, height: 'auto', fontSize: 11}}
                            onClick={() => { setSelectedRoute(null); setSelectedShipment(null); }}>关闭</Button>
                    </div>
                    {selectedRoute && (
                        <div style={{fontSize: 11, color: '#475569'}}>
                            <div>路线 {selectedRoute.route_id}</div>
                            <div>{selectedRoute.nodes?.join(' → ')}</div>
                        </div>
                    )}
                    {selectedShipment && (
                        <div style={{fontSize: 11, color: '#475569'}}>
                            <div>货物 {selectedShipment.shipment_id}</div>
                            <div>{selectedShipment.origin_city} → {selectedShipment.destination_city}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SVGMapViewer;
