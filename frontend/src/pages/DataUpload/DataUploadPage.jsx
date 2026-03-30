import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    Alert, Badge, Button, Card, Col, Descriptions, Form, InputNumber,
    message, Modal, Popconfirm, Progress, Row, Space,
    Steps, Table, Tag, Tooltip, Typography, Upload,
} from 'antd';
import {
    CheckCircleOutlined, CloudUploadOutlined,
    DeleteOutlined, ExclamationCircleOutlined,
    EyeOutlined, FileTextOutlined, FileZipOutlined,
    PlayCircleOutlined, ReloadOutlined, SettingOutlined,
    SyncOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import {uploadDataAPI} from '../../services/api';
import api from '../../services/api';

const {Dragger} = Upload;
const {Text, Paragraph} = Typography;

const FILE_SLOTS = [
    {key: 'shipment',              label: '货物数据', filename: 'shipment.csv',              color: '#3B82F6', required: true,  desc: '货物ID、起终点、需求量、时间价值'},
    {key: 'route',                 label: '路线数据', filename: 'route.csv',                 color: '#10B981', required: true,  desc: '路线节点、运费、运时、容量'},
    {key: 'network',               label: '网络节点', filename: 'network.csv',               color: '#8B5CF6', required: false, desc: '节点数量和索引'},
    {key: 'cooperation_parameter', label: '合作参数', filename: 'cooperation_parameter.csv', color: '#F59E0B', required: false, desc: '货物与路线合作意愿矩阵'},
];

const fmtSize = b => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(2)}MB`;

const usePolling = (fn, interval, active) => {
    const ref = useRef();
    useEffect(() => {
        if (!active) { clearInterval(ref.current); return; }
        ref.current = setInterval(fn, interval);
        return () => clearInterval(ref.current);
    }, [fn, interval, active]);
};

const DataUploadPage = () => {
    const [selected, setSelected]     = useState({});
    const [uploaded, setUploaded]     = useState([]);
    const [uploading, setUploading]   = useState(false);
    const [uploadPct, setUploadPct]   = useState(0);
    const [scenes, setScenes]         = useState([]);
    const [scenesLoading, setScenesLoading] = useState(false);
    const [taskId, setTaskId]         = useState(null);
    const [taskStatus, setTaskStatus] = useState('idle');
    const [taskResult, setTaskResult] = useState(null);
    const [taskError, setTaskError]   = useState(null);
    const [elapsed, setElapsed]       = useState(0);
    const [preview, setPreview]       = useState(null);
    // zip上传
    const [zipFile, setZipFile]       = useState(null);
    const [zipUploading, setZipUploading] = useState(false);
    const [zipResult, setZipResult]   = useState(null);
    // 场景任务状态轮询
    const [sceneTaskMap, setSceneTaskMap] = useState({}); // scene_id -> {status, result}
    // 算法参数弹窗
    const [algoModal, setAlgoModal]   = useState(null); // scene_id 或 null
    const [algoForm] = Form.useForm();

    const DEFAULT_PARAMS = {max_prefer_list: 1000000, max_iter: 2000, max_incomplete: 200, prob_random_walk: 0.5};

    const loadUploaded = useCallback(async () => {
        try {
            const res = await uploadDataAPI.getUploadHistory();
            setUploaded(res?.data?.files || []);
        } catch (_) {}
    }, []);

    const loadScenes = useCallback(async () => {
        setScenesLoading(true);
        try {
            const res = await api.get('/scenes');
            setScenes(res?.data || []);
        } catch (_) {} finally {
            setScenesLoading(false);
        }
    }, []);

    useEffect(() => { loadUploaded(); loadScenes(); }, [loadUploaded, loadScenes]);

    // 轮询当前活跃的单次算法任务
    const pollStatus = useCallback(async () => {
        try {
            const res = await api.get('/matching/status', {params: taskId ? {task_id: taskId} : {}});
            const s = res?.status || 'idle';
            setTaskStatus(s);
            if (s === 'done')   setTaskResult(res.result?.summary || res.result || null);
            if (s === 'failed') setTaskError(res.error || '执行失败');
        } catch (_) {}
    }, [taskId]);
    usePolling(pollStatus, 2000, taskStatus === 'running');

    // 轮询场景批量任务
    const pollScenes = useCallback(async () => {
        const running = scenes.filter(s => s.task_status === 'running');
        if (!running.length) return;
        const updates = {};
        await Promise.all(running.map(async s => {
            try {
                const res = await api.get(`/scenes/${s.id}/status`);
                updates[s.id] = res?.data || {};
            } catch (_) {}
        }));
        if (Object.keys(updates).length) {
            setSceneTaskMap(prev => ({...prev, ...updates}));
            loadScenes();
        }
    }, [scenes, loadScenes]);
    const hasRunningScenes = scenes.some(s => s.task_status === 'running' || s.task_status === 'queued');
    usePolling(pollScenes, 3000, hasRunningScenes);

    // 计时器
    useEffect(() => {
        if (taskStatus !== 'running') { setElapsed(0); return; }
        const t = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => clearInterval(t);
    }, [taskStatus]);

    // ── 单文件选择 ────────────────────────────────────────────
    const makeProps = key => ({
        accept: '.csv', multiple: false, showUploadList: false,
        beforeUpload: file => { setSelected(p => ({...p, [key]: file})); return false; },
    });

    // ── 一键上传 ──────────────────────────────────────────────
    const handleBatchUpload = useCallback(async () => {
        const toUpload = Object.entries(selected).filter(([, f]) => f);
        if (!toUpload.length) { message.warning('请先选择文件'); return; }
        setUploading(true); setUploadPct(0);
        const timer = setInterval(() => setUploadPct(p => Math.min(p + 8, 88)), 150);
        try {
            const fd = new FormData();
            toUpload.forEach(([k, f]) => fd.append(k, f));
            const res = await api.post('/upload/batch', fd, {headers: {'Content-Type': 'multipart/form-data'}});
            clearInterval(timer); setUploadPct(100);
            message.success(`成功上传 ${res.saved?.length || 0} 个文件`);
            if (res.errors?.length) res.errors.forEach(e => message.warning(`${e.file_type}: ${e.error}`));
            setSelected({});
            setTimeout(() => { setUploadPct(0); loadUploaded(); }, 800);
        } catch (e) {
            clearInterval(timer); setUploadPct(0);
            message.error('上传失败：' + (e.message || '未知'));
        } finally { setUploading(false); }
    }, [selected, loadUploaded]);

    // ── zip 上传 ──────────────────────────────────────────────
    const handleZipUpload = useCallback(async () => {
        if (!zipFile) { message.warning('请先选择 zip 文件'); return; }
        setZipUploading(true); setZipResult(null);
        try {
            const fd = new FormData();
            fd.append('file', zipFile);
            const res = await api.post('/upload/zip', fd, {
                headers: {'Content-Type': 'multipart/form-data'},
                timeout: 60000,
            });
            setZipResult(res);
            message.success(res.message || '上传成功');
            setZipFile(null);
            loadScenes();
        } catch (e) {
            message.error('zip 上传失败：' + (e.message || '未知'));
        } finally { setZipUploading(false); }
    }, [zipFile, loadScenes]);

    // ── 执行当前 data/ 的算法 ─────────────────────────────────
    const handleExecute = useCallback(async () => {
        setTaskStatus('running'); setTaskResult(null); setTaskError(null); setElapsed(0);
        try {
            const res = await api.post('/matching/execute', {}, {timeout: 15000});
            setTaskId(res?.task_id || null);
        } catch (e) {
            setTaskStatus('failed'); setTaskError(e.message || '提交失败');
        }
    }, []);

    // ── 执行单个场景（弹窗确认参数后提交） ───────────────────
    const openAlgoModal = useCallback((sceneId) => {
        algoForm.setFieldsValue(DEFAULT_PARAMS);
        setAlgoModal(sceneId);
    }, [algoForm]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRunScene = useCallback(async (sceneId, params) => {
        try {
            await api.post(`/scenes/${sceneId}/run`, params);
            message.success('已提交，算法在后台运行');
            loadScenes();
        } catch (e) {
            message.error('提交失败：' + (e.message || '未知'));
        }
    }, [loadScenes]);

    const handleAlgoOk = useCallback(async () => {
        const values = await algoForm.validateFields();
        const sceneId = algoModal;
        setAlgoModal(null);
        await handleRunScene(sceneId, values);
    }, [algoForm, algoModal, handleRunScene]);

    // ── 批量跑所有场景 ────────────────────────────────────────
    const handleRunAll = useCallback(async () => {
        try {
            const res = await api.post('/scenes/run-all');
            if (res.count === 0) {
                message.warning(res.message || '没有可提交的场景');
            } else {
                message.success(res.message || `已提交 ${res.count} 个场景`);
            }
            loadScenes();
        } catch (e) {
            message.error('批量提交失败：' + (e.message || '未知'));
        }
    }, [loadScenes]);

    const handlePreview = useCallback(async (filename) => {
        try {
            const res = await uploadDataAPI.previewFile(filename);
            setPreview(res?.data || null);
        } catch (e) { message.error('预览失败：' + e.message); }
    }, []);

    const handleDelete = useCallback(async (filename) => {
        try {
            await uploadDataAPI.deleteFile(filename);
            message.success('删除成功');
            loadUploaded();
            if (preview?.filename === filename) setPreview(null);
        } catch (e) { message.error('删除失败：' + e.message); }
    }, [loadUploaded, preview]);

    const uploadedKeys = uploaded.map(u => u.file_type);
    const requiredOk = ['shipment', 'route'].every(k => uploadedKeys.includes(k));
    const selectedCount = Object.values(selected).filter(Boolean).length;
    const running = taskStatus === 'running';

    const sceneStatusTag = (s) => {
        const ts = sceneTaskMap[s.id]?.status || s.task_status || s.status;
        const pos = sceneTaskMap[s.id]?.queue_position ?? s.queue_position;
        if (ts === 'running') return <Tag icon={<SyncOutlined spin/>} color="processing">运行中</Tag>;
        if (ts === 'queued')  return <Tag icon={<ClockCircleOutlined/>} color="warning">排队中{pos != null ? `(第${pos})` : ''}</Tag>;
        if (ts === 'done')    return <Tag icon={<CheckCircleOutlined/>} color="success">已完成</Tag>;
        if (ts === 'failed')  return <Tag icon={<ExclamationCircleOutlined/>} color="error">失败</Tag>;
        return <Tag color="default">待执行</Tag>;
    };

    const sceneColumns = [
        {title: '场景', dataIndex: 'label', key: 'label', width: 200,
            render: (t, r) => <span style={{fontWeight: 600}}>{t || r.id}</span>},
        {title: '分组', dataIndex: 'group', key: 'group', width: 110,
            render: t => <Tag>{t}</Tag>},
        {title: '路线数', dataIndex: 'route_count', key: 'routes', width: 80, align: 'right'},
        {title: '货物数', dataIndex: 'shipment_count', key: 'shipments', width: 80, align: 'right'},
        {title: '状态', key: 'status', width: 100, render: (_, r) => sceneStatusTag(r)},
        {title: '匹配率', key: 'rate', width: 90, align: 'right',
            render: (_, r) => {
                const res = sceneTaskMap[r.id]?.result || r.result;
                return res ? <Text style={{color:'#10B981', fontWeight:600}}>{(res.matching_rate*100).toFixed(1)}%</Text> : '—';
            }},
        {title: '操作', key: 'action', width: 90, align: 'center',
            render: (_, r) => {
                const ts = sceneTaskMap[r.id]?.status || r.task_status;
                return (
                    <Button
                        size="small" type="primary"
                        icon={ts === 'running' ? <SyncOutlined spin/> : <SettingOutlined/>}
                        disabled={ts === 'running'}
                        onClick={() => openAlgoModal(r.id)}
                    >
                        {ts === 'running' ? '运行中' : '执行'}
                    </Button>
                );
            }},
    ];

    return (
        <div>
            <Card style={{marginBottom: 16}}>
                <Steps size="small" current={!requiredOk ? 0 : taskStatus === 'idle' ? 1 : taskStatus === 'running' ? 1 : 2} items={[
                    {title: '上传数据'},
                    {title: '执行算法'},
                    {title: '对比分析'},
                ]}/>
            </Card>

            <Row gutter={[16, 16]}>
                {/* 左上：4文件上传 */}
                <Col xs={24} xl={14}>
                    <Card title="当前数据文件"
                        extra={
                            <Space>
                                <Text style={{fontSize:12, color:'#94A3B8'}}>{selectedCount > 0 ? `已选 ${selectedCount} 个` : '支持4个文件同时上传'}</Text>
                                <Button type="primary" icon={<CloudUploadOutlined/>}
                                    onClick={handleBatchUpload} loading={uploading} disabled={!selectedCount}>
                                    一键上传
                                </Button>
                            </Space>
                        }
                    >
                        {(uploading || uploadPct > 0) && (
                            <Progress percent={uploadPct} status={uploadPct===100?'success':'active'} style={{marginBottom:12}}/>
                        )}
                        <Row gutter={[10, 10]}>
                            {FILE_SLOTS.map(slot => {
                                const file = selected[slot.key];
                                const sv = uploaded.find(u => u.file_type === slot.key);
                                return (
                                    <Col xs={24} sm={12} key={slot.key}>
                                        <div style={{border:`1.5px dashed ${file ? slot.color : '#E2E8F0'}`, borderRadius:10, background: file ? `${slot.color}08` : '#FAFAFA'}}>
                                            <Dragger {...makeProps(slot.key)} style={{background:'transparent', border:'none', padding:'8px 12px'}}>
                                                <div style={{padding:'8px 0 4px'}}>
                                                    <div style={{width:32, height:32, borderRadius:8, background:`${slot.color}15`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 6px'}}>
                                                        {file ? <CheckCircleOutlined style={{color:slot.color, fontSize:16}}/> : <FileTextOutlined style={{color:slot.color, fontSize:16}}/>}
                                                    </div>
                                                    <div style={{fontWeight:600, fontSize:12}}>{slot.label}{slot.required && <span style={{color:'#EF4444'}}>*</span>}</div>
                                                    <div style={{fontSize:11, color:'#94A3B8'}}>{file ? file.name : slot.filename}</div>
                                                    {file && <Tag color="blue" style={{marginTop:3, fontSize:10}}>{fmtSize(file.size)}</Tag>}
                                                </div>
                                            </Dragger>
                                            {sv && !file && (
                                                <div style={{padding:'5px 10px 7px', borderTop:`1px solid ${slot.color}20`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                    <Space size={4}>
                                                        <Badge status="success"/>
                                                        <Text style={{fontSize:11, color:'#64748B'}}>已上传 · {fmtSize(sv.file_size)}</Text>
                                                    </Space>
                                                    <Space size={2}>
                                                        <Tooltip title="预览"><Button size="small" type="text" icon={<EyeOutlined style={{fontSize:11}}/>} onClick={() => handlePreview(sv.filename)}/></Tooltip>
                                                        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(sv.filename)} okText="删除" cancelText="取消">
                                                            <Tooltip title="删除"><Button size="small" type="text" danger icon={<DeleteOutlined style={{fontSize:11}}/>}/></Tooltip>
                                                        </Popconfirm>
                                                    </Space>
                                                </div>
                                            )}
                                        </div>
                                    </Col>
                                );
                            })}
                        </Row>
                        <div style={{marginTop:10, fontSize:11, color:'#94A3B8'}}>* 必填 · 仅支持 CSV · 上传后覆盖现有数据文件</div>

                        {/* 预览 */}
                        {preview && (
                            <Card size="small" style={{marginTop:10}}
                                title={<Space><FileTextOutlined/>预览 · {preview.filename}</Space>}
                                extra={<Button size="small" onClick={() => setPreview(null)}>关闭</Button>}
                            >
                                <pre style={{fontSize:11, margin:0, maxHeight:160, overflow:'auto', background:'#F8FAFC', padding:'6px 10px', borderRadius:6, fontFamily:'var(--font-mono)'}}>
                                    {preview.preview_lines?.join('\n')}
                                </pre>
                                <Text style={{fontSize:11, color:'#94A3B8'}}>前10行</Text>
                            </Card>
                        )}
                    </Card>

                    {/* zip 上传 */}
                    <Card title="批量场景上传（ZIP）" style={{marginTop:12}}
                        extra={
                            <Button type="primary" icon={<FileZipOutlined/>}
                                onClick={handleZipUpload} loading={zipUploading} disabled={!zipFile}>
                                解析并注册
                            </Button>
                        }
                    >
                        <Dragger
                            accept=".zip" multiple={false} showUploadList={false}
                            beforeUpload={f => { setZipFile(f); setZipResult(null); return false; }}
                            style={{borderRadius:8}}
                        >
                            <div style={{padding:'12px 0'}}>
                                <FileZipOutlined style={{fontSize:32, color: zipFile ? '#10B981' : '#94A3B8'}}/>
                                <div style={{fontWeight:600, fontSize:13, marginTop:8}}>
                                    {zipFile ? zipFile.name : '点击或拖拽上传 ZIP 压缩包'}
                                </div>
                                <div style={{fontSize:12, color:'#94A3B8', marginTop:4}}>
                                    将自动扫描压缩包内每个包含 route.csv + shipment.csv 的目录，注册为独立场景
                                </div>
                                {zipFile && <Tag color="blue" style={{marginTop:6}}>{fmtSize(zipFile.size)}</Tag>}
                            </div>
                        </Dragger>
                        {zipResult && (
                            <Alert
                                style={{marginTop:10}}
                                type={zipResult.status === 'success' ? 'success' : 'warning'}
                                message={zipResult.message}
                                description={zipResult.scenes?.map(s => s.label).join('、')}
                                showIcon
                            />
                        )}
                    </Card>
                </Col>

                {/* 右：算法执行 */}
                <Col xs={24} xl={10}>
                    <Card title="执行当前数据文件算法"
                        extra={
                            !requiredOk
                                ? <Tooltip title="请先上传货物和路线数据"><Button type="primary" disabled icon={<PlayCircleOutlined/>}>执行算法</Button></Tooltip>
                                : <Button type="primary" danger icon={running ? <SyncOutlined spin/> : <PlayCircleOutlined/>}
                                    onClick={handleExecute} loading={running}>
                                    {running ? '运算中...' : '执行算法'}
                                </Button>
                        }
                    >
                        <Space direction="vertical" style={{width:'100%'}} size={12}>
                            <div style={{background:'#F8FAFC', borderRadius:8, padding:'10px 12px', fontSize:12}}>
                                <div style={{fontWeight:600, color:'#1E293B', marginBottom:3}}>稳定匹配算法</div>
                                <Paragraph style={{margin:0, fontSize:11, color:'#64748B'}}>
                                    提交后算法在后台运行，可关闭页面，完成后刷新「数据分析」页查看结果。循环次数可达百万级，服务器端可能需要较长时间。
                                </Paragraph>
                            </div>

                            {/* 就绪状态 */}
                            {FILE_SLOTS.map(slot => {
                                const ok = uploadedKeys.includes(slot.key);
                                return (
                                    <div key={slot.key} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:'1px solid #F1F5F9'}}>
                                        <Space size={6}>
                                            {ok ? <CheckCircleOutlined style={{color:'#10B981'}}/> : <ExclamationCircleOutlined style={{color: slot.required ? '#EF4444' : '#94A3B8'}}/>}
                                            <Text style={{fontSize:12}}>{slot.label}</Text>
                                            {slot.required && !ok && <Tag color="error" style={{fontSize:10}}>必须</Tag>}
                                        </Space>
                                        <Tag color={ok ? 'success' : 'default'} style={{fontSize:11}}>{ok ? '已就绪' : '未上传'}</Tag>
                                    </div>
                                );
                            })}

                            {running && (
                                <div style={{textAlign:'center', padding:'12px 0'}}>
                                    <div style={{fontSize:32, fontWeight:800, fontFamily:'var(--font-mono)', color:'#3B82F6'}}>{elapsed}s</div>
                                    <div style={{fontSize:12, color:'#94A3B8'}}>后台运行中，可关闭页面</div>
                                </div>
                            )}
                            {taskStatus === 'done' && taskResult && (
                                <>
                                    <Alert type="success" showIcon message="执行完成" style={{marginBottom:4}}/>
                                    <Descriptions column={2} size="small" bordered>
                                        <Descriptions.Item label="匹配成功"><Text strong style={{color:'#10B981'}}>{taskResult.matched_shipments ?? '—'}</Text></Descriptions.Item>
                                        <Descriptions.Item label="未匹配"><Text strong style={{color:'#EF4444'}}>{taskResult.unmatched_shipments ?? '—'}</Text></Descriptions.Item>
                                        <Descriptions.Item label="匹配率"><Text strong style={{color:'#3B82F6'}}>{taskResult.avg_matching_rate != null ? `${(taskResult.avg_matching_rate*100).toFixed(1)}%` : '—'}</Text></Descriptions.Item>
                                        <Descriptions.Item label="耗时"><Text strong style={{fontFamily:'var(--font-mono)'}}>{taskResult.avg_cpu_time ?? '—'}s</Text></Descriptions.Item>
                                    </Descriptions>
                                </>
                            )}
                            {taskStatus === 'failed' && (
                                <Alert type="error" showIcon message="执行失败" description={taskError}
                                    action={<Button size="small" icon={<ReloadOutlined/>} onClick={handleExecute}>重试</Button>}
                                />
                            )}
                        </Space>
                    </Card>
                </Col>

                {/* 场景管理表格 */}
                <Col xs={24}>
                    <Card
                        title={`场景管理（共 ${scenes.length} 个）`}
                        extra={
                            <Space>
                                <Button icon={<ReloadOutlined/>} onClick={loadScenes} loading={scenesLoading} size="small">刷新</Button>
                                <Tooltip title="所有场景加入串行队列，逐个执行，避免服务器过载">
                                    <Button type="primary" icon={<PlayCircleOutlined/>} onClick={handleRunAll} size="small">
                                        批量执行全部场景
                                    </Button>
                                </Tooltip>
                            </Space>
                        }
                    >
                        <Alert
                            type="info" showIcon style={{marginBottom:12}}
                            message="各场景算法相互独立，批量执行时并发运行，完成后在「对比分析」页横向比较结果"
                        />
                        <Table
                            columns={sceneColumns}
                            dataSource={scenes}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            loading={scenesLoading}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 算法参数配置弹窗 */}
            <Modal
                title={<Space><SettingOutlined/>算法参数配置</Space>}
                open={!!algoModal}
                onOk={handleAlgoOk}
                onCancel={() => setAlgoModal(null)}
                okText="确认执行"
                cancelText="取消"
                width={420}
            >
                <Alert
                    type="info" showIcon style={{marginBottom: 16}}
                    message="参数将覆盖算法默认值，留空则使用默认值。较大的参数值会增加运算时间但可能提升匹配质量。"
                />
                <Form form={algoForm} layout="vertical" size="small">
                    <Form.Item label="最大偏好列表长度 (MaxNum_preferList)" name="max_prefer_list"
                        tooltip="每条路线记录的最多候选匹配方案数，默认100万">
                        <InputNumber min={1000} max={10000000} step={100000} style={{width: '100%'}}
                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={v => v.replace(/,/g, '')}/>
                    </Form.Item>
                    <Form.Item label="最大迭代次数 (MaxNum_iter)" name="max_iter"
                        tooltip="算法最大迭代轮数，默认2000">
                        <InputNumber min={100} max={100000} step={100} style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item label="最大不完整稳定匹配次数 (MaxNum_incompleteStable)" name="max_incomplete"
                        tooltip="允许的最大不完整稳定匹配次数，默认200">
                        <InputNumber min={10} max={10000} step={50} style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item label="随机游走概率 (probability_randomWalk)" name="prob_random_walk"
                        tooltip="局部搜索中随机游走的概率，取值0~1，默认0.5">
                        <InputNumber min={0} max={1} step={0.05} precision={2} style={{width: '100%'}}/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default DataUploadPage;
