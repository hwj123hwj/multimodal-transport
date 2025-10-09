import React, {useEffect, useState} from 'react';
import {Button, Card, Col, message, Row, Select, Space, Statistic, Tag} from 'antd';
import {AimOutlined, ExportOutlined, ReloadOutlined} from '@ant-design/icons';
import MapViewer from '../../components/MapViewer/MapViewer';
import DataTable from '../../components/DataTable/DataTable';
import {routesAPI} from '../../services/api';
import {formatCurrency, formatDistance, formatTime} from '../../utils/formatters';
import {ROUTE_COLORS} from '../../utils/constants';

const {Option} = Select;
const RoutesPage = () => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [mapMode, setMapMode] = useState('routes');
    const [mapEngine, setMapEngine] = useState('baidu'); // 'baidu' 或 'svg'
    const [statistics, setStatistics] = useState({
        totalRoutes: 0,
        totalDistance: 0,
        totalDuration: 0,
        avgCost: 0
    });

    // 获取路线数据
    const fetchRoutes = async () => {
        try {
            setLoading(true);
            const response = await routesAPI.getAll();
            let data = response.data;

            // 确保data是数组
            if (!Array.isArray(data)) {
                data = data?.routes || data?.data || [];
            }

            setRoutes(data);

            // 计算统计信息
            const stats = {
                totalRoutes: data.length,
                totalDistance: data.reduce((sum, route) => sum + (route.total_distance || 0), 0),
                totalDuration: data.reduce((sum, route) => sum + (route.total_duration || 0), 0),
                avgCost: data.length > 0 ? data.reduce((sum, route) => sum + (route.total_cost || 0), 0) / data.length : 0
            };
            setStatistics(stats);

            message.success('路线数据加载成功');
        } catch (error) {
            console.error('获取路线数据失败:', error);
            message.error('获取路线数据失败');
            setRoutes([]);
            setStatistics({
                totalRoutes: 0,
                totalDistance: 0,
                totalDuration: 0,
                avgCost: 0
            });
        } finally {
            setLoading(false);
        }
    };

    // 处理路线选择
    const handleRouteSelect = (route) => {
        setSelectedRoute(route);
        setMapMode('routes');
    };

    // 处理路线筛选
    const handleRouteFilter = async (filters) => {
        try {
            setLoading(true);
            const response = await routesAPI.filter(filters);
            setRoutes(response.data);
            message.success(`筛选出 ${response.data.length} 条路线`);
        } catch (error) {
            console.error('筛选路线失败:', error);
            message.error('筛选路线失败');
        } finally {
            setLoading(false);
        }
    };

    // 切换地图引擎
    const handleMapEngineChange = (engine) => {
        setMapEngine(engine);
        message.info(`已切换到${engine === 'baidu' ? '百度地图' : 'SVG地图'}`);
    };

// 处理数据导出
    const handleExport = () => {
        const data = routes.map(route => ({
            '路线ID': route.id,
            '起点': route.nodes && route.nodes.length > 0 ? route.nodes[0] : '-',  // 修改这里
            '终点': route.nodes && route.nodes.length > 0 ? route.nodes[route.nodes.length - 1] : '-',  // 修改这里
            '距离': formatDistance(route.total_distance),
            '耗时': formatTime(route.total_duration),
            '成本': formatCurrency(route.total_cost),
            '途经城市': route.nodes ? route.nodes.join(', ') : '-',  // 修改这里，原来可能是 waypoints
            '创建时间': new Date(route.created_at).toLocaleString()
        }));

        const csvContent = [
            Object.keys(data[0]).join(','),
            ...data.map(row => Object.values(row).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `routes_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        message.success('路线数据导出成功');
    };

    // 页面加载时获取数据
    useEffect(() => {
        fetchRoutes();
    }, []);

    // 表格列配置
    const columns = [
        {
            title: '路线ID',
            dataIndex: 'route_id',
            key: 'route_id',
            width: 80,
            sorter: (a, b) => a.id - b.id
        },
        {
            title: '起点',
            dataIndex: 'nodes',
            key: 'origin',
            ellipsis: true,
            filter: true,
            render: (nodes) => nodes && nodes.length > 0 ? nodes[0] : '-'
        },
        {
            title: '终点',
            dataIndex: 'nodes',
            key: 'destination',
            ellipsis: true,
            filter: true,
            render: (nodes) => nodes && nodes.length > 0 ? nodes[nodes.length - 1] : '-'
        },
        {
            title: '距离',
            dataIndex: 'total_distance',
            key: 'total_distance',
            width: 100,
            render: (distance) => formatDistance(distance),
            sorter: (a, b) => a.total_distance - b.total_distance
        },
        {
            title: '耗时',
            dataIndex: 'total_duration',
            key: 'total_duration',
            width: 100,
            render: (duration) => formatTime(duration),
            sorter: (a, b) => a.total_duration - b.total_duration
        },
        {
            title: '成本',
            dataIndex: 'total_cost',
            key: 'total_cost',
            width: 100,
            render: (cost) => formatCurrency(cost),
            sorter: (a, b) => a.total_cost - b.total_cost
        },
        {
            title: '途经城市',
            dataIndex: 'nodes',
            key: 'nodes',
            ellipsis: true,
            render: (waypoints) => {
                if (!waypoints || !Array.isArray(waypoints) || waypoints.length === 0) {
                    return '-';
                }
                return (
                    <Space size="small" wrap>
                        {waypoints.slice(0, 5).map((city, index) => (
                            <Tag key={index} color="blue">{city}</Tag>
                        ))}
                        {waypoints.length > 5 && (
                            <Tag color="default">+{waypoints.length - 3}</Tag>
                        )}
                    </Space>
                );
            }
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<AimOutlined/>}
                        onClick={() => handleRouteSelect(record)}
                    >
                        查看
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div className="routes-page">
            {/* 统计卡片 */}
            <Row gutter={16} style={{marginBottom: 24}}>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="总路线数"
                            value={statistics.totalRoutes}
                            prefix={<AimOutlined/>}
                            valueStyle={{color: '#1890ff'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="总距离"
                            value={statistics.totalDistance}
                            precision={1}
                            suffix="km"
                            valueStyle={{color: '#52c41a'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="总耗时"
                            value={statistics.totalDuration}
                            precision={1}
                            suffix="小时"
                            valueStyle={{color: '#faad14'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="平均成本"
                            value={statistics.avgCost}
                            precision={2}
                            prefix="¥"
                            valueStyle={{color: '#f5222d'}}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 工具栏 */}
            <Card style={{marginBottom: 24}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 style={{margin: 0}}>路线管理</h3>
                    <Space>
                        <Select
                            value={mapEngine}
                            onChange={handleMapEngineChange}
                            style={{width: 120}}
                            size="small"
                        >
                            <Option value="baidu">百度地图</Option>
                            <Option value="svg">SVG地图</Option>
                        </Select>
                        <Button
                            type="primary"
                            icon={<ReloadOutlined/>}
                            onClick={fetchRoutes}
                            loading={loading}
                        >
                            刷新
                        </Button>
                        <Button
                            icon={<ExportOutlined/>}
                            onClick={handleExport}
                            disabled={routes.length === 0}
                        >
                            导出
                        </Button>
                    </Space>
                </div>
            </Card>

            {/* 地图和详情区域 */}
            <Row gutter={16}>
                <Col span={12}>
                    <Card
                        title="路线地图"
                        styles={{body: {padding: 0}}}
                        style={{height: '600px'}}
                    >
                        <MapViewer
                            mode={mapMode}
                            routes={selectedRoute ? [selectedRoute] : routes}
                            shipments={[]}  // 添加缺失的属性
                            matchings={[]}  // 添加缺失的属性
                            onRouteSelect={handleRouteSelect}
                            mapEngine={mapEngine}
                            height="100%"
                        />
                    </Card>
                </Col>

                <Col span={12}>
                    {selectedRoute ? (
                        <Card
                            title="路线详情"
                            extra={
                                <Button
                                    type="text"
                                    onClick={() => setSelectedRoute(null)}
                                >
                                    关闭
                                </Button>
                            }
                            style={{height: '600px', overflow: 'auto'}}
                        >
                            <div style={{padding: '16px 0'}}>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <strong>起点:</strong>
                                        <div>{selectedRoute.nodes && selectedRoute.nodes.length > 0 ? selectedRoute.nodes[0] : '-'}</div>
                                    </Col>
                                    <Col span={12}>
                                        <strong>终点:</strong>
                                        <div>{selectedRoute.nodes && selectedRoute.nodes.length > 0 ? selectedRoute.nodes[selectedRoute.nodes.length - 1] : '-'}</div>
                                    </Col>
                                </Row>

                                <Row gutter={16} style={{marginTop: 16}}>
                                    <Col span={8}>
                                        <strong>距离:</strong>
                                        <div>{formatDistance(selectedRoute.total_distance)}</div>
                                    </Col>
                                    <Col span={8}>
                                        <strong>耗时:</strong>
                                        <div>{formatTime(selectedRoute.total_duration)}</div>
                                    </Col>
                                    <Col span={8}>
                                        <strong>成本:</strong>
                                        <div>{formatCurrency(selectedRoute.total_cost)}</div>
                                    </Col>
                                </Row>

                                <div style={{marginTop: 16}}>
                                    <strong>途经城市:</strong>
                                    <div style={{marginTop: 8}}>
                                        <Space size="small" wrap>
                                            {selectedRoute.nodes && selectedRoute.nodes.map((city, index) => (
                                                <Tag key={index} color={ROUTE_COLORS[index % ROUTE_COLORS.length]}>
                                                    {city}
                                                </Tag>
                                            ))}
                                        </Space>
                                    </div>
                                </div>

                                <div style={{marginTop: 16}}>
                                    <strong>创建时间:</strong>
                                    <div>{new Date(selectedRoute.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card
                            title="路线信息"
                            style={{height: '600px'}}
                        >
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                textAlign: 'center'
                            }}>
                                <AimOutlined style={{fontSize: 48, color: '#ccc', marginBottom: 16}}/>
                                <h3>选择路线查看详情</h3>
                                <p style={{color: '#999'}}>点击左侧地图上的路线或下方表格中的"查看"按钮</p>
                            </div>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* 数据表格 */}
            <Card style={{marginTop: 24}}>
                <DataTable
                    title="路线列表"
                    data={routes}
                    columns={columns}
                    loading={loading}
                    onFilter={handleRouteFilter}
                    exportable
                    searchable
                    pagination
                    rowKey="id"
                    style={{marginTop: 16}}
                />
            </Card>
        </div>
    );
};

export default RoutesPage;