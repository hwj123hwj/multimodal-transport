import React, {useState, useEffect, useCallback, useRef} from 'react';
import {Card, Button, Select, Space, Tag, Slider, Row, Col, message} from 'antd';
import {PlayCircleOutlined, PauseCircleOutlined, StepForwardOutlined, StepBackwardOutlined, ReloadOutlined} from '@ant-design/icons';
import api from '../../services/api';
import useSceneSelector from '../../hooks/useSceneSelector';
import './MatchingAnimation.css';

const {Option} = Select;

const MatchingAnimation = () => {
    const [matchings, setMatchings] = useState([]);
    const [steps, setSteps] = useState([]);
    const [currentStep, setCurrentStep] = useState(-1);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [shipmentDetails, setShipmentDetails] = useState({});
    const timerRef = useRef(null);
    const {selectScenes, activeId, setActiveId} = useSceneSelector(true);

    // 构建动画步骤
    const buildSteps = useCallback((matchingsData, detailsMap) => {
        if (!matchingsData || matchingsData.length === 0) return [];

        const builtSteps = [];
        // 按货物ID排序
        const sorted = [...matchingsData].sort((a, b) => (a.shipment_id || 0) - (b.shipment_id || 0));

        // 全局匹配状态
        const routeCurrentMatch = {}; // route_id -> [shipment_ids]

        for (const m of sorted) {
            const sid = m.shipment_id;
            const detail = detailsMap[sid];
            if (!detail) continue;

            const candidates = detail.candidates || [];
            const assignedRoute = m.assigned_route;

            // 按匹配成本排序（货物偏好）
            const sortedCandidates = [...candidates].sort((a, b) => (a.matched_cost || 0) - (b.matched_cost || 0));

            for (const candidate of sortedCandidates) {
                const rid = candidate.route_id;
                const isFinal = rid === assignedRoute;
                const category = candidate.route_category || '未分类';
                const cost = candidate.matched_cost || 0;

                if (isFinal) {
                    // 表白 + 接受
                    builtSteps.push({
                        step: builtSteps.length + 1,
                        type: 'propose',
                        shipment_id: sid,
                        route_id: rid,
                        shipment_city: `${detail.shipment?.origin_city || '?'} → ${detail.shipment?.destination_city || '?'}`,
                        route_category: category,
                        cost: cost,
                        description: `📦 货物${sid}（${detail.shipment?.origin_city}→${detail.shipment?.destination_city}）向 路线#${rid}（${category}）表白，匹配成本：¥${cost.toLocaleString()}`
                    });

                    if (routeCurrentMatch[rid]) {
                        routeCurrentMatch[rid].push(sid);
                    } else {
                        routeCurrentMatch[rid] = [sid];
                    }

                    builtSteps.push({
                        step: builtSteps.length + 1,
                        type: 'accept',
                        shipment_id: sid,
                        route_id: rid,
                        route_category: category,
                        description: `✅ 路线#${rid}（${category}）接受货物${sid}！当前承载：${routeCurrentMatch[rid]?.length || 1}个货物`
                    });
                    break; // 已匹配，跳出循环
                } else {
                    // 表白 + 拒绝
                    builtSteps.push({
                        step: builtSteps.length + 1,
                        type: 'propose',
                        shipment_id: sid,
                        route_id: rid,
                        shipment_city: `${detail.shipment?.origin_city || '?'} → ${detail.shipment?.destination_city || '?'}`,
                        route_category: category,
                        cost: cost,
                        description: `📦 货物${sid}（${detail.shipment?.origin_city}→${detail.shipment?.destination_city}）向 路线#${rid}（${category}）表白，匹配成本：¥${cost.toLocaleString()}`
                    });

                    builtSteps.push({
                        step: builtSteps.length + 1,
                        type: 'reject',
                        shipment_id: sid,
                        route_id: rid,
                        route_category: category,
                        description: `❌ 路线#${rid}（${category}）拒绝货物${sid}（容量不足或已有更优匹配），继续向下一偏好路线表白`
                    });
                }
            }
        }

        // 最终结果步骤
        builtSteps.push({
            step: builtSteps.length + 1,
            type: 'complete',
            description: `🎉 稳定匹配完成！共匹配 ${sorted.filter(m => m.assigned_route && m.assigned_route !== 'Self').length} 个货物`
        });

        return builtSteps;
    }, []);

    // 加载数据
    useEffect(() => {
        const loadData = async () => {
            try {
                let matchingsData = [];
                if (activeId) {
                    const res = await api.get(`/scenes/${activeId}/matchings`);
                    const raw = res?.data;
                    // scenes/:id/matchings 返回可能是数组或对象
                    if (Array.isArray(raw)) {
                        matchingsData = raw;
                    } else if (raw?.shipments) {
                        matchingsData = raw.shipments;
                    } else if (raw?.data?.shipments) {
                        matchingsData = raw.data.shipments;
                    }
                } else {
                    const res = await api.get('/matchings');
                    const raw = res?.data;
                    // /matchings 返回 [ { total_shipments, shipments: [...] } ]
                    if (Array.isArray(raw) && raw.length > 0 && raw[0]?.shipments) {
                        matchingsData = raw[0].shipments;
                    } else if (raw?.shipments) {
                        matchingsData = raw.shipments;
                    } else if (raw?.data?.shipments) {
                        matchingsData = raw.data.shipments;
                    } else if (Array.isArray(raw)) {
                        matchingsData = raw;
                    }
                }
                // 过滤掉 Self 和未匹配的
                const matched = matchingsData.filter(m => m.assigned_route && m.assigned_route !== 'Self');
                setMatchings(matched);

                // 加载前5个货物的溯源详情
                const details = {};
                const matchedShipments = matchingsData.filter(m => m.assigned_route && m.assigned_route !== 'Self').slice(0, 10);
                for (const m of matchedShipments) {
                    try {
                        const traceRes = await api.get(`/shipment/${m.shipment_id}/trace`);
                        details[m.shipment_id] = traceRes.data?.data || traceRes.data;
                    } catch (e) {
                        // skip
                    }
                }
                setShipmentDetails(details);

                // 构建步骤
                const builtSteps = buildSteps(matchingsData, details);
                setSteps(builtSteps);
                message.success(`加载了 ${matchingsData.length} 个货物的匹配数据`);
            } catch (error) {
                console.error('加载数据失败:', error);
                message.error('加载数据失败');
            }
        };

        loadData();
    }, [activeId, buildSteps]);

    // 自动播放
    useEffect(() => {
        if (playing && currentStep < steps.length - 1) {
            timerRef.current = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, speed);
        } else if (playing && currentStep >= steps.length - 1) {
            setPlaying(false);
        }
        return () => clearTimeout(timerRef.current);
    }, [playing, currentStep, steps.length, speed]);

    const nextStep = () => {
        if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        if (currentStep > -1) setCurrentStep(prev => prev - 1);
    };

    const reset = () => {
        setPlaying(false);
        setCurrentStep(-1);
    };

    const togglePlay = () => {
        if (currentStep >= steps.length - 1) {
            setCurrentStep(-1);
        }
        setPlaying(!playing);
    };

    // 获取当前状态下的匹配关系
    const getCurrentMatches = () => {
        const matches = {}; // route_id -> [shipment_ids]
        if (currentStep < 0) return matches;
        for (let i = 0; i <= currentStep && i < steps.length; i++) {
            const s = steps[i];
            if (s.type === 'accept') {
                if (!matches[s.route_id]) matches[s.route_id] = [];
                matches[s.route_id].push(s.shipment_id);
            }
            // reject 不改变状态
        }
        return matches;
    };

    // 获取当前步骤涉及的货物和路线
    const getCurrentStepData = () => {
        if (currentStep < 0 || currentStep >= steps.length) return null;
        return steps[currentStep];
    };

    // 获取所有涉及的货物和路线
    const getAllEntities = () => {
        const shipments = new Map();
        const routes = new Map();

        for (const step of steps) {
            if (step.shipment_id) {
                shipments.set(step.shipment_id, {
                    id: step.shipment_id,
                    city: step.shipment_city || `货物${step.shipment_id}`
                });
            }
            if (step.route_id) {
                routes.set(step.route_id, {
                    id: step.route_id,
                    category: step.route_category || '未分类'
                });
            }
        }
        return {shipments: [...shipments.values()], routes: [...routes.values()]};
    };

    const {shipments, routes} = getAllEntities();
    const currentMatches = getCurrentMatches();
    const stepData = getCurrentStepData();

    // 过滤显示
    const filteredSteps = selectedShipment
        ? steps.filter(s => s.type === 'complete' || s.shipment_id === selectedShipment)
        : steps;

    // 重新映射步骤索引
    const filteredStepIndex = selectedShipment
        ? filteredSteps.findIndex(s => s.step === (stepData?.step))
        : currentStep;

    return (
        <div className="matching-animation">
            {/* 控制栏 */}
            <Card style={{marginBottom: 16}}>
                <Row gutter={16} align="middle">
                    <Col>
                        <Space>
                            <span style={{fontSize: 13, color: '#64748B'}}>场景：</span>
                            <Select value={activeId} onChange={setActiveId} style={{width: 200}} allowClear placeholder="选择场景">
                                {selectScenes.map(s => <Option key={s.id} value={s.id}>{s.label}</Option>)}
                            </Select>
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            <span style={{fontSize: 13, color: '#64748B'}}>聚焦货物：</span>
                            <Select value={selectedShipment} onChange={setSelectedShipment} style={{width: 160}} allowClear placeholder="全部货物">
                                {shipments.map(s => <Option key={s.id} value={s.id}>{s.city || `货物${s.id}`}</Option>)}
                            </Select>
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            <span style={{fontSize: 13, color: '#64748B'}}>速度：</span>
                            <Slider min={500} max={3000} step={100} value={3300 - speed} onChange={v => setSpeed(3300 - v)} style={{width: 120}} />
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* 动画区域 */}
            <Card>
                <div className="animation-container">
                    <div className="animation-columns">
                        {/* 货物列 */}
                        <div className="entity-column shipments-column">
                            <div className="column-title">📦 货物</div>
                            {shipments.map(s => {
                                const isActive = stepData?.shipment_id === s.id;
                                const isMatched = Object.values(currentMatches).flat().includes(s.id);
                                return (
                                    <div key={s.id} className={`entity-node shipment-node ${isActive ? 'active' : ''} ${isMatched ? 'matched' : ''}`}>
                                        <div className="node-id">货物{s.id}</div>
                                        <div className="node-detail">{s.city}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 连线区域 */}
                        <div className="connections-area">
                            <svg className="connections-svg">
                                {Object.entries(currentMatches).map(([routeId, shipmentIds]) =>
                                    shipmentIds.map(sid => {
                                        const sIdx = shipments.findIndex(s => s.id === sid);
                                        const rIdx = routes.findIndex(r => r.id === parseInt(routeId));
                                        if (sIdx === -1 || rIdx === -1) return null;
                                        const y1 = 40 + sIdx * 70;
                                        const y2 = 40 + rIdx * 70;
                                        return (
                                            <line key={`${sid}-${routeId}`} x1="0" y1={y1} x2="100%" y2={y2}
                                                stroke="#52c41a" strokeWidth="2" opacity="0.6"
                                                strokeDasharray={stepData?.type === 'propose' && stepData?.shipment_id === sid && stepData?.route_id === parseInt(routeId) ? "8 4" : "none"}
                                            />
                                        );
                                    })
                                )}
                            </svg>
                            {/* 当前表白连线 */}
                            {stepData && (stepData.type === 'propose' || stepData.type === 'reject') && stepData.shipment_id && stepData.route_id && (
                                <div className="propose-arrow" style={{
                                    top: `${40 + shipments.findIndex(s => s.id === stepData.shipment_id) * 70}px`,
                                }}>
                                    {stepData.type === 'reject' ? '→ ❌' : '→ 💕'}
                                </div>
                            )}
                        </div>

                        {/* 路线列 */}
                        <div className="entity-column routes-column">
                            <div className="column-title">🛤️ 路线</div>
                            {routes.map(r => {
                                const isActive = stepData?.route_id === r.id;
                                const matchedShipments = currentMatches[r.id] || [];
                                const isMatched = matchedShipments.length > 0;
                                return (
                                    <div key={r.id} className={`entity-node route-node ${isActive ? 'active' : ''} ${isMatched ? 'matched' : ''} ${stepData?.type === 'reject' && stepData?.route_id === r.id ? 'rejected' : ''}`}>
                                        <div className="node-id">路线#{r.id}</div>
                                        <div className="node-detail">
                                            <Tag color={r.category === '西海路新通道' ? 'green' : r.category === '长江经济带' ? 'blue' : r.category === '跨境公路' ? 'orange' : 'default'} style={{fontSize: 11}}>
                                                {r.category}
                                            </Tag>
                                        </div>
                                        {isMatched && <div className="node-matched">承载: {matchedShipments.join(', ')}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 步骤说明 */}
                    <div className="step-description">
                        <div className={`step-card ${stepData?.type || ''}`}>
                            {stepData ? (
                                <div>
                                    <span className="step-number">第 {stepData.step} 步</span>
                                    <span className="step-text">{stepData.description}</span>
                                </div>
                            ) : (
                                <div style={{color: '#999', textAlign: 'center'}}>
                                    点击「播放」或「下一步」开始演示匹配过程
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 控制按钮 */}
                    <div className="controls">
                        <Space size="middle">
                            <Button icon={<ReloadOutlined/>} onClick={reset}>重置</Button>
                            <Button icon={<StepBackwardOutlined/>} onClick={prevStep} disabled={currentStep <= -1}>上一步</Button>
                            <Button type="primary" icon={playing ? <PauseCircleOutlined/> : <PlayCircleOutlined/>} onClick={togglePlay}>
                                {playing ? '暂停' : '播放'}
                            </Button>
                            <Button icon={<StepForwardOutlined/>} onClick={nextStep} disabled={currentStep >= steps.length - 1}>下一步</Button>
                            <span style={{color: '#999', marginLeft: 16}}>
                                进度：{currentStep + 1} / {steps.length}
                            </span>
                        </Space>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default MatchingAnimation;
