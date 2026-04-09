import React, {useEffect, useState} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {Card, Col, Row, Statistic, Tag, Table, Button, message, Spin} from 'antd';
import {ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined} from '@ant-design/icons';
import MapViewer from '../../components/MapViewer/MapViewer';
import api from '../../services/api';
import {formatCurrency, formatTime} from '../../utils/formatters';

const TracePage = () => {
    const {shipmentId} = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [traceData, setTraceData] = useState(null);

    useEffect(() => {
        if (shipmentId) {
            fetchTraceData(shipmentId);
        }
    }, [shipmentId]);

    const fetchTraceData = async (id) => {
        try {
            setLoading(true);
            const res = await api.get(`/shipment/${id}/trace`);
            setTraceData(res.data);
            message.success('溯源数据加载成功');
        } catch (error) {
            console.error('获取溯源数据失败:', error);
            message.error('获取溯源数据失败');
        } finally {
            setLoading(false);
        }
    };

    const getStatusTag = (routeId) => {
        if (!traceData || !traceData.selected_route_id) {
            return <Tag color="default">未选中</Tag>;
        }
        if (routeId === traceData.selected_route_id) {
            return <Tag color="success" icon={<CheckCircleOutlined/>}>已选中</Tag>;
        }
        return <Tag color="warning" icon={<CloseCircleOutlined/>}>备选</Tag>;
    };

    const columns = [
        {
            title: '排名',
            key: 'rank',
            width: 80,
            render: (_, record, index) => index + 1
        },
        {
            title: '路线ID',
            dataIndex: ['route_id'],
            key: 'route_id',
            width: 80
        },
        {
            title: '路线详情',
            key: 'route_detail',
            width: 200,
            render: (_, record) => {
                const routeInfo = record.route_info;
                const nodes = routeInfo?.nodes || [];
                if (nodes.length < 2) {
                    return '-';
                }
                return (
                    <div>
                        <div style={{fontWeight: 'bold'}}>
                            {nodes[0]} → {nodes[nodes.length - 1]}
                        </div>
                        <div style={{color: '#666', fontSize: '12px'}}>
                            途经: {nodes.slice(1, -1).join('   ')}
                        </div>
                    </div>
                );
            }
        },
        {
            title: '匹配成本',
            key: 'score',
            width: 120,
            render: (_, record) => (
                <span style={{fontWeight: 'bold', color: '#1890ff'}}>
                    {formatCurrency(record.score)}
                </span>
            ),
            sorter: (a, b) => a.score - b.score,
            defaultSortOrder: 'ascend'
        },
        {
            title: '运输成本',
            key: 'transport_cost',
            width: 120,
            render: (_, record) => {
                const routeInfo = record.route_info;
                const totalCost = routeInfo?.total_cost || 0;
                return formatCurrency(totalCost);
            }
        },
        {
            title: '时间成本',
            key: 'time_cost',
            width: 120,
            render: (_, record) => {
                const routeInfo = record.route_info;
                const totalTime = routeInfo?.total_travel_time || 0;
                return formatTime(totalTime);
            }
        },
        {
            title: '状态',
            key: 'status',
            width: 100,
            render: (_, record) => getStatusTag(record.route_id)
        }
    ];

    const mapRoutes = traceData?.routes?.map(r => ({
        ...r.route_info,
        route_id: r.route_id,
        score: r.score
    })) || [];

    return (
        <div className="trace-page">
            <div style={{marginBottom: 16}}>
                <Button
                    icon={<ArrowLeftOutlined/>}
                    onClick={() => navigate('/matching')}
                >
                    返回匹配结果
                </Button>
            </div>

            {loading ? (
                <div style={{textAlign: 'center', padding: 100}}>
                    <Spin size="large" tip="加载中..."/>
                </div>
            ) : traceData ? (
                <>
                    {/* 货物信息卡片 */}
                    <Card title="货物信息" style={{marginBottom: 24}}>
                        <Row gutter={16}>
                            <Col span={6}>
                                <Statistic
                                    title="货物ID"
                                    value={traceData.shipment_id}
                                    valueStyle={{fontSize: 18}}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="起点"
                                    value={traceData.shipment_info?.origin_city || '-'}
                                    valueStyle={{fontSize: 18}}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="终点"
                                    value={traceData.shipment_info?.destination_city || '-'}
                                    valueStyle={{fontSize: 18}}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="需求量"
                                    value={traceData.shipment_info?.demand || 0}
                                    suffix="TEU"
                                    valueStyle={{fontSize: 18}}
                                />
                            </Col>
                        </Row>
                    </Card>

                    {/* 候选路线对比表格 */}
                    <Card title="候选路线对比" style={{marginBottom: 24}}>
                        <Table
                            columns={columns}
                            dataSource={traceData.routes}
                            rowKey="route_id"
                            pagination={false}
                            size="middle"
                        />
                    </Card>

                    {/* 地图可视化 */}
                    <Card title="路线可视化">
                        <div style={{height: 500}}>
                            <MapViewer
                                mode="matching"
                                matchings={[]}
                                routes={mapRoutes}
                                shipments={[traceData.shipment_info]}
                                mapEngine="baidu"
                                height="100%"
                            />
                        </div>
                    </Card>

                    {/* 评分说明 */}
                    <Card title="评分说明" style={{marginTop: 24, backgroundColor: '#f5f5f5'}}>
                        <div style={{color: '#666', lineHeight: 1.8}}>
                            <p><strong>匹配成本计算公式：</strong></p>
                            <p>匹配成本 = 运费 × 需求量 × 合作系数 + 时间 × 需求量 × 时间价值</p>
                            <p style={{marginTop: 12, fontSize: '12px', color: '#999'}}>
                                * 运费和时间均取起点位置对应的分段成本<br/>
                                * 匹配成本越低，排名越靠前，越容易被算法选中
                            </p>
                        </div>
                    </Card>
                </>
            ) : null}
        </div>
    );
};

export default TracePage;
