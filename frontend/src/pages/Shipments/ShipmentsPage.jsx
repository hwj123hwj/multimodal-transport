import React, {useEffect, useState} from 'react';
import {Button, Card, Col, Input, message, Row, Space, Statistic, Table, Tag} from 'antd';
import {ExportOutlined, ReloadOutlined, SearchOutlined} from '@ant-design/icons';
import {shipmentsAPI} from '../../services/api';
import './ShipmentsPage.css';

const {Search} = Input;

const ShipmentsPage = () => {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        inTransit: 0,
        delivered: 0
    });

    // 获取货物数据
    const fetchShipments = async () => {
        setLoading(true);
        try {
            const response = await shipmentsAPI.getAll();
            let data = response.data;

            // 确保data是数组
            if (!Array.isArray(data)) {
                data = data?.shipments || data?.data || [];
            }

            // 搜索过滤
            if (searchTerm) {
                data = data.filter(shipment =>
                    shipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    shipment.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    shipment.destination.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            setShipments(data);

            // 计算统计数据
            const stats = {
                total: data.length,
                pending: data.filter(s => s.status === 'pending').length,
                inTransit: data.filter(s => s.status === 'in-transit').length,
                delivered: data.filter(s => s.status === 'delivered').length
            };
            setStats(stats);
        } catch (error) {
            message.error('获取货物数据失败');
            console.error('获取货物数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 搜索处理
    const handleSearch = (value) => {
        setSearchTerm(value);
    };


    // 导出数据
    const handleExport = () => {
        try {
            const csvContent = [
                ['货物ID', '类型', '重量(kg)', '体积(m³)', '状态', '起点', '终点', '时间价值(CNY/TEU)'],
                ...shipments.map(shipment => [
                    shipment.shipment_id,
                    shipment.type,
                    shipment.weight,
                    shipment.volume,
                    shipment.status,
                    shipment.origin_city,
                    shipment.destination_city,
                    shipment.time_value,
                ])
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob(['\uFEFF' + csvContent], {type: 'text/csv;charset=utf-8;'});
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `货物数据_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            message.success('数据导出成功');
        } catch (error) {
            message.error('数据导出失败');
            console.error('数据导出失败:', error);
        }
    };

    // 初始化加载数据
    useEffect(() => {
        fetchShipments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    // 表格列定义
    const columns = [
        {
            title: '货物ID',
            dataIndex: 'shipment_id',
            key: 'shipment_id',
            width: 150,
            render: (text) => <span style={{fontWeight: 500}}>{text}</span>
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (type) => {
                const typeMap = {
                    'general': {text: '普通货物', color: 'blue'},
                    'perishable': {text: '易腐货物', color: 'orange'},
                    'fragile': {text: '易碎货物', color: 'purple'},
                    'hazardous': {text: '危险品', color: 'red'},
                    'valuable': {text: '贵重货物', color: 'gold'}
                };
                const typeInfo = typeMap[type] || {text: '未知', color: 'default'};
                return <Tag color={typeInfo.color} className={`type-tag ${type}`}>{typeInfo.text}</Tag>;
            }
        },
        {
            title: '重量(kg)',
            dataIndex: 'weight',
            key: 'weight',
            width: 100,
            render: (weight) => `${weight} kg`
        },
        {
            title: '体积(m³)',
            dataIndex: 'volume',
            key: 'volume',
            width: 100,
            render: (volume) => `${volume} m³`
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => {
                const statusMap = {
                    'pending': {text: '待处理', color: 'orange'},
                    'in-transit': {text: '运输中', color: 'blue'},
                    'delivered': {text: '已送达', color: 'green'},
                    'cancelled': {text: '已取消', color: 'red'},
                    'expired': {text: '已过期', color: 'purple'}
                };
                const statusInfo = statusMap[status] || {text: '未知', color: 'default'};
                return <Tag color={statusInfo.color} className={`status-tag ${status}`}>{statusInfo.text}</Tag>;
            }
        },
        {
            title: '起点城市',
            dataIndex: 'origin_city',
            key: 'origin_city',
            width: 120
        },
        {
            title: '终点城市',
            dataIndex: 'destination_city',
            key: 'destination_city',
            width: 120
        },
        {
            title: '时间价值(CNY/TEU)',
            dataIndex: 'time_value',
            key: 'time_value',
            width: 150,
        },
        {
            title: '操作',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <div className="action-buttons">
                    <Button size="small" type="primary" ghost>
                        详情
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="shipments-page">
            {/* 搜索栏 */}
            <Card className="search-section">
                <Row gutter={16} align="middle">
                    <Col flex="auto">
                        <Search
                            placeholder="搜索货物名称、起点或终点..."
                            allowClear
                            enterButton={<SearchOutlined/>}
                            size="large"
                            value={searchTerm}
                            onSearch={handleSearch}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{maxWidth: 400}}
                        />
                    </Col>
                    <Col>
                        <Space>
                            <Button
                                icon={<ReloadOutlined/>}
                                onClick={fetchShipments}
                                loading={loading}
                                className="refresh-button"
                            >
                                刷新
                            </Button>
                            <Button
                                icon={<ExportOutlined/>}
                                onClick={handleExport}
                                className="export-button"
                            >
                                导出
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* 统计信息 */}
            <Row gutter={16}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="总货物数"
                            value={stats.total}
                            prefix="#"
                            valueStyle={{color: '#1890ff'}}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="待处理"
                            value={stats.pending}
                            prefix="#"
                            valueStyle={{color: '#fa8c16'}}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="运输中"
                            value={stats.inTransit}
                            prefix="#"
                            valueStyle={{color: '#1890ff'}}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="已送达"
                            value={stats.delivered}
                            prefix="#"
                            valueStyle={{color: '#52c41a'}}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 货物列表 */}
            <Card title="货物列表">
                <Table
                    columns={columns}
                    dataSource={shipments}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        total: shipments.length,
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
                    }}
                    scroll={{x: 1200}}
                />
            </Card>
        </div>
    );
};

export default ShipmentsPage;