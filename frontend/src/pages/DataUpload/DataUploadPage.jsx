import React, {useCallback, useEffect, useState} from 'react';
import {Button, Card, Col, List, message, Popconfirm, Progress, Row, Space, Spin, Tag, Typography, Upload} from 'antd';
import {CheckCircleOutlined, DeleteOutlined, EyeOutlined, InboxOutlined, LoadingOutlined, PlayCircleOutlined} from '@ant-design/icons';
import {executeAlgorithmAPI, uploadDataAPI} from '../../services/api';
import './DataUploadPage.css';

const {Dragger} = Upload;
const {Title, Text, Paragraph} = Typography;

const DataUploadPage = () => {
    const [routesFile, setRoutesFile] = useState(null);
    const [shipmentsFile, setShipmentsFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({routes: 0, shipments: 0});
    const [executionResult, setExecutionResult] = useState(null); // 真实执行结果
    const [uploadHistory, setUploadHistory] = useState([]);
    const [filePreviews, setFilePreviews] = useState({});

    // 加载上传历史
    const loadUploadHistory = useCallback(async () => {
        try {
            const response = await uploadDataAPI.getUploadHistory();
            if (response.status === 'success') {
                setUploadHistory(response.data.files);
            }
        } catch (error) {
            console.error('加载上传历史失败:', error);
        }
    }, []);

    // 组件加载时获取上传历史
    useEffect(() => {
        loadUploadHistory();
    }, [loadUploadHistory]);

    // 文件上传配置
    const uploadProps = (fileType, setFile, setProgress) => ({
        name: 'file',
        multiple: false,
        accept: '.csv',
        beforeUpload: (file) => {
            const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
            if (!isCSV) {
                message.error('只能上传CSV文件!');
                return false;
            }
            const isLt10M = file.size / 1024 / 1024 < 10;
            if (!isLt10M) {
                message.error('文件大小不能超过10MB!');
                return false;
            }

            // 文件名校验：路线文件必须包含"route"，货物文件必须包含"shipment"
            const fileName = file.name.toLowerCase();
            if (fileType === 'route' && !fileName.includes('route')) {
                message.error('路线数据文件名必须包含"route"字样!');
                return false;
            }
            if (fileType === 'shipment' && !fileName.includes('shipment')) {
                message.error('货物数据文件名必须包含"shipment"字样!');
                return false;
            }

            setFile(file);
            return false; // 阻止自动上传
        },
        onRemove: () => {
            setFile(null);
            setProgress(0);
        },
        fileList: [],
        showUploadList: false
    });

    // 处理文件上传
    const handleFileUpload = useCallback(async (fileType) => {
        const file = fileType === 'route' ? routesFile : shipmentsFile;
        if (!file) {
            message.warning(`请先选择${fileType === 'route' ? '路线' : '货物'}文件`);
            return;
        }

        setUploading(true);
        const progressKey = fileType === 'route' ? 'route' : 'shipment';
        setUploadProgress(prev => ({...prev, [progressKey]: 0}));

        // 模拟上传进度
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => ({
                ...prev,
                [progressKey]: Math.min(prev[progressKey] + 10, 90)
            }));
        }, 200);

        try {
            // eslint-disable-next-line no-unused-vars
            const response = await uploadDataAPI.uploadFile(file, fileType, `${fileType}数据文件上传`);

            clearInterval(progressInterval);
            setUploadProgress(prev => ({...prev, [progressKey]: 100}));

            message.success(`${fileType === 'route' ? '路线' : '货物'}文件上传成功！`);

            // 清空已上传的文件
            if (fileType === 'route') {
                setRoutesFile(null);
            } else {
                setShipmentsFile(null);
            }

            // 重新加载上传历史
            setTimeout(() => {
                loadUploadHistory();
            }, 1000);

        } catch (error) {
            clearInterval(progressInterval);
            message.error(`文件上传失败：${error.message || '未知错误'}`);
        } finally {
            setUploading(false);
            setTimeout(() => {
                setUploadProgress(prev => ({...prev, [progressKey]: 0}));
            }, 2000);
        }
    }, [routesFile, shipmentsFile, loadUploadHistory]);

    // 预览文件
    const handlePreviewFile = useCallback(async (filename) => {
        try {
            // eslint-disable-next-line no-unused-vars
            const response = await uploadDataAPI.previewFile(filename);
            if (response.status === 'success') {
                setFilePreviews(prev => ({
                    ...prev,
                    [filename]: response.data
                }));
            }
        } catch (error) {
            message.error(`预览文件失败：${error.message}`);
        }
    }, []);

    // 删除文件
    const handleDeleteFile = useCallback(async (filename) => {
        try {
            // eslint-disable-next-line no-unused-vars
            const response = await uploadDataAPI.deleteFile(filename);
            if (response.status === 'success') {
                message.success(response.message);
                loadUploadHistory();
                // 清除预览缓存
                setFilePreviews(prev => {
                    const newPreviews = {...prev};
                    delete newPreviews[filename];
                    return newPreviews;
                });
            }
        } catch (error) {
            message.error(`删除文件失败：${error.message}`);
        }
    }, [loadUploadHistory]);

    // 执行算法
    const handleExecuteAlgorithm = useCallback(async () => {
        setExecuting(true);
        setExecutionResult(null);

        try {
            const response = await executeAlgorithmAPI.runMatching();
            // 拦截器返回完整body，result在 response.result.summary
            const summary = response?.result?.summary || response?.summary || null;
            setExecutionResult(summary);
            message.success('算法执行成功！匹配结果已生成');
        } catch (error) {
            message.error('算法执行失败：' + (error.message || '未知错误'));
        } finally {
            setExecuting(false);
        }
    }, []);

    // 获取文件类型标签颜色
    const getFileTypeColor = (fileType) => {
        switch (fileType) {
            case 'route':
                return 'blue';
            case 'shipment':
                return 'green';
            default:
                return 'default';
        }
    };

    return (
        <div className="data-upload-page">
            <div className="page-header">
                <Title level={2}>数据上传与算法执行</Title>
                <Paragraph type="secondary">
                    上传路线和货物数据文件，执行匹配算法生成最优路线规划
                </Paragraph>
            </div>

            <Row gutter={[24, 24]}>
                {/* 文件上传区域 */}
                <Col span={16}>
                    <Card
                        title="数据文件上传"
                        className="upload-card"
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <div className="upload-section">
                                    <Text strong>路线数据文件 (route.csv)</Text>
                                    <Dragger
                                        {...uploadProps('route', setRoutesFile, (progress) => setUploadProgress(prev => ({
                                            ...prev,
                                            routes: progress
                                        })))}
                                        className="file-dragger"
                                    >
                                        <p className="ant-upload-drag-icon">
                                            {routesFile ? <CheckCircleOutlined style={{color: '#52c41a'}}/> :
                                                <InboxOutlined/>}
                                        </p>
                                        <p className="ant-upload-text">
                                            {routesFile ? routesFile.name : '点击或拖拽上传路线数据文件'}
                                        </p>
                                        <p className="ant-upload-hint">
                                            支持 CSV 格式，文件大小不超过10MB<br/>
                                            文件名必须包含"route"字样
                                        </p>
                                    </Dragger>
                                    {routesFile && (
                                        <Button
                                            type="primary"
                                            size="small"
                                            style={{marginTop: 8}}
                                            onClick={() => handleFileUpload('route')}
                                            loading={uploading}
                                        >
                                            上传路线文件
                                        </Button>
                                    )}
                                    {uploadProgress.routes > 0 && uploading && (
                                        <Progress
                                            percent={uploadProgress.routes}
                                            size="small"
                                            status={uploadProgress.routes === 100 ? "success" : "active"}
                                        />
                                    )}
                                </div>
                            </Col>
                            <Col span={12}>
                                <div className="upload-section">
                                    <Text strong>货物数据文件 (shipment.csv)</Text>
                                    <Dragger
                                        {...uploadProps('shipment', setShipmentsFile, (progress) => setUploadProgress(prev => ({
                                            ...prev,
                                            shipments: progress
                                        })))}
                                        className="file-dragger"
                                    >
                                        <p className="ant-upload-drag-icon">
                                            {shipmentsFile ? <CheckCircleOutlined style={{color: '#52c41a'}}/> :
                                                <InboxOutlined/>}
                                        </p>
                                        <p className="ant-upload-text">
                                            {shipmentsFile ? shipmentsFile.name : '点击或拖拽上传货物数据文件'}
                                        </p>
                                        <p className="ant-upload-hint">
                                            支持 CSV 格式，文件大小不超过10MB<br/>
                                            文件名必须包含"shipment"字样
                                        </p>
                                    </Dragger>
                                    {shipmentsFile && (
                                        <Button
                                            type="primary"
                                            size="small"
                                            style={{marginTop: 8}}
                                            onClick={() => handleFileUpload('shipment')}
                                            loading={uploading}
                                        >
                                            上传货物文件
                                        </Button>
                                    )}
                                    {uploadProgress.shipments > 0 && uploading && (
                                        <Progress
                                            percent={uploadProgress.shipments}
                                            size="small"
                                            status={uploadProgress.shipments === 100 ? "success" : "active"}
                                        />
                                    )}
                                </div>
                            </Col>
                        </Row>
                    </Card>

                    {/* 上传历史 */}
                    <Card
                        title="上传历史"
                        style={{marginTop: 24}}
                        className="upload-history-card"
                    >
                        {uploadHistory.length === 0 ? (
                            <Text type="secondary">暂无上传历史</Text>
                        ) : (
                            <List
                                dataSource={uploadHistory}
                                renderItem={item => (
                                    <List.Item
                                        actions={[
                                            <Button
                                                size="small"
                                                icon={<EyeOutlined/>}
                                                onClick={() => handlePreviewFile(item.filename)}
                                            >
                                                预览
                                            </Button>,
                                            <Popconfirm
                                                title="确定要删除这个文件吗？"
                                                onConfirm={() => handleDeleteFile(item.filename)}
                                                okText="确定"
                                                cancelText="取消"
                                            >
                                                <Button
                                                    size="small"
                                                    danger
                                                    icon={<DeleteOutlined/>}
                                                >
                                                    删除
                                                </Button>
                                            </Popconfirm>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={item.filename}
                                            description={
                                                <Space>
                                                    <Tag color={getFileTypeColor(item.file_type)}>
                                                        {item.file_type === 'route' ? '路线' : '货物'}
                                                    </Tag>
                                                    <Text type="secondary">
                                                        大小: {(item.file_size / 1024).toFixed(2)} KB
                                                    </Text>
                                                    <Text type="secondary">
                                                        上传时间: {new Date(item.upload_time).toLocaleString()}
                                                    </Text>
                                                </Space>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>

                {/* 算法执行区域 */}
                <Col span={8}>
                    <Card
                        title="算法执行"
                        className="execution-card"
                        extra={
                            <Button
                                type="primary"
                                danger
                                icon={<PlayCircleOutlined/>}
                                onClick={handleExecuteAlgorithm}
                                loading={executing}
                                disabled={uploading}
                            >
                                {executing ? '运行中...' : '执行算法'}
                            </Button>
                        }
                    >
                        <Space direction="vertical" size="large" style={{width: '100%'}}>
                            <div>
                                <Text strong>稳定匹配算法</Text>
                                <Paragraph type="secondary" style={{marginTop: 8, marginBottom: 0}}>
                                    基于稳定匹配理论，为货物分配最优运输路线。算法通常在10~30秒内完成。
                                </Paragraph>
                            </div>

                            {/* 执行中状态 */}
                            {executing && (
                                <div style={{textAlign: 'center', padding: '24px 0'}}>
                                    <Spin indicator={<LoadingOutlined style={{fontSize: 48}} spin/>}/>
                                    <div style={{marginTop: 16, color: '#1890ff'}}>算法执行中，请稍候...</div>
                                    <div style={{marginTop: 4, color: '#888', fontSize: 12}}>通常需要10~30秒</div>
                                </div>
                            )}

                            {/* 执行完成结果 */}
                            {!executing && executionResult && (
                                <div>
                                    <div style={{
                                        background: '#f6ffed',
                                        border: '1px solid #b7eb8f',
                                        borderRadius: 6,
                                        padding: '12px 16px',
                                        marginBottom: 12
                                    }}>
                                        <CheckCircleOutlined style={{color: '#52c41a', marginRight: 8}}/>
                                        <Text strong style={{color: '#52c41a'}}>执行成功</Text>
                                    </div>
                                    <Row gutter={[8, 8]}>
                                        <Col span={12}>
                                            <div style={{textAlign: 'center', padding: 8, background: '#fafafa', borderRadius: 4}}>
                                                <div style={{fontSize: 22, fontWeight: 'bold', color: '#1890ff'}}>
                                                    {executionResult.matched_shipments ?? 0}
                                                </div>
                                                <div style={{fontSize: 12, color: '#888'}}>匹配成功</div>
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div style={{textAlign: 'center', padding: 8, background: '#fafafa', borderRadius: 4}}>
                                                <div style={{fontSize: 22, fontWeight: 'bold', color: '#ff4d4f'}}>
                                                    {executionResult.unmatched_shipments ?? 0}
                                                </div>
                                                <div style={{fontSize: 12, color: '#888'}}>未匹配</div>
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div style={{textAlign: 'center', padding: 8, background: '#fafafa', borderRadius: 4}}>
                                                <div style={{fontSize: 22, fontWeight: 'bold', color: '#52c41a'}}>
                                                    {executionResult.avg_matching_rate
                                                        ? `${(executionResult.avg_matching_rate * 100).toFixed(1)}%`
                                                        : '0%'}
                                                </div>
                                                <div style={{fontSize: 12, color: '#888'}}>匹配率</div>
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div style={{textAlign: 'center', padding: 8, background: '#fafafa', borderRadius: 4}}>
                                                <div style={{fontSize: 22, fontWeight: 'bold', color: '#722ed1'}}>
                                                    {executionResult.avg_cpu_time ?? 0}s
                                                </div>
                                                <div style={{fontSize: 12, color: '#888'}}>耗时</div>
                                            </div>
                                        </Col>
                                    </Row>
                                    <div style={{marginTop: 8, fontSize: 12, color: '#888', textAlign: 'center'}}>
                                        结果稳定：{executionResult.avg_matching_rate ? '是' : '—'}
                                        &nbsp;·&nbsp;
                                        前往「匹配结果」页面查看详情
                                    </div>
                                </div>
                            )}

                            {/* 未执行时的提示 */}
                            {!executing && !executionResult && (
                                <div style={{color: '#888', fontSize: 13}}>
                                    <div>执行前请确保已上传或使用默认的 route.csv 和 shipment.csv。</div>
                                </div>
                            )}
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* 文件预览模态框 */}
            {Object.keys(filePreviews).length > 0 && (
                <Row gutter={[24, 24]} style={{marginTop: 24}}>
                    {Object.entries(filePreviews).map(([filename, preview]) => (
                        <Col span={preview.file_type === 'route' ? 12 : 12} key={filename}>
                            <Card
                                title={`${preview.file_type === 'route' ? '路线' : '货物'}数据预览 - ${filename}`}
                                size="small"
                                extra={
                                    <Button
                                        size="small"
                                        onClick={() => setFilePreviews(prev => {
                                            const newPreviews = {...prev};
                                            delete newPreviews[filename];
                                            return newPreviews;
                                        })}
                                    >
                                        关闭
                                    </Button>
                                }
                            >
                                <div className="data-preview">
                                    {preview.preview_lines && preview.preview_lines.length > 0 ? (
                                        <div style={{maxHeight: 300, overflow: 'auto'}}>
                                            <pre style={{fontSize: 12, margin: 0}}>
                                                {preview.preview_lines.join('\n')}
                                            </pre>
                                        </div>
                                    ) : (
                                        <Text type="secondary">暂无数据</Text>
                                    )}
                                    <Text type="secondary" style={{display: 'block', marginTop: 8}}>
                                        支持预览前10行
                                    </Text>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
};

export default DataUploadPage;