import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    Alert, Badge, Button, Card, Col, Descriptions,
    message, Popconfirm, Progress, Row, Space, Spin,
    Steps, Tag, Tooltip, Typography, Upload,
} from 'antd';
import {
    CheckCircleOutlined, ClockCircleOutlined,
    CloudUploadOutlined, DeleteOutlined,
    ExclamationCircleOutlined, EyeOutlined,
    FileTextOutlined, PlayCircleOutlined,
    ReloadOutlined, SyncOutlined,
} from '@ant-design/icons';
import {analyticsAPI, executeAlgorithmAPI, uploadDataAPI} from '../../services/api';
import api from '../../services/api';

const {Dragger} = Upload;
const {Text, Paragraph} = Typography;

// ── 4个文件槽配置 ──────────────────────────────────────────────
const FILE_SLOTS = [
    {
        key: 'shipment',
        label: '货物数据',
        filename: 'shipment.csv',
        color: '#3B82F6',
        desc: '包含货物ID、起终点、需求量、时间价值等字段',
        required: true,
    },
    {
        key: 'route',
        label: '路线数据',
        filename: 'route.csv',
        color: '#10B981',
        desc: '包含路线节点、运费、运时、容量等字段',
        required: true,
    },
    {
        key: 'network',
        label: '网络节点',
        filename: 'network.csv',
        color: '#8B5CF6',
        desc: '包含节点数量和节点索引',
        required: false,
    },
    {
        key: 'cooperation_parameter',
        label: '合作参数',
        filename: 'cooperation_parameter.csv',
        color: '#F59E0B',
        desc: '货物与路线合作意愿矩阵（默认全1）',
        required: false,
    },
];

const TYPE_LABEL = {
    shipment: '货物数据',
    route: '路线数据',
    network: '网络节点',
    cooperation_parameter: '合作参数',
};

// ── 辅助：格式化文件大小 ───────────────────────────────────────
const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

// ── 辅助：轮询 ────────────────────────────────────────────────
const usePolling = (fn, interval, active) => {
    const timerRef = useRef(null);
    useEffect(() => {
        if (!active) { clearInterval(timerRef.current); return; }
        timerRef.current = setInterval(fn, interval);
        return () => clearInterval(timerRef.current);
    }, [fn, interval, active]);
};

const DataUploadPage = () => {
    // 每个 slot 选中的本地文件
    const [selected, setSelected]     = useState({});   // key -> File
    // 上传成功后服务器上的文件列表
    const [uploaded, setUploaded]     = useState([]);
    // 整体上传进度
    const [uploading, setUploading]   = useState(false);
    const [uploadPct, setUploadPct]   = useState(0);
    // 算法执行
    const [taskId, setTaskId]         = useState(null);
    const [taskStatus, setTaskStatus] = useState('idle'); // idle|running|done|failed
    const [taskResult, setTaskResult] = useState(null);
    const [taskError, setTaskError]   = useState(null);
    const [startedAt, setStartedAt]   = useState(null);
    const [elapsed, setElapsed]       = useState(0);
    // 预览
    const [preview, setPreview]       = useState(null);

    // ── 加载服务器已有文件 ──────────────────────────────────────
    const loadUploaded = useCallback(async () => {
        try {
            const res = await uploadDataAPI.getUploadHistory();
            setUploaded(res?.data?.files || []);
        } catch (_) {}
    }, []);

    useEffect(() => { loadUploaded(); }, [loadUploaded]);

    // ── 轮询算法任务状态 ───────────────────────────────────────
    const pollStatus = useCallback(async () => {
        try {
            const res = await api.get('/matching/status', {params: taskId ? {task_id: taskId} : {}});
            const s = res?.status || 'idle';
            setTaskStatus(s);
            if (s === 'done') {
                setTaskResult(res.result?.summary || res.result || null);
            } else if (s === 'failed') {
                setTaskError(res.error || '算法执行失败');
            }
        } catch (_) {}
    }, [taskId]);

    usePolling(pollStatus, 2000, taskStatus === 'running');

    // 计时器
    useEffect(() => {
        if (taskStatus !== 'running') { setElapsed(0); return; }
        const t = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => clearInterval(t);
    }, [taskStatus]);

    // ── 选文件 ────────────────────────────────────────────────
    const makeUploadProps = (slotKey) => ({
        accept: '.csv',
        multiple: false,
        showUploadList: false,
        beforeUpload: (file) => {
            setSelected(prev => ({...prev, [slotKey]: file}));
            return false;
        },
    });

    // ── 一键上传全部已选文件 ───────────────────────────────────
    const handleBatchUpload = useCallback(async () => {
        const toUpload = Object.entries(selected).filter(([, f]) => f);
        if (!toUpload.length) { message.warning('请先选择至少一个文件'); return; }

        setUploading(true);
        setUploadPct(0);

        try {
            const formData = new FormData();
            toUpload.forEach(([key, file]) => formData.append(key, file));

            // 模拟进度条推进
            let pct = 0;
            const timer = setInterval(() => {
                pct = Math.min(pct + 8, 88);
                setUploadPct(pct);
            }, 150);

            const res = await api.post('/upload/batch', formData, {
                headers: {'Content-Type': 'multipart/form-data'},
            });

            clearInterval(timer);
            setUploadPct(100);

            if (res.status === 'success' || res.status === 'partial') {
                const n = res.saved?.length || 0;
                message.success(`成功上传 ${n} 个文件`);
                if (res.errors?.length) {
                    res.errors.forEach(e => message.warning(`${e.file_type}: ${e.error}`));
                }
                setSelected({});
                setTimeout(() => { setUploadPct(0); loadUploaded(); }, 800);
            }
        } catch (e) {
            message.error('上传失败：' + (e.message || '未知错误'));
            setUploadPct(0);
        } finally {
            setUploading(false);
        }
    }, [selected, loadUploaded]);

    // ── 执行算法 ──────────────────────────────────────────────
    const handleExecute = useCallback(async () => {
        setTaskStatus('running');
        setTaskResult(null);
        setTaskError(null);
        setStartedAt(new Date());
        setElapsed(0);
        try {
            const res = await executeAlgorithmAPI.runMatching();
            const tid = res?.task_id || null;
            setTaskId(tid);
            // 立即查一次
            if (tid) {
                const s = await api.get('/matching/status', {params: {task_id: tid}});
                if (s?.status === 'done') {
                    setTaskStatus('done');
                    setTaskResult(s.result?.summary || null);
                }
            }
        } catch (e) {
            setTaskStatus('failed');
            setTaskError(e.message || '提交失败');
        }
    }, []);

    // ── 预览 ──────────────────────────────────────────────────
    const handlePreview = useCallback(async (filename) => {
        try {
            const res = await uploadDataAPI.previewFile(filename);
            setPreview(res?.data || null);
        } catch (e) {
            message.error('预览失败：' + e.message);
        }
    }, []);

    // ── 删除 ──────────────────────────────────────────────────
    const handleDelete = useCallback(async (filename) => {
        try {
            await uploadDataAPI.deleteFile(filename);
            message.success('删除成功');
            loadUploaded();
            if (preview?.filename === filename) setPreview(null);
        } catch (e) {
            message.error('删除失败：' + e.message);
        }
    }, [loadUploaded, preview]);

    // ── 计算当前步骤 ──────────────────────────────────────────
    const requiredKeys = FILE_SLOTS.filter(s => s.required).map(s => s.key);
    const uploadedKeys = uploaded.map(u => u.file_type);
    const allRequiredUploaded = requiredKeys.every(k => uploadedKeys.includes(k));
    const currentStep = !allRequiredUploaded ? 1 : taskStatus === 'idle' ? 2 : taskStatus === 'running' ? 2 : 3;

    const selectedCount = Object.values(selected).filter(Boolean).length;
    const anyRunning = taskStatus === 'running';

    return (
        <div>
            {/* 步骤条 */}
            <Card style={{marginBottom: 20}}>
                <Steps
                    current={currentStep - 1}
                    size="small"
                    items={[
                        {title: '选择文件', description: '拖拽或点击选文件'},
                        {title: '上传数据', description: '验证并保存到服务器'},
                        {title: '执行算法', description: '稳定匹配运算'},
                        {title: '查看结果', description: '分析页面可视化'},
                    ]}
                />
            </Card>

            <Row gutter={[16, 16]}>
                {/* 左：文件选择区 */}
                <Col xs={24} xl={14}>
                    <Card
                        title="数据文件"
                        extra={
                            <Space>
                                <Text style={{fontSize: 12, color: '#94A3B8'}}>
                                    {selectedCount > 0 ? `已选择 ${selectedCount} 个文件` : '支持同时上传4个文件'}
                                </Text>
                                <Button
                                    type="primary"
                                    icon={<CloudUploadOutlined/>}
                                    onClick={handleBatchUpload}
                                    loading={uploading}
                                    disabled={selectedCount === 0}
                                >
                                    一键上传
                                </Button>
                            </Space>
                        }
                    >
                        {/* 进度条 */}
                        {(uploading || uploadPct > 0) && (
                            <Progress
                                percent={uploadPct}
                                status={uploadPct === 100 ? 'success' : 'active'}
                                style={{marginBottom: 16}}
                            />
                        )}

                        <Row gutter={[12, 12]}>
                            {FILE_SLOTS.map(slot => {
                                const file = selected[slot.key];
                                const serverFile = uploaded.find(u => u.file_type === slot.key);
                                return (
                                    <Col xs={24} sm={12} key={slot.key}>
                                        <div style={{
                                            border: `1.5px dashed ${file ? slot.color : '#E2E8F0'}`,
                                            borderRadius: 10,
                                            padding: 0,
                                            background: file ? `${slot.color}08` : '#FAFAFA',
                                            transition: 'all .2s',
                                        }}>
                                            <Dragger
                                                {...makeUploadProps(slot.key)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    padding: '8px 12px',
                                                }}
                                            >
                                                <div style={{padding: '10px 0 6px'}}>
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: 8,
                                                        background: `${slot.color}15`,
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', margin: '0 auto 8px',
                                                    }}>
                                                        {file
                                                            ? <CheckCircleOutlined style={{color: slot.color, fontSize: 18}}/>
                                                            : <FileTextOutlined style={{color: slot.color, fontSize: 18}}/>
                                                        }
                                                    </div>
                                                    <div style={{fontWeight: 600, fontSize: 13, color: '#1E293B'}}>
                                                        {slot.label}
                                                        {slot.required && <span style={{color: '#EF4444', marginLeft: 2}}>*</span>}
                                                    </div>
                                                    <div style={{fontSize: 11, color: '#94A3B8', marginTop: 2}}>
                                                        {file ? file.name : slot.filename}
                                                    </div>
                                                    {file && (
                                                        <Tag color="blue" style={{marginTop: 4, fontSize: 11}}>
                                                            {fmtSize(file.size)}
                                                        </Tag>
                                                    )}
                                                </div>
                                            </Dragger>

                                            {/* 服务器已有文件提示 */}
                                            {serverFile && !file && (
                                                <div style={{
                                                    padding: '6px 12px 8px',
                                                    borderTop: `1px solid ${slot.color}20`,
                                                    display: 'flex', alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                }}>
                                                    <Space size={4}>
                                                        <Badge status="success"/>
                                                        <Text style={{fontSize: 11, color: '#64748B'}}>
                                                            已上传 · {fmtSize(serverFile.file_size)}
                                                        </Text>
                                                    </Space>
                                                    <Space size={4}>
                                                        <Tooltip title="预览">
                                                            <Button
                                                                size="small" type="text"
                                                                icon={<EyeOutlined style={{fontSize: 12}}/>}
                                                                onClick={() => handlePreview(serverFile.filename)}
                                                            />
                                                        </Tooltip>
                                                        <Popconfirm
                                                            title="确定删除？"
                                                            onConfirm={() => handleDelete(serverFile.filename)}
                                                            okText="删除" cancelText="取消"
                                                        >
                                                            <Tooltip title="删除">
                                                                <Button
                                                                    size="small" type="text" danger
                                                                    icon={<DeleteOutlined style={{fontSize: 12}}/>}
                                                                />
                                                            </Tooltip>
                                                        </Popconfirm>
                                                    </Space>
                                                </div>
                                            )}
                                        </div>
                                    </Col>
                                );
                            })}
                        </Row>

                        <div style={{marginTop: 12, fontSize: 11, color: '#94A3B8'}}>
                            * 为必填项 · 拖拽文件到对应卡片，或点击选择 · 仅支持 CSV 格式
                        </div>
                    </Card>

                    {/* 预览区 */}
                    {preview && (
                        <Card
                            size="small"
                            style={{marginTop: 12}}
                            title={
                                <Space>
                                    <FileTextOutlined/>
                                    {`预览 · ${preview.filename}`}
                                </Space>
                            }
                            extra={
                                <Button size="small" onClick={() => setPreview(null)}>关闭</Button>
                            }
                        >
                            <pre style={{
                                fontSize: 11, margin: 0, maxHeight: 200,
                                overflow: 'auto', background: '#F8FAFC',
                                padding: '8px 12px', borderRadius: 6,
                                fontFamily: 'var(--font-mono)',
                            }}>
                                {preview.preview_lines?.join('\n')}
                            </pre>
                            <Text style={{fontSize: 11, color: '#94A3B8'}}>仅显示前10行</Text>
                        </Card>
                    )}
                </Col>

                {/* 右：算法执行 */}
                <Col xs={24} xl={10}>
                    <Card
                        title="算法执行"
                        style={{height: '100%'}}
                        extra={
                            !allRequiredUploaded ? (
                                <Tooltip title="请先上传货物数据和路线数据">
                                    <Button type="primary" disabled icon={<PlayCircleOutlined/>}>
                                        执行算法
                                    </Button>
                                </Tooltip>
                            ) : (
                                <Button
                                    type="primary"
                                    icon={anyRunning ? <SyncOutlined spin/> : <PlayCircleOutlined/>}
                                    onClick={handleExecute}
                                    loading={anyRunning}
                                    danger={!anyRunning}
                                >
                                    {anyRunning ? '运算中...' : '执行算法'}
                                </Button>
                            )
                        }
                    >
                        <Space direction="vertical" style={{width: '100%'}} size={16}>
                            {/* 说明 */}
                            <div style={{
                                background: '#F8FAFC', borderRadius: 8,
                                padding: '12px 14px', fontSize: 13,
                            }}>
                                <div style={{fontWeight: 600, color: '#1E293B', marginBottom: 4}}>
                                    稳定匹配算法
                                </div>
                                <Paragraph style={{margin: 0, fontSize: 12, color: '#64748B'}}>
                                    基于稳定匹配理论，将货物与运输路线进行最优分配。
                                    算法循环次数可达百万级，服务器端可能需要较长时间，
                                    <strong>提交后可关闭页面，算法在后台继续运行</strong>，
                                    完成后刷新分析页即可查看结果。
                                </Paragraph>
                            </div>

                            {/* 数据就绪状态 */}
                            <div>
                                <div style={{fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6}}>
                                    数据就绪状态
                                </div>
                                {FILE_SLOTS.map(slot => {
                                    const ok = uploadedKeys.includes(slot.key);
                                    return (
                                        <div key={slot.key} style={{
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '5px 0',
                                            borderBottom: '1px solid #F1F5F9',
                                        }}>
                                            <Space size={6}>
                                                {ok
                                                    ? <CheckCircleOutlined style={{color: '#10B981'}}/>
                                                    : <ExclamationCircleOutlined style={{color: slot.required ? '#EF4444' : '#94A3B8'}}/>
                                                }
                                                <Text style={{fontSize: 12}}>{slot.label}</Text>
                                                {slot.required && !ok && (
                                                    <Tag color="error" style={{fontSize: 10}}>必须</Tag>
                                                )}
                                            </Space>
                                            <Tag color={ok ? 'success' : 'default'} style={{fontSize: 11}}>
                                                {ok ? '已就绪' : '未上传'}
                                            </Tag>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 运行中 */}
                            {anyRunning && (
                                <div style={{textAlign: 'center', padding: '16px 0'}}>
                                    <Spin size="large"/>
                                    <div style={{marginTop: 12, color: '#3B82F6', fontWeight: 600}}>
                                        算法运行中
                                    </div>
                                    <div style={{
                                        fontSize: 28, fontWeight: 800,
                                        fontFamily: 'var(--font-mono)',
                                        color: '#1E293B', marginTop: 4,
                                    }}>
                                        {elapsed}s
                                    </div>
                                    <div style={{fontSize: 12, color: '#94A3B8', marginTop: 2}}>
                                        提交后可关闭页面，算法在后台持续运行
                                    </div>
                                </div>
                            )}

                            {/* 完成结果 */}
                            {taskStatus === 'done' && taskResult && (
                                <div>
                                    <Alert
                                        type="success"
                                        showIcon
                                        message="算法执行完成"
                                        style={{marginBottom: 12}}
                                    />
                                    <Descriptions column={2} size="small" bordered>
                                        <Descriptions.Item label="匹配成功">
                                            <Text strong style={{color: '#10B981'}}>
                                                {taskResult.matched_shipments ?? '—'}
                                            </Text>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="未匹配">
                                            <Text strong style={{color: '#EF4444'}}>
                                                {taskResult.unmatched_shipments ?? '—'}
                                            </Text>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="匹配率">
                                            <Text strong style={{color: '#3B82F6'}}>
                                                {taskResult.avg_matching_rate != null
                                                    ? `${(taskResult.avg_matching_rate * 100).toFixed(1)}%`
                                                    : '—'}
                                            </Text>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="CPU耗时">
                                            <Text strong style={{color: '#8B5CF6', fontFamily: 'var(--font-mono)'}}>
                                                {taskResult.avg_cpu_time ?? '—'}s
                                            </Text>
                                        </Descriptions.Item>
                                    </Descriptions>
                                    <div style={{marginTop: 10, fontSize: 12, color: '#94A3B8'}}>
                                        <ClockCircleOutlined style={{marginRight: 4}}/>
                                        前往「数据分析」页查看完整图表
                                    </div>
                                </div>
                            )}

                            {/* 失败 */}
                            {taskStatus === 'failed' && (
                                <Alert
                                    type="error"
                                    showIcon
                                    message="算法执行失败"
                                    description={taskError}
                                    action={
                                        <Button size="small" icon={<ReloadOutlined/>} onClick={handleExecute}>
                                            重试
                                        </Button>
                                    }
                                />
                            )}
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DataUploadPage;
