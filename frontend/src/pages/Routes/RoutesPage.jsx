import React, {useEffect, useState} from 'react';
import {Button, Card, Col, message, Row, Select, Space, Statistic, Tag, Input} from 'antd';
import {AimOutlined, ReloadOutlined} from '@ant-design/icons';
import MapViewer from '../../components/MapViewer/MapViewer';
import DataTable from '../../components/DataTable/DataTable';
import {routesAPI} from '../../services/api';
import api from '../../services/api';
import {formatCurrency, formatDistance, formatTime} from '../../utils/formatters';
import {ROUTE_COLORS} from '../../utils/constants';
import useSceneSelector from '../../hooks/useSceneSelector';

const {Option} = Select;

const RoutesPage = () => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [mapMode, setMapMode] = useState('routes');
    const [mapEngine, setMapEngine] = useState('baidu'); // 'baidu' 或 'svg'
    const [statistics, setStatistics] = useState({
        totalRoutes: 0,
        totalCapacity: 0,
        avgDuration: 0,
        avgCost: 0
    });
    const [originSearch, setOriginSearch] = useState('');
    const [destinationSearch, setDestinationSearch] = useState('');
    const {selectScenes, activeId, setActiveId, loadingScenes} = useSceneSelector(false);
    const [mapControls, setMapControls] = useState(null); // 由 MapViewer 传出的控制栏节点

    // 获取路线数据
    const fetchRoutes = async (sceneId) => {
        try {
            setLoading(true);
            let data = [];
            if (sceneId) {
                const response = await api.get(`/scenes/${sceneId}/routes`);
                data = response?.data?.routes || [];
            } else {
                const response = await routesAPI.getAll();
                data = response?.data?.routes || [];
            }

            setRoutes(data);

            const stats = {
                totalRoutes: data.length,
                totalCapacity: data.reduce((sum, route) => sum + (route.capacity || 0), 0),
                avgDuration: data.length > 0 ? data.reduce((sum, route) => sum + (route.total_travel_time || 0), 0) / data.length : 0,
                avgCost: data.length > 0 ? data.reduce((sum, route) => sum + (route.total_cost || 0), 0) / data.length : 0
            };
            setStatistics(stats);

            message.success('路线数据加载成功');
        } catch (error) {
            console.error('获取路线数据失败:', error);
            setRoutes([]);
            setStatistics({
                totalRoutes: 0,
                totalCapacity: 0,
                avgDuration: 0,
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

    // 处理路线搜索（按起点和终点）
    const handleRouteSearch = async () => {
        try {
            setLoading(true);
            // 只有当至少有一个搜索条件时才进行搜索
            if (originSearch || destinationSearch) {
                const params = {};
                if (originSearch) params.origin = originSearch;
                if (destinationSearch) params.destination = destinationSearch;

                const response = await routesAPI.filter(params);
                // filter接口返回 {status, routes:[]}（注意该接口未包装在data里）
                const routesData = response?.routes || [];
                setRoutes(routesData);
                message.success(`筛选出 ${routesData.length} 条路线`);
            } else {
                // 如果没有搜索条件，加载所有路线
                await fetchRoutes();
            }
        } catch (error) {
            message.error('搜索失败，请检查网络连接');
        } finally {
            setLoading(false);
        }
    };

    // 切换地图引擎
    const handleMapEngineChange = (engine) => {
        setMapEngine(engine);
    };

    // 处理数据导出
    /*
    const handleExport = () => {
        const data = routes.map(route => ({
            '路线ID': route.route_id,
            '起点': route.nodes && route.nodes.length > 0 ? route.nodes[0] : '-',
            '终点': route.nodes && route.nodes.length > 0 ? route.nodes[route.nodes.length - 1] : '-',
            '距离': formatDistance(route.total_distance),
            '耗时': formatTime(route.total_travel_time),
            '成本': formatCurrency(route.total_cost),
            '途经城市': route.nodes ? route.nodes.join(', ') : '-',
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
    */

    // 页面加载时获取数据，场景切换时重新加载
    useEffect(() => {
        fetchRoutes(activeId);
    }, [activeId]); // eslint-disable-line

    // 表格列配置
    const columns = [
        {
            title: '路线ID',
            dataIndex: 'route_id',
            key: 'route_id',
            width: 80,
            sorter: (a, b) => a.route_id - b.route_id
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
            dataIndex: 'total_travel_time',
            key: 'total_travel_time',
            width: 100,
            render: (duration) => formatTime(duration),
            sorter: (a, b) => a.total_travel_time - b.total_travel_time
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
            title: '路线种类',
            dataIndex: 'route_category',
            key: 'route_category',
            width: 120,
            render: (category) => (
                <Tag color={category === '西海路新通道' ? 'green' : category === '长江经济带' ? 'blue' : category === '跨境公路' ? 'orange' : 'default'}>
                    {category || '未分类'}
                </Tag>
            )
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

    // 自定义搜索栏
    const customSearchBar = (
        <Space>
            <Input
                placeholder="起点"
                value={originSearch}
                onChange={(e) => setOriginSearch(e.target.value)}
                style={{width: 120}}
            />
            <Input
                placeholder="终点"
                value={destinationSearch}
                onChange={(e) => setDestinationSearch(e.target.value)}
                style={{width: 120}}
            />
            <Button
                type="primary"
                onClick={handleRouteSearch}
                loading={loading}
            >
                搜索
            </Button>
        </Space>
    );

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
                            title="总容量"
                            value={statistics.totalCapacity}
                            precision={0}
                            suffix="TEU"
                            valueStyle={{color: '#52c41a'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="平均耗时"
                            value={statistics.avgDuration}
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
                            placeholder="切换场景"
                            value={activeId}
                            onChange={setActiveId}
                            style={{width: 160}}
                            size="small"
                            loading={loadingScenes}
                            allowClear
                        >
                            {selectScenes.map(s => (
                                <Option key={s.id} value={s.id}>{s.label}</Option>
                            ))}
                        </Select>
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
                            icon={<ReloadOutlined/>}
                            onClick={() => fetchRoutes(activeId)}
                            loading={loading}
                        >
                            刷新
                        </Button>
                    </Space>
                </div>
            </Card>

            {/* 地图和详情区域 */}
            <Row gutter={16}>
                <Col span={12}>
                    <Card
                        title="路线地图"
                        extra={
                            <Space size="small">
                                <Select
                                    value={mapEngine}
                                    onChange={handleMapEngineChange}
                                    style={{width: 80}}
                                    size="small"
                                >
                                    <Option value="baidu">百度</Option>
                                    <Option value="svg">SVG</Option>
                                </Select>
                                {mapControls}
                            </Space>
                        }
                        styles={{body: {padding: 0, height: 'calc(100% - 46px)'}}}
                        style={{height: '600px'}}
                    >
                        <MapViewer
                            mode={mapMode}
                            routes={selectedRoute ? [selectedRoute] : routes}
                            shipments={[]}
                            matchings={[]}
                            onRouteClick={handleRouteSelect}
                            mapEngine={mapEngine}
                            height="100%"
                            onControlsChange={setMapControls}
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
                                {/* 基本信息卡片 */}
                                <Card size="small" style={{marginBottom: 16}}>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <div style={{textAlign: 'center'}}>
                                                <div style={{color: '#1890ff', fontWeight: 'bold', fontSize: '18px'}}>
                                                    {selectedRoute.nodes && selectedRoute.nodes.length > 0 ? selectedRoute.nodes[0] : '-'}
                                                </div>
                                                <div style={{fontSize: '12px', color: '#666'}}>起点城市</div>
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div style={{textAlign: 'center'}}>
                                                <div style={{color: '#52c41a', fontWeight: 'bold', fontSize: '18px'}}>
                                                    {selectedRoute.nodes && selectedRoute.nodes.length > 0 ? selectedRoute.nodes[selectedRoute.nodes.length - 1] : '-'}
                                                </div>
                                                <div style={{fontSize: '12px', color: '#666'}}>终点城市</div>
                                            </div>
                                        </Col>
                                    </Row>
                                    <Row gutter={16} style={{marginTop: 16}}>
                                        <Col span={6}>
                                            <div style={{textAlign: 'center'}}>
                                                <div style={{color: '#fa8c16', fontWeight: 'bold', fontSize: '16px'}}>
                                                    {formatDistance(selectedRoute.total_distance)}
                                                </div>
                                                <div style={{fontSize: '12px', color: '#666'}}>总距离</div>
                                            </div>
                                        </Col>
                                        <Col span={6}>
                                            <div style={{textAlign: 'center'}}>
                                                <div style={{color: '#722ed1', fontWeight: 'bold', fontSize: '16px'}}>
                                                    {formatTime(selectedRoute.total_travel_time)}
                                                </div>
                                                <div style={{fontSize: '12px', color: '#666'}}>总耗时</div>
                                            </div>
                                        </Col>
                                        <Col span={6}>
                                            <div style={{textAlign: 'center'}}>
                                                <div style={{color: '#eb2f96', fontWeight: 'bold', fontSize: '16px'}}>
                                                    {formatCurrency(selectedRoute.total_cost)}
                                                </div>
                                                <div style={{fontSize: '12px', color: '#666'}}>总成本</div>
                                            </div>
                                        </Col>
                                        <Col span={6}>
                                            <div style={{textAlign: 'center'}}>
                                                <div style={{color: '#13c2c2', fontWeight: 'bold', fontSize: '16px'}}>
                                                    {selectedRoute.route_category || '未分类'}
                                                </div>
                                                <div style={{fontSize: '12px', color: '#666'}}>路线分类</div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card>

                                {/* 分段详情 */}
                                <Card size="small" title="分段详情" style={{marginBottom: 16}}>
                                    {selectedRoute.nodes && selectedRoute.nodes.length > 1 && selectedRoute.costs && selectedRoute.travel_times && (
                                        <div>
                                            {selectedRoute.nodes.slice(0, -1).map((fromCity, index) => {
                                                const toCity = selectedRoute.nodes[index + 1];
                                                const cost = selectedRoute.costs[index] || 0;
                                                const time = selectedRoute.travel_times[index] || 0;
                                                return (
                                                    <Card key={index} size="small" style={{marginBottom: 8, backgroundColor: '#f0f2f5'}}>
                                                        <Row gutter={16} align="middle">
                                                            <Col span={6}>
                                                                <div style={{textAlign: 'center'}}>
                                                                    <div style={{fontWeight: 'bold'}}>
                                                                        {fromCity} → {toCity}
                                                                    </div>
                                                                </div>
                                                            </Col>
                                                            <Col span={6}>
                                                                <div style={{textAlign: 'center'}}>
                                                                    <div style={{color: '#faad14', fontWeight: 'bold'}}>
                                                                        ¥{formatCurrency(cost)}
                                                                    </div>
                                                                    <div style={{fontSize: '11px', color: '#999'}}>成本</div>
                                                                </div>
                                                            </Col>
                                                            <Col span={6}>
                                                                <div style={{textAlign: 'center'}}>
                                                                    <div style={{color: '#722ed1', fontWeight: 'bold'}}>
                                                                        {formatTime(time)}
                                                                    </div>
                                                                    <div style={{fontSize: '11px', color: '#999'}}>耗时</div>
                                                                </div>
                                                            </Col>
                                                            <Col span={6}>
                                                                <div style={{textAlign: 'center'}}>
                                                                    <div style={{color: '#13c2c2', fontWeight: 'bold'}}>
                                                                        {index + 1}/{selectedRoute.nodes.length - 1}
                                                                    </div>
                                                                    <div style={{fontSize: '11px', color: '#999'}}>路段</div>
                                                                </div>
                                                            </Col>
                                                        </Row>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>

                                {/* 途经城市 */}
                                <Card size="small" title="途经城市">
                                    <div style={{marginTop: 8}}>
                                        <Space size="small" wrap>
                                            {selectedRoute.nodes && selectedRoute.nodes.map((city, index) => (
                                                <Tag key={index} color={ROUTE_COLORS[index % ROUTE_COLORS.length]}>
                                                    {city}
                                                </Tag>
                                            ))}
                                        </Space>
                                    </div>
                                    <div style={{marginTop: 8, fontSize: '12px', color: '#666'}}>
                                        共 {selectedRoute.nodes ? selectedRoute.nodes.length : 0} 个城市
                                    </div>
                                </Card>
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
                    // 移除默认的筛选功能
                    filterable={false}
                    exportable
                    // 移除默认的搜索功能，使用自定义搜索
                    searchable={false}
                    customSearch={customSearchBar}
                    pagination
                    rowKey="id"
                    style={{marginTop: 16}}
                />
            </Card>
        </div>
    );
};

export default RoutesPage;