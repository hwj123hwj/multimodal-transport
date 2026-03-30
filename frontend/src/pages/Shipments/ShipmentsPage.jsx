import React, {useEffect, useState} from 'react';
import {
    Button, Card, Col, Descriptions, Drawer,
    Input, message, Row, Space, Statistic, Table, Tag
} from 'antd';
import {
    ExportOutlined, EyeOutlined,
    ReloadOutlined, SearchOutlined,
    InboxOutlined, ColumnWidthOutlined,
    EnvironmentOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import {shipmentsAPI} from '../../services/api';

const ShipmentsPage = () => {
    const [shipments, setShipments]           = useState([]);
    const [loading, setLoading]               = useState(false);
    const [originSearch, setOriginSearch]     = useState('');
    const [destSearch, setDestSearch]         = useState('');
    const [drawerOpen, setDrawerOpen]         = useState(false);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [stats, setStats] = useState({total: 0, totalDemand: 0, totalWeight: 0, totalVolume: 0});

    const fetchShipments = async () => {
        setLoading(true);
        try {
            const response = await shipmentsAPI.getAll();
            let data = response?.data?.shipments || [];
            if (!Array.isArray(data)) data = [];

            if (originSearch.trim())
                data = data.filter(s => s.origin_city?.toLowerCase().includes(originSearch.toLowerCase().trim()));
            if (destSearch.trim())
                data = data.filter(s => s.destination_city?.toLowerCase().includes(destSearch.toLowerCase().trim()));

            setShipments(data);
            setStats({
                total:       data.length,
                totalDemand: data.reduce((s, r) => s + (r.demand  || 0), 0),
                totalWeight: data.reduce((s, r) => s + (r.weight  || 0), 0),
                totalVolume: data.reduce((s, r) => s + (r.volume  || 0), 0),
            });
        } catch (e) {
            console.error('获取货物数据失败:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        try {
            const csv = [
                ['货物ID', '重量(kg)', '体积(m³)', '需求量(TEU)', '起点', '终点', '时间价值(CNY/TEU)'],
                ...shipments.map(s => [
                    s.shipment_id, s.weight, s.volume, s.demand,
                    s.origin_city, s.destination_city, s.time_value,
                ])
            ].map(r => r.join(',')).join('\n');

            const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8;'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `货物数据_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            message.success('数据导出成功');
        } catch {
            message.error('数据导出失败');
        }
    };

    useEffect(() => { fetchShipments(); }, [originSearch, destSearch]); // eslint-disable-line

    // ── 统计卡配置 ──────────────────────────────────────────────
    const statCards = [
        {label: '总货物数',   value: stats.total,                  suffix: undefined, prefix: <InboxOutlined/>,       color: '#1890ff'},
        {label: '总需求量',   value: stats.totalDemand,            suffix: 'TEU',     prefix: <ColumnWidthOutlined/>, color: '#fa8c16'},
        {label: '总重量',     value: stats.totalWeight.toFixed(0), suffix: 'kg',      prefix: <AppstoreOutlined/>,    color: '#52c41a'},
        {label: '总体积',     value: stats.totalVolume.toFixed(0), suffix: 'm³',      prefix: <EnvironmentOutlined/>, color: '#722ed1'},
    ];

    // ── 表格列 ──────────────────────────────────────────────────
    const columns = [
        {
            title: '货物ID',
            dataIndex: 'shipment_id',
            key: 'shipment_id',
            width: 130,
            render: t => <span style={{fontFamily: 'var(--font-mono)', fontWeight: 600}}>{t}</span>,
        },
        {
            title: '起点',
            dataIndex: 'origin_city',
            key: 'origin_city',
            width: 100,
            render: t => <Tag color="blue">{t}</Tag>,
        },
        {
            title: '终点',
            dataIndex: 'destination_city',
            key: 'destination_city',
            width: 100,
            render: t => <Tag color="cyan">{t}</Tag>,
        },
        {
            title: '需求量(TEU)',
            dataIndex: 'demand',
            key: 'demand',
            width: 110,
            align: 'right',
            render: v => <span style={{fontFamily: 'var(--font-mono)'}}>{v}</span>,
        },
        {
            title: '重量(kg)',
            dataIndex: 'weight',
            key: 'weight',
            width: 100,
            align: 'right',
            render: v => <span style={{fontFamily: 'var(--font-mono)'}}>{v}</span>,
        },
        {
            title: '体积(m³)',
            dataIndex: 'volume',
            key: 'volume',
            width: 100,
            align: 'right',
            render: v => <span style={{fontFamily: 'var(--font-mono)'}}>{v}</span>,
        },
        {
            title: '时间价值(CNY/TEU)',
            dataIndex: 'time_value',
            key: 'time_value',
            width: 160,
            align: 'right',
            render: v => <span style={{fontFamily: 'var(--font-mono)'}}>{v}</span>,
        },
        {
            title: '操作',
            key: 'actions',
            width: 80,
            align: 'center',
            render: (_, record) => (
                <Button
                    size="small"
                    icon={<EyeOutlined/>}
                    onClick={() => { setSelectedShipment(record); setDrawerOpen(true); }}
                    style={{
                        color: '#64748B',
                        borderColor: '#E2E8F0',
                        background: '#F8FAFC',
                    }}
                >
                    详情
                </Button>
            ),
        },
    ];

    return (
        <div>
            {/* 搜索栏 */}
            <Card style={{marginBottom: 24}}>
                <Row gutter={12} align="middle" wrap={false}>
                    <Col>
                        <Input
                            placeholder="搜索起点城市"
                            value={originSearch}
                            onChange={e => setOriginSearch(e.target.value)}
                            onPressEnter={fetchShipments}
                            prefix={<SearchOutlined style={{color: '#94A3B8'}}/>}
                            style={{width: 180}}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <Input
                            placeholder="搜索终点城市"
                            value={destSearch}
                            onChange={e => setDestSearch(e.target.value)}
                            onPressEnter={fetchShipments}
                            prefix={<SearchOutlined style={{color: '#94A3B8'}}/>}
                            style={{width: 180}}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <Button type="primary" onClick={fetchShipments} loading={loading} icon={<SearchOutlined/>}>
                            搜索
                        </Button>
                    </Col>
                    <Col flex="auto"/>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined/>} onClick={fetchShipments} loading={loading}>刷新</Button>
                            <Button icon={<ExportOutlined/>} onClick={handleExport}>导出</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* 统计卡 */}
            <Row gutter={16} style={{marginBottom: 24}}>
                {statCards.map(card => (
                    <Col key={card.label} xs={24} sm={12} md={6}>
                        <Card>
                            <Statistic
                                title={card.label}
                                value={card.value}
                                suffix={card.suffix}
                                prefix={card.prefix}
                                valueStyle={{color: card.color}}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* 货物列表 */}
            <Card title={`货物列表（共 ${shipments.length} 条）`}>
                <Table
                    columns={columns}
                    dataSource={shipments}
                    loading={loading}
                    rowKey="shipment_id"
                    size="small"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
                    }}
                    scroll={{x: 900}}
                />
            </Card>

            {/* 详情 Drawer */}
            <Drawer
                title={
                    <span style={{fontFamily: 'var(--font-mono)', fontWeight: 700}}>
                        货物详情 · {selectedShipment?.shipment_id}
                    </span>
                }
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={400}
            >
                {selectedShipment && (
                    <Descriptions column={1} bordered size="small" labelStyle={{width: 130, color: '#64748B'}}>
                        <Descriptions.Item label="货物 ID">{selectedShipment.shipment_id}</Descriptions.Item>
                        <Descriptions.Item label="起点城市">
                            <Tag color="blue">{selectedShipment.origin_city}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="终点城市">
                            <Tag color="cyan">{selectedShipment.destination_city}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="需求量">{selectedShipment.demand} TEU</Descriptions.Item>
                        <Descriptions.Item label="重量">{selectedShipment.weight} kg</Descriptions.Item>
                        <Descriptions.Item label="体积">{selectedShipment.volume} m³</Descriptions.Item>
                        <Descriptions.Item label="时间价值">{selectedShipment.time_value} CNY/TEU</Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </div>
    );
};

export default ShipmentsPage;
