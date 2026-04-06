import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, Button, Card, Checkbox, Col, Empty, Row, Spin, Statistic, Table, Tag, Tooltip} from 'antd';
import {
    BarChart, Bar, CartesianGrid, Cell,
    Legend, LineChart, Line,
    RadarChart, Radar, PolarGrid, PolarAngleAxis,
    ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import {CheckCircleOutlined, ReloadOutlined} from '@ant-design/icons';
import api from '../../services/api';
import {analyticsAPI} from '../../services/api';

// ── 走廊颜色常量 ──────────────────────────────────────
const CORRIDOR_COLORS = {
    '西部陆海新通道': '#3B82F6',
    '长江经济带': '#10B981',
    '跨境公路': '#F59E0B',
};
const CORRIDOR_KEYS = ['西部陆海新通道', '长江经济带', '跨境公路'];

// ── 场景颜色池 ────────────────────────────────────────
const PALETTE = [
    '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6',
    '#06B6D4','#84CC16','#F97316','#EC4899','#6366F1','#14B8A6',
];

const ComparePage = () => {
    const [scenes, setScenes]       = useState([]);
    const [compare, setCompare]     = useState([]);
    const [corridorData, setCorridorData] = useState([]);
    const [selected, setSelected]   = useState(new Set());
    const [loading, setLoading]     = useState(false);
    const [noData, setNoData]       = useState(false);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [sc, cmp, cor] = await Promise.all([
                api.get('/scenes'),
                api.get('/compare'),
                analyticsAPI.corridorUtilization(),
            ]);
            const sceneList = sc?.data || [];
            const cmpData   = cmp?.data || [];
            const corData   = cor?.scenes || [];
            setScenes(sceneList);
            setCompare(cmpData);
            setCorridorData(corData);
            setNoData(cmpData.length === 0);
            setSelected(new Set(cmpData.map(r => r.scene_id)));
        } catch (_) {} finally { setLoading(false); }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // 仅展示已选中的场景
    const rows = compare.filter(r => selected.has(r.scene_id));
    const corridorRows = corridorData.filter(r => selected.has(r.scene_id));

    const toggleScene = (id) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const colorOf = (id) => {
        const all = compare.map(r => r.scene_id);
        return PALETTE[all.indexOf(id) % PALETTE.length];
    };

    // ── 走廊利用率堆叠柱状图数据 ────────────────────────────
    const corridorBarData = useMemo(() => {
        return corridorRows.map(r => {
            const entry = { label: r.label, scene_id: r.scene_id };
            CORRIDOR_KEYS.forEach(k => {
                entry[k] = r.corridors?.[k]?.utilization || 0;
            });
            return entry;
        });
    }, [corridorRows]);

    // ── 补贴场景走廊利用率趋势数据 ───────────────────────────
    const subsidyTrendData = useMemo(() => {
        return corridorRows
            .filter(r => r.sub || r.label === '政府补贴')
            .map(r => {
                const entry = { pct: r.sub || r.label };
                CORRIDOR_KEYS.forEach(k => {
                    entry[k] = r.corridors?.[k]?.utilization || 0;
                });
                return entry;
            });
    }, [corridorRows]);

    // ── 三大场景对比数据（基准/时间价值/全额补贴）──────────
    const mainSceneCompare = useMemo(() => {
        return corridorRows.filter(r => !r.sub && ['运价+时间', '时间价值', '政府补贴'].includes(r.label));
    }, [corridorRows]);

    // ── 路线分流量对比数据 ────────────────────────────────────
    const routeDistData = useMemo(() => {
        if (!rows.length) return { chartData: [], sceneLabels: [] };
        const allRoutes = new Set();
        rows.forEach(r => Object.keys(r.route_distribution || {}).forEach(k => allRoutes.add(k)));
        const sortedRoutes = [...allRoutes].sort((a, b) => parseInt(a) - parseInt(b));
        const chartData = sortedRoutes.map(routeId => {
            const entry = { route: `路线${routeId}` };
            rows.forEach(r => {
                entry[r.label] = r.route_distribution?.[routeId] || 0;
            });
            return entry;
        });
        return { chartData, sceneLabels: rows.map(r => r.label) };
    }, [rows]);

    // ── KPI: 三大场景走廊利用率 ──────────────────────────
    const kpiBase = corridorRows.find(r => r.label === '运价+时间');
    const kpiTime = corridorRows.find(r => r.label === '时间价值');
    const kpiSub  = corridorRows.find(r => r.label === '政府补贴');

    // ── 表格列（走廊利用率替代匹配率）──────────────────────
    const columns = [
        {title: '场景', dataIndex: 'label', key: 'label', width: 150,
            render: (t, r) => (
                <Space>
                    <span style={{display:'inline-block', width:10, height:10, borderRadius:2, background: colorOf(r.scene_id)}}/>
                    <span style={{fontWeight:600, fontSize:12}}>{t}</span>
                </Space>
            )},
        {title: '分组', dataIndex: 'group', key: 'group', width: 100, render: t => <Tag style={{fontSize:11}}>{t}</Tag>},
        ...CORRIDOR_KEYS.map(k => ({
            title: k,
            key: k,
            width: 120,
            align: 'right',
            render: (_, record) => {
                const cRow = corridorRows.find(c => c.scene_id === record.scene_id);
                const val = cRow?.corridors?.[k]?.utilization;
                if (val == null) return '—';
                const color = val >= 70 ? '#10B981' : val >= 40 ? '#3B82F6' : '#F59E0B';
                return <span style={{color, fontWeight:700, fontFamily:'var(--font-mono)'}}>{val}%</span>;
            },
            sorter: (a, b) => {
                const ca = corridorRows.find(c => c.scene_id === a.scene_id)?.corridors?.[k]?.utilization || 0;
                const cb = corridorRows.find(c => c.scene_id === b.scene_id)?.corridors?.[k]?.utilization || 0;
                return ca - cb;
            },
        })),
        {title: '迭代次数', dataIndex: 'iteration_num', key: 'it', width: 85, align: 'right'},
        {title: 'CPU(s)', dataIndex: 'cpu_time', key: 'cpu', width: 80, align: 'right', sorter: (a,b) => a.cpu_time - b.cpu_time,
            render: v => <span style={{fontFamily:'var(--font-mono)'}}>{v}</span>},
        {title: '稳定', dataIndex: 'is_stable', key: 'stable', width: 65, align: 'center',
            render: v => v ? <CheckCircleOutlined style={{color:'#10B981'}}/> : <span style={{color:'#F59E0B'}}>✗</span>},
    ];

    const Space = ({children, ...p}) => <div style={{display:'flex', alignItems:'center', gap:6, ...p}}>{children}</div>;

    if (noData && !loading) return (
        <div>
            <Alert type="info" showIcon style={{marginBottom:16}}
                message="暂无对比数据"
                description="请先在「数据上传」页面执行各场景的算法，完成后结果将自动显示在这里。"
            />
            <Empty description="执行算法后刷新"/>
        </div>
    );

    return (
        <Spin spinning={loading}>
            <div>
                {/* 页头 */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                    <div style={{fontSize:13, color:'#64748B'}}>选择要对比的场景：</div>
                    <Button size="small" icon={<ReloadOutlined/>} onClick={loadAll} loading={loading}>刷新</Button>
                </div>

                {/* 场景选择器 */}
                <Card style={{marginBottom:16}}>
                    <Row gutter={[8, 8]}>
                        {compare.map(r => (
                            <Col key={r.scene_id}>
                                <Checkbox
                                    checked={selected.has(r.scene_id)}
                                    onChange={() => toggleScene(r.scene_id)}
                                >
                                    <span style={{fontSize:12}}>
                                        <span style={{display:'inline-block', width:8, height:8, borderRadius:2, background:colorOf(r.scene_id), marginRight:4}}/>
                                        {r.label}
                                    </span>
                                </Checkbox>
                            </Col>
                        ))}
                    </Row>
                </Card>

                {/* KPI: 三大场景走廊利用率对比 */}
                {mainSceneCompare.length >= 2 && (
                    <Row gutter={[12, 12]} style={{marginBottom:16}}>
                        {mainSceneCompare.map(scene => (
                            <Col key={scene.scene_id} xs={24} sm={8}>
                                <Card title={scene.label} 
                                    headStyle={{fontSize:13, fontWeight:600, textAlign:'center'}}
                                    bodyStyle={{padding:'12px 16px'}}>
                                    <Row gutter={8}>
                                        {CORRIDOR_KEYS.map(k => {
                                            const val = scene.corridors?.[k]?.utilization || 0;
                                            return (
                                                <Col key={k} span={8} style={{textAlign:'center'}}>
                                                    <div style={{fontSize:20, fontWeight:700, fontFamily:'var(--font-mono)', color: CORRIDOR_COLORS[k]}}>
                                                        {val}%
                                                    </div>
                                                    <div style={{fontSize:10, color:'#94A3B8', marginTop:2}}>{k}</div>
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}

                {/* 图表区 */}
                <Row gutter={[16, 16]}>
                    {/* 走廊利用率堆叠柱状图 */}
                    <Col xs={24} lg={12}>
                        <Card title="走廊利用率对比"
                            extra={<span style={{fontSize:12, color:'#94A3B8'}}>%</span>}>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={corridorBarData} margin={{top:5, right:10, left:-10, bottom:60}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                                    <XAxis dataKey="label" fontSize={10} angle={-35} textAnchor="end" interval={0} tick={{fill:'#64748B'}}/>
                                    <YAxis domain={[0,100]} unit="%" fontSize={11} tick={{fill:'#64748B'}}/>
                                    <RTooltip formatter={v => [`${v}%`]} contentStyle={{fontSize:12, borderRadius:8}}/>
                                    <Legend wrapperStyle={{fontSize:11, paddingTop:4}}/>
                                    {CORRIDOR_KEYS.map(k => (
                                        <Bar key={k} dataKey={k} name={k} fill={CORRIDOR_COLORS[k]} radius={[2,2,0,0]}/>
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>

                    {/* 补贴比例 vs 走廊利用率趋势 */}
                    {subsidyTrendData.length >= 2 && (
                        <Col xs={24} lg={12}>
                            <Card title="补贴比例 vs 走廊利用率变化趋势"
                                extra={<span style={{fontSize:12, color:'#94A3B8'}}>40%是关键分水岭</span>}>
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={subsidyTrendData} margin={{top:5, right:10, left:-10, bottom:5}}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                                        <XAxis dataKey="pct" fontSize={11} tick={{fill:'#64748B'}}/>
                                        <YAxis domain={[0,100]} unit="%" fontSize={11} tick={{fill:'#64748B'}}/>
                                        <RTooltip formatter={v => [`${v}%`]} contentStyle={{fontSize:12, borderRadius:8}}/>
                                        <Legend wrapperStyle={{fontSize:11}}/>
                                        {CORRIDOR_KEYS.map(k => (
                                            <Line key={k} type="monotone" dataKey={k} name={k}
                                                stroke={CORRIDOR_COLORS[k]} strokeWidth={2} dot={{r:4}}/>
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                    )}

                    {/* 雷达图（三大场景走廊利用率） */}
                    {mainSceneCompare.length >= 2 && (
                        <Col xs={24} lg={12}>
                            <Card title="三大场景走廊利用率雷达图">
                                <ResponsiveContainer width="100%" height={280}>
                                    <RadarChart data={CORRIDOR_KEYS.map(k => {
                                        const entry = { corridor: k };
                                        mainSceneCompare.forEach(s => {
                                            entry[s.label] = s.corridors?.[k]?.utilization || 0;
                                        });
                                        return entry;
                                    })}>
                                        <PolarGrid stroke="#E2E8F0"/>
                                        <PolarAngleAxis dataKey="corridor" fontSize={11}/>
                                        {mainSceneCompare.map((s, i) => (
                                            <Radar key={s.scene_id} name={s.label}
                                                dataKey={s.label}
                                                stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.15}/>
                                        ))}
                                        <Legend wrapperStyle={{fontSize:11}}/>
                                        <RTooltip contentStyle={{fontSize:12, borderRadius:8}}/>
                                    </RadarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                    )}

                    {/* 各路线分流量对比 */}
                    {routeDistData.chartData.length > 0 && (
                        <Col xs={24}>
                            <Card title="各路线分流量对比（每条路线分配的货物数）"
                                extra={<span style={{fontSize:12, color:'#94A3B8'}}>货物数</span>}>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={routeDistData.chartData} margin={{top:5, right:20, left:0, bottom:5}}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                                        <XAxis dataKey="route" fontSize={11} tick={{fill:'#64748B'}}/>
                                        <YAxis fontSize={11} tick={{fill:'#64748B'}} allowDecimals={false}/>
                                        <RTooltip contentStyle={{fontSize:12, borderRadius:8}}/>
                                        <Legend wrapperStyle={{fontSize:11}}/>
                                        {routeDistData.sceneLabels.map((label, i) => (
                                            <Bar key={label} dataKey={label} fill={PALETTE[i % PALETTE.length]}
                                                radius={[2,2,0,0]}/>
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                    )}

                    {/* 主要路线跨场景分流变化 */}
                    {routeDistData.chartData.length > 0 && rows.length >= 2 && (
                        <Col xs={24}>
                            <Card title="主要路线跨场景分流变化"
                                extra={<Tooltip title="展示分流量前8的路线在不同场景下的变化趋势"><span style={{fontSize:12, color:'#94A3B8', cursor:'help'}}>? 说明</span></Tooltip>}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart
                                        data={rows.map(r => {
                                            const entry = {label: r.label};
                                            Object.entries(r.route_distribution || {}).forEach(([k, v]) => {
                                                entry[`路线${k}`] = v;
                                            });
                                            return entry;
                                        })}
                                        margin={{top:5, right:20, left:0, bottom:60}}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                                        <XAxis dataKey="label" fontSize={10} angle={-35} textAnchor="end" interval={0} tick={{fill:'#64748B'}}/>
                                        <YAxis fontSize={11} tick={{fill:'#64748B'}} allowDecimals={false}/>
                                        <RTooltip contentStyle={{fontSize:12, borderRadius:8}}/>
                                        <Legend wrapperStyle={{fontSize:11, paddingTop:8}}/>
                                        {(() => {
                                            const totals = {};
                                            rows.forEach(r => Object.entries(r.route_distribution || {}).forEach(([k,v]) => {
                                                totals[k] = (totals[k] || 0) + v;
                                            }));
                                            return Object.entries(totals)
                                                .sort((a,b) => b[1]-a[1]).slice(0,8)
                                                .map(([k], i) => (
                                                    <Line key={k} type="monotone" dataKey={`路线${k}`}
                                                        stroke={PALETTE[i % PALETTE.length]} strokeWidth={2}
                                                        dot={{r:3}} activeDot={{r:5}}/>
                                                ));
                                        })()}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                    )}

                    {/* 详细数据表 */}
                    <Col xs={24}>
                        <Card title="详细对比数据（走廊利用率 %）">
                            <Table
                                columns={columns}
                                dataSource={rows}
                                rowKey="scene_id"
                                size="small"
                                pagination={false}
                                scroll={{x: 900}}
                            />
                        </Card>
                    </Col>
                </Row>
            </div>
        </Spin>
    );
};

export default ComparePage;
