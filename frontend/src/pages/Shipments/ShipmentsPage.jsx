import React, {useEffect, useState} from 'react';
import {Button, Card, Col, Input, message, Row, Space, Statistic, Table} from 'antd';
import {ExportOutlined, ReloadOutlined, SearchOutlined} from '@ant-design/icons';
import {shipmentsAPI} from '../../services/api';
import './ShipmentsPage.css';

const ShipmentsPage = () => {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [originSearch, setOriginSearch] = useState(''); // eslint-disable-next-line
    const [destinationSearch, setDestinationSearch] = useState(''); // eslint-disable-next-line
    const [stats, setStats] = useState({
        total: 0,
        totalDemand: 0,
        totalWeight: 0,
        totalVolume: 0
    });

    // 获取货物数据
    const fetchShipments = async () => {
        setLoading(true);
        try {
            const response = await shipmentsAPI.getAll();
            // 拦截器已解包 response.data，后端返回 {shipments:[]}
            let data = response?.shipments || [];
            if (!Array.isArray(data)) data = [];

            // 起点城市筛选
            if (originSearch.trim()) {
                data = data.filter(shipment =>
                    shipment.origin_city && shipment.origin_city.toLowerCase().includes(originSearch.toLowerCase().trim())
                );
            }

            // 终点城市筛选
            if (destinationSearch.trim()) {
                data = data.filter(shipment =>
                    shipment.destination_city && shipment.destination_city.toLowerCase().includes(destinationSearch.toLowerCase().trim())
                );
            }

            setShipments(data);

            // 计算统计数据
            const totalDemand = data.reduce((sum, shipment) => sum + (shipment.demand || 0), 0);
            const totalWeight = data.reduce((sum, shipment) => sum + (shipment.weight || 0), 0);
            const totalVolume = data.reduce((sum, shipment) => sum + (shipment.volume || 0), 0);

            const stats = {
                total: data.length,
                totalDemand: totalDemand,
                totalWeight: totalWeight,
                totalVolume: totalVolume
            };
            setStats(stats);
        } catch (error) {
            message.error('获取货物数据失败');
            console.error('获取货物数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 起点搜索处理
    const handleOriginSearch = () => { // eslint-disable-next-line
        fetchShipments();
    };

    // 终点搜索处理
    const handleDestinationSearch = () => { // eslint-disable-next-line
        fetchShipments();
    };


    // 导出数据
    const handleExport = () => {
        try {
            const csvContent = [
                ['货物ID', '重量(kg)', '体积(m³)', '需求量', '起点', '终点', '时间价值(CNY/TEU)'],
                ...shipments.map(shipment => [
                    shipment.shipment_id,
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
    }, [originSearch, destinationSearch]);

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
            title: '需求量(TEU)',
            dataIndex: 'demand',
            key: 'demand',
            width: 100,
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
                    <Col>
                        <Input
                            placeholder="搜索起点城市..."
                            value={originSearch}
                            onChange={(e) => setOriginSearch(e.target.value)}
                            onPressEnter={handleOriginSearch}
                            style={{width: 200}}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <Input
                            placeholder="搜索终点城市..."
                            value={destinationSearch}
                            onChange={(e) => setDestinationSearch(e.target.value)}
                            onPressEnter={handleDestinationSearch}
                            style={{width: 200}}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <Button
                            type="primary"
                            onClick={fetchShipments}
                            loading={loading}
                            icon={<SearchOutlined/>}
                        >
                            搜索
                        </Button>
                    </Col>
                    <Col flex="auto"></Col>
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
                            title="总需求量(TEU)"
                            value={stats.totalDemand}
                            prefix="#"
                            valueStyle={{color: '#fa8c16'}}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="总重量(kg)"
                            value={stats.totalWeight.toFixed(0)}
                            prefix="#"
                            valueStyle={{color: '#1890ff'}}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="总体积(m³)"
                            value={stats.totalVolume.toFixed(0)}
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
                    loading={loading}
                    rowKey="shipment_id"
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