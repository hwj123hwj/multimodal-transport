import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Button, Space, message, Progress, Badge } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExportOutlined, ReloadOutlined, AimOutlined } from '@ant-design/icons';
import MapViewer from '../../components/MapViewer/MapViewer';
import DataTable from '../../components/DataTable/DataTable';
import { matchingAPI, routesAPI, shipmentsAPI } from '../../services/api';
import { formatDistance, formatTime, formatCurrency, formatWeight, formatVolume } from '../../utils/formatters';
import { MATCHING_STATUS } from '../../utils/constants';

const MatchingPage = () => {
  const [matchingResults, setMatchingResults] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [mapMode, setMapMode] = useState('matching');
  const [statistics, setStatistics] = useState({
    totalMatches: 0,
    successfulMatches: 0,
    avgScore: 0,
    totalSavedCost: 0
  });

  // 获取所有数据
  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // 并行获取所有数据
      const [matchingRes, routesRes, shipmentsRes] = await Promise.all([
        matchingAPI.getAll(),
        routesAPI.getAll(),
        shipmentsAPI.getAll()
      ]);
      
      const matches = matchingRes.data;
      const routesData = routesRes.data;
      const shipmentsData = shipmentsRes.data;
      
      setMatchingResults(matches);
      setRoutes(routesData);
      setShipments(shipmentsData);
      
      // 计算统计信息
      const successfulMatches = matches.filter(m => m.match_score > 0.7);
      const avgScore = matches.length > 0 
        ? matches.reduce((sum, m) => sum + m.match_score, 0) / matches.length 
        : 0;
      const totalSavedCost = successfulMatches.reduce((sum, m) => sum + m.saved_cost, 0);
      
      const stats = {
        totalMatches: matches.length,
        successfulMatches: successfulMatches.length,
        avgScore: avgScore,
        totalSavedCost: totalSavedCost
      };
      setStatistics(stats);
      
      message.success('匹配数据加载成功');
    } catch (error) {
      console.error('获取匹配数据失败:', error);
      message.error('获取匹配数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理匹配结果选择
  const handleResultSelect = (result) => {
    setSelectedResult(result);
    setMapMode('matching');
  };

  // 获取匹配状态标签
  const getStatusTag = (score) => {
    if (score >= 0.9) {
      return <Badge status="success" text="优秀匹配" />;
    } else if (score >= 0.7) {
      return <Badge status="processing" text="良好匹配" />;
    } else if (score >= 0.5) {
      return <Badge status="warning" text="一般匹配" />;
    } else {
      return <Badge status="error" text="低匹配" />;
    }
  };

  // 获取进度条颜色
  const getProgressColor = (score) => {
    if (score >= 0.9) return '#52c41a';
    if (score >= 0.7) return '#1890ff';
    if (score >= 0.5) return '#faad14';
    return '#f5222d';
  };

  // 处理数据导出
  const handleExport = () => {
    const data = matchingResults.map(result => {
      const route = routes.find(r => r.id === result.route_id);
      const shipment = shipments.find(s => s.id === result.shipment_id);
      
      return {
        '匹配ID': result.id,
        '路线': route ? `${route.origin} - ${route.destination}` : '未知',
        '货物': shipment ? shipment.name : '未知',
        '匹配度': `${(result.match_score * 100).toFixed(1)}%`,
        '节省成本': formatCurrency(result.saved_cost),
        '匹配状态': result.match_score >= 0.7 ? '成功' : '失败',
        '创建时间': new Date(result.created_at).toLocaleString()
      };
    });
    
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `matching_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    message.success('匹配结果导出成功');
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchAllData();
  }, []);

  // 表格列配置
  const columns = [
    {
      title: '匹配ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id
    },
    {
      title: '路线',
      key: 'route',
      width: 200,
      render: (_, record) => {
        const route = routes.find(r => r.id === record.route_id);
        return route ? (
          <div>
            <div>{route.origin}</div>
            <div style={{ color: '#999', fontSize: '12px' }}>→ {route.destination}</div>
          </div>
        ) : '未知路线';
      }
    },
    {
      title: '货物',
      key: 'shipment',
      width: 150,
      render: (_, record) => {
        const shipment = shipments.find(s => s.id === record.shipment_id);
        return shipment ? (
          <div>
            <div>{shipment.name}</div>
            <div style={{ color: '#999', fontSize: '12px' }}>
              {formatWeight(shipment.weight)} | {formatVolume(shipment.volume)}
            </div>
          </div>
        ) : '未知货物';
      }
    },
    {
      title: '匹配度',
      dataIndex: 'match_score',
      key: 'match_score',
      width: 120,
      render: (score) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={score * 100}
            size="small"
            strokeColor={getProgressColor(score)}
            format={percent => `${percent.toFixed(1)}%`}
            style={{ width: 80 }}
          />
          {score >= 0.7 ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#f5222d' }} />
          )}
        </div>
      ),
      sorter: (a, b) => a.match_score - b.match_score
    },
    {
      title: '节省成本',
      dataIndex: 'saved_cost',
      key: 'saved_cost',
      width: 100,
      render: (cost) => formatCurrency(cost),
      sorter: (a, b) => a.saved_cost - b.saved_cost
    },
    {
      title: '匹配状态',
      key: 'status',
      width: 100,
      render: (_, record) => getStatusTag(record.match_score)
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
            icon={<AimOutlined />}
            onClick={() => handleResultSelect(record)}
          >
            查看
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="matching-page">
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总匹配数"
              value={statistics.totalMatches}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="成功匹配"
              value={statistics.successfulMatches}
              suffix={`/ ${statistics.totalMatches}`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均匹配度"
              value={statistics.avgScore * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总节省成本"
              value={statistics.totalSavedCost}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>匹配结果管理</h3>
          <Space>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={fetchAllData}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
              disabled={matchingResults.length === 0}
            >
              导出
            </Button>
          </Space>
        </div>
      </Card>

      {/* 地图和详情 */}
      <Row gutter={16}>
        <Col xs={24} lg={selectedResult ? 12 : 24}>
          <Card
            title="匹配结果地图"
            bodyStyle={{ padding: 0 }}
            style={{ height: '600px' }}
          >
            <MapViewer
              mode={mapMode}
              data={selectedResult ? [selectedResult] : matchingResults}
              routes={routes}
              shipments={shipments}
              selectedResult={selectedResult}
              onResultSelect={handleResultSelect}
              style={{ height: '100%' }}
            />
          </Card>
        </Col>
        
        {selectedResult && (
          <Col xs={24} lg={12}>
            <Card
              title="匹配详情"
              extra={
                <Button
                  type="text"
                  onClick={() => setSelectedResult(null)}
                >
                  关闭
                </Button>
              }
              style={{ height: '600px', overflow: 'auto' }}
            >
              <div style={{ padding: '16px 0' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <strong>匹配ID:</strong>
                    <div>{selectedResult.id}</div>
                  </Col>
                  <Col span={12}>
                    <strong>匹配状态:</strong>
                    <div>{getStatusTag(selectedResult.match_score)}</div>
                  </Col>
                </Row>
                
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <strong>匹配度:</strong>
                    <div style={{ marginTop: 8 }}>
                      <Progress
                        percent={selectedResult.match_score * 100}
                        strokeColor={getProgressColor(selectedResult.match_score)}
                        format={percent => `${percent.toFixed(1)}%`}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <strong>节省成本:</strong>
                    <div style={{ color: '#52c41a', fontWeight: 'bold' }}>
                      {formatCurrency(selectedResult.saved_cost)}
                    </div>
                  </Col>
                </Row>
                
                <div style={{ marginTop: 16 }}>
                  <strong>路线信息:</strong>
                  <div style={{ marginTop: 8 }}>
                    {(() => {
                      const route = routes.find(r => r.id === selectedResult.route_id);
                      return route ? (
                        <div>
                          <div>起点: {route.origin}</div>
                          <div>终点: {route.destination}</div>
                          <div>距离: {formatDistance(route.total_distance)}</div>
                          <div>耗时: {formatTime(route.total_duration)}</div>
                      <div>成本: {formatCurrency(route.total_cost)}</div>
                        </div>
                      ) : '未知路线';
                    })()}
                  </div>
                </div>
                
                <div style={{ marginTop: 16 }}>
                  <strong>货物信息:</strong>
                  <div style={{ marginTop: 8 }}>
                    {(() => {
                      const shipment = shipments.find(s => s.id === selectedResult.shipment_id);
                      return shipment ? (
                        <div>
                          <div>名称: {shipment.name}</div>
                          <div>类型: {shipment.type}</div>
                          <div>重量: {formatWeight(shipment.weight)}</div>
                          <div>体积: {formatVolume(shipment.volume)}</div>
                          <div>价值: {formatCurrency(shipment.value)}</div>
                          <div>起点: {shipment.origin}</div>
                          <div>终点: {shipment.destination}</div>
                        </div>
                      ) : '未知货物';
                    })()}
                  </div>
                </div>
                
                <div style={{ marginTop: 16 }}>
                  <strong>创建时间:</strong>
                  <div>{new Date(selectedResult.created_at).toLocaleString()}</div>
                </div>
              </div>
            </Card>
          </Col>
        )}
      </Row>

      {/* 数据表格 */}
      <Card style={{ marginTop: 24 }}>
        <DataTable
          title="匹配结果列表"
          data={matchingResults}
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

export default MatchingPage;