import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Button, Card, message, Select, Space} from 'antd';
import {ReloadOutlined} from '@ant-design/icons';
import MapService from '../../services/mapService';
import SVGMapViewer from './SVGMapViewer';
import {getRouteColor} from '../../utils/formatters';
import './MapViewer.css';

const {Option} = Select;

// 百度地图组件
const BaiduMapViewer = ({
                            routes = [],
                            shipments = [],
                            matchings = [],
                            mode = 'routes',
                            onRouteClick,
                            onShipmentClick,
                            height = '500px',
                            showLegend = true,
                            onControlsChange, // (controls: ReactNode) => void
                        }) => {
    const mapContainerRef = useRef(null);
    const mapServiceRef = useRef(null);
    const [mapType, setMapType] = useState('normal');
    const [loading, setLoading] = useState(false);

    // 显示路线
    const displayRoutes = useCallback(() => {
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
    }, [routes, onRouteClick]);

    // 显示货物
    const displayShipments = useCallback(() => {
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
    }, [shipments, onShipmentClick]);

    // 显示匹配结果
    const displayMatchingResults = useCallback(() => {
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
                // 添加路线节点标记点
                mapServiceRef.current.addRouteMarkers(route);
            });
        }
        // 自适应显示
        if (routes && routes.length > 0) {
            mapServiceRef.current.fitRoutes(routes);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routes, matchings, onRouteClick]);

    // 刷新地图数据
    const refreshMapData = useCallback(() => {
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
    }, [mode, displayRoutes, displayShipments, displayMatchingResults]);

    // 初始化地图服务
    const initializeMap = useCallback(() => {
        try {
            mapServiceRef.current = new MapService('map-container');
            refreshMapData();
        } catch (error) {
            message.error('地图初始化失败，请检查百度地图API配置');
            console.error('Map initialization error:', error);
        }
    }, [refreshMapData]);

    // 百度地图初始化
    useEffect(() => {
        // 等待百度地图API加载完成
        const checkBMapLoaded = () => {
            if (typeof window.BMap !== 'undefined' && window.BMap.Map) {
                // 延迟初始化，确保API完全加载
                setTimeout(() => {
                    initializeMap();
                }, 500);
            } else {
                // 每500ms检查一次，最多重试20次（10秒）
                let retryCount = 0;
                const maxRetries = 20;

                const retryCheck = () => {
                    retryCount++;
                    if (typeof window.BMap !== 'undefined' && window.BMap.Map) {
                        setTimeout(() => {
                            initializeMap();
                        }, 500);
                    } else if (retryCount < maxRetries) {
                        setTimeout(retryCheck, 500);
                    } else {
                        message.error('百度地图API加载超时，请检查网络连接和API密钥');
                        console.error('Baidu Map API failed to load after maximum retries');
                    }
                };

                setTimeout(retryCheck, 500);
            }
        };

        checkBMapLoaded();

        return () => {
            if (mapServiceRef.current) {
                mapServiceRef.current.destroy();
            }
        };
    }, [initializeMap]);

    // 根据模式刷新地图数据
    useEffect(() => {
        if (mapServiceRef.current) {
            refreshMapData();
        }
    }, [routes, shipments, matchings, mode, refreshMapData]);

    // 切换全屏（保留逻辑，供外部调用）
    const toggleFullscreen = () => { // eslint-disable-line no-unused-vars
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

    // 把控制栏节点通过回调暴露给父组件
    useEffect(() => {
        if (!onControlsChange) return;
        onControlsChange(
            <Space size="small">
                <Select value={mapType} onChange={handleMapTypeChange} style={{width: 90}} size="small">
                    <Option value="normal">普通</Option>
                    <Option value="satellite">卫星</Option>
                    <Option value="hybrid">混合</Option>
                </Select>
                <Button icon={<ReloadOutlined/>} onClick={refreshMapData} size="small" loading={loading}>
                    刷新
                </Button>
            </Space>
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapType, loading, onControlsChange]);

    // 只渲染地图容器，不包 Card
    return (
        <div style={{position: 'relative', width: '100%', height: height || '100%'}}>
            <div
                id="map-container"
                ref={mapContainerRef}
                style={{width: '100%', height: '100%'}}
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
                        <div className="legend-item">
                            <span className="legend-marker"/>
                            <span>路线节点</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 主组件
const MapViewer = ({
                       routes = [],
                       shipments = [],
                       matchings = [],
                       mode = 'routes',
                       onRouteClick,
                       onRouteSelect,
                       onShipmentClick,
                       height = '500px',
                       showLegend = true,
                       mapEngine = 'baidu',
                       onControlsChange, // 把地图内部控制栏节点传出给父组件的 Card extra
                   }) => {
    const handleRouteClick = onRouteClick || onRouteSelect;

    if (mapEngine === 'svg') {
        return (
            <SVGMapViewer
                routes={routes}
                shipments={shipments}
                matchings={matchings}
                mode={mode}
                onRouteClick={handleRouteClick}
                onShipmentClick={onShipmentClick}
                height={height}
                showLegend={showLegend}
            />
        );
    }

    return (
        <BaiduMapViewer
            routes={routes}
            shipments={shipments}
            matchings={matchings}
            mode={mode}
            onRouteClick={handleRouteClick}
            onShipmentClick={onShipmentClick}
            height={height}
            showLegend={showLegend}
            onControlsChange={onControlsChange}
        />
    );
};

export default MapViewer;