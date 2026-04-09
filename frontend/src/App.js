import React from 'react';
import {BrowserRouter as Router, Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import {ConfigProvider} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import DashboardPage from './pages/Dashboard/DashboardPage';
import RoutesPage from './pages/Routes/RoutesPage';
import ShipmentsPage from './pages/Shipments/ShipmentsPage';
import MatchingPage from './pages/Matching/MatchingPage';
import DataUploadPage from './pages/DataUpload/DataUploadPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import ComparePage from './pages/Compare/ComparePage';
import TracePage from './pages/Trace/TracePage';
import './App.css';

// ── Icons (inline SVG, no emoji) ────────────────────────────
const IconDashboard = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
);
const IconRoutes = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/>
        <path d="M5 17V9a4 4 0 0 1 4-4h6"/>
        <polyline points="15 3 19 5 15 7"/>
    </svg>
);
const IconShipments = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
);
const IconMatching = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>
    </svg>
);
const IconUpload = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
);
const IconAnalytics = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
);
const IconCompare = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
    </svg>
);
const IconTrace = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        <path d="M2 12l10-2 7 20"/>
    </svg>
);
const IconChevronLeft = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
    </svg>
);
const IconChevronRight = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
    </svg>
);

// ── Nav Config ───────────────────────────────────────────────
const NAV_ITEMS = [
    {key: 'dashboard', label: '仪表板',   icon: <IconDashboard/>},
    {key: 'routes',    label: '路线管理', icon: <IconRoutes/>},
    {key: 'shipments', label: '货物管理', icon: <IconShipments/>},
    {key: 'matching',  label: '匹配结果', icon: <IconMatching/>},
    {key: 'data-upload', label: '数据上传', icon: <IconUpload/>},
    {key: 'trace',      label: '匹配溯源', icon: <IconTrace/>},
    {key: 'analytics',   label: '数据分析', icon: <IconAnalytics/>},
    {key: 'compare',      label: '对比分析', icon: <IconCompare/>},
];

const PAGE_TITLES = {
    dashboard:    '仪表板',
    routes:       '路线管理',
    shipments:    '货物管理',
    matching:     '匹配结果',
    'data-upload': '数据上传与算法执行',
    trace:        '匹配溯源',
    'analytics':   '数据分析',
    'compare':     '对比分析',
};

// ── Sidebar ──────────────────────────────────────────────────
const Sidebar = ({collapsed, onToggle}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentKey = location.pathname.slice(1) || 'dashboard';

    return (
        <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}`}>
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">TM</div>
                <div className="sidebar-logo-text" style={{overflow: 'hidden', transition: 'opacity 200ms, max-width 200ms', maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1}}>
                    <span className="sidebar-logo-title">运输管理系统</span>
                    <span className="sidebar-logo-sub">Transport MIS</span>
                </div>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
                {NAV_ITEMS.map(item => (
                    <div
                        key={item.key}
                        className={`nav-item${currentKey === item.key ? ' active' : ''}`}
                        onClick={() => navigate(`/${item.key}`)}
                        title={collapsed ? item.label : undefined}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </div>
                ))}
            </nav>

            {/* Collapse toggle */}
            <div className="sidebar-footer">
                <div className="sidebar-collapse-btn" onClick={onToggle} title={collapsed ? '展开侧边栏' : '收起侧边栏'}>
                    {collapsed ? <IconChevronRight/> : <><IconChevronLeft/><span className="nav-label" style={{fontSize: 12}}>收起</span></>}
                </div>
            </div>
        </aside>
    );
};

// ── Header ───────────────────────────────────────────────────
const Header = () => {
    const location = useLocation();
    const currentKey = location.pathname.slice(1) || 'dashboard';
    const title = PAGE_TITLES[currentKey] || '运输管理系统';

    return (
        <header className="app-header">
            <span className="header-title">{title}</span>
            <div className="header-badge">
                <span className="header-badge-dot"/>
                系统在线
            </div>
        </header>
    );
};

// ── App Shell ────────────────────────────────────────────────
const AppShell = () => {
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <div className="app-shell">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}/>
            <div className="app-main">
                <Header/>
                <main className="app-content">
                    <Routes>
                        <Route path="/"            element={<DashboardPage/>}/>
                        <Route path="/dashboard"   element={<DashboardPage/>}/>
                        <Route path="/routes"      element={<RoutesPage/>}/>
                        <Route path="/shipments"   element={<ShipmentsPage/>}/>
                        <Route path="/matching"    element={<MatchingPage/>}/>
                        <Route path="/data-upload" element={<DataUploadPage/>}/>
                        <Route path="/trace/:shipmentId" element={<TracePage/>}/>
                        <Route path="/analytics"   element={<AnalyticsPage/>}/>
                        <Route path="/compare"     element={<ComparePage/>}/>
                    </Routes>
                </main>
            </div>
        </div>
    );
};

// ── Ant Design Theme Token ───────────────────────────────────
const antTheme = {
    token: {
        colorPrimary:       '#2563EB',
        colorSuccess:       '#10B981',
        colorWarning:       '#F59E0B',
        colorError:         '#EF4444',
        borderRadius:       8,
        fontFamily:         "'Fira Sans', -apple-system, sans-serif",
        fontSize:           14,
        colorBgContainer:   '#FFFFFF',
        colorBorder:        '#E2E8F0',
        colorTextBase:      '#1E293B',
        colorTextSecondary: '#64748B',
        boxShadow:          '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    },
    components: {
        Card:   { paddingLG: 16 },
        Table:  { borderRadius: 10 },
        Button: { fontWeight: 500 },
    },
};

function App() {
    return (
        <ConfigProvider locale={zhCN} theme={antTheme}>
            <Router>
                <AppShell/>
            </Router>
        </ConfigProvider>
    );
}

export default App;
