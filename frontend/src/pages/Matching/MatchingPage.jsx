import React, {useEffect, useState} from 'react';
import {Button, Card, Col, message, Row, Select, Space, Statistic, Tag} from 'antd';
import {AimOutlined, CheckCircleOutlined, ExportOutlined, ReloadOutlined} from '@ant-design/icons';
import MapViewer from '../../components/MapViewer/MapViewer';
import DataTable from '../../components/DataTable/DataTable';
import {matchingAPI, routesAPI, shipmentsAPI} from '../../services/api';
import {formatCurrency, formatTime} from '../../utils/formatters';
import {MATCHING_STATUS} from '../../utils/constants';

const {Option} = Select;

const MatchingPage = () => {
    const [matchingResults, setMatchingResults] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedResult, setSelectedResult] = useState(null);
    const [mapMode, setMapMode] = useState('matching');
    const [mapEngine, setMapEngine] = useState('baidu'); // 'baidu' 或 'svg'
    const [statistics, setStatistics] = useState({
        totalMatches: 0,
        matchedRoutes: 0,
        matchedShipments: 0,
        avgMatchScore: 0
    });

    // 获取匹配结果数据
    const fetchMatchingResults = async () => {
        try {
            setLoading(true);

            // 获取匹配结果
            const [matchingResponse, routesResponse, shipmentsResponse] = await Promise.all([
                matchingAPI.getAll(),
                routesAPI.getAll(),
                shipmentsAPI.getAll()
            ]);

            let matches = matchingResponse.data;
            let routesData = routesResponse.data;
            let shipmentsData = shipmentsResponse.data;

            // 确保数据是数组
            if (!Array.isArray(matches)) {
                matches = matches?.matches || matches?.data || [];
            }
            if (!Array.isArray(routesData)) {
                routesData = routesData?.routes || routesData?.data || [];
            }
            if (!Array.isArray(shipmentsData)) {
                shipmentsData = shipmentsData?.shipments || shipmentsData?.data || [];
            }

            // 根据匹配结果更新货物的分配状态
            const updatedShipments = shipmentsData.map(shipment => {
                const matchedResult = matches.find(m => m.shipment_id === shipment.id && m.status === 'matched');
                return {
                    ...shipment,
                    assigned_route: matchedResult ? matchedResult.route_id : null
                };
            });

            setMatchingResults(matches);
            setRoutes(routesData);
            setShipments(updatedShipments);

            // 计算统计信息
            const stats = {
                totalMatches: matches.length,
                matchedRoutes: new Set(matches.map(m => m.route_id)).size,
                matchedShipments: new Set(matches.map(m => m.shipment_id)).size,
                avgMatchScore: matches.length > 0 ? matches.reduce((sum, m) => sum + (m.match_score || 0), 0) / matches.length : 0
            };
            setStatistics(stats);

            message.success('匹配结果加载成功');
        } catch (error) {
            console.error('获取匹配结果失败:', error);
            message.error('获取匹配结果失败');
            setMatchingResults([]);
            setRoutes([]);
            setShipments([]);
            setStatistics({
                totalMatches: 0,
                matchedRoutes: 0,
                matchedShipments: 0,
                avgMatchScore: 0
            });
        } finally {
            setLoading(false);
        }
    };

    // 处理匹配结果选择
    const handleResultSelect = (result) => {
        setSelectedResult(result);
        setMapMode('matching');
    };

    // 处理匹配结果筛选
    const handleResultFilter = async (filters) => {
        try {
            setLoading(true);
            const response = await matchingAPI.filter(filters);
            setMatchingResults(response.data);
            message.success(`筛选出 ${response.data.length} 条匹配结果`);
        } catch (error) {
            console.error('筛选匹配结果失败:', error);
            message.error('筛选匹配结果失败');
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
        const data = matchingResults.map(result => ({
            '匹配ID': result.id,
            '路线ID': result.route_id,
            '货物ID': result.shipment_id,
            '匹配分数': result.match_score,
            '状态': result.status,
            '成本节约': formatCurrency(result.cost_saving || 0),
            '时间节约': formatTime(result.time_saving || 0),
            '创建时间': new Date(result.created_at).toLocaleString()
        }));

        const csvContent = [
            Object.keys(data[0]).join(','),
            ...data.map(row => Object.values(row).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `matching_results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        message.success('匹配结果导出成功');
    };

    // 页面加载时获取数据
    useEffect(() => {
        fetchMatchingResults();
    }, []);

    // 获取匹配结果对应的路线和货物信息
    const getRouteInfo = (routeId) => {
        return routes.find(route => route.id === routeId) || {};
    };

    const getShipmentInfo = (shipmentId) => {
        return shipments.find(shipment => shipment.id === shipmentId) || {};
    };

    // 获取状态颜色
    const getStatusColor = (status) => {
        const statusConfig = MATCHING_STATUS[status?.toUpperCase()];
        return statusConfig?.color || 'default';
    };

    // 表格列配置
    const columns = [
        {
            title: '匹配ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            sorter: (a, b) => a.id - b.id
        },
        {
            title: '路线',
            key: 'route',
            width: 120,
            render: (_, record) => {
                const route = getRouteInfo(record.route_id);
                return (
                    <div>
                        <div style={{fontWeight: 'bold'}}>{route.origin}</div>
                        <div style={{color: '#999'}}>→</div>
                        <div>{route.destination}</div>
                    </div>
                );
            }
        },
        {
            title: '货物',
            key: 'shipment',
            width: 120,
            render: (_, record) => {
                const shipment = getShipmentInfo(record.shipment_id);
                return (
                    <div>
                        <div>{shipment.origin}</div>
                        <div style={{color: '#999'}}>→</div>
                        <div>{shipment.destination}</div>
                    </div>
                );
            }
        },
        {
            title: '匹配分数',
            dataIndex: 'match_score',
            key: 'match_score',
            width: 100,
            render: (score) => (
                <Tag color={score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'}>
                    {score?.toFixed(1) || '0.0'}
                </Tag>
            ),
            sorter: (a, b) => a.match_score - b.match_score
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 80,
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {status === 'matched' ? '已匹配' : status === 'pending' ? '待确认' : '已拒绝'}
                </Tag>
            )
        },
        {
            title: '成本节约',
            dataIndex: 'cost_saving',
            key: 'cost_saving',
            width: 100,
            render: (saving) => formatCurrency(saving || 0),
            sorter: (a, b) => (a.cost_saving || 0) - (b.cost_saving || 0)
        },
        {
            title: '时间节约',
            dataIndex: 'time_saving',
            key: 'time_saving',
            width: 100,
            render: (saving) => formatTime(saving || 0),
            sorter: (a, b) => (a.time_saving || 0) - (b.time_saving || 0)
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 160,
            render: (date) => new Date(date).toLocaleString(),
            sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
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
                        onClick={() => handleResultSelect(record)}
                    >
                        查看
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div className="matching-page">
            {/* 统计卡片 */}
            <Row gutter={16} style={{marginBottom: 24}}>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="总匹配数"
                            value={statistics.totalMatches}
                            prefix={<CheckCircleOutlined/>}
                            valueStyle={{color: '#1890ff'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="匹配路线数"
                            value={statistics.matchedRoutes}
                            valueStyle={{color: '#52c41a'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="匹配货物数"
                            value={statistics.matchedShipments}
                            valueStyle={{color: '#faad14'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="平均匹配分数"
                            value={statistics.avgMatchScore}
                            precision={1}
                            valueStyle={{color: '#f5222d'}}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 工具栏 */}
            <Card style={{marginBottom: 24}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 style={{margin: 0}}>匹配结果</h3>
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
                            onClick={fetchMatchingResults}
                            loading={loading}
                        >
                            刷新
                        </Button>
                        <Button
                            icon={<ExportOutlined/>}
                            onClick={handleExport}
                            disabled={matchingResults.length === 0}
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
                        title="匹配结果地图"
                        styles={{body: {padding: 0}}}
                        style={{height: '600px'}}
                    >
                        <MapViewer
                            mode="matching"
                            matchings={selectedResult ? [selectedResult] : matchingResults}
                            routes={selectedResult ? [getRouteInfo(selectedResult.route_id)] : (routes || [])}
                            shipments={selectedResult ? [getShipmentInfo(selectedResult.shipment_id)] : (shipments || [])}
                            onRouteClick={handleResultSelect}
                            mapEngine={mapEngine}
                            height="100%"
                        />
                    </Card>
                </Col>

                <Col span={12}>
                    {selectedResult ? (
                        <Card
                            title="匹配详情"
                            extra={
                                <Button
                                    type="text"
                                    onClick={() => setSelectedResult(null)}
                                >
                                    关闭
                                </Button>
                            }
                            style={{height: '600px', overflow: 'auto'}}
                        >
                            <div style={{padding: '16px 0'}}>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <strong>匹配ID:</strong>
                                        <div>{selectedResult.id}</div>
                                    </Col>
                                    <Col span={12}>
                                        <strong>匹配分数:</strong>
                                        <div>
                                            <Tag
                                                color={selectedResult.match_score >= 80 ? 'green' : selectedResult.match_score >= 60 ? 'orange' : 'red'}>
                                                {selectedResult.match_score?.toFixed(1) || '0.0'}
                                            </Tag>
                                        </div>
                                    </Col>
                                </Row>

                                <Row gutter={16} style={{marginTop: 16}}>
                                    <Col span={12}>
                                        <strong>路线信息:</strong>
                                        <div>
                                            {(() => {
                                                const route = getRouteInfo(selectedResult.route_id);
                                                return (
                                                    <div>
                                                        <div>{route.origin}</div>
                                                        <div style={{color: '#999'}}>→</div>
                                                        <div>{route.destination}</div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <strong>货物信息:</strong>
                                        <div>
                                            {(() => {
                                                const shipment = getShipmentInfo(selectedResult.shipment_id);
                                                return (
                                                    <div>
                                                        <div>{shipment.origin}</div>
                                                        <div style={{color: '#999'}}>→</div>
                                                        <div>{shipment.destination}</div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </Col>
                                </Row>

                                <Row gutter={16} style={{marginTop: 16}}>
                                    <Col span={8}>
                                        <strong>状态:</strong>
                                        <div>
                                            <Tag color={getStatusColor(selectedResult.status)}>
                                                {selectedResult.status === 'matched' ? '已匹配' : selectedResult.status === 'pending' ? '待确认' : '已拒绝'}
                                            </Tag>
                                        </div>
                                    </Col>
                                    <Col span={8}>
                                        <strong>成本节约:</strong>
                                        <div>{formatCurrency(selectedResult.cost_saving || 0)}</div>
                                    </Col>
                                    <Col span={8}>
                                        <strong>时间节约:</strong>
                                        <div>{formatTime(selectedResult.time_saving || 0)}</div>
                                    </Col>
                                </Row>

                                <div style={{marginTop: 16}}>
                                    <strong>创建时间:</strong>
                                    <div>{new Date(selectedResult.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card
                            title="匹配信息"
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
                                <CheckCircleOutlined style={{fontSize: 48, color: '#ccc', marginBottom: 16}}/>
                                <h3>选择匹配结果查看详情</h3>
                                <p style={{color: '#999'}}>点击左侧地图上的匹配结果或下方表格中的"查看"按钮</p>
                            </div>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* 数据表格 */}
            <Card style={{marginTop: 24}}>
                <DataTable
                    title="匹配结果列表"
                    data={matchingResults}
                    columns={columns}
                    loading={loading}
                    onFilter={handleResultFilter}
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

export default MatchingPage;