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
                routes: (() => {
                    const candidates = responseData.candidates || [];
                    const assignedId = responseData.assigned_route_id;
                    // 排序：实际选中的排第一，其余按匹配成本升序
                    return [
                        ...candidates.filter(c => c.route_id === assignedId),
                        ...candidates.filter(c => c.route_id !== assignedId).sort((a, b) => a.matched_cost - b.matched_cost)
                    ].map(c => ({
                        route_id: c.route_id,
                        score: c.matched_cost,
                        route_info: c
                    }));
                })(),
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
            render: (_, record, index) => {
                const isSelected = record.route_id === traceData?.selected_route_id;
                return (
                    <div style={{textAlign: 'center'}}>
                        <span style={{fontWeight: 'bold', fontSize: 16, color: isSelected ? '#52c41a' : '#666'}}>
                            {isSelected ? '★' : index + 1}
                        </span>
                    </div>
                );
            }
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

                    {/* 匹配决策说明 */}
                    <Card title="📋 匹配决策说明" style={{marginTop: 24, backgroundColor: '#fafafa'}}>
                        <div style={{lineHeight: 2}}>
                            <p><strong>一、算法概述</strong></p>
                            <p>本系统采用 <strong>Gale-Shapley 稳定匹配算法</strong>（N对1），同时考虑货物和路线的双方偏好，求得稳定匹配解。</p>

                            <p style={{marginTop: 16}}><strong>二、货物偏好构建</strong></p>
                            <p>对每条候选路线计算匹配成本，按成本从低到高排序，形成货物偏好列表：</p>
                            <div style={{background: '#fff', padding: 12, borderRadius: 6, margin: '8px 0', fontFamily: 'monospace', fontSize: 13}}>
                                匹配成本 = 起点运费 × 需求量 × 合作系数 + 起点时间 × 需求量 × 时间价值
                            </div>
                            {traceData && (() => {
                                const sorted = [...traceData.routes].sort((a, b) => a.score - b.score);
                                return (
                                    <div style={{background: '#fff', padding: 12, borderRadius: 6, margin: '8px 0'}}>
                                        <p style={{marginBottom: 8, fontWeight: 'bold'}}>本货物偏好排序：</p>
                                        {sorted.map((r, i) => (
                                            <div key={r.route_id} style={{display: 'flex', gap: 16, padding: '4px 0', borderBottom: '1px solid #f0f0f0'}}>
                                                <span>偏好{i + 1}：</span>
                                                <span>路线#{r.route_id}</span>
                                                <span>({r.route_info?.route_category || '-'})</span>
                                                <span>匹配成本 ¥{(r.score || 0).toLocaleString()}</span>
                                                {r.route_id === traceData.selected_route_id && <Tag color="success">✅ 最终选中</Tag>}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            <p style={{marginTop: 16}}><strong>三、路线偏好构建</strong></p>
                            <p>路线按运输收入（运费 × 承运量）从高到低排序，优先选择能带来更高收入的货物。</p>

                            <p style={{marginTop: 16}}><strong>四、稳定匹配过程</strong></p>
                            <p>算法执行 Gale-Shapley 双向匹配：</p>
                            <ol style={{paddingLeft: 20}}>
                                <li>货物按偏好顺序依次向路线"表白"（请求匹配）</li>
                                <li>路线收到请求后：若空闲则暂时接受；若已有匹配，则比较新旧货物偏好，选择更优的</li>
                                <li>被拒绝的货物继续向下一偏好路线请求</li>
                                <li>重复直到所有货物都匹配完毕或所有偏好都已尝试</li>
                            </ol>

                            <p style={{marginTop: 16}}><strong>五、本货物匹配结果</strong></p>
                            {traceData && (() => {
                                const selected = traceData.routes.find(r => r.route_id === traceData.selected_route_id);
                                const sorted = [...traceData.routes].sort((a, b) => a.score - b.score);
                                const selectedRank = sorted.findIndex(r => r.route_id === traceData.selected_route_id) + 1;
                                return (
                                    <div style={{background: selectedRank === 1 ? '#f6ffed' : '#fff7e6', padding: 12, borderRadius: 6, margin: '8px 0', border: '1px solid ' + (selectedRank === 1 ? '#b7eb8f' : '#ffd591')}}>
                                        <p style={{fontWeight: 'bold', marginBottom: 8}}>
                                            货物 {traceData.shipment_id}（{traceData.shipment_info?.origin_city} → {traceData.shipment_info?.destination_city}）→ 路线#{traceData.selected_route_id}
                                        </p>
                                        {selectedRank === 1 ? (
                                            <p>✅ 该货物成功匹配到其<strong>第一偏好</strong>路线，货物偏好与最终结果完全一致。</p>
                                        ) : (
                                            <p>⚠️ 该货物的第<strong>{selectedRank}</strong>偏好路线（成本最低为路线#{sorted[0]?.route_id}），但经过稳定匹配博弈后，最终匹配到路线#{traceData.selected_route_id}。这是因为路线#{sorted[0]?.route_id}可能已被其他对其更具偏好的货物占据，在稳定匹配框架下，当前结果是双方都满意的最优稳定解。</p>
                                        )}
                                        {selected && (
                                            <p>选中路线：{selected.route_info?.route_category}，途经 {selected.route_info?.nodes?.join('→')}，成本 ¥{(selected.route_info?.total_cost || 0).toLocaleString()}，时间 {selected.route_info?.total_travel_time || 0}h</p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </Card>
                </>
            ) : null}
        </div>
    );
};

export default TracePage;
