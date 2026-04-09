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
            // API 返回：{ status: "success", data: { shipment, assigned_route_id, candidates } }
            const apiData = res.data;
            const responseData = apiData.data || apiData; // 兼容不同版本的 axios 配置

            // 转换为 TracePage 期望的格式
            const formattedData = {
                shipment_id: responseData.shipment?.shipment_id || parseInt(id),
                shipment_info: responseData.shipment,
                routes: (responseData.candidates || []).map(c => ({
                    route_id: c.route_id,
                    score: c.matched_cost,
                    route_info: c
                })),
                selected_route_id: responseData.assigned_route_id
            };

            setTraceData(formattedData);
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
            width: 60,
            render: (_, record, index) => (
                <span style={{fontWeight: 'bold', fontSize: 16, color: index === 0 ? '#1890ff' : '#666'}}>
                    {index + 1}
                </span>
            )
        },
        {
            title: '路线ID',
            dataIndex: ['route_id'],
            key: 'route_id',
            width: 70
        },
        {
            title: '通道',
            key: 'route_category',
            width: 120,
            render: (_, record) => {
                const category = record.route_info?.route_category;
                if (!category) return '-';
                const colorMap = {
                    '西海路新通道': 'green',
                    '长江经济带': 'blue',
                    '跨境公路': 'orange',
                };
                return <Tag color={colorMap[category] || 'default'}>{category}</Tag>;
            }
        },
        {
            title: '路线详情',
            key: 'route_detail',
            width: 180,
            render: (_, record) => {
                const routeInfo = record.route_info;
                const nodes = routeInfo?.nodes || [];
                if (nodes.length < 2) return '-';
                return (
                    <div>
                        <div style={{fontWeight: 'bold'}}>
                            {nodes[0]} → {nodes[nodes.length - 1]}
                        </div>
                        <div style={{color: '#666', fontSize: '12px'}}>
                            途经: {nodes.slice(1, -1).join(' → ')}
                        </div>
                    </div>
                );
            }
        },
        {
            title: '综合评分',
            key: 'score',
            width: 110,
            render: (_, record, index) => {
                // 将 matched_cost 转换为百分制评分（成本越低分越高）
                const maxScore = Math.max(...(traceData?.routes?.map(r => r.score) || [1]));
                const minScore = Math.min(...(traceData?.routes?.map(r => r.score) || [0]));
                const range = maxScore - minScore || 1;
                const normalized = ((maxScore - record.score) / range) * 40 + 60; // 60-100分
                return (
                    <div style={{textAlign: 'center'}}>
                        <div style={{fontWeight: 'bold', fontSize: 18, color: normalized >= 90 ? '#52c41a' : normalized >= 75 ? '#1890ff' : '#faad14'}}>
                            {normalized.toFixed(1)}
                        </div>
                        <div style={{fontSize: 11, color: '#999'}}>分</div>
                    </div>
                );
            },
            sorter: (a, b) => a.score - b.score,
            defaultSortOrder: 'ascend'
        },
        {
            title: '运输成本',
            key: 'transport_cost',
            width: 100,
            render: (_, record) => {
                const totalCost = record.route_info?.total_cost || 0;
                return <span>¥{totalCost.toLocaleString()}</span>;
            }
        },
        {
            title: '运输时间',
            key: 'time_cost',
            width: 90,
            render: (_, record) => {
                const totalTime = record.route_info?.total_travel_time || 0;
                return <span>{totalTime}h</span>;
            }
        },
        {
            title: '状态',
            key: 'status',
            width: 80,
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
                                mode="routes"
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
