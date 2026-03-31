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
import api from '../../services/api';

const PALETTE = [
    '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6',
    '#06B6D4','#84CC16','#F97316','#EC4899','#6366F1','#14B8A6',
];

// ── 单场景卡片 ────────────────────────────────────────────────
const SceneCard = ({scene, color}) => {
    const matchRate = scene.matching_rate ?? 0;
    const contRate  = scene.container_rate ?? 0;

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

            {/* 匹配率进度条 */}
            <div style={{marginBottom:8}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'#64748B', marginBottom:3}}>
                    <span>匹配率</span>
                    <span style={{fontWeight:700, color: matchRate >= 70 ? '#10B981' : '#F59E0B',
                        fontFamily:'var(--font-mono)'}}>{matchRate}%</span>
                </div>
                <Progress
                    percent={matchRate} showInfo={false} size="small"
                    strokeColor={matchRate >= 70 ? '#10B981' : '#F59E0B'}
                    trailColor="#E2E8F0" strokeWidth={6}
                />
            </div>

            {/* 集装箱率进度条 */}
            <div style={{marginBottom:10}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'#64748B', marginBottom:3}}>
                    <span>集装箱率</span>
                    <span style={{fontWeight:700, color:color, fontFamily:'var(--font-mono)'}}>{contRate}%</span>
                </div>
                <Progress
                    percent={contRate} showInfo={false} size="small"
                    strokeColor={color} trailColor="#E2E8F0" strokeWidth={6}
                />
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
            const [compareRes, allRes] = await Promise.all([
                api.get('/compare'),
                api.get('/scenes'),
            ]);
            setScenes(compareRes?.data?.data || []);
            setTotalScenes((allRes?.data?.data || allRes?.data || []).length);
        } catch (e) {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const executedCount = scenes.length;
    const stableCount   = scenes.filter(s => s.is_stable).length;
    const avgMatchRate  = executedCount
        ? Math.round(scenes.reduce((s, r) => s + r.matching_rate, 0) / executedCount * 10) / 10
        : 0;

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
                        {label:'平均匹配率', value: `${avgMatchRate}%`, icon:<InboxOutlined/>,  color:'#F59E0B'},
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
