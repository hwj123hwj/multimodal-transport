import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Button, Space, message, Input, Select } from 'antd';
import { BoxPlotOutlined, ExportOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import MapViewer from '../../components/MapViewer/MapViewer';
import DataTable from '../../components/DataTable/DataTable';
import { shipmentsAPI } from '../../services/api';
import { formatWeight, formatVolume, formatCurrency } from '../../utils/formatters';

const { Option } = Select;

const ShipmentsPage = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [mapMode, setMapMode] = useState('shipments');
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [statistics, setStatistics] = useState({
    totalShipments: 0,
    totalWeight: 0,
    totalVolume: 0,
    totalValue: 0
  });

  // 获取货物数据
  const fetchShipments = async () => {
    try {
      setLoading(true);
      const response = await shipmentsAPI.getAll();
      const data = response.data;
      
      setShipments(data);
      
      // 计算统计信息
      const stats = {
        totalShipments: data.length,
        totalWeight: data.reduce((sum, shipment) => sum + shipment.weight, 0),
        totalVolume: data.reduce((sum, shipment) => sum + shipment.volume, 0),
        totalValue: data.reduce((sum, shipment) => sum + shipment.value, 0)
      };
      setStatistics(stats);
      
      message.success('货物数据加载成功');
    } catch (error) {
      console.error('获取货物数据失败:', error);
      message.error('获取货物数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理货物搜索
  const handleSearch = async () => {
    if (!searchText.trim()) {
      fetchShipments();
      return;
    }

    try {
      setLoading(true);
      const response = await shipmentsAPI.search(searchText, searchType);
      const data = response.data;
      
      setShipments(data);
      
      // 重新计算统计信息
      const stats = {
        totalShipments: data.length,
        totalWeight: data.reduce((sum, shipment) => sum + shipment.weight, 0),
        totalVolume: data.reduce((sum, shipment) => sum + shipment.volume, 0),
        totalValue: data.reduce((sum, shipment) => sum + shipment.value, 0)
      };
      setStatistics(stats);
      
      message.success(`搜索到 ${data.length} 条货物信息`);
    } catch (error) {
      console.error('搜索货物失败:', error);
      message.error('搜索货物失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理货物选择
  const handleShipmentSelect = (shipment) => {
    setSelectedShipment(shipment);
    setMapMode('shipments');
  };

  // 处理数据导出
  const handleExport = () => {
    const data = shipments.map(shipment => ({
      '货物ID': shipment.id,
      '名称': shipment.name,
      '类型': shipment.type,
      '重量': formatWeight(shipment.weight),
      '体积': formatVolume(shipment.volume),
      '价值': formatCurrency(shipment.value),
      '起点': shipment.origin,
      '终点': shipment.destination,
      '创建时间': new Date(shipment.created_at).toLocaleString()
    }));
    
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `shipments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    message.success('货物数据导出成功');
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchShipments();
  }, []);

  // 表格列配置
  const columns = [
    {
      title: '货物ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      filter: true
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color={
          type === '普通' ? 'blue' :
          type === '易碎' ? 'orange' :
          type === '危险品' ? 'red' :
          type === '冷藏' ? 'cyan' :
          'default'
        }>
          {type}
        </Tag>
      ),
      filters: [
        { text: '普通', value: '普通' },
        { text: '易碎', value: '易碎' },
        { text: '危险品', value: '危险品' },
        { text: '冷藏', value: '冷藏' }
      ],
      onFilter: (value, record) => record.type === value
    },
    {
      title: '重量',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      render: (weight) => formatWeight(weight),
      sorter: (a, b) => a.weight - b.weight
    },
    {
      title: '体积',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      render: (volume) => formatVolume(volume),
      sorter: (a, b) => a.volume - b.volume
    },
    {
      title: '价值',
      dataIndex: 'value',
      key: 'value',
      width: 120,
      render: (value) => formatCurrency(value),
      sorter: (a, b) => a.value - b.value
    },
    {
      title: '起点',
      dataIndex: 'origin',
      key: 'origin',
      ellipsis: true,
      filter: true
    },
    {
      title: '终点',
      dataIndex: 'destination',
      key: 'destination',
      ellipsis: true,
      filter: true
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date) => new Date(date).toLocaleString(),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<BoxPlotOutlined />}
            onClick={() => handleShipmentSelect(record)}
          >
            查看
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="shipments-page">
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总货物数"
              value={statistics.totalShipments}
              prefix={<BoxPlotOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总重量"
              value={statistics.totalWeight}
              precision={2}
              suffix="吨"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总体积"
              value={statistics.totalVolume}
              precision={2}
              suffix="m³"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总价值"
              value={statistics.totalValue}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和工具栏 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <h3 style={{ margin: 0 }}>货物管理</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select
              value={searchType}
              onChange={setSearchType}
              style={{ width: 120 }}
            >
              <Option value="all">全部</Option>
              <Option value="name">名称</Option>
              <Option value="type">类型</Option>
              <Option value="origin">起点</Option>
              <Option value="destination">终点</Option>
            </Select>
            <Input
              placeholder="搜索货物..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
              搜索
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchShipments}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
              disabled={shipments.length === 0}
            >
              导出
            </Button>
          </div>
        </div>
      </Card>

      {/* 地图和详情 */}
      <Row gutter={16}>
        <Col xs={24} lg={selectedShipment ? 12 : 24}>
          <Card
            title="货物地图"
            bodyStyle={{ padding: 0 }}
            style={{ height: '600px' }}
          >
            <MapViewer
              mode={mapMode}
              data={selectedShipment ? [selectedShipment] : shipments}
              selectedShipment={selectedShipment}
              onShipmentSelect={handleShipmentSelect}
              style={{ height: '100%' }}
            />
          </Card>
        </Col>
        
        {selectedShipment && (
          <Col xs={24} lg={12}>
            <Card
              title="货物详情"
              extra={
                <Button
                  type="text"
                  onClick={() => setSelectedShipment(null)}
                >
                  关闭
                </Button>
              }
              style={{ height: '600px', overflow: 'auto' }}
            >
              <div style={{ padding: '16px 0' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <strong>名称:</strong>
                    <div>{selectedShipment.name}</div>
                  </Col>
                  <Col span={12}>
                    <strong>类型:</strong>
                    <div>
                      <Tag color={
                        selectedShipment.type === '普通' ? 'blue' :
                        selectedShipment.type === '易碎' ? 'orange' :
                        selectedShipment.type === '危险品' ? 'red' :
                        selectedShipment.type === '冷藏' ? 'cyan' :
                        'default'
                      }>
                        {selectedShipment.type}
                      </Tag>
                    </div>
                  </Col>
                </Row>
                
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={8}>
                    <strong>重量:</strong>
                    <div>{formatWeight(selectedShipment.weight)}</div>
                  </Col>
                  <Col span={8}>
                    <strong>体积:</strong>
                    <div>{formatVolume(selectedShipment.volume)}</div>
                  </Col>
                  <Col span={8}>
                    <strong>价值:</strong>
                    <div>{formatCurrency(selectedShipment.value)}</div>
                  </Col>
                </Row>
                
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <strong>起点:</strong>
                    <div>{selectedShipment.origin}</div>
                  </Col>
                  <Col span={12}>
                    <strong>终点:</strong>
                    <div>{selectedShipment.destination}</div>
                  </Col>
                </Row>
                
                <div style={{ marginTop: 16 }}>
                  <strong>描述:</strong>
                  <div>{selectedShipment.description || '暂无描述'}</div>
                </div>
                
                <div style={{ marginTop: 16 }}>
                  <strong>创建时间:</strong>
                  <div>{new Date(selectedShipment.created_at).toLocaleString()}</div>
                </div>
              </div>
            </Card>
          </Col>
        )}
      </Row>

      {/* 数据表格 */}
      <Card style={{ marginTop: 24 }}>
        <DataTable
          title="货物列表"
          data={shipments}
          columns={columns}
          loading={loading}
          exportable
          searchable
          pagination
          rowKey="id"
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );
};

export default ShipmentsPage;