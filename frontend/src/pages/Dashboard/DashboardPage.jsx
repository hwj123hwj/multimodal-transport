import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Progress, Button, Empty } from 'antd';
import { 
  TruckOutlined, 
  ShoppingCartOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ReloadOutlined,
  ExportOutlined
} from '@ant-design/icons';
import MapViewer from '../../components/MapViewer/MapViewer';
import DataTable from '../../components/DataTable/DataTable';
import { routesAPI, shipmentsAPI, matchingAPI } from '../../services/api';
import * as formatters from '../../utils/formatters';
import './DashboardPage.css';
 
// CSV转换函数
const convertToCSV = (data) => {
  const headers = ['类型', '名称', '状态', '创建时间'];
  const rows = [];
  
  // 添加路线数据
  if (data.routes && data.routes.length > 0) {
    data.routes.forEach(route => {
      rows.push(['路线', route.name || `路线${route.id}`, '活跃', new Date().toLocaleDateString()]);
    });
  }
  
  // 添加货物数据
  if (data.shipments && data.shipments.length > 0) {
    data.shipments.forEach(shipment => {
      rows.push(['货物', shipment.name || `货物${shipment.id}`, shipment.status || '待处理', new Date().toLocaleDateString()]);
    });
  }
  
  // 添加匹配数据
  if (data.matchingResults && data.matchingResults.length > 0) {
    data.matchingResults.forEach(match => {
      rows.push(['匹配', `匹配${match.id}`, match.status || '已匹配', new Date().toLocaleDateString()]);
    });
  }
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

const { Column } = Table;

export const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [matchingResults, setMatchingResults] = useState([]);
  const [statistics, setStatistics] = useState({
    totalRoutes: 0,
    totalShipments: 0,
    totalMatches: 0,
    pendingShipments: 0
  });

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [routesRes, shipmentsRes, matchingRes] = await Promise.all([
        routesAPI.getAll(),
        shipmentsAPI.getAll(),
        matchingAPI.getAll()
      ]);

      const routesData = routesRes.data || [];
      const shipmentsData = shipmentsRes.data || [];
      const matchingData = matchingRes.data || [];

      setRoutes(routesData);
      setShipments(shipmentsData);
      setMatchingResults(matchingData);

      // 计算统计数据
      const stats = {
        totalRoutes: routesData.length,
        totalShipments: shipmentsData.length,
        totalMatches: matchingData.length,
        pendingShipments: shipmentsData.filter(s => s.status === 'pending').length
      };
      setStatistics(stats);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 刷新数据
  const handleRefresh = () => {
    loadData();
  };

  // 导出数据
  const handleExport = () => {
    const data = {
      routes,
      shipments,
      matchingResults,
      statistics
    };
    
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 获取最近匹配结果
  const getRecentMatches = () => {
    return matchingResults
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(match => ({
        ...match,
        key: match.id,
        routeName: match.route?.name || '未知路线',
        shipmentName: match.shipment?.name || '未知货物',
        matchScore: formatters.formatPercentage(match.matchScore),
        statusText: getMatchStatusText(match.status)
      }));
  };

  // 获取匹配状态文本
  const getMatchStatusText = (status) => {
    const statusMap = {
      'perfect': '完美匹配',
      'good': '良好匹配',
      'fair': '一般匹配',
      'poor': '较差匹配'
    };
    return statusMap[status] || status;
  };

  // 获取匹配状态颜色
  const getMatchStatusColor = (status) => {
    const colorMap = {
      'perfect': 'green',
      'good': 'blue',
      'fair': 'orange',
      'poor': 'red'
    };
    return colorMap[status] || 'default';
  };

  // 获取匹配率
  const getMatchRate = () => {
    if (shipments.length === 0) return 0;
    return Math.round((matchingResults.length / shipments.length) * 100);
  };

  return (
    <div className="dashboard-page">
      {/* 页面标题和操作栏 */}
      <div className="page-header">
        <h1>运输管理系统 - 仪表板</h1>
        <div className="header-actions">
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
          >
            刷新数据
          </Button>
          <Button 
            icon={<ExportOutlined />} 
            onClick={handleExport}
            disabled={loading}
          >
            导出数据
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} className="statistics-row">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总路线数"
              value={statistics.totalRoutes}
              prefix={<TruckOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总货物数"
              value={statistics.totalShipments}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="匹配成功数"
              value={statistics.totalMatches}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待处理货物"
              value={statistics.pendingShipments}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 匹配率进度条 */}
      <Card title="整体匹配率" className="progress-card">
        <Progress 
          percent={getMatchRate()} 
          status="active" 
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          format={percent => `${percent}%`}
        />
      </Card>

      {/* 地图和数据概览 */}
      <Row gutter={16} className="content-row">
        <Col xs={24} lg={12}>
          <Card title="路线和货物分布" className="map-card">
            <div className="map-container">
              <MapViewer
                mode="combined"
                routes={routes}
                shipments={shipments}
                height={400}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近匹配结果" className="matches-card">
            <div className="recent-matches">
              {getRecentMatches().length > 0 ? (
                <Table
                  dataSource={getRecentMatches()}
                  pagination={false}
                  size="small"
                  scroll={{ y: 400 }}
                >
                  <Column
                    title="路线"
                    dataIndex="routeName"
                    key="routeName"
                    width={120}
                    ellipsis
                  />
                  <Column
                    title="货物"
                    dataIndex="shipmentName"
                    key="shipmentName"
                    width={120}
                    ellipsis
                  />
                  <Column
                    title="匹配度"
                    dataIndex="matchScore"
                    key="matchScore"
                    width={80}
                    align="center"
                    render={(text, record) => (
                      <span style={{ fontWeight: 'bold', color: getMatchStatusColor(record.status) }}>
                        {text}
                      </span>
                    )}
                  />
                  <Column
                    title="状态"
                    dataIndex="statusText"
                    key="statusText"
                    width={80}
                    align="center"
                    render={(text, record) => (
                      <Tag color={getMatchStatusColor(record.status)}>
                        {text}
                      </Tag>
                    )}
                  />
                </Table>
              ) : (
                <Empty description="暂无匹配结果" />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 数据表格概览 */}
      <Row gutter={16} className="tables-row">
        <Col xs={24} lg={12}>
          <Card title="最近路线" className="routes-card">
            <DataTable
              data={routes.slice(0, 10)}
              loading={loading}
              showSearch={false}
              showFilter={false}
              showExport={false}
              compactMode={true}
              pagination={false}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近货物" className="shipments-card">
            <DataTable
              data={shipments.slice(0, 10)}
              loading={loading}
              showSearch={false}
              showFilter={false}
              showExport={false}
              compactMode={true}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;