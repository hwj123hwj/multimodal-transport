import React, {useEffect, useState} from 'react';
import {Button, Card, Col, Input, message, Row, Select, Space, Statistic, Table, Tag} from 'antd';
import {
    AppstoreOutlined, ColumnWidthOutlined,
    EnvironmentOutlined, ExportOutlined,
    InboxOutlined, ReloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import {shipmentsAPI} from '../../services/api';
import api from '../../services/api';
import useSceneSelector from '../../hooks/useSceneSelector';

const {Option} = Select;

const ShipmentsPage = () => {
    const [shipments, setShipments]       = useState([]);
    const [loading, setLoading]           = useState(false);
    const [originSearch, setOriginSearch] = useState('');
    const [destSearch, setDestSearch]     = useState('');
    const [stats, setStats] = useState({total: 0, totalDemand: 0, totalWeight: 0, totalVolume: 0});
    const {selectScenes, activeId, setActiveId, loadingScenes} = useSceneSelector(false);

    const fetchShipments = async (sceneId) => {
        setLoading(true);
        try {
            let data = [];
            if (sceneId) {
                const response = await api.get(`/scenes/${sceneId}/shipments`);
                data = response?.data?.shipments || [];
            } else {
                const response = await shipmentsAPI.getAll();
                data = response?.data?.shipments || [];
            }
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

    useEffect(() => { fetchShipments(activeId); }, [activeId]); // eslint-disable-line

    const statCards = [
        {label: '总货物数', value: stats.total,                  suffix: undefined, prefix: <InboxOutlined/>,       color: '#1890ff'},
        {label: '总需求量', value: stats.totalDemand,            suffix: 'TEU',     prefix: <ColumnWidthOutlined/>, color: '#fa8c16'},
        {label: '总重量',   value: stats.totalWeight.toFixed(0), suffix: 'kg',      prefix: <AppstoreOutlined/>,    color: '#52c41a'},
        {label: '总体积',   value: stats.totalVolume.toFixed(0), suffix: 'm³',      prefix: <EnvironmentOutlined/>, color: '#722ed1'},
    ];

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
                    <Col>
                        <Select
                            placeholder="切换场景"
                            value={activeId}
                            onChange={id => { setActiveId(id); }}
                            style={{width: 160}}
                            allowClear
                            loading={loadingScenes}
                        >
                            {selectScenes.map(s => (
                                <Option key={s.id} value={s.id}>{s.label}</Option>
                            ))}
                        </Select>
                    </Col>
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
        </div>
    );
};

export default ShipmentsPage;
