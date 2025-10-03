import React, { useEffect, useRef, useState } from 'react';
import { Card, Space, Button, Select, message } from 'antd';
import { ReloadOutlined, ExpandOutlined, ShrinkOutlined } from '@ant-design/icons';
import MapService from '../../services/mapService';
import { getRouteColor } from '../../utils/formatters';
import './MapViewer.css';

const { Option } = Select;

const MapViewer = ({ 
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
  const mapContainerRef = useRef(null);
  const mapServiceRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapType, setMapType] = useState('normal');
  const [loading, setLoading] = useState(false);

  // 初始化地图
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 等待百度地图API加载
    const checkBMapLoaded = () => {
      if (typeof window.BMap !== 'undefined') {
        initializeMap();
      } else {
        setTimeout(checkBMapLoaded, 100);
      }
    };

    checkBMapLoaded();

    return () => {
      if (mapServiceRef.current) {
        mapServiceRef.current.destroy();
      }
    };
  }, []);

  // 初始化地图服务
  const initializeMap = () => {
    try {
      mapServiceRef.current = new MapService('map-container');
      refreshMapData();
    } catch (error) {
      message.error('地图初始化失败，请检查百度地图API配置');
      console.error('Map initialization error:', error);
    }
  };

  // 根据模式刷新地图数据
  useEffect(() => {
    if (mapServiceRef.current) {
      refreshMapData();
    }
  }, [routes, shipments, matchings, mode]);

  // 刷新地图数据
  const refreshMapData = () => {
    if (!mapServiceRef.current) return;

    setLoading(true);
    
    try {
      mapServiceRef.current.clearOverlays();

      switch (mode) {
        case 'routes':
          displayRoutes();
          break;
        case 'shipments':
          displayShipments();
          break;
        case 'matching':
          displayMatchingResults();
          break;
        default:
          displayRoutes();
      }
    } catch (error) {
      message.error('地图数据刷新失败');
      console.error('Map refresh error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 显示路线
  const displayRoutes = () => {
    if (!routes || routes.length === 0) return;

    routes.forEach(route => {
      const color = getRouteColor(route.route_id);
      mapServiceRef.current.drawRoute(route, {
        color,
        onClick: () => {
          if (onRouteClick) {
            onRouteClick(route);
          }
        }
      });
      
      // 添加路线节点标记
      mapServiceRef.current.addRouteMarkers(route);
    });

    // 自适应显示所有路线
    mapServiceRef.current.fitRoutes(routes);
  };

  // 显示货物
  const displayShipments = () => {
    if (!shipments || shipments.length === 0) return;

    shipments.forEach(shipment => {
      mapServiceRef.current.addShipmentMarker(shipment, {
        onClick: () => {
          if (onShipmentClick) {
            onShipmentClick(shipment);
          }
        }
      });
    });
  };

  // 显示匹配结果
  const displayMatchingResults = () => {
    if (!matchings || matchings.length === 0) return;

    // 显示匹配路线
    if (routes && routes.length > 0) {
      routes.forEach(route => {
        const color = getRouteColor(route.route_id);
        mapServiceRef.current.drawRoute(route, {
          color,
          onClick: () => {
            if (onRouteClick) {
              onRouteClick(route);
            }
          }
        });
      });
    }

    // 显示货物标记
    if (shipments && shipments.length > 0) {
      shipments.forEach(shipment => {
        let color = '#1890ff'; // 默认蓝色
        
        if (shipment.assigned_route === 'Self') {
          color = '#faad14'; // 自营 - 橙色
        } else if (shipment.assigned_route) {
          color = '#52c41a'; // 已匹配 - 绿色
        } else {
          color = '#f5222d'; // 未匹配 - 红色
        }

        mapServiceRef.current.addShipmentMarker(shipment, {
          color,
          onClick: () => {
            if (onShipmentClick) {
              onShipmentClick(shipment);
            }
          }
        });
      });
    }

    // 自适应显示
    if (routes && routes.length > 0) {
      mapServiceRef.current.fitRoutes(routes);
    }
  };

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (mapServiceRef.current) {
        mapServiceRef.current.map.checkResize();
      }
    }, 100);
  };

  // 切换地图类型
  const handleMapTypeChange = (value) => {
    setMapType(value);
    if (mapServiceRef.current && mapServiceRef.current.map) {
      switch (value) {
        case 'satellite':
          mapServiceRef.current.map.setMapType(window.BMAP_SATELLITE_MAP);
          break;
        case 'hybrid':
          mapServiceRef.current.map.setMapType(window.BMAP_HYBRID_MAP);
          break;
        default:
          mapServiceRef.current.map.setMapType(window.BMAP_NORMAL_MAP);
      }
    }
  };

  // 重新加载地图
  const handleReload = () => {
    refreshMapData();
  };

  return (
    <div className={`map-viewer ${isFullscreen ? 'fullscreen' : ''}`}>
      <Card
        title={
          <div className="map-viewer-header">
            <span>地图视图</span>
            {showControls && (
              <Space className="map-viewer-controls">
                <Select
                  value={mapType}
                  onChange={handleMapTypeChange}
                  style={{ width: 100 }}
                  size="small"
                >
                  <Option value="normal">普通地图</Option>
                  <Option value="satellite">卫星地图</Option>
                  <Option value="hybrid">混合地图</Option>
                </Select>
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
                />
              </Space>
            )}
          </div>
        }
        className="map-viewer-card"
        style={{ height: isFullscreen ? '100vh' : height }}
      >
        <div
          id="map-container"
          ref={mapContainerRef}
          className="map-container"
          style={{ height: '100%' }}
        />
        
        {showLegend && (
          <div className="map-legend">
            <div className="legend-title">图例</div>
            <div className="legend-items">
              {mode === 'matching' && (
                <>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#52c41a' }}></span>
                    <span>已匹配货物</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#f5222d' }}></span>
                    <span>未匹配货物</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#faad14' }}></span>
                    <span>自营货物</span>
                  </div>
                </>
              )}
              {mode === 'routes' && (
                <div className="legend-item">
                  <span className="legend-line" style={{ borderColor: '#1890ff' }}></span>
                  <span>运输路线</span>
                </div>
              )}
              {mode === 'shipments' && (
                <div className="legend-item">
                  <span className="legend-marker"></span>
                  <span>货物位置</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MapViewer;