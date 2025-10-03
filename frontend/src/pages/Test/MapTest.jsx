import React, { useEffect, useState } from 'react';
import { Card, message, Select, Button, Space } from 'antd';
import MapViewer from '../../components/MapViewer/MapViewer';

// 地图测试组件
const { Option } = Select;

const MapTest = () => {
  const [mapEngine, setMapEngine] = useState('baidu');
  const [testRoutes, setTestRoutes] = useState([]);
  const [testShipments, setTestShipments] = useState([]);

  // 切换地图引擎
  const handleMapEngineChange = (engine) => {
    setMapEngine(engine);
    message.info(`已切换到${engine === 'baidu' ? '百度地图' : 'SVG地图'}`);
  };

  // 生成测试数据
  const generateTestData = () => {
    const testRoutes = [
      {
        route_id: 1,
        origin_city: '北京',
        destination_city: '上海',
        node_details: [
          { city_name: '北京', sequence: 1 },
          { city_name: '天津', sequence: 2 },
          { city_name: '济南', sequence: 3 },
          { city_name: '南京', sequence: 4 },
          { city_name: '上海', sequence: 5 }
        ]
      },
      {
        route_id: 2,
        origin_city: '广州',
        destination_city: '深圳',
        node_details: [
          { city_name: '广州', sequence: 1 },
          { city_name: '东莞', sequence: 2 },
          { city_name: '深圳', sequence: 3 }
        ]
      }
    ];

    const testShipments = [
      {
        shipment_id: 1,
        origin_city: '北京',
        destination_city: '上海',
        demand: 100,
        assigned_route: '1'
      },
      {
        shipment_id: 2,
        origin_city: '广州',
        destination_city: '深圳',
        demand: 50,
        assigned_route: 'Self'
      },
      {
        shipment_id: 3,
        origin_city: '成都',
        destination_city: '重庆',
        demand: 75,
        assigned_route: null
      }
    ];

    setTestRoutes(testRoutes);
    setTestShipments(testShipments);
    message.success('测试数据生成成功！');
  };

  useEffect(() => {
    generateTestData();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <Card 
        title="地图测试" 
        style={{ height: '600px' }}
        extra={
          <Space>
            <Select
              value={mapEngine}
              onChange={handleMapEngineChange}
              style={{ width: 120 }}
            >
              <Option value="baidu">百度地图</Option>
              <Option value="svg">SVG地图</Option>
            </Select>
            <Button onClick={generateTestData} type="primary">
              生成测试数据
            </Button>
          </Space>
        }
      >
        <div style={{ height: '500px' }}>
          <MapViewer
            mode="routes"
            routes={testRoutes}
            shipments={testShipments}
            mapEngine={mapEngine}
            height="100%"
          />
        </div>
      </Card>
    </div>
  );
};

export default MapTest;