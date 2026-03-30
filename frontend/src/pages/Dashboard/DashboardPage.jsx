import React, {useEffect, useState} from 'react';
import {Button, Card, Col, Empty, Progress, Row, Statistic, Table, Tag} from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    DotChartOutlined,
    ExclamationCircleOutlined,
    NodeIndexOutlined,
    InboxOutlined,
} from '@ant-design/icons';
import {matchingAPI, routesAPI, shipmentsAPI} from '../../services/api';
import SVGMapViewer from '../../components/MapViewer/SVGMapViewer';

const {Column} = Table;

// ── Stat Card ────────────────────────────────────────────────
const StatCard = ({title, value, suffix, precision, colorClass, icon, iconColor, sub, noSuffixSpace}) => (
    <Card className={colorClass} style={{height: '100%'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
            {/* 图标 */}
            <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `${iconColor}18`,
                border: `1.5px solid ${iconColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0, color: iconColor,
            }}>{icon}</div>
            {/* 数值 */}
            <div style={{flex: 1, minWidth: 0, textAlign: 'right'}}>
                <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>{title}</div>
                {noSuffixSpace ? (
                    <div style={{
                        fontSize: 24, fontWeight: 800,
                        fontFamily: 'var(--font-mono)', lineHeight: 1.1,
                        whiteSpace: 'nowrap', color: 'var(--text-primary)'
                    }}>
                        {typeof value === 'number' ? value.toFixed(precision ?? 0) : value}{suffix}
                    </div>
                ) : (
                    <Statistic
                        value={value}
                        suffix={suffix}
                        precision={precision}
                        valueStyle={{
                            fontSize: 24, fontWeight: 800,
                            fontFamily: 'var(--font-mono)', lineHeight: 1.1,
                            whiteSpace: 'nowrap',
                        }}
                    />
                )}
                {sub && <div style={{marginTop: 4, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap'}}>{sub}</div>}
            </div>
        </div>
    </Card>
);

export const DashboardPage = () => {
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [routes, setRoutes] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [matchRoutesShipmentsData, setMatchRoutesShipmentsData] = useState([]);
    const [stats, setStats] = useState({
        totalRoutes: 0, totalShipments: 0,
        matchedShipments: 0, unmatchedShipments: 0,
        matchingRate: 0, cpuTime: 0,
    });

    const loadData = async () => {
        setLoading(true);
        setLoadError(false);
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
            setLoadError(true);
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
                <Button type="primary" onClick={loadData} loading={loading} style={{borderRadius: 8}}>
                    刷新数据
                </Button>
            </div>

            {loadError && (
                <div style={{
                    marginBottom: 16, padding: '10px 16px',
                    background: '#FEF2F2', border: '1px solid #FCA5A5',
                    borderRadius: 8, color: '#DC2626', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 8
                }}>
                    <ExclamationCircleOutlined/>
                    无法连接到后端服务，数据加载失败。请确认服务正常后点击「刷新数据」。
                </div>
            )}

            {/* KPI Row */}
            <Row gutter={[12, 12]} style={{marginBottom: 16}}>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="总路线数" value={stats.totalRoutes}
                        colorClass="stat-card-blue"
                        icon={<NodeIndexOutlined/>} iconColor="#2563EB"
                        sub="可用运输路线"/>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="总货物数" value={stats.totalShipments}
                        colorClass="stat-card-green"
                        icon={<InboxOutlined/>} iconColor="#059669"
                        sub="待匹配货物"/>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="匹配成功" value={stats.matchedShipments}
                        colorClass="stat-card-green"
                        icon={<CheckCircleOutlined/>} iconColor="#059669"/>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="未匹配" value={stats.unmatchedShipments}
                        colorClass="stat-card-red"
                        icon={<ExclamationCircleOutlined/>} iconColor="#DC2626"/>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="匹配率" value={stats.matchingRate} suffix="%"
                        colorClass="stat-card-orange"
                        icon={<DotChartOutlined/>} iconColor="#D97706"/>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <StatCard title="算法耗时" value={stats.cpuTime} suffix="s" precision={2}
                        colorClass="stat-card-purple"
                        icon={<ClockCircleOutlined/>} iconColor="#7C3AED"
                        noSuffixSpace/>
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
                    <Card
                        title="路线与货物分布"
                        styles={{body: {padding: 0, height: 320, overflow: 'hidden'}}}
                    >
                        <SVGMapViewer
                            mode="combined"
                            routes={routes}
                            shipments={shipments}
                            height={320}
                            showControls={false}
                            showLegend={false}
                        />
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
