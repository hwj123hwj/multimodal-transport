import React, {useEffect, useState} from 'react';
import {Button, Card, Col, Empty, Progress, Row, Statistic, Table, Tag} from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    ShoppingCartOutlined,
    TruckOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import MapViewer from '../../components/MapViewer/MapViewer';
import {matchingAPI, routesAPI, shipmentsAPI} from '../../services/api';
import './DashboardPage.css';

const {Column} = Table;

export const DashboardPage = () => {
    const [loading, setLoading] = useState(true);
    const [routes, setRoutes] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [matchingResults, setMatchingResults] = useState([]);
    const [matchRoutesShipmentsData, setMatchRoutesShipmentsData] = useState([]);
    const [statistics, setStatistics] = useState({
        totalRoutes: 0,
        totalShipments: 0,
        matchedShipments: 0,
        unmatchedShipments: 0,
        matchingRate: 0,
        cpuTime: 0,
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [routesRes, shipmentsRes, matchingRes, matchRoutesShipments] = await Promise.all([
                routesAPI.getAll(),
                shipmentsAPI.getAll(),
                matchingAPI.getAll(),
                matchingAPI.getMatching()
            ]);

            const routesData = routesRes?.data?.routes || [];
            const shipmentsData = shipmentsRes?.data?.shipments || [];
            const matchingData = matchingRes?.data || [];
            const mappingData = matchRoutesShipments?.data || [];

            setRoutes(routesData);
            setShipments(shipmentsData);
            setMatchingResults(matchingData);
            setMatchRoutesShipmentsData(mappingData);

            const firstMatching = Array.isArray(matchingData) ? matchingData[0] : null;
            setStatistics({
                totalRoutes: routesData.length,
                totalShipments: shipmentsData.length,
                matchedShipments: firstMatching?.matched_shipments ?? 0,
                unmatchedShipments: firstMatching?.unmatched_shipments ?? 0,
                matchingRate: firstMatching ? Math.round(firstMatching.matching_rate * 100) : 0,
                cpuTime: firstMatching?.cpu_time ?? 0,
            });
        } catch (error) {
            console.error('加载数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getRecentMatches = () => {
        return matchRoutesShipmentsData
            .slice(0, 10)
            .map(match => ({
                ...match,
                key: match.id,
                routeName: match.route_id !== 'Self' ? `路线 ${match.route_id}` : '未分配',
                shipmentName: `货物 ${match.shipment_id}`,
                status: match.route_id !== 'Self' ? '已匹配' : '未匹配',
                statusColor: match.route_id !== 'Self' ? 'green' : 'red',
            }));
    };

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h1>运输管理系统 - 仪表板</h1>
                <Button
                    type="primary"
                    icon={<ReloadOutlined/>}
                    onClick={loadData}
                    loading={loading}
                >
                    刷新数据
                </Button>
            </div>

            {/* 统计卡片 */}
            <Row gutter={16} className="statistics-row">
                <Col xs={24} sm={12} lg={4}>
                    <Card>
                        <Statistic
                            title="总路线数"
                            value={statistics.totalRoutes}
                            prefix={<TruckOutlined/>}
                            valueStyle={{color: '#1890ff'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card>
                        <Statistic
                            title="总货物数"
                            value={statistics.totalShipments}
                            prefix={<ShoppingCartOutlined/>}
                            valueStyle={{color: '#52c41a'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card>
                        <Statistic
                            title="匹配成功"
                            value={statistics.matchedShipments}
                            prefix={<CheckCircleOutlined/>}
                            valueStyle={{color: '#52c41a'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card>
                        <Statistic
                            title="未匹配"
                            value={statistics.unmatchedShipments}
                            prefix={<WarningOutlined/>}
                            valueStyle={{color: '#ff4d4f'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card>
                        <Statistic
                            title="匹配率"
                            value={statistics.matchingRate}
                            suffix="%"
                            valueStyle={{color: statistics.matchingRate >= 70 ? '#52c41a' : '#faad14'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <Card>
                        <Statistic
                            title="算法耗时"
                            value={statistics.cpuTime}
                            suffix="s"
                            precision={2}
                            prefix={<ClockCircleOutlined/>}
                            valueStyle={{color: '#722ed1'}}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 匹配率进度条 */}
            <Card title="整体匹配率" className="progress-card">
                <Progress
                    percent={statistics.matchingRate}
                    status={statistics.matchingRate === 0 ? 'normal' : 'active'}
                    strokeColor={{'0%': '#108ee9', '100%': '#87d068'}}
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
                    <Card title="最近匹配结果（前10条）" className="matches-card">
                        {getRecentMatches().length > 0 ? (
                            <Table
                                dataSource={getRecentMatches()}
                                pagination={false}
                                size="small"
                                scroll={{y: 400}}
                            >
                                <Column title="货物" dataIndex="shipmentName" key="shipmentName" width={120}/>
                                <Column title="路线" dataIndex="routeName" key="routeName" width={120}/>
                                <Column
                                    title="状态"
                                    dataIndex="status"
                                    key="status"
                                    width={80}
                                    align="center"
                                    render={(text, record) => (
                                        <Tag color={record.statusColor}>{text}</Tag>
                                    )}
                                />
                            </Table>
                        ) : (
                            <Empty description="暂无匹配结果，请先执行算法"/>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardPage;
