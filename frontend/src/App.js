import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { 
  DashboardOutlined,
  TruckOutlined, 
  ShoppingCartOutlined, 
  CheckCircleOutlined 
} from '@ant-design/icons';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import DashboardPage from './pages/Dashboard/DashboardPage';
import RoutesPage from './pages/Routes/RoutesPage';
import ShipmentsPage from './pages/Shipments/ShipmentsPage';
import MatchingPage from './pages/Matching/MatchingPage';
import './App.css';

const { Header, Sider, Content } = Layout;

// 导航组件
const Navigation = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: 'routes',
      icon: <TruckOutlined />,
      label: '路线管理',
    },
    {
      key: 'shipments',
      icon: <ShoppingCartOutlined />,
      label: '货物管理',
    },
    {
      key: 'matching',
      icon: <CheckCircleOutlined />,
      label: '匹配结果',
    },
  ];

  const handleMenuClick = (e) => {
    navigate(`/${e.key}`);
  };

  return (
    <Sider trigger={null} collapsible collapsed={collapsed}>
      <div className="logo">
        <h3>{collapsed ? 'TMS' : '运输管理系统'}</h3>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname.slice(1) || 'dashboard']}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </Sider>
  );
};

// 主应用内容组件
const AppContent = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);

  const getPageTitle = () => {
    const path = location.pathname.slice(1) || 'dashboard';
    const titles = {
      dashboard: '仪表板',
      routes: '路线管理',
      shipments: '货物管理',
      matching: '匹配结果'
    };
    return titles[path] || '运输管理系统';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navigation collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout>
        <Header style={{ padding: 0, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div className="header-content">
            <div className="header-left">
              <span className="trigger" onClick={() => setCollapsed(!collapsed)}>
                {collapsed ? '☰' : '☰'}
              </span>
              <h2>{getPageTitle()}</h2>
            </div>
            <div className="header-right">
              <span className="system-name">运输路线优化系统</span>
            </div>
          </div>
        </Header>
        <Content style={{ margin: 0, background: '#f0f2f5' }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/shipments" element={<ShipmentsPage />} />
            <Route path="/matching" element={<MatchingPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <AppContent />
      </Router>
    </ConfigProvider>
  );
}

export default App;
