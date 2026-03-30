import React, {useEffect, useState} from 'react';
import {Button, Card, Col, Empty, Progress, Row, Statistic, Table, Tag} from 'antd';
import {matchingAPI, routesAPI, shipmentsAPI} from '../../services/api';
import MapViewer from '../../components/MapViewer/MapViewer';

const {Column} = Table;

// ── Stat Card ────────────────────────────────────────────────
const StatCard = ({title, value, suffix, precision, colorClass, icon, sub}) => (
    <Card className={colorClass} style={{height: '100%'}}>
        <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
            <div>
                <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8
                }}>{title}</div>
                <Statistic
                    value={value}
                    suffix={suffix}
                    precision={precision}
                    valueStyle={{
                        fontSize: 28,
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1.1,
                    }}
                />
                {sub && <div style={{marginTop: 6, fontSize: 12, color: 'var(--text-muted)'}}>{sub}</div>}
            </div>
            <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0
            }}>{icon}</div>
        </div>
    </Card>
);

export const DashboardPage = () => {
    const [loading, setLoading] = useState(true);
    const [routes, setRoutes] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [matchingResults, setMatchingResults] = useState([]);
    const [matchRoutesShipmentsData, setMatchRoutesShipmentsData] = useState([]);
    const [stats, setStats] = useState({
        totalRoutes: 0, totalShipments: 0,
        matchedShipments: 0, unmatchedShipments: 0,
        matchingRate: 0, cpuTime: 0,
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [routesRes, shipmentsRes, matchingRes, mappingRes] = await Promise.all([
                routesAPI.getAll(),
                shipmentsAPI.getAll(),
                matchingAPI.getAll(),
                matchingAPI.getMatching(),
            ]);
            const routesData    = routesRes?.data?.routes      || [];
            const shipmentsData = shipmentsRes?.data?.shipments || [];
            const matchingData  = matchingRes?.data             || [];
            const mappingData   = mappingRes?.data              || [];

            setRoutes(routesData);
            setShipments(shipmentsData);
            setMatchingResults(matchingData);
            setMatchRoutesShipmentsData(mappingData);

            const first = Array.isArray(matchingData) ? matchingData[0] : null;
            setStats({
                totalRoutes:       routesData.length,
                totalShipments:    shipmentsData.length,
                matchedShipments:  first?.matched_shipments   ?? 0,
                unmatchedShipments:first?.unmatched_shipments  ?? 0,
                matchingRate:      first ? Math.round(first.matching_rate * 100) : 0,
                cpuTime:           first?.cpu_time ?? 0,
            });
        } catch (e) {
            console.error('加载数据失败:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const recentMatches = matchRoutesShipmentsData.slice(0, 12).map(m => ({
        ...m,
        key:          m.id,
        routeName:    m.route_id !== 'Self' ? `路线 ${m.route_id}` : '未分配',
        shipmentName: `货物 ${m.shipment_id}`,
        matched:      m.route_id !== 'Self',
    }));

    return (
        <div>
            {/* Header row */}
            <div className="page-header">
                <h1 style={{margin: 0}}>系统概览</h1>
                <Button
                    type="primary" onClick={loadData} loading={loading}
                    style={{borderRadius: 8}}
                >
                    刷新数据
                </Button>
            </div>

            {/* KPI Row */}
            <Row gutter={[12, 12]} style={{marginBottom: 16}}>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="总路线数" value={stats.totalRoutes}
                        colorClass="stat-card-blue" icon="🛤"
                        sub="可用运输路线"/>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="总货物数" value={stats.totalShipments}
                        colorClass="stat-card-green" icon="📦"
                        sub="待匹配货物"/>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="匹配成功" value={stats.matchedShipments}
                        colorClass="stat-card-green" icon="✅"/>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="未匹配" value={stats.unmatchedShipments}
                        colorClass="stat-card-red" icon="⚠"/>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="匹配率" value={stats.matchingRate} suffix="%"
                        colorClass="stat-card-orange" icon="📊"/>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="算法耗时" value={stats.cpuTime} suffix="s" precision={2}
                        colorClass="stat-card-purple" icon="⚡"/>
                </Col>
            </Row>

            {/* Progress + Map + Table */}
            <Row gutter={[12, 12]}>
                {/* Left column */}
                <Col xs={24} lg={14}>
                    {/* Match rate progress */}
                    <Card
                        title="整体匹配率"
                        style={{marginBottom: 12}}
                        extra={
                            <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: 20,
                                fontWeight: 800,
                                color: stats.matchingRate >= 70 ? 'var(--success)' : 'var(--warning)'
                            }}>
                                {stats.matchingRate}%
                            </span>
                        }
                    >
                        <div style={{paddingBottom: 4}}>
                            <Progress
                                percent={stats.matchingRate}
                                showInfo={false}
                                strokeWidth={10}
                                strokeColor={{
                                    '0%':   '#3B82F6',
                                    '60%':  '#10B981',
                                    '100%': '#10B981',
                                }}
                                trailColor="#E2E8F0"
                            />
                            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-muted)'}}>
                                <span>已匹配 {stats.matchedShipments} 票</span>
                                <span>未匹配 {stats.unmatchedShipments} 票</span>
                                <span>共 {stats.totalShipments} 票</span>
                            </div>
                        </div>
                    </Card>

                    {/* Map */}
                    <Card title="路线与货物分布" style={{height: 420}}>
                        <div style={{height: 340}}>
                            <MapViewer
                                mode="combined"
                                routes={routes}
                                shipments={shipments}
                                height={340}
                            />
                        </div>
                    </Card>
                </Col>

                {/* Right column – recent matches table */}
                <Col xs={24} lg={10}>
                    <Card
                        title="最近匹配记录"
                        style={{height: '100%'}}
                        extra={
                            <span style={{fontSize: 12, color: 'var(--text-muted)'}}>
                                前 {recentMatches.length} 条
                            </span>
                        }
                    >
                        {recentMatches.length > 0 ? (
                            <Table
                                dataSource={recentMatches}
                                pagination={false}
                                size="small"
                                scroll={{y: 460}}
                                style={{fontSize: 13}}
                            >
                                <Column title="货物" dataIndex="shipmentName" key="ship" width={90}/>
                                <Column title="路线" dataIndex="routeName"    key="route" width={90}/>
                                <Column
                                    title="状态" key="status" width={70} align="center"
                                    render={(_, r) => (
                                        <Tag color={r.matched ? 'success' : 'error'}>
                                            {r.matched ? '已匹配' : '未匹配'}
                                        </Tag>
                                    )}
                                />
                            </Table>
                        ) : (
                            <Empty description="暂无匹配结果，请先执行算法" style={{paddingTop: 60}}/>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardPage;
