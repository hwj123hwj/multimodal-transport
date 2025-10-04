import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Space, Button } from 'antd';
import { ReloadOutlined, ExpandOutlined, ShrinkOutlined } from '@ant-design/icons';
import './MapViewer.css';

const SVGMapViewer = ({ 
  routes = [], 
  shipments = [], 
  matchings = [],
  mode = 'routes',
  onRouteClick,
  onShipmentClick,
  height = '500px',
  showControls = true,
  showLegend = true
}) => {
  const svgRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);

  // 获取数据中涉及的所有城市
  const getRequiredCities = useCallback(() => {
    const cities = new Set();
    
    // 从路线数据中提取城市
    routes.forEach(route => {
      if (route.origin_city) cities.add(route.origin_city);
      if (route.destination_city) cities.add(route.destination_city);
      if (route.node_details) {
        route.node_details.forEach(node => {
          if (node.city_name) cities.add(node.city_name);
        });
      }
    });
    
    // 从货物数据中提取城市
    shipments.forEach(shipment => {
      if (shipment.origin_city) cities.add(shipment.origin_city);
      if (shipment.destination_city) cities.add(shipment.destination_city);
      if (shipment.origin) cities.add(shipment.origin);
      if (shipment.destination) cities.add(shipment.destination);
    });
    
    return Array.from(cities);
  }, [routes, shipments]);

  // 中国地图基础数据（简化版）
  const chinaMapData = {
    provinces: [
      { name: '北京', x: 450, y: 150, code: 'bj' },
      { name: '上海', x: 520, y: 280, code: 'sh' },
      { name: '广东', x: 480, y: 450, code: 'gd' },
      { name: '江苏', x: 500, y: 260, code: 'js' },
      { name: '浙江', x: 520, y: 300, code: 'zj' },
      { name: '山东', x: 480, y: 200, code: 'sd' },
      { name: '河南', x: 450, y: 250, code: 'hn' },
      { name: '湖北', x: 450, y: 300, code: 'hb' },
      { name: '湖南', x: 450, y: 350, code: 'hn2' },
      { name: '四川', x: 350, y: 300, code: 'sc' },
      { name: '重庆', x: 400, y: 320, code: 'cq' },
      { name: '陕西', x: 400, y: 250, code: 'sx' },
      { name: '河北', x: 450, y: 180, code: 'hb2' },
      { name: '山西', x: 420, y: 220, code: 'sx2' },
      { name: '辽宁', x: 520, y: 120, code: 'ln' },
      { name: '吉林', x: 550, y: 100, code: 'jl' },
      { name: '黑龙江', x: 580, y: 80, code: 'hlj' },
      { name: '内蒙古', x: 400, y: 150, code: 'nmg' },
      { name: '新疆', x: 200, y: 150, code: 'xj' },
      { name: '西藏', x: 250, y: 350, code: 'xz' },
      { name: '青海', x: 300, y: 250, code: 'qh' },
      { name: '甘肃', x: 350, y: 200, code: 'gs' },
      { name: '宁夏', x: 380, y: 220, code: 'nx' },
      { name: '天津', x: 470, y: 160, code: 'tj' },
      { name: '江西', x: 500, y: 320, code: 'jx' },
      { name: '安徽', x: 480, y: 280, code: 'ah' },
      { name: '福建', x: 540, y: 350, code: 'fj' },
      { name: '广西', x: 450, y: 400, code: 'gx' },
      { name: '海南', x: 480, y: 500, code: 'hi' },
      { name: '云南', x: 350, y: 400, code: 'yn' },
      { name: '贵州', x: 400, y: 380, code: 'gz' },
      { name: '河南', x: 450, y: 250, code: 'henan' }
    ],
    connections: []
  };

  // 获取城市坐标
  const getCityCoordinates = useCallback((cityName) => {
    if (!cityName) return { x: 400, y: 250 };
    
    // 城市名称映射表
    const cityMapping = {
      '北京': ['北京', '北京市', 'Beijing'],
      '上海': ['上海', '上海市', 'Shanghai'],
      '广州': ['广州', '广州市', 'Guangzhou', '广东'],
      '深圳': ['深圳', '深圳市', 'Shenzhen'],
      '南京': ['南京', '南京市', 'Nanjing', '江苏'],
      '杭州': ['杭州', '杭州市', 'Hangzhou', '浙江'],
      '济南': ['济南', '济南市', 'Jinan', '山东'],
      '郑州': ['郑州', 'INTEGRATION', 'Zhengzhou', '河南'],
      '武汉': ['武汉', '武汉市', 'Wuhan', '湖北'],
      '长沙': ['长沙', '长沙市', 'Changsha', '湖南'],
      '成都': ['成都', '成都市', 'Chengdu', '四川'],
      '重庆': ['重庆', '重庆市', 'Chongqing'],
      '西安': ['西安', '西安市', 'Xian', '陕西'],
      '石家庄': ['石家庄', '石家庄市', 'Shijiazhuang', '河北'],
      '太原': ['太原', '太原市', 'Taiyuan', '山西'],
      '沈阳': ['沈阳', '沈阳市', 'Shenyang', '辽宁'],
      '长春': ['长春', '长春市', 'Changchun', '吉林'],
      '哈尔滨': ['哈尔滨', '哈尔滨市', 'Harbin', '黑龙江'],
      '呼和浩特': ['呼和浩特', '呼和浩特市', 'Hohhot', '内蒙古'],
      '乌鲁木齐': ['乌鲁木齐', '乌鲁木齐市', 'Urumqi', '新疆'],
      '拉萨': ['拉萨', '拉萨市', 'Lhasa', '西藏'],
      '西宁': ['西宁', '西宁市', 'Xining', '青海'],
      '兰州': ['兰州', '兰州市', 'Lanzhou', '甘肃'],
      '银川': ['银川', '银川市', 'Yinchuan', '宁夏'],
      '天津': ['天津', '天津市', 'Tianjin'],
      '南昌': ['南昌', '南昌市', 'Nanchang', '江西'],
      '合肥': ['合肥', '合肥市', 'Hefei', '安徽'],
      '福州': ['福州', '福州市', 'Fuzhou', '福建'],
      '南宁': ['南宁', '南宁市', 'Nanning', '广西'],
      '海口': ['海口', '海口市', 'Haikou', '海南'],
      '昆明': ['昆明', '昆明市', 'Kunming', '云南'],
      '贵阳': ['贵阳', '贵阳市', 'Guiyang', '贵州']
    };

    // 查找匹配的城市
    for (const [provinceName, cityNames] of Object.entries(cityMapping)) {
      if (cityNames.some(name => cityName.includes(name) || name.includes(cityName))) {
        const province = chinaMapData.provinces.find(p => p.name === provinceName);
        if (province) {
          return { x: province.x, y: province.y };
        }
      }
    }

    // 如果没有找到精确匹配，尝试模糊匹配
    const province = chinaMapData.provinces.find(p => 
      cityName.includes(p.name) || p.name.includes(cityName)
    );
    return province ? { x: province.x, y: province.y } : { x: 400, y: 250 };
  }, [chinaMapData.provinces]);

  // 获取路线颜色
  const getRouteColor = useCallback((routeType) => {
    const colors = {
      highway: '#ff4444',
      railway: '#4444ff',
      waterway: '#44ff44',
      airway: '#ff44ff'
    };
    return colors[routeType] || '#666666';
  }, []);

  // 绘制路线
  const drawRoutes = useCallback(() => {
    if (!routes || routes.length === 0) return;

    routes.forEach((route, index) => {
      if (!route.node_details || route.node_details.length < 2) return;

      const color = getRouteColor(route.route_id);
      const points = route.node_details.map(node => {
        const coords = getCityCoordinates(node.city_name);
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
      route.node_details.forEach((node, nodeIndex) => {
        const coords = getCityCoordinates(node.city_name);
        
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
  }, [routes, onRouteClick, getCityCoordinates, getRouteColor]);

  // 绘制货物
  const drawShipments = useCallback(() => {
    if (!shipments || shipments.length === 0) return;

    shipments.forEach((shipment, index) => {
      const originCoords = getCityCoordinates(shipment.origin_city);
      const destCoords = getCityCoordinates(shipment.destination_city);

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
      originLabel.textContent = shipment.origin_city;

      const destLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      destLabel.setAttribute('x', destCoords.x);
      destLabel.setAttribute('y', destCoords.y - 15);
      destLabel.setAttribute('text-anchor', 'middle');
      destLabel.setAttribute('font-size', '10');
      destLabel.setAttribute('fill', '#333');
      destLabel.textContent = shipment.destination_city;

      svgRef.current.appendChild(originLabel);
      svgRef.current.appendChild(destLabel);
    });
  }, [shipments, onShipmentClick, getCityCoordinates]);

  // 绘制匹配结果
  const drawMatchingResults = useCallback(() => {
    // 先绘制路线
    drawRoutes();
    
    // 再绘制货物（带颜色区分）
    if (shipments && shipments.length > 0) {
      shipments.forEach((shipment) => {
        const originCoords = getCityCoordinates(shipment.origin_city);
        
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
  }, [shipments, drawRoutes, onShipmentClick, getCityCoordinates]);

  // 绘制SVG地图
  const drawSVGMap = useCallback(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const container = svg.parentElement;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 清空SVG内容
    svg.innerHTML = '';

    // 设置SVG尺寸和视图框 - 使用更大的视图范围确保所有城市可见
    const viewBoxWidth = 800;
    const viewBoxHeight = 600;
    const viewBoxX = 0;
    const viewBoxY = 0;
    
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
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

    // 如果没有指定城市，显示主要城市
    const citiesToShow = requiredCities.length > 0 ? requiredCities : ['北京', '上海', '广州', '深圳'];

    // 绘制需要的省份
    chinaMapData.provinces.forEach(province => {
      // 检查这个城市是否被需要
      const isRequired = citiesToShow.some(city => 
        city.includes(province.name) || province.name.includes(city)
      );

      if (isRequired) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', province.x);
        circle.setAttribute('cy', province.y);
        circle.setAttribute('r', '10');
        circle.setAttribute('fill', '#e6f7ff');
        circle.setAttribute('stroke', '#1890ff');
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('opacity', '0.8');
        svg.appendChild(circle);

        // 添加省份标签
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', province.x);
        text.setAttribute('y', province.y - 15);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', '#333');
        text.textContent = province.name;
        svg.appendChild(text);
      }
    });

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
      default:
        drawRoutes();
    }
  }, [mode, drawRoutes, drawShipments, drawMatchingResults, chinaMapData.provinces, getRequiredCities]);

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      drawSVGMap(); // 重新绘制以适应新尺寸
    }, 100);
  };

  // 刷新地图
  const handleReload = () => {
    setLoading(true);
    setTimeout(() => {
      drawSVGMap();
      setLoading(false);
    }, 300);
  };

  // 初始化绘制
  useEffect(() => {
    const timer = setTimeout(() => {
      drawSVGMap();
    }, 100);

    // 窗口大小改变时重新绘制
    const handleResize = () => {
      setTimeout(drawSVGMap, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [drawSVGMap]);

  // 数据变化时重新绘制
  useEffect(() => {
    drawSVGMap();
  }, [routes, shipments, matchings, mode, drawSVGMap]);

  return (
    <div className={`map-viewer ${isFullscreen ? 'fullscreen' : ''}`}>
      <Card
        title={
          <div className="map-viewer-header">
            <span>SVG地图视图</span>
            {showControls && (
              <Space className="map-viewer-controls">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReload}
                  size="small"
                  loading={loading}
                >
                  刷新
                </Button>
                <Button
                  icon={isFullscreen ? <ShrinkOutlined /> : <ExpandOutlined />}
                  onClick={toggleFullscreen}
                  size="small"
                >
                  {isFullscreen ? '退出全屏' : '全屏'}
                </Button>
              </Space>
            )}
          </div>
        }
        className="map-card"
        style={{ height: isFullscreen ? '100vh' : height }}
      >
        <div className="map-container">
          <svg
            ref={svgRef}
            className="svg-map"
            style={{
              width: '100%',
              height: '100%',
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          
          {showLegend && (
            <div className="map-legend">
              <div className="legend-title">图例</div>
              {mode === 'routes' && (
                <div className="legend-items">
                  <div className="legend-item">
                    <div className="legend-color" style={{ background: '#1890ff' }}></div>
                    <span>运输路线</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-marker" style={{ background: '#1890ff' }}></div>
                    <span>路线节点</span>
                  </div>
                </div>
              )}
              {mode === 'shipments' && (
                <div className="legend-items">
                  <div className="legend-item">
                    <div className="legend-marker" style={{ background: '#52c41a' }}></div>
                    <span>起点</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-marker" style={{ background: '#f5222d' }}></div>
                    <span>终点</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-line"></div>
                    <span>运输路径</span>
                  </div>
                </div>
              )}
              {mode === 'matching' && (
                <div className="legend-items">
                  <div className="legend-item">
                    <div className="legend-marker" style={{ background: '#52c41a' }}></div>
                    <span>已匹配</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-marker" style={{ background: '#f5222d' }}></div>
                    <span>未匹配</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-marker" style={{ background: '#faad14' }}></div>
                    <span>自营</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 选中信息面板 */}
          {(selectedRoute || selectedShipment) && (
            <div className="selection-info">
              <div className="info-header">
                <span>选中信息</span>
                <Button
                  type="text"
                  size="small"
                  onClick={() => {
                    setSelectedRoute(null);
                    setSelectedShipment(null);
                  }}
                >
                  关闭
                </Button>
              </div>
              {selectedRoute && (
                <div className="info-content">
                  <p><strong>路线ID:</strong> {selectedRoute.route_id}</p>
                  <p><strong>起点:</strong> {selectedRoute.origin_city}</p>
                  <p><strong>终点:</strong> {selectedRoute.destination_city}</p>
                  <p><strong>节点数:</strong> {selectedRoute.node_details?.length || 0}</p>
                </div>
              )}
              {selectedShipment && (
                <div className="info-content">
                  <p><strong>货物ID:</strong> {selectedShipment.shipment_id}</p>
                  <p><strong>起点:</strong> {selectedShipment.origin_city}</p>
                  <p><strong>终点:</strong> {selectedShipment.destination_city}</p>
                  <p><strong>需求量:</strong> {selectedShipment.demand}</p>
                  <p><strong>状态:</strong> {selectedShipment.assigned_route ? '已分配' : '未分配'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SVGMapViewer;