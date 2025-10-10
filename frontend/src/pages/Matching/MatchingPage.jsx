import React, {useEffect, useState} from 'react';
import {Button, Card, Col, message, Row, Select, Space, Statistic, Tag} from 'antd';
import {AimOutlined, CheckCircleOutlined, ExportOutlined, ReloadOutlined} from '@ant-design/icons';
import MapViewer from '../../components/MapViewer/MapViewer';
import DataTable from '../../components/DataTable/DataTable';
import {matchingAPI} from '../../services/api';
import {formatCurrency, formatTime} from '../../utils/formatters';
import {MATCHING_STATUS} from '../../utils/constants';

const {Option} = Select;

const MatchingPage = () => {
    const [matchingResults, setMatchingResults] = useState([]);
    const [matchTable, setMatchTable] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null);
    const [mapEngine, setMapEngine] = useState('baidu');
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

            // 使用新的详细接口获取匹配结果
            const detailedResponse = await matchingAPI.getDetailed();
            
            let detailedMatchings = detailedResponse.data;
            if (!Array.isArray(detailedMatchings)) {
                detailedMatchings = detailedMatchings?.data || [];
            }

            // 直接使用详细数据，无需额外查询
            setMatchingResults(detailedMatchings);
            setMatchTable(detailedMatchings);

            // 使用摘要API获取统计信息
            try {
                const summaryResponse = await matchingAPI.getSummary();
                const summaryData = summaryResponse.data?.data || summaryResponse.data;
                
                // 根据摘要数据更新统计信息
                const stats = {
                    total_shipments: summaryData.total_shipments || detailedMatchings.length,
                    matchedRoutes: Math.round(summaryData.avg_matching_rate * summaryData.total_shipments) || 0,
                    unmatched_shipments:summaryData.unmatched_shipments || 0,
                    matchedShipments: summaryData.matched_shipments || 0,
                    avgMatchScore: summaryData.avg_matching_rate ? (summaryData.avg_matching_rate * 100) : 0
                };
                setStatistics(stats);
            } catch (summaryError) {
                console.error('获取摘要信息失败:', summaryError);
                // 如果摘要API失败，使用详细数据计算
                const stats = {
                    totalMatches: detailedMatchings.length,
                    matchedRoutes: new Set(detailedMatchings.filter(m => m.status === 'matched').map(m => m.route_id)).size,
                    matchedShipments: new Set(detailedMatchings.filter(m => m.status === 'matched').map(m => m.shipment_id)).size,
                    avgMatchScore: 0
                };
                setStatistics(stats);
            }

            message.success('匹配结果加载成功');
        } catch (error) {
            console.error('获取匹配结果失败:', error);
            message.error('获取匹配结果失败');
            setMatchingResults([]);
            setMatchTable([]);
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

    // 处理数据导出 - 简化导出字段
    const handleExport = () => {
        const data = matchingResults.map(result => {
            const shipmentInfo = result.shipment_info || {};
            const routeInfo = result.route_info || {};
            return {
                '匹配ID': result.id,
                '货物ID': result.shipment_id,
                '路线ID': result.route_id,
                '起点': shipmentInfo.origin_city || '-',
                '终点': shipmentInfo.destination_city || '-',
                '货物数量': shipmentInfo.demand || '-',
                '货物重量': shipmentInfo.weight ? `${shipmentInfo.weight}kg` : '-',
                '货物体积': shipmentInfo.volume ? `${shipmentInfo.volume}m³` : '-',
                '路线节点': routeInfo.nodes ? routeInfo.nodes.join(' → ') : '-',
                '路线容量': routeInfo.capacity || '-',
                '可用容量': routeInfo.available_capacity || '-',
                '状态': result.status === 'matched' ? '已匹配' : result.status === 'pending' ? '待确认' : '已拒绝'
            };
        });

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

    // 获取匹配结果对应的路线和货物信息（新接口已包含详细信息）
    // 这些函数现在不再需要，因为数据已经包含在接口返回中
    // const getRouteInfo = (routeId) => {
    //     return {};
    // };

    // const getShipmentInfo = (shipmentId) => {
    //     return {};
    // };

    // 获取状态颜色
    const getStatusColor = (status) => {
        const statusConfig = MATCHING_STATUS[status?.toUpperCase()];
        return statusConfig?.color || 'default';
    };

    // 表格列配置 - 根据后端数据优化显示
    const columns = [
        {
            title: '匹配ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            sorter: (a, b) => a.id - b.id
        },
        {
            title: '货物ID',
            dataIndex: 'shipment_id',
            key: 'shipment_id',
            width: 80
        },
        {
            title: '路线ID',
            dataIndex: 'route_id',
            key: 'route_id',
            width: 80
        },
        {
            title: '路线详情',
            key: 'route',
            width: 200,
            render: (_, record) => {
                const routeInfo = record.route_info;
                if (!routeInfo || !routeInfo.nodes) {
                    return <Tag color="red">未匹配</Tag>;
                }
                return (
                    <div>
                        <div style={{fontWeight: 'bold', marginBottom: 4}}>
                            {routeInfo.nodes[0]} → {routeInfo.nodes[routeInfo.nodes.length - 1]}
                        </div>
                        <div style={{color: '#666', fontSize: '12px'}}>
                            途经: {routeInfo.nodes.slice(1, -1).join('   ')}
                        </div>
                    </div>
                );
            }
        },
        {
            title: '货物信息',
            key: 'shipment',
            width: 120,
            render: (_, record) => {
                const shipmentInfo = record.shipment_info;
                if (!shipmentInfo) {
                    return <Tag color="red">无数据</Tag>;
                }
                return (
                    <div>
                        <div style={{fontWeight: 'bold'}}>{shipmentInfo.origin_city}</div>
                        <div style={{color: '#999'}}>→</div>
                        <div>{shipmentInfo.destination_city}</div>
                    </div>
                );
            }
        },
        {
            title: '货物需求',
            key: 'demand',
            width: 100,
            render: (_, record) => {
                const shipmentInfo = record.shipment_info;
                if (!shipmentInfo) return '-';
                return (
                    <div style={{fontSize: '12px'}}>
                        <div>需求量: {shipmentInfo.demand}</div>
                        <div>重量: {shipmentInfo.weight}kg</div>
                        <div>体积: {shipmentInfo.volume}m³</div>
                    </div>
                );
            }
        },
        {
            title: '路线容量',
            key: 'capacity',
            width: 100,
            render: (_, record) => {
                const routeInfo = record.route_info;
                if (!routeInfo) return '-';
                return (
                    <div style={{fontSize: '12px'}}>
                        <div>总容量: {routeInfo.capacity}</div>
                        <div>可用: {routeInfo.available_capacity}</div>
                    </div>
                );
            }
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
            title: '操作',
            key: 'action',
            width: 80,
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
                            title="总货物数"
                            value={statistics.total_shipments}
                            prefix={<CheckCircleOutlined/>}
                            valueStyle={{color: '#1890ff'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="匹配货物数"
                            value={statistics.matchedShipments}
                            valueStyle={{color: '#52c41a'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="未匹配货物数"
                            value={statistics.unmatched_shipments}
                            valueStyle={{color: '#faad14'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="匹配成功率"
                            value={statistics.avgMatchScore}
                            precision={1}
                            suffix="%"
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
                            routes={selectedResult ? [selectedResult.route_info] : []}
                            shipments={selectedResult ? [selectedResult.shipment_info] : []}
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

                                {/* 路线详情卡片 */}
                                <Card size="small" style={{marginTop: 16, backgroundColor: '#f5f5f5'}}>
                                    <div style={{fontWeight: 'bold', marginBottom: 12, fontSize: '16px'}}>路线详情</div>
                                    {(() => {
                                        const routeInfo = selectedResult.route_info;
                                        if (!routeInfo) {
                                            return <Tag color="red">未匹配</Tag>;
                                        }
                                        
                                        const nodes = routeInfo.nodes || [];
                                        const costs = routeInfo.costs || [];
                                        const travelTimes = routeInfo.travel_times || [];
                                        const totalDistance = routeInfo.total_distance || 0;
                                        const totalCost = routeInfo.total_cost || 0;
                                        const totalTravelTime = routeInfo.total_travel_time || 0;
                                        
                                        return (
                                            <div>
                                                {/* 起点终点和总距离 */}
                                                <Row gutter={16} style={{marginBottom: 16}}>
                                                    <Col span={8}>
                                                        <div style={{textAlign: 'center'}}>
                                                            <div style={{color: '#1890ff', fontWeight: 'bold', fontSize: '18px'}}>
                                                                🏁 {nodes[0] || '起点'}
                                                            </div>
                                                            <div style={{fontSize: '12px', color: '#999'}}>起点</div>
                                                        </div>
                                                    </Col>
                                                    <Col span={8}>
                                                        <div style={{textAlign: 'center'}}>
                                                            <div style={{color: '#52c41a', fontWeight: 'bold'}}>
                                                                📏 {totalDistance.toFixed(1)} km
                                                            </div>
                                                            <div style={{fontSize: '12px', color: '#999'}}>总距离</div>
                                                        </div>
                                                    </Col>
                                                    <Col span={8}>
                                                        <div style={{textAlign: 'center'}}>
                                                            <div style={{color: '#ff4d4f', fontWeight: 'bold', fontSize: '18px'}}>
                                                                🎯 {nodes[nodes.length - 1] || '终点'}
                                                            </div>
                                                            <div style={{fontSize: '12px', color: '#999'}}>终点</div>
                                                        </div>
                                                    </Col>
                                                </Row>
                                                
                                                {/* 路线段详情 */}
                                                <div style={{marginTop: 16}}>
                                                    <div style={{fontWeight: 'bold', marginBottom: 8, color: '#666'}}>路线分段信息:</div>
                                                    {nodes.map((node, index) => {
                                                        if (index >= nodes.length - 1) return null;
                                                        
                                                        const nextNode = nodes[index + 1];
                                                        const segmentCost = costs[index] || 0;
                                                        const segmentTime = travelTimes[index] || 0;
                                                        
                                                        return (
                                                            <Card key={index} size="small" style={{marginBottom: 8, borderLeft: '3px solid #1890ff'}}>
                                                                <Row gutter={16} align="middle">
                                                                    <Col span={6}>
                                                                        <div style={{fontWeight: 'bold'}}>
                                                                            {node} → {nextNode}
                                                                        </div>
                                                                    </Col>
                                                                    <Col span={6}>
                                                                        <div style={{textAlign: 'center'}}>
                                                                            <div style={{color: '#faad14', fontWeight: 'bold'}}>
                                                                                ¥{segmentCost.toFixed(2)}
                                                                            </div>
                                                                            <div style={{fontSize: '11px', color: '#999'}}>成本</div>
                                                                        </div>
                                                                    </Col>
                                                                    <Col span={6}>
                                                                        <div style={{textAlign: 'center'}}>
                                                                            <div style={{color: '#722ed1', fontWeight: 'bold'}}>
                                                                                {segmentTime.toFixed(1)}h
                                                                            </div>
                                                                            <div style={{fontSize: '11px', color: '#999'}}>耗时</div>
                                                                        </div>
                                                                    </Col>
                                                                    <Col span={6}>
                                                                        <div style={{textAlign: 'center'}}>
                                                                            <div style={{color: '#13c2c2', fontWeight: 'bold'}}>
                                                                                {index + 1}/{nodes.length - 1}
                                                                            </div>
                                                                            <div style={{fontSize: '11px', color: '#999'}}>路段</div>
                                                                        </div>
                                                                    </Col>
                                                                </Row>
                                                            </Card>
                                                        );
                                                    })}
                                                </div>
                                                
                                                {/* 总计信息 */}
                                                <div style={{marginTop: 16, padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '6px'}}>
                                                    <Row gutter={16}>
                                                        <Col span={8}>
                                                            <div style={{textAlign: 'center'}}>
                                                                <div style={{color: '#1890ff', fontWeight: 'bold', fontSize: '16px'}}>
                                                                    ¥{totalCost.toFixed(2)}
                                                                </div>
                                                                <div style={{fontSize: '12px', color: '#666'}}>总成本</div>
                                                            </div>
                                                        </Col>
                                                        <Col span={8}>
                                                            <div style={{textAlign: 'center'}}>
                                                                <div style={{color: '#52c41a', fontWeight: 'bold', fontSize: '16px'}}>
                                                                    {totalTravelTime.toFixed(1)}h
                                                                </div>
                                                                <div style={{fontSize: '12px', color: '#666'}}>总耗时</div>
                                                            </div>
                                                        </Col>
                                                        <Col span={8}>
                                                            <div style={{textAlign: 'center'}}>
                                                                <div style={{color: '#faad14', fontWeight: 'bold', fontSize: '16px'}}>
                                                                    {nodes.length} 个城市
                                                                </div>
                                                                <div style={{fontSize: '12px', color: '#666'}}>途经城市</div>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </Card>
                                
                                {/* 货物信息 */}
                                <Card size="small" style={{marginTop: 16, backgroundColor: '#fff7e6'}}>
                                    <div style={{fontWeight: 'bold', marginBottom: 12, fontSize: '16px'}}>货物信息</div>
                                    {(() => {
                                        const shipmentInfo = selectedResult.shipment_info;
                                        const originCity = shipmentInfo?.origin_city || '未知起点';
                                        const destinationCity = shipmentInfo?.destination_city || '未知终点';
                                        const weight = shipmentInfo?.weight || 0;
                                        const volume = shipmentInfo?.volume || 0;
                                        const priority = shipmentInfo?.priority || 1;
                                        
                                        return (
                                            <div>
                                                <Row gutter={16} style={{marginBottom: 16}}>
                                                    <Col span={12}>
                                                        <div style={{textAlign: 'center'}}>
                                                            <div style={{color: '#1890ff', fontWeight: 'bold', fontSize: '18px'}}>
                                                                📦 {originCity}
                                                            </div>
                                                            <div style={{fontSize: '12px', color: '#999'}}>发货地</div>
                                                        </div>
                                                    </Col>
                                                    <Col span={12}>
                                                        <div style={{textAlign: 'center'}}>
                                                            <div style={{color: '#ff4d4f', fontWeight: 'bold', fontSize: '18px'}}>
                                                                🎯 {destinationCity}
                                                            </div>
                                                            <div style={{fontSize: '12px', color: '#999'}}>收货地</div>
                                                        </div>
                                                    </Col>
                                                </Row>
                                                
                                                <Row gutter={16}>
                                                    <Col span={8}>
                                                        <div style={{textAlign: 'center', padding: '8px', backgroundColor: '#f0f5ff', borderRadius: '4px'}}>
                                                            <div style={{color: '#722ed1', fontWeight: 'bold'}}>
                                                                {weight.toFixed(1)} kg
                                                            </div>
                                                            <div style={{fontSize: '11px', color: '#666'}}>重量</div>
                                                        </div>
                                                    </Col>
                                                    <Col span={8}>
                                                        <div style={{textAlign: 'center', padding: '8px', backgroundColor: '#fff0f6', borderRadius: '4px'}}>
                                                            <div style={{color: '#eb2f96', fontWeight: 'bold'}}>
                                                                {volume.toFixed(1)} m³
                                                            </div>
                                                            <div style={{fontSize: '11px', color: '#666'}}>体积</div>
                                                        </div>
                                                    </Col>
                                                    <Col span={8}>
                                                        <div style={{textAlign: 'center', padding: '8px', backgroundColor: '#fff2e8', borderRadius: '4px'}}>
                                                            <div style={{color: '#fa8c16', fontWeight: 'bold'}}>
                                                                {'⭐'.repeat(priority)}
                                                            </div>
                                                            <div style={{fontSize: '11px', color: '#666'}}>优先级</div>
                                                        </div>
                                                    </Col>
                                                </Row>
                                            </div>
                                        );
                                    })()}
                                </Card>

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
                    data={matchTable}
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