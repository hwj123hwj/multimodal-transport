import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, Button, Card, Checkbox, Col, Empty, Row, Spin, Statistic, Table, Tag, Tooltip} from 'antd';
import {
    BarChart, Bar, CartesianGrid, Cell,
    Legend, LineChart, Line,
    RadarChart, Radar, PolarGrid, PolarAngleAxis,
    ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import {CheckCircleOutlined, ExclamationCircleOutlined, ReloadOutlined} from '@ant-design/icons';
import api from '../../services/api';

// ── 颜色池（11个场景各一色）──────────────────────────────────
const PALETTE = [
    '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6',
    '#06B6D4','#84CC16','#F97316','#EC4899','#6366F1','#14B8A6',
];

const ComparePage = () => {
    const [scenes, setScenes]       = useState([]);
    const [compare, setCompare]     = useState([]);
    const [selected, setSelected]   = useState(new Set());
    const [loading, setLoading]     = useState(false);
    const [noData, setNoData]       = useState(false);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [sc, cmp] = await Promise.all([
                api.get('/scenes'),
                api.get('/compare'),
            ]);
            const sceneList = sc?.data?.data || [];
            const cmpData   = cmp?.data?.data || [];
            setScenes(sceneList);
            setCompare(cmpData);
            setNoData(cmpData.length === 0);
            // 默认全选有结果的场景
            setSelected(new Set(cmpData.map(r => r.scene_id)));
        } catch (_) {} finally { setLoading(false); }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // 仅展示已选中的场景
    const rows = compare.filter(r => selected.has(r.scene_id));

    const toggleScene = (id) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const colorOf = (id) => {
        const all = compare.map(r => r.scene_id);
        return PALETTE[all.indexOf(id) % PALETTE.length];
    };

    // ── 路线分流量对比数据 ────────────────────────────────────
    // 格式：[{route: '1', 场景A: 5, 场景B: 7, ...}, ...]
    const routeDistData = useMemo(() => {
        if (!rows.length) return { chartData: [], sceneLabels: [] };
        // 收集所有路线ID（按数字排序）
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

    // ── 摘要卡 KPIs ──────────────────────────────────────────
    const bestMatch = rows.reduce((b, r) => r.matching_rate > (b?.matching_rate || 0) ? r : b, null);
    const bestCont  = rows.reduce((b, r) => r.container_rate > (b?.container_rate || 0) ? r : b, null);
    const fastCPU   = rows.reduce((b, r) => r.cpu_time < (b?.cpu_time ?? Infinity) ? r : b, null);
    const stableN   = rows.filter(r => r.is_stable).length;

    // ── 表格列 ───────────────────────────────────────────────
    const columns = [
        {title: '场景', dataIndex: 'label', key: 'label', width: 180,
            render: (t, r) => (
                <Space>
                    <span style={{display:'inline-block', width:10, height:10, borderRadius:2, background: colorOf(r.scene_id)}}/>
                    <span style={{fontWeight:600, fontSize:12}}>{t}</span>
                </Space>
            )},
        {title: '分组', dataIndex: 'group', key: 'group', width: 100, render: t => <Tag style={{fontSize:11}}>{t}</Tag>},
        {title: '匹配率', dataIndex: 'matching_rate', key: 'mr', width: 90, align: 'right', sorter: (a,b) => a.matching_rate - b.matching_rate,
            render: v => <span style={{color: v >= 70 ? '#10B981' : '#F59E0B', fontWeight:700, fontFamily:'var(--font-mono)'}}>{v}%</span>},
        {title: '集装箱率', dataIndex: 'container_rate', key: 'cr', width: 95, align: 'right', sorter: (a,b) => a.container_rate - b.container_rate,
            render: v => <span style={{fontFamily:'var(--font-mono)'}}>{v}%</span>},
        {title: '已匹配', dataIndex: 'matched_shipments', key: 'ms', width: 80, align: 'right'},
        {title: '未匹配', dataIndex: 'unmatched_shipments', key: 'us', width: 80, align: 'right'},
        {title: '平均运费', dataIndex: 'avg_route_cost', key: 'cost', width: 95, align: 'right', sorter: (a,b) => a.avg_route_cost - b.avg_route_cost,
            render: v => <span style={{fontFamily:'var(--font-mono)'}}>{v?.toLocaleString()}</span>},
        {title: '迭代次数', dataIndex: 'iteration_num', key: 'it', width: 85, align: 'right'},
        {title: 'CPU(s)', dataIndex: 'cpu_time', key: 'cpu', width: 80, align: 'right', sorter: (a,b) => a.cpu_time - b.cpu_time,
            render: v => <span style={{fontFamily:'var(--font-mono)'}}>{v}</span>},
        {title: '稳定', dataIndex: 'is_stable', key: 'stable', width: 65, align: 'center',
            render: v => v ? <CheckCircleOutlined style={{color:'#10B981'}}/> : <ExclamationCircleOutlined style={{color:'#F59E0B'}}/>},
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

                {/* KPI 摘要 */}
                <Row gutter={[12, 12]} style={{marginBottom:16}}>
                    {[
                        {label:'最高匹配率', value: bestMatch ? `${bestMatch.matching_rate}%` : '—', sub: bestMatch?.label, color:'#10B981'},
                        {label:'最高集装箱率', value: bestCont ? `${bestCont.container_rate}%` : '—', sub: bestCont?.label, color:'#3B82F6'},
                        {label:'最快CPU', value: fastCPU ? `${fastCPU.cpu_time}s` : '—', sub: fastCPU?.label, color:'#8B5CF6'},
                        {label:'稳定场景数', value: `${stableN} / ${rows.length}`, sub: '匹配结果稳定', color:'#F59E0B'},
                    ].map(k => (
                        <Col key={k.label} xs={12} sm={6}>
                            <Card>
                                <Statistic title={k.label} value={k.value} valueStyle={{color:k.color, fontSize:20, fontFamily:'var(--font-mono)'}}/>
                                <div style={{fontSize:11, color:'#94A3B8', marginTop:3}}>{k.sub}</div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* 图表区 */}
                <Row gutter={[16, 16]}>
                    {/* 匹配率对比柱状图 */}
                    <Col xs={24} lg={12}>
                        <Card title="匹配率 & 集装箱匹配率对比"
                            extra={<span style={{fontSize:12, color:'#94A3B8'}}>%</span>}>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={rows} margin={{top:5, right:10, left:-10, bottom:60}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                                    <XAxis dataKey="label" fontSize={10} angle={-35} textAnchor="end" interval={0} tick={{fill:'#64748B'}}/>
                                    <YAxis domain={[0,100]} unit="%" fontSize={11} tick={{fill:'#64748B'}}/>
                                    <RTooltip formatter={v => [`${v}%`]} contentStyle={{fontSize:12, borderRadius:8}}/>
                                    <Legend wrapperStyle={{fontSize:11, paddingTop:4}}/>
                                    <Bar dataKey="matching_rate"  name="匹配率(%)" radius={[3,3,0,0]}>
                                        {rows.map(r => <Cell key={r.scene_id} fill={colorOf(r.scene_id)}/>)}
                                    </Bar>
                                    <Bar dataKey="container_rate" name="集装箱率(%)" fill="#CBD5E1" radius={[3,3,0,0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>

                    {/* 平均运费折线 */}
                    <Col xs={24} lg={12}>
                        <Card title="各场景平均运费趋势"
                            extra={<span style={{fontSize:12, color:'#94A3B8'}}>CNY</span>}>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={rows} margin={{top:5, right:10, left:0, bottom:60}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                                    <XAxis dataKey="label" fontSize={10} angle={-35} textAnchor="end" interval={0} tick={{fill:'#64748B'}}/>
                                    <YAxis fontSize={11} tick={{fill:'#64748B'}}/>
                                    <RTooltip formatter={v => [v?.toLocaleString(), '平均运费']} contentStyle={{fontSize:12, borderRadius:8}}/>
                                    <Line
                                        type="monotone" dataKey="avg_route_cost" name="平均运费"
                                        stroke="#3B82F6" strokeWidth={2} dot={{r:4, fill:'#3B82F6'}}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>

                    {/* 雷达图（政府补贴子场景） */}
                    {rows.filter(r => r.group === '政府补贴').length >= 3 && (
                        <Col xs={24} lg={12}>
                            <Card title="政府补贴场景综合雷达图"
                                extra={<Tooltip title="各指标已归一化到0-100"><span style={{fontSize:12, color:'#94A3B8', cursor:'help'}}>? 说明</span></Tooltip>}>
                                <ResponsiveContainer width="100%" height={280}>
                                    <RadarChart data={
                                        rows.filter(r => r.group === '政府补贴').map(r => ({
                                            label: r.sub || r.label,
                                            匹配率:   r.matching_rate,
                                            集装箱率: r.container_rate,
                                            稳定性:   r.is_stable ? 100 : 0,
                                            速度:     r.cpu_time > 0 ? Math.max(0, 100 - r.cpu_time * 10) : 50,
                                        }))
                                    }>
                                        <PolarGrid stroke="#E2E8F0"/>
                                        <PolarAngleAxis dataKey="label" fontSize={11}/>
                                        <Radar name="匹配率" dataKey="匹配率" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15}/>
                                        <Radar name="集装箱率" dataKey="集装箱率" stroke="#10B981" fill="#10B981" fillOpacity={0.15}/>
                                        <Legend wrapperStyle={{fontSize:11}}/>
                                        <RTooltip contentStyle={{fontSize:12, borderRadius:8}}/>
                                    </RadarChart>
                                </ResponsiveContainer>
                            </Card>
                        </Col>
                    )}

                    {/* 政府补贴 - 匹配率随补贴率变化折线 */}
                    {(() => {
                        const subsidyRows = rows.filter(r => r.sub && r.sub.includes('补贴'));
                        if (subsidyRows.length < 2) return null;
                        const data = subsidyRows.map(r => ({
                            pct: r.sub,
                            匹配率: r.matching_rate,
                            集装箱率: r.container_rate,
                        }));
                        return (
                            <Col xs={24} lg={12}>
                                <Card title="政府补贴比例 vs 匹配效果">
                                    <ResponsiveContainer width="100%" height={280}>
                                        <LineChart data={data} margin={{top:5, right:10, left:-10, bottom:5}}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                                            <XAxis dataKey="pct" fontSize={11} tick={{fill:'#64748B'}}/>
                                            <YAxis domain={[0,100]} unit="%" fontSize={11} tick={{fill:'#64748B'}}/>
                                            <RTooltip formatter={v => [`${v}%`]} contentStyle={{fontSize:12, borderRadius:8}}/>
                                            <Legend wrapperStyle={{fontSize:11}}/>
                                            <Line type="monotone" dataKey="匹配率" stroke="#3B82F6" strokeWidth={2} dot={{r:4}}/>
                                            <Line type="monotone" dataKey="集装箱率" stroke="#10B981" strokeWidth={2} dot={{r:4}} strokeDasharray="4 2"/>
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Card>
                            </Col>
                        );
                    })()}

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

                    {/* 同路线跨场景对比折线（路线1~5的分流量随场景变化） */}
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
                                            // 取分流量总和最大的前8条路线
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
                        <Card title="详细对比数据">
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
