import React, {useCallback, useState} from 'react';
import {Button, Card, Col, message, Progress, Row, Space, Typography, Upload} from 'antd';
import {CheckCircleOutlined, InboxOutlined, PlayCircleOutlined} from '@ant-design/icons';
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
    const [executionProgress, setExecutionProgress] = useState(0);
    const [executionStatus, setExecutionStatus] = useState('');

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
    const handleFileUpload = useCallback(async () => {
        if (!routesFile && !shipmentsFile) {
            message.warning('请至少选择一个文件上传');
            return;
        }

        setUploading(true);
        setUploadProgress({routes: 0, shipments: 0});

        try {
            const formData = new FormData();
            if (routesFile) {
                formData.append('routes_file', routesFile);
            }
            if (shipmentsFile) {
                formData.append('shipments_file', shipmentsFile);
            }

            // 模拟上传进度
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => ({
                    routes: routesFile ? Math.min(prev.routes + 10, 100) : 0,
                    shipments: shipmentsFile ? Math.min(prev.shipments + 10, 100) : 0
                }));
            }, 200);

            const response = await uploadDataAPI.uploadFiles(formData);

            clearInterval(progressInterval);
            setUploadProgress({routes: 100, shipments: 100});

            message.success('文件上传成功！');

            // 清空已上传的文件
            setRoutesFile(null);
            setShipmentsFile(null);

        } catch (error) {
            message.error('文件上传失败：' + (error.message || '未知错误'));
        } finally {
            setUploading(false);
        }
    }, [routesFile, shipmentsFile]);

    // 执行算法
    const handleExecuteAlgorithm = useCallback(async () => {
        setExecuting(true);
        setExecutionProgress(0);
        setExecutionStatus('正在准备数据...');

        try {
            // 模拟算法执行进度
            const statusMessages = [
                '正在读取路线数据...',
                '正在读取货物数据...',
                '正在计算最优匹配...',
                '正在生成路线规划...',
                '正在保存匹配结果...'
            ];

            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 20;
                setExecutionProgress(progress);
                if (progress <= 100) {
                    setExecutionStatus(statusMessages[Math.floor(progress / 20) - 1] || '算法执行完成');
                }
            }, 1000);

            const response = await executeAlgorithmAPI.runMatching();

            clearInterval(progressInterval);
            setExecutionProgress(100);
            setExecutionStatus('算法执行完成');

            message.success('算法执行成功！匹配结果已生成');

        } catch (error) {
            message.error('算法执行失败：' + (error.message || '未知错误'));
        } finally {
            setExecuting(false);
        }
    }, []);

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
                        extra={
                            <Button
                                type="primary"
                                icon={<InboxOutlined/>}
                                onClick={handleFileUpload}
                                loading={uploading}
                                disabled={!routesFile && !shipmentsFile}
                            >
                                开始上传
                            </Button>
                        }
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <div className="upload-section">
                                    <Text strong>路线数据文件 (routes.csv)</Text>
                                    <Dragger
                                        {...uploadProps('routes', setRoutesFile, (progress) => setUploadProgress(prev => ({
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
                                            支持 CSV 格式，文件大小不超过1MB
                                        </p>
                                    </Dragger>
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
                                    <Text strong>货物数据文件 (shipments.csv)</Text>
                                    <Dragger
                                        {...uploadProps('shipments', setShipmentsFile, (progress) => setUploadProgress(prev => ({
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
                                            支持 CSV 格式，文件大小不超过10MB
                                        </p>
                                    </Dragger>
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
                                执行算法
                            </Button>
                        }
                    >
                        <div className="execution-content">
                            <Space direction="vertical" size="large" style={{width: '100%'}}>
                                <div className="execution-info">
                                    <Text strong>路线-货物匹配算法</Text>
                                    <Paragraph type="secondary" style={{marginTop: 8}}>
                                        基于遗传算法和启发式搜索的最优路线规划算法
                                    </Paragraph>
                                </div>

                                {executing && (
                                    <div className="execution-progress">
                                        <Text type="secondary">{executionStatus}</Text>
                                        <Progress
                                            percent={executionProgress}
                                            status="active"
                                            strokeColor={{
                                                '0%': '#108ee9',
                                                '100%': '#87d068',
                                            }}
                                        />
                                    </div>
                                )}

                                <div className="execution-steps">
                                    <Title level={5} style={{marginBottom: 16}}>算法步骤：</Title>
                                    <Space direction="vertical" size="small">
                                        <Text>1. 数据预处理与验证</Text>
                                        <Text>2. 路线可行性分析</Text>
                                        <Text>3. 货物聚类与分组</Text>
                                        <Text>4. 最优匹配计算</Text>
                                        <Text>5. 结果验证与输出</Text>
                                    </Space>
                                </div>
                            </Space>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 数据预览区域 */}
            <Row gutter={[24, 24]} style={{marginTop: 24}}>
                <Col span={12}>
                    <Card title="路线数据预览" size="small">
                        <div className="data-preview">
                            <Text type="secondary">上传文件后显示数据预览</Text>
                        </div>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="货物数据预览" size="small">
                        <div className="data-preview">
                            <Text type="secondary">上传文件后显示数据预览</Text>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DataUploadPage;