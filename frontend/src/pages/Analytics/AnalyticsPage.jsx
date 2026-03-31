import React, {useEffect, useState} from 'react';
import {Card, Col, Row, Select, Spin, Statistic, Tag, Tooltip} from 'antd';
import {
    CheckCircleOutlined, ClockCircleOutlined,
    ExclamationCircleOutlined, ReloadOutlined, SyncOutlined,
} from '@ant-design/icons';
import {
    Bar, BarChart, CartesianGrid, Cell,
    Legend, Pie, PieChart,
    ResponsiveContainer, Sankey, Tooltip as RTooltip,
    XAxis, YAxis, LabelList,
} from 'recharts';
import {analyticsAPI} from '../../services/api';
import api from '../../services/api';

// ── 颜色系统 ─────────────────────────────────────────────────
const COLORS = {
    blue:   '#3B82F6',
    green:  '#10B981',
    orange: '#F59E0B',
    red:    '#EF4444',
    purple: '#8B5CF6',
    cyan:   '#06B6D4',
    gray:   '#94A3B8',
};

const CATEGORY_COLORS = {
    '西海路新通道': COLORS.blue,
    '长江经济带':   COLORS.green,
    '跨境公路':     COLORS.orange,
    '未知':         COLORS.gray,
};

const TIME_VALUE_COLORS = ['#3B82F6', '#F59E0B', '#EF4444'];

// ── 空状态占位 ────────────────────────────────────────────────
const EmptyHint = () => (
    <div style={{
        height: 200, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: '#94A3B8', fontSize: 13, gap: 8,
    }}>
        <ExclamationCircleOutlined style={{fontSize: 28}}/>
        暂无数据，请先执行匹配算法
    </div>
);

// ── 自定义 Sankey 节点 ────────────────────────────────────────
const SankeyNode = ({x, y, width, height, index, payload}) => {
    const isSource = payload.depth === 0;
    return (
        <g>
            <rect
                x={x} y={y} width={width} height={height}
                fill={isSource ? COLORS.blue : COLORS.green}
                fillOpacity={0.85} rx={3}
            />
            <text
                x={isSource ? x - 6 : x + width + 6}
                y={y + height / 2}
                textAnchor={isSource ? 'end' : 'start'}
                dominantBaseline="middle"
                fontSize={12} fontWeight={600}
                fill="#1E293B"
            >
                {payload.name}
            </text>
        </g>
    );
};

// ── 路线利用率图 ──────────────────────────────────────────────
const RouteUtilizationChart = ({data}) => {
    if (!data?.length) return <EmptyHint/>;
    return (
        <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{top: 10, right: 20, left: 0, bottom: 60}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis
                    dataKey="label" fontSize={11}
                    angle={-35} textAnchor="end" interval={0}
                    tick={{fill: '#64748B'}}
                />
                <YAxis fontSize={11} tick={{fill: '#64748B'}} unit=" TEU"/>
                <RTooltip
                    formatter={(v, name) => [`${v} TEU`, name]}
                    labelFormatter={(label, payload) => {
                        const d = payload?.[0]?.payload;
                        return d ? `${label}：${d.nodes}（${d.category}）` : label;
                    }}
                    contentStyle={{fontSize: 12, borderRadius: 8}}
                />
                <Legend wrapperStyle={{fontSize: 12, paddingTop: 8}}/>
                <Bar dataKey="used"      name="已用容量" stackId="a" radius={[0,0,0,0]}>
                    {data.map((d, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[d.category] || COLORS.blue}/>
                    ))}
                </Bar>
                <Bar dataKey="available" name="剩余容量" stackId="a" fill="#E2E8F0" radius={[4,4,0,0]}>
                    <LabelList
                        dataKey="utilization_pct"
                        position="top"
                        formatter={v => v > 0 ? `${v}%` : ''}
                        style={{fontSize: 10, fill: '#64748B'}}
                    />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// ── OD Sankey 图 ──────────────────────────────────────────────
const OdSankeyChart = ({data}) => {
    if (!data?.nodes?.length) return <EmptyHint/>;

    // recharts Sankey 需要节点索引
    const nodeNames = data.nodes.map(n => n.name);
    const links = data.links
        .filter(l => l.value > 0)
        .map(l => ({
            source: nodeNames.indexOf(l.source),
            target: nodeNames.indexOf(l.target),
            value:  l.value,
        }))
        .filter(l => l.source !== -1 && l.target !== -1 && l.source !== l.target);

    return (
        <ResponsiveContainer width="100%" height={340}>
            <Sankey
                data={{nodes: data.nodes, links}}
                nodePadding={16}
                nodeWidth={12}
                margin={{top: 10, right: 100, left: 100, bottom: 10}}
                node={<SankeyNode/>}
                link={{stroke: COLORS.blue, strokeOpacity: 0.25}}
            >
                <RTooltip
                    formatter={(v) => [`${v} TEU`, '货物需求量']}
                    contentStyle={{fontSize: 12, borderRadius: 8}}
                />
            </Sankey>
        </ResponsiveContainer>
    );
};

// ── 时间价值图（饼图 + 分组柱） ────────────────────────────────
const TimeValueCharts = ({data}) => {
    if (!data?.length) return <EmptyHint/>;

    const pieData = data.map((d, i) => ({
        name:  d.label,
        value: d.total_shipments,
        color: TIME_VALUE_COLORS[i],
    }));

    return (
        <Row gutter={[16, 0]}>
            {/* 饼图 */}
            <Col xs={24} md={10}>
                <div style={{fontSize: 12, color: '#64748B', marginBottom: 4, textAlign: 'center'}}>票数分布</div>
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie
                            data={pieData} cx="50%" cy="50%"
                            innerRadius={55} outerRadius={85}
                            paddingAngle={3} dataKey="value"
                            label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}
                            labelLine={false}
                        >
                            {pieData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                        </Pie>
                        <RTooltip formatter={v => [`${v} 票`, '货物数']} contentStyle={{fontSize: 12, borderRadius: 8}}/>
                    </PieChart>
                </ResponsiveContainer>
            </Col>
            {/* 分组柱 */}
            <Col xs={24} md={14}>
                <div style={{fontSize: 12, color: '#64748B', marginBottom: 4, textAlign: 'center'}}>各档匹配情况</div>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} margin={{top: 5, right: 10, left: -10, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                        <XAxis dataKey="label" fontSize={11} tick={{fill: '#64748B'}}/>
                        <YAxis fontSize={11} tick={{fill: '#64748B'}}/>
                        <RTooltip contentStyle={{fontSize: 12, borderRadius: 8}}/>
                        <Legend wrapperStyle={{fontSize: 11}}/>
                        <Bar dataKey="matched_shipments"   name="已匹配" fill={COLORS.green} radius={[3,3,0,0]}/>
                        <Bar dataKey="unmatched_shipments" name="未匹配" fill={COLORS.red}   radius={[3,3,0,0]}/>
                    </BarChart>
                </ResponsiveContainer>
            </Col>
        </Row>
    );
};

// ── 算法质量仪表盘 ────────────────────────────────────────────
const AlgorithmQualityPanel = ({data}) => {
    if (!data || !Object.keys(data).length) return <EmptyHint/>;

    const containerRate = data.total_container_num > 0
        ? ((data.matched_container_num / data.total_container_num) * 100).toFixed(1)
        : 0;

    const items = [
        {
            label: '匹配率',
            value: `${data.matching_rate}%`,
            color: data.matching_rate >= 70 ? COLORS.green : COLORS.orange,
            sub: `${data.matched_shipments} / ${data.total_shipments} 票`,
        },
        {
            label: '集装箱匹配率',
            value: `${containerRate}%`,
            color: COLORS.blue,
            sub: `${data.matched_container_num} / ${data.total_container_num} TEU`,
        },
        {
            label: '迭代次数',
            value: data.iteration_num,
            color: COLORS.purple,
            sub: `重启 ${data.restart_num} 次`,
        },
        {
            label: 'CPU 耗时',
            value: `${data.cpu_time}s`,
            color: COLORS.cyan,
            sub: '算法执行时间',
        },
    ];

    return (
        <div>
            <div style={{marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8}}>
                <Tag
                    color={data.is_stable ? 'success' : 'warning'}
                    icon={data.is_stable ? <CheckCircleOutlined/> : <ExclamationCircleOutlined/>}
                    style={{fontSize: 13, padding: '3px 10px'}}
                >
                    {data.is_stable ? '匹配结果稳定' : '匹配结果不稳定'}
                </Tag>
                <span style={{fontSize: 12, color: '#94A3B8'}}>稳定匹配算法已收敛</span>
            </div>
            <Row gutter={[12, 12]}>
                {items.map(item => (
                    <Col key={item.label} xs={12} md={6}>
                        <div style={{
                            padding: '16px', borderRadius: 10,
                            background: `${item.color}0d`,
                            border: `1px solid ${item.color}25`,
                            textAlign: 'center',
                        }}>
                            <div style={{
                                fontSize: 26, fontWeight: 800,
                                fontFamily: 'var(--font-mono)',
                                color: item.color, lineHeight: 1.1,
                            }}>{item.value}</div>
                            <div style={{fontSize: 12, fontWeight: 600, color: '#475569', margin: '6px 0 2px'}}>{item.label}</div>
                            <div style={{fontSize: 11, color: '#94A3B8'}}>{item.sub}</div>
                        </div>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

// ── 主页面 ────────────────────────────────────────────────────
const AnalyticsPage = () => {
    const [loading, setLoading]           = useState(true);
    const [scenes, setScenes]             = useState([]);
    const [sceneId, setSceneId]           = useState(null);  // null = 默认场景
    const [utilization, setUtilization]   = useState([]);
    const [odFlow, setOdFlow]             = useState(null);
    const [timeValue, setTimeValue]       = useState([]);
    const [algoQuality, setAlgoQuality]   = useState({});

    // 加载场景列表（只取有结果的）
    useEffect(() => {
        api.get('/compare').then(res => {
            const list = res?.data || [];
            setScenes(list);
            if (list.length > 0 && !sceneId) setSceneId(list[0].scene_id);
        }).catch(() => {});
    }, []); // eslint-disable-line

    const loadAll = async (sid) => {
        setLoading(true);
        try {
            const [u, o, t, a] = await Promise.all([
                analyticsAPI.routeUtilization(sid),
                analyticsAPI.odFlow(sid),
                analyticsAPI.timeValue(sid),
                analyticsAPI.algorithmQuality(sid),
            ]);
            setUtilization(u?.data  || []);
            setOdFlow(o?.data       || null);
            setTimeValue(t?.data    || []);
            setAlgoQuality(a?.data  || {});
        } catch (e) {
            console.error('分析数据加载失败', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(sceneId); }, [sceneId]); // eslint-disable-line

    const handleSceneChange = (val) => { setSceneId(val); };

    const matchRate = algoQuality?.matching_rate ?? 0;
    const iterNum   = algoQuality?.iteration_num ?? 0;
    const cpuTime   = algoQuality?.cpu_time ?? 0;
    const isStable  = algoQuality?.is_stable ?? false;

    const currentLabel = scenes.find(s => s.scene_id === sceneId)?.label || '默认场景';

    return (
        <Spin spinning={loading} tip="加载分析数据...">
            <div>
                {/* 页头 */}
                <div className="page-header" style={{marginBottom: 20}}>
                    <h1 style={{margin: 0}}>数据分析</h1>
                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        {/* 场景切换 */}
                        <Select
                            value={sceneId}
                            onChange={handleSceneChange}
                            style={{width: 200}}
                            placeholder="选择场景"
                            options={scenes.map(s => ({ value: s.scene_id, label: s.label }))}
                            size="middle"
                        />
                        <div
                            onClick={() => loadAll(sceneId)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                cursor: 'pointer', fontSize: 13,
                                color: '#64748B', padding: '6px 12px',
                                borderRadius: 8, border: '1px solid #E2E8F0',
                                background: '#F8FAFC',
                            }}
                        >
                            <ReloadOutlined spin={loading}/> 刷新
                        </div>
                    </div>
                </div>

                {/* 当前场景标签 */}
                {sceneId && (
                    <div style={{marginBottom: 12}}>
                        <Tag color="blue" style={{fontSize: 13, padding: '3px 10px'}}>
                            当前场景：{currentLabel}
                        </Tag>
                    </div>
                )}

                {/* KPI 摘要行 */}
                <Row gutter={[12, 12]} style={{marginBottom: 16}}>
                    {[
                        {label: '整体匹配率',   value: `${matchRate}%`,  color: matchRate >= 70 ? '#10B981' : '#F59E0B', icon: <CheckCircleOutlined/>},
                        {label: '算法稳定',     value: isStable ? '是' : '否', color: isStable ? '#10B981' : '#EF4444', icon: <SyncOutlined/>},
                        {label: '迭代次数',     value: iterNum,          color: '#8B5CF6', icon: <ReloadOutlined/>},
                        {label: 'CPU 耗时',     value: `${cpuTime}s`,    color: '#06B6D4', icon: <ClockCircleOutlined/>},
                    ].map(k => (
                        <Col key={k.label} xs={12} sm={6}>
                            <Card>
                                <Statistic
                                    title={k.label}
                                    value={k.value}
                                    prefix={k.icon}
                                    valueStyle={{color: k.color, fontFamily: 'var(--font-mono)', fontSize: 22}}
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* 图表区 */}
                <Row gutter={[16, 16]}>
                    {/* 路线容量利用率 */}
                    <Col xs={24} xl={14}>
                        <Card
                            title="路线容量利用率"
                            extra={
                                <span style={{fontSize: 12, color: '#94A3B8'}}>
                                    已用容量 vs 剩余容量（TEU）
                                </span>
                            }
                        >
                            <RouteUtilizationChart data={utilization}/>
                            <div style={{display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap'}}>
                                {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== '未知').map(([cat, color]) => (
                                    <div key={cat} style={{display: 'flex', alignItems: 'center', gap: 4, fontSize: 11}}>
                                        <span style={{width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block'}}/>
                                        {cat}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </Col>

                    {/* 时间价值分析 */}
                    <Col xs={24} xl={10}>
                        <Card
                            title="时间价值分析"
                            extra={
                                <Tooltip title="货物按时间价值(CNY/TEU)分三档统计匹配情况">
                                    <span style={{fontSize: 12, color: '#94A3B8', cursor: 'help'}}>? 说明</span>
                                </Tooltip>
                            }
                        >
                            <TimeValueCharts data={timeValue}/>
                        </Card>
                    </Col>

                    {/* OD 货流 Sankey */}
                    <Col xs={24}>
                        <Card
                            title="OD 货流分布"
                            extra={<span style={{fontSize: 12, color: '#94A3B8'}}>节点间货物需求量（TEU）· 宽度表示流量大小</span>}
                        >
                            <OdSankeyChart data={odFlow}/>
                        </Card>
                    </Col>

                    {/* 算法质量 */}
                    <Col xs={24}>
                        <Card title="算法运行质量">
                            <AlgorithmQualityPanel data={algoQuality}/>
                        </Card>
                    </Col>
                </Row>
            </div>
        </Spin>
    );
};

export default AnalyticsPage;
