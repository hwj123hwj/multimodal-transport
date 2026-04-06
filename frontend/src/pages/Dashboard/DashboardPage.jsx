import React, {useCallback, useEffect, useState} from 'react';
import {Button, Card, Col, Empty, Progress, Row, Spin, Tag} from 'antd';
import {
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    NodeIndexOutlined,
    InboxOutlined,
    BarChartOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import {useNavigate} from 'react-router-dom';
import api, {analyticsAPI} from '../../services/api';

const PALETTE = [
    '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6',
    '#06B6D4','#84CC16','#F97316','#EC4899','#6366F1','#14B8A6',
];
const CORRIDORS = [
    {key: '西部陆海新通道', color: '#3B82F6'},
    {key: '长江经济带', color: '#10B981'},
    {key: '跨境公路', color: '#F59E0B'},
];
const EMPTY_CORRIDOR = {matched_teu: 0, capacity: 0, utilization: 0};

const getCorridorMetric = (scene, corridorKey) => scene?.corridors?.[corridorKey] || EMPTY_CORRIDOR;
const formatPercent = (value) => Number(value || 0).toFixed(1);

const getSubsidyWeight = (scene) => {
    if (scene?.scene_id === '政府补贴') return Number.POSITIVE_INFINITY;
    const matched = scene?.scene_id?.match(/补贴(\d+)pct$/);
    return matched ? Number(matched[1]) : -1;
};

const pickKpiScene = (sceneList) => {
    const subsidyScenes = sceneList.filter(scene => scene?.scene_id?.startsWith('政府补贴'));
    if (subsidyScenes.length === 0) return null;

    return subsidyScenes.reduce((best, current) => (
        getSubsidyWeight(current) > getSubsidyWeight(best) ? current : best
    ), subsidyScenes[0]);
};

// ── 单场景卡片 ────────────────────────────────────────────────
const SceneCard = ({scene, color}) => {
    return (
        <Card
            size="small"
            style={{
                borderTop: `3px solid ${color}`,
                height: '100%',
                transition: 'box-shadow 0.2s',
            }}
            hoverable
        >
            {/* 场景名 + 稳定标签 */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10}}>
                <div style={{fontWeight:700, fontSize:13, color:'#1E293B', lineHeight:1.3, flex:1, marginRight:6}}>
                    {scene.label}
                </div>
                <Tag
                    color={scene.is_stable ? 'success' : 'warning'}
                    style={{fontSize:11, flexShrink:0}}
                    icon={scene.is_stable ? <CheckCircleOutlined/> : <ExclamationCircleOutlined/>}
                >
                    {scene.is_stable ? '稳定' : '不稳定'}
                </Tag>
            </div>

            {/* 三条走廊利用率 */}
            <div style={{marginBottom:10}}>
                {CORRIDORS.map((corridor, index) => {
                    const metric = getCorridorMetric(scene, corridor.key);
                    return (
                        <div key={corridor.key} style={{marginBottom: index === CORRIDORS.length - 1 ? 0 : 8}}>
                            <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'#64748B', marginBottom:3, gap:8}}>
                                <span>{corridor.key}</span>
                                <span style={{fontWeight:700, color:corridor.color, fontFamily:'var(--font-mono)'}}>
                                    {formatPercent(metric.utilization)}%
                                </span>
                            </div>
                            <Progress
                                percent={Math.min(metric.utilization, 100)}
                                showInfo={false}
                                size="small"
                                strokeColor={corridor.color}
                                trailColor="#E2E8F0"
                                strokeWidth={6}
                            />
                        </div>
                    );
                })}
            </div>

            {/* 底部统计 */}
            <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'#94A3B8',
                borderTop:'1px solid #F1F5F9', paddingTop:8}}>
                <span><InboxOutlined style={{marginRight:3}}/>已匹配 {scene.matched_shipments}</span>
                <span><ClockCircleOutlined style={{marginRight:3}}/>{scene.cpu_time}s</span>
                <span>迭代 {scene.iteration_num}</span>
            </div>
        </Card>
    );
};

// ── 主页面 ────────────────────────────────────────────────────
export const DashboardPage = () => {
    const [loading, setLoading] = useState(true);
    const [scenes, setScenes]   = useState([]);
    const [totalScenes, setTotalScenes] = useState(0);
    const navigate = useNavigate();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [compareRes, allRes, corridorRes] = await Promise.allSettled([
                api.get('/compare'),
                api.get('/scenes'),
                analyticsAPI.corridorUtilization(),
            ]);

            const compareData = compareRes.status === 'fulfilled'
                ? (compareRes.value?.data || compareRes.value || [])
                : [];
            const allScenes = allRes.status === 'fulfilled'
                ? (allRes.value?.data || allRes.value || [])
                : [];
            const corridorScenes = corridorRes.status === 'fulfilled'
                ? (corridorRes.value?.scenes || [])
                : [];

            const corridorMap = corridorScenes.reduce((acc, scene) => {
                acc[scene.scene_id] = scene.corridors || {};
                return acc;
            }, {});

            setScenes(compareData.map(scene => ({
                ...scene,
                corridors: corridorMap[scene.scene_id] || {},
            })));
            setTotalScenes(allScenes.length);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const executedCount = scenes.length;
    const stableCount   = scenes.filter(s => s.is_stable).length;
    const kpiScene = pickKpiScene(scenes);
    const corridorKpis = CORRIDORS.map(corridor => {
        const value = kpiScene
            ? getCorridorMetric(kpiScene, corridor.key).utilization
            : (
                executedCount
                    ? Math.round(
                        scenes.reduce((sum, scene) => sum + getCorridorMetric(scene, corridor.key).utilization, 0)
                        / executedCount * 10
                    ) / 10
                    : 0
            );

        return {...corridor, value};
    });

    return (
        <Spin spinning={loading}>
            <div>
                {/* 页头 */}
                <div className="page-header" style={{marginBottom:16}}>
                    <h1 style={{margin:0}}>系统概览</h1>
                    <Button size="small" onClick={loadData} loading={loading}>刷新</Button>
                </div>

                {/* 汇总 KPI */}
                <Row gutter={[12,12]} style={{marginBottom:16}}>
                    {[
                        {label:'总场景数',   value: totalScenes,    icon:<NodeIndexOutlined/>,  color:'#3B82F6'},
                        {label:'已执行场景', value: executedCount,  icon:<BarChartOutlined/>,   color:'#10B981'},
                        {label:'稳定场景',   value: stableCount,    icon:<CheckCircleOutlined/>,color:'#8B5CF6'},
                    ].map(k => (
                        <Col key={k.label} xs={12} sm={6}>
                            <Card>
                                <div style={{display:'flex', alignItems:'center', gap:10}}>
                                    <div style={{
                                        width:40, height:40, borderRadius:'50%',
                                        background:`${k.color}18`, border:`1.5px solid ${k.color}30`,
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                        fontSize:18, color:k.color, flexShrink:0,
                                    }}>{k.icon}</div>
                                    <div>
                                        <div style={{fontSize:11, color:'#94A3B8', fontWeight:600,
                                            textTransform:'uppercase', letterSpacing:'0.05em'}}>{k.label}</div>
                                        <div style={{fontSize:22, fontWeight:800,
                                            fontFamily:'var(--font-mono)', color:'#1E293B'}}>{k.value}</div>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    ))}
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <div style={{display:'flex', alignItems:'flex-start', gap:10}}>
                                <div style={{
                                    width:40, height:40, borderRadius:'50%',
                                    background:'#F59E0B18', border:'1.5px solid #F59E0B30',
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:18, color:'#F59E0B', flexShrink:0,
                                }}>
                                    <InboxOutlined/>
                                </div>
                                <div style={{flex:1}}>
                                    <div style={{fontSize:11, color:'#94A3B8', fontWeight:600, letterSpacing:'0.03em'}}>
                                        {kpiScene ? `${kpiScene.label} 走廊利用率` : '平均走廊利用率'}
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between', gap:10, marginTop:8}}>
                                        {corridorKpis.map(corridor => (
                                            <div key={corridor.key} style={{flex:1, minWidth:0}}>
                                                <div style={{fontSize:10, color:corridor.color, fontWeight:700, lineHeight:1.4}}>
                                                    {corridor.key}
                                                </div>
                                                <div style={{fontSize:22, fontWeight:800, fontFamily:'var(--font-mono)', color:'#1E293B'}}>
                                                    {formatPercent(corridor.value)}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* 场景卡片网格 */}
                {scenes.length === 0 ? (
                    <Card>
                        <Empty
                            description="暂无已执行场景，请前往「数据上传」页面执行算法"
                            style={{padding:'40px 0'}}
                        >
                            <Button type="primary" onClick={() => navigate('/data-upload')}>
                                前往上传执行
                            </Button>
                        </Empty>
                    </Card>
                ) : (
                    <>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                            <span style={{fontSize:13, color:'#64748B', fontWeight:600}}>
                                已执行场景（{executedCount} 个）
                            </span>
                            <Button size="small" type="link" onClick={() => navigate('/compare')}>
                                查看对比分析 →
                            </Button>
                        </div>
                        <Row gutter={[12,12]}>
                            {scenes.map((scene, i) => (
                                <Col key={scene.scene_id} xs={24} sm={12} lg={8} xl={6}>
                                    <SceneCard scene={scene} color={PALETTE[i % PALETTE.length]}/>
                                </Col>
                            ))}
                        </Row>
                    </>
                )}
            </div>
        </Spin>
    );
};

export default DashboardPage;
