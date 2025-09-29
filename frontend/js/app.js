/**
 * 主应用控制器
 * 协调所有模块，处理用户交互和数据流
 */

class LogisticsApp {
    constructor() {
        this.currentView = 'dashboard';
        this.isLoading = false;
        this.data = null;
        this.map = null;
        this.networkMap = null;  // 网络图地图实例
        this.charts = {};
        this.topologyInitialized = false;  // 拓扑图初始化状态
        this.filters = {
            priority: 'all',
            status: 'all',
            timeRange: 'all'
        };
        
        // 初始化配置
        this.config = {
            autoRefresh: false,
            refreshInterval: 30000, // 30秒
            animationEnabled: true,
            theme: 'light'
        };

        // 事件监听器
        this.eventListeners = new Map();
        
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            console.log('初始化物流可视化应用...');
            
            // Edge浏览器特殊处理 - 强制清理初始状态
            if (navigator.userAgent.includes('Edg')) {
                console.log('检测到Edge浏览器，执行强制清理');
                document.querySelectorAll('.view-container').forEach(container => {
                    container.style.setProperty('display', 'none', 'important');
                    container.style.setProperty('visibility', 'hidden', 'important');
                    container.style.setProperty('opacity', '0', 'important');
                    container.style.setProperty('position', 'absolute', 'important');
                    container.style.setProperty('top', '-9999px', 'important');
                    container.style.setProperty('left', '-9999px', 'important');
                    container.classList.remove('active');
                });
            }
            
            // 显示加载界面
            this.showLoadingScreen();
            
            // 初始化UI组件
            this.initUI();
            
            // 初始化地图
            this.initMap();
            
            // 初始化图表
            this.initCharts();
            
            // 绑定事件
            this.bindEvents();
            
            // 加载初始数据
            await this.loadInitialData();
            
            // 隐藏加载界面
            this.hideLoadingScreen();
            
            // 启动自动刷新（如果启用）
            if (this.config.autoRefresh) {
                this.startAutoRefresh();
            }
            
            console.log('应用初始化完成');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showError('应用初始化失败: ' + error.message);
        }
    }

    /**
     * 显示加载界面
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    /**
     * 隐藏加载界面
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const mainApp = document.getElementById('main-app');
        
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                // 显示主应用界面
                if (mainApp) {
                    mainApp.classList.remove('hidden');
                }
            }, 500);
        }
    }

    /**
     * 初始化UI组件
     */
    initUI() {
        // Edge浏览器特殊处理 - 初始状态强制清理
        if (navigator.userAgent.includes('Edg')) {
            console.log('Edge浏览器：初始化时强制清理视图状态');
            document.querySelectorAll('.view-container').forEach(container => {
                container.style.setProperty('display', 'none', 'important');
                container.style.setProperty('visibility', 'hidden', 'important');
                container.style.setProperty('opacity', '0', 'important');
                container.style.setProperty('position', 'absolute', 'important');
                container.style.setProperty('top', '-9999px', 'important');
                container.style.setProperty('left', '-9999px', 'important');
                container.style.setProperty('width', '0', 'important');
                container.style.setProperty('height', '0', 'important');
                container.style.setProperty('overflow', 'hidden', 'important');
                container.style.setProperty('z-index', '-9999', 'important');
                container.classList.remove('active');
            });
            
            // 延迟后显示仪表板
            setTimeout(() => {
                this.renderDashboard();
            }, 100);
        }
        
        // 初始化导航
        this.initNavigation();
        
        // 初始化侧边栏
        this.initSidebar();
        
        // 初始化控制面板
        this.initControls();
        
        // 初始化模态框
        this.initModals();
    }

    /**
     * 初始化导航
     */
    initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                if (view) {
                    this.switchView(view);
                }
            });
        });
    }

    /**
     * 初始化侧边栏
     */
    initSidebar() {
        // 筛选器事件
        const filterInputs = document.querySelectorAll('.filter-input');
        filterInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateFilter(input.name, input.value);
            });
        });

        // 搜索功能
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.performSearch(e.target.value);
            }, 300));
        }

        // 时间范围选择
        const timeRangeSelect = document.getElementById('time-range');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.updateFilter('timeRange', e.target.value);
            });
        }
    }

    /**
     * 初始化控制面板
     */
    initControls() {
        // 自动刷新开关
        const autoRefreshToggle = document.getElementById('auto-refresh');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                this.config.autoRefresh = e.target.checked;
                if (this.config.autoRefresh) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        // 动画开关
        const animationToggle = document.getElementById('enable-animation');
        if (animationToggle) {
            animationToggle.addEventListener('change', (e) => {
                this.config.animationEnabled = e.target.checked;
                if (this.map) {
                    this.map.animationEnabled = this.config.animationEnabled;
                }
            });
        }

        // 主题切换
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // 刷新按钮
        const refreshBtn = document.getElementById('refresh-data');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // 重置视图按钮
        const resetViewBtn = document.getElementById('reset-view');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => {
                this.resetMapView();
            });
        }

        // 导出网络按钮
        const exportNetworkBtn = document.getElementById('export-network');
        if (exportNetworkBtn) {
            exportNetworkBtn.addEventListener('click', () => {
                this.exportNetwork();
            });
        }
    }

    /**
     * 初始化模态框
     */
    initModals() {
        // 详情模态框
        const modal = document.getElementById('detail-modal');
        if (modal) {
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeModal('detail-modal');
                });
            }

            // 点击模态框外部关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal('detail-modal');
                }
            });
        }
    }

    /**
     * 初始化地图
     */
    initMap() {
        try {
            // 检查地图容器是否存在
            const mapContainer = document.getElementById('network-map');
            if (!mapContainer) {
                console.warn('地图容器未找到，跳过地图初始化');
                return;
            }

            // 清理现有地图实例
            if (this.map) {
                this.map.remove();
                this.map = null;
            }

            // 初始化地图
            this.map = L.map('network-map').setView([31.2304, 121.4737], 8);

            // 添加地图图层
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            // 添加地图控件
            this.map.addControl(new L.Control.Scale());

            // 绑定地图事件
            this.bindMapEvents();
            
        } catch (error) {
            console.error('地图初始化失败:', error);
            this.showError('地图初始化失败: ' + error.message);
        }
    }

    /**
     * 绑定地图事件
     */
    bindMapEvents() {
        // 节点选择事件
        window.addEventListener('nodeSelected', (e) => {
            this.handleNodeSelection(e.detail);
        });

        // 路线选择事件
        window.addEventListener('routeSelected', (e) => {
            this.handleRouteSelection(e.detail);
        });

        // 详情查看事件
        window.addEventListener('viewNodeDetails', (e) => {
            this.showNodeDetails(e.detail.nodeId);
        });

        window.addEventListener('viewRouteDetails', (e) => {
            this.showRouteDetails(e.detail.routeId);
        });

        window.addEventListener('viewConnectedRoutes', (e) => {
            this.showConnectedRoutes(e.detail.nodeId);
        });

        window.addEventListener('viewRouteShipments', (e) => {
            this.showRouteShipments(e.detail.routeId);
        });
    }

    /**
     * 初始化图表
     */
    initCharts() {
        try {
            // 销毁现有图表
            this.destroyAllCharts();
            
            // 初始化各种图表组件
            this.charts.summaryChart = this.createSummaryChart();
            this.charts.priorityChart = this.createPriorityChart();
            this.charts.utilizationChart = this.createUtilizationChart();
            this.charts.matchingChart = this.createMatchingChart();
            
            this.chartsInitialized = true;
            console.log('图表初始化完成');
        } catch (error) {
            console.error('图表初始化失败:', error);
            this.showError('图表初始化失败: ' + error.message);
        }
    }

    /**
     * 创建汇总图表
     */
    createSummaryChart() {
        const ctx = document.getElementById('summary-chart');
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['货物', '路线', '匹配'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    /**
     * 创建优先级图表
     */
    createPriorityChart() {
        const ctx = document.getElementById('priority-chart');
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['最高优先级', '高优先级', '中等优先级', '低优先级'],
                datasets: [{
                    label: '货物数量',
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#ef4444',
                        '#f59e0b',
                        '#3b82f6',
                        '#6b7280'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * 创建利用率图表
     */
    createUtilizationChart() {
        const ctx = document.getElementById('utilization-chart');
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '平均利用率',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    /**
     * 创建匹配图表
     */
    createMatchingChart() {
        const ctx = document.getElementById('matching-chart');
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['匹配成功率', '路线利用率', '成本效率', '时间效率', '满意度'],
                datasets: [{
                    label: '当前状态',
                    data: [0, 0, 0, 0, 0],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    pointBackgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    /**
     * 销毁所有图表
     */
    destroyAllCharts() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
                this.charts[key] = null;
            }
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 数据加载事件
        dataLoader.subscribe((event) => {
            this.handleDataEvent(event);
        });

        // 窗口大小变化
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    /**
     * 处理数据事件
     */
    handleDataEvent(event) {
        switch (event.type) {
            case 'loading_start':
                this.showLoadingIndicator();
                break;
            case 'data_loaded':
                this.updateData(event.data);
                this.updateCharts(event.data);
                this.updateMap(event.data);
                break;
            case 'loading_error':
                this.showError('数据加载失败: ' + event.error);
                break;
            case 'loading_end':
                this.hideLoadingIndicator();
                break;
        }
    }

    /**
     * 加载初始数据
     */
    async loadInitialData() {
        try {
            console.log('开始加载初始数据...');
            const data = await dataLoader.loadAllData();
            console.log('初始数据加载完成:', data);
            this.updateData(data);
            this.updateCharts(data);
            this.updateMap(data);
        } catch (error) {
            console.error('初始数据加载失败:', error);
            this.showError('初始数据加载失败: ' + error.message);
        }
    }

    /**
     * 更新数据
     */
    updateData(data) {
        this.data = data;
        this.updateStatistics();
        this.updateTables();
    }

    /**
     * 更新统计信息
     */
    updateStatistics() {
        if (!this.data) return;

        const { shipments, routes, matching } = this.data;
        
        // 更新统计卡片
        this.updateStatCard('total-shipments', shipments?.shipments?.length || 0);
        this.updateStatCard('total-routes', routes?.routes?.length || 0);
        this.updateStatCard('matched-pairs', matching?.matchings?.length || 0);
        
        // 计算平均利用率
        const avgUtilization = routes?.routes?.reduce((sum, route) => sum + (route.utilization_rate || 0), 0) / (routes?.routes?.length || 1);
        this.updateStatCard('avg-utilization', avgUtilization || 0);
    }

    /**
     * 更新统计卡片
     */
    updateStatCard(id, value) {
        const card = document.getElementById(id);
        if (card) {
            const valueElement = card.querySelector('.stat-value');
            if (valueElement) {
                // 添加动画效果
                this.animateValue(valueElement, parseFloat(valueElement.textContent) || 0, value, 1000);
            }
        }
    }

    /**
     * 数值动画
     */
    animateValue(element, start, end, duration) {
        const startTime = performance.now();
        const isPercentage = element.textContent.includes('%');
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (end - start) * this.easeOutQuart(progress);
            
            if (isPercentage) {
                element.textContent = current.toFixed(1) + '%';
            } else if (Number.isInteger(end)) {
                element.textContent = Math.round(current).toLocaleString();
            } else {
                element.textContent = current.toFixed(1);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * 缓动函数
     */
    easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }

    /**
     * 更新图表
     */
    updateCharts(data) {
        if (!data) return;

        const { shipments, routes, matching } = data;

        // 更新汇总图表
        if (this.charts.summaryChart) {
            this.charts.summaryChart.data.datasets[0].data = [
                shipments?.shipments?.length || 0,
                routes?.routes?.length || 0,
                matching?.matchings?.length || 0
            ];
            this.charts.summaryChart.update('active');
        }

        // 更新优先级图表 - 使用实际数据或默认值
        if (this.charts.priorityChart) {
            let priorityData = [0, 0, 0, 0]; // 最高优先级, 高优先级, 中等优先级, 低优先级
            
            if (shipments?.shipments) {
                // 计算优先级分布
                const priorityBreakdown = {1: 0, 2: 0, 3: 0, 4: 0};
                shipments.shipments.forEach(shipment => {
                    const priority = shipment.priority || 2;
                    priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;
                });
                priorityData = [priorityBreakdown[4] || 0, priorityBreakdown[3] || 0, priorityBreakdown[2] || 0, priorityBreakdown[1] || 0];
            }
            
            this.charts.priorityChart.data.datasets[0].data = priorityData;
            this.charts.priorityChart.update('active');
        }

        // 更新利用率图表
        if (this.charts.utilizationChart && routes?.routes) {
            const utilizationData = routes.routes.slice(0, 10).map(route => ({
                label: route.route_id,
                value: (route.utilization_rate || 0) * 100
            }));
            
            this.charts.utilizationChart.data.labels = utilizationData.map(d => d.label);
            this.charts.utilizationChart.data.datasets[0].data = utilizationData.map(d => d.value);
            this.charts.utilizationChart.update('active');
        }

        // 更新匹配图表 - 使用实际数据或默认值
        if (this.charts.matchingChart) {
            const stats = matching?.statistics || {};
            const chartData = [
                (stats.matching_rate || 0) * 100,
                (stats.avg_utilization || 0) * 100,
                (stats.cost_efficiency || 0.7) * 100,
                (stats.time_efficiency || 0.8) * 100,
                (stats.satisfaction || 0.85) * 100
            ];
            
            this.charts.matchingChart.data.datasets[0].data = chartData;
            this.charts.matchingChart.update('active');
        }
    }

    /**
     * 更新地图
     */
    updateMap(data) {
        if (!this.map || !data) return;

        const { network, routes } = data;

        // 清除现有标记
        this.map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                this.map.removeLayer(layer);
            }
        });

        // 显示网络节点
        if (network?.nodes) {
            network.nodes.forEach(node => {
                // 使用location对象中的经纬度，如果没有则使用默认位置
                const lat = node.latitude || node.location?.lat || 31.2304;
                const lng = node.longitude || node.location?.lng || 121.4737;
                
                L.marker([lat, lng])
                    .addTo(this.map)
                    .bindPopup(`<b>${node.name || node.node_id}</b><br>${node.type || '节点'}`);
            });
        }

        // 显示路线
        if (routes?.routes && network?.nodes) {
            routes.routes.forEach(route => {
                // 获取起点和终点的节点信息
                const originNode = network.nodes.find(n => n.id === route.origin_node || n.node_id === route.origin_node);
                const destNode = network.nodes.find(n => n.id === route.destination_node || n.node_id === route.destination_node);
                
                if (originNode && destNode) {
                    // 获取节点位置
                    const originLat = originNode.latitude || originNode.location?.lat || 31.2304;
                    const originLng = originNode.longitude || originNode.location?.lng || 121.4737;
                    const destLat = destNode.latitude || destNode.location?.lat || 31.2304;
                    const destLng = destNode.longitude || destNode.location?.lng || 121.4737;
                    
                    const coords = [
                        [originLat, originLng],
                        [destLat, destLng]
                    ];
                    
                    L.polyline(coords, { color: '#3b82f6', weight: 3 })
                        .addTo(this.map)
                        .bindPopup(`<b>${route.route_id}</b><br>利用率: ${(route.utilization_rate * 100).toFixed(1)}%`);
                }
            });
        }
    }

    /**
     * 更新表格
     */
    updateTables() {
        // 更新货物表格
        this.updateShipmentsTable();
        
        // 更新路线表格
        this.updateRoutesTable();
        
        // 更新匹配表格
        this.updateMatchingTable();
    }

    /**
     * 更新货物表格
     */
    updateShipmentsTable() {
        const table = document.getElementById('shipments-table');
        if (!table || !this.data?.shipments?.shipments) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = this.data.shipments.shipments.map(shipment => {
            const priorityInfo = shipment.priorityInfo || dataFormatter.formatPriority(shipment.priority || 2);
            const statusInfo = shipment.statusInfo || { type: 'pending', name: '待匹配' };
            
            return `
            <tr data-shipment-id="${shipment.shipment_id}">
                <td>${shipment.shipment_id}</td>
                <td>${shipment.origin_node}</td>
                <td>${shipment.destination_node}</td>
                <td>${dataFormatter.formatWeight(shipment.weight)}</td>
                <td>${dataFormatter.formatVolume(shipment.volume)}</td>
                <td>
                    <span class="priority-badge" style="background-color: ${priorityInfo.color}">
                        ${priorityInfo.name}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusInfo.type}">
                        ${statusInfo.name}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="app.viewShipmentDetails('${shipment.shipment_id}')" title="查看详情">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `}).join('');
    }

    /**
     * 更新路线表格
     */
    updateRoutesTable() {
        const table = document.getElementById('routes-table');
        if (!table || !this.data?.routes?.routes) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = this.data.routes.routes.map(route => {
            const utilizationRate = route.utilization_rate || 0;
            const displayUtilization = Math.min(utilizationRate * 100, 100);
            
            return `
            <tr data-route-id="${route.route_id}">
                <td>${route.route_id}</td>
                <td>${route.origin_node}</td>
                <td>${route.destination_node}</td>
                <td>${dataFormatter.formatWeight(route.capacity_weight)}</td>
                <td>${dataFormatter.formatVolume(route.capacity_volume)}</td>
                <td>
                    <div class="utilization-cell">
                        <div class="utilization-bar" style="width: ${displayUtilization}%; background-color: ${this.getUtilizationColor(utilizationRate)}"></div>
                        <span class="utilization-text">${(utilizationRate * 100).toFixed(1)}%</span>
                    </div>
                </td>
                <td>${dataFormatter.formatDistance(route.distance)}</td>
                <td>${dataFormatter.formatTime(route.estimated_time)}</td>
                <td>
                    <button class="btn-icon" onclick="app.viewRouteDetails('${route.route_id}')" title="查看详情">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `}).join('');
    }

    /**
     * 更新匹配表格
     */
    updateMatchingTable() {
        const table = document.getElementById('matching-table');
        if (!table || !this.data?.matching?.matchings) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = this.data.matching.matchings.map(matching => `
            <tr data-matching-id="${matching.matching_id}">
                <td>${matching.matching_id}</td>
                <td>${matching.shipment_id}</td>
                <td>${matching.route_id}</td>
                <td>${dataFormatter.formatWeight(matching.allocated_weight)}</td>
                <td>${dataFormatter.formatVolume(matching.allocated_volume)}</td>
                <td>${dataFormatter.formatCost(matching.total_cost)}</td>
                <td>${dataFormatter.formatTime(matching.delivery_time)}</td>
                <td>
                    <span class="status-badge ${matching.statusInfo.type}">
                        ${matching.statusInfo.name}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="app.viewMatchingDetails('${matching.matching_id}')" title="查看详情">
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * 获取利用率颜色
     */
    getUtilizationColor(utilization) {
        if (utilization >= 0.9) return '#ef4444';
        if (utilization >= 0.7) return '#f59e0b';
        return '#10b981';
    }

    /**
     * 清理视图内容
     */
    async cleanupView(viewName) {
        // Edge浏览器特殊处理 - 强制深度清理
        if (navigator.userAgent.includes('Edg')) {
            console.log('Edge浏览器：执行深度视图清理');
            
            // 强制隐藏所有视图容器 - 使用多种方式确保完全隐藏
            document.querySelectorAll('.view-container').forEach((container, index) => {
                // 使用setProperty来确保!important优先级
                container.style.setProperty('display', 'none', 'important');
                container.style.setProperty('visibility', 'hidden', 'important');
                container.style.setProperty('opacity', '0', 'important');
                container.style.setProperty('position', 'absolute', 'important');
                container.style.setProperty('top', '-9999px', 'important');
                container.style.setProperty('left', '-9999px', 'important');
                container.style.setProperty('width', '0', 'important');
                container.style.setProperty('height', '0', 'important');
                container.style.setProperty('overflow', 'hidden', 'important');
                
                // 移除active类
                container.classList.remove('active');
                
                // 强制重绘
                container.offsetHeight;
            });
            
            // 延迟确保清理完成
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('Edge浏览器：深度清理完成');
            return;
        }
        
        // 普通浏览器的清理逻辑
        document.querySelectorAll('.view-container').forEach(container => {
            container.style.display = 'none';
            container.classList.remove('active');
            container.style.visibility = 'hidden';
            container.style.opacity = '0';
        });
        
        // 清理地图实例
        if (viewName === 'network' && this.networkMap) {
            // 保持网络图地图实例，但隐藏容器
            const mapContainer = document.getElementById('map-container');
            if (mapContainer) {
                mapContainer.style.display = 'none';
            }
        }
        
        // 清理图表
        if (this.charts) {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    // 不销毁图表，只隐藏容器
                }
            });
        }
    }

    /**
     * 切换视图
     */
    async switchView(viewName) {
        if (this.currentView === viewName) return;

        console.log(`切换视图: ${this.currentView} -> ${viewName}`);

        // 清理当前视图
        if (this.currentView) {
            await this.cleanupView(this.currentView);
        }

        // 更新导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // 显示目标视图
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            // Edge浏览器特殊处理 - 强制重置样式
            if (navigator.userAgent.includes('Edg')) {
                console.log('Edge浏览器：强制显示目标视图');
                targetView.style.setProperty('display', 'block', 'important');
                targetView.style.setProperty('visibility', 'visible', 'important');
                targetView.style.setProperty('opacity', '1', 'important');
                targetView.style.setProperty('position', 'relative', 'important');
                targetView.style.setProperty('top', '0', 'important');
                targetView.style.setProperty('left', '0', 'important');
                targetView.style.setProperty('width', 'auto', 'important');
                targetView.style.setProperty('height', 'auto', 'important');
                targetView.style.setProperty('overflow', 'visible', 'important');
            } else {
                targetView.style.display = 'block';
                targetView.style.visibility = 'visible';
                targetView.style.opacity = '1';
            }
            targetView.classList.add('active');
            console.log(`显示视图: ${viewName}-view`);
        }

        this.currentView = viewName;

        // 触发视图切换事件
        this.triggerEvent('viewChanged', { view: viewName });

        // 重新渲染当前视图
        this.renderCurrentView();
    }

    /**
     * 渲染当前视图
     */
    renderCurrentView() {
        switch (this.currentView) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'network':
                this.renderNetwork();
                break;
            case 'matching':
                this.renderMatching();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
        }
    }

    /**
     * 渲染仪表板
     */
    renderDashboard() {
        console.log('渲染仪表板视图');
        
        // 确保仪表板视图容器正确显示
        const dashboardView = document.getElementById('dashboard-view');
        if (dashboardView) {
            // Edge浏览器特殊处理
            if (navigator.userAgent.includes('Edg')) {
                dashboardView.style.setProperty('display', 'block', 'important');
                dashboardView.style.setProperty('visibility', 'visible', 'important');
                dashboardView.style.setProperty('opacity', '1', 'important');
                dashboardView.style.setProperty('position', 'relative', 'important');
                dashboardView.style.setProperty('top', '0', 'important');
                dashboardView.style.setProperty('left', '0', 'important');
                dashboardView.style.setProperty('width', 'auto', 'important');
                dashboardView.style.setProperty('height', 'auto', 'important');
                dashboardView.style.setProperty('overflow', 'visible', 'important');
                dashboardView.style.setProperty('z-index', 'auto', 'important');
            }
            
            // 确保active类存在
            dashboardView.classList.add('active');
            
            // 触发重绘确保样式生效
            dashboardView.offsetHeight;
        }
        
        // 更新所有仪表板组件
        this.updateDashboardComponents();
    }
    
    /**
     * 更新仪表板组件
     */
    updateDashboardComponents() {
        // 更新统计卡片
        this.updateStatsCards();
        
        // 更新表格
        this.updateTables();
        
        // 更新地图
        if (this.map) {
            this.map.invalidateSize();
        }
        
        console.log('仪表板组件更新完成');
    }

    /**
     * 渲染网络视图
     */
    renderNetwork() {
        // 初始化网络图视图的地图（如果还没有初始化）
        if (!this.networkMap) {
            this.initNetworkMap();
        } else {
            // 确保地图容器可见
            const mapContainer = document.getElementById('map-container');
            if (mapContainer) {
                mapContainer.style.display = 'block';
            }
            // 重新调整地图大小
            setTimeout(() => {
                if (this.networkMap) {
                    this.networkMap.invalidateSize();
                }
            }, 100);
        }
        
        // 初始化拓扑图（如果还没有初始化）
        if (!this.topologyInitialized) {
            this.initTopologyGraph();
        }
        
        if (this.map) {
            this.map.resetView();
        }
    }

    /**
     * 初始化网络图地图
     */
    initNetworkMap() {
        try {
            // 检查网络图地图容器是否存在
            const networkMapContainer = document.getElementById('map-container');
            if (!networkMapContainer) {
                console.warn('网络图地图容器未找到，跳过网络图地图初始化');
                return;
            }

            // 如果已经存在网络图地图实例，先清理
            if (this.networkMap) {
                this.networkMap.remove();
                this.networkMap = null;
            }

            // 初始化网络图地图
            this.networkMap = L.map('map-container').setView([31.2304, 121.4737], 8);

            // 添加地图图层
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.networkMap);

            console.log('网络图地图初始化完成');
            
        } catch (error) {
            console.error('网络图地图初始化失败:', error);
            this.showError('网络图地图初始化失败: ' + error.message);
        }
    }

    /**
     * 重置网络图视图
     */
    resetMapView() {
        if (this.networkMap) {
            this.networkMap.setView([31.2304, 121.4737], 8);
        }
        if (this.map) {
            this.map.setView([31.2304, 121.4737], 8);
        }
    }

    /**
     * 导出网络数据
     */
    exportNetwork() {
        try {
            if (!this.data || !this.data.network) {
                this.showError('没有可用的网络数据');
                return;
            }

            const networkData = {
                nodes: this.data.network.nodes || [],
                routes: this.data.routes?.routes || [],
                timestamp: new Date().toISOString()
            };

            const dataStr = JSON.stringify(networkData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `network_data_${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            
            URL.revokeObjectURL(link.href);
            this.showSuccess('网络数据导出成功');
            
        } catch (error) {
            console.error('导出网络数据失败:', error);
            this.showError('导出网络数据失败: ' + error.message);
        }
    }

    /**
     * 初始化拓扑图
     */
    initTopologyGraph() {
        try {
            const topologyContainer = document.getElementById('topology-graph');
            if (!topologyContainer) {
                console.warn('拓扑图容器未找到');
                return;
            }

            // 设置容器尺寸
            topologyContainer.style.width = '100%';
            topologyContainer.style.height = '400px';
            
            // 创建基本的SVG容器
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.border = '1px solid #ddd';
            svg.style.borderRadius = '8px';
            
            // 添加标题
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            title.setAttribute('x', '50%');
            title.setAttribute('y', '30');
            title.setAttribute('text-anchor', 'middle');
            title.setAttribute('font-size', '16');
            title.setAttribute('fill', '#333');
            title.textContent = '网络拓扑图（示例）';
            svg.appendChild(title);
            
            // 添加一些示例节点
            const nodes = [
                { x: 100, y: 100, label: '上海' },
                { x: 300, y: 100, label: '北京' },
                { x: 200, y: 200, label: '中转站' },
                { x: 400, y: 200, label: '广州' }
            ];
            
            // 添加连接线
            const connections = [
                [0, 2], [1, 2], [2, 3]
            ];
            
            // 绘制连接线
            connections.forEach(([from, to]) => {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', nodes[from].x);
                line.setAttribute('y1', nodes[from].y);
                line.setAttribute('x2', nodes[to].x);
                line.setAttribute('y2', nodes[to].y);
                line.setAttribute('stroke', '#999');
                line.setAttribute('stroke-width', '2');
                svg.appendChild(line);
            });
            
            // 绘制节点
            nodes.forEach((node, index) => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', node.x);
                circle.setAttribute('cy', node.y);
                circle.setAttribute('r', '20');
                circle.setAttribute('fill', index === 2 ? '#4CAF50' : '#2196F3');
                circle.setAttribute('stroke', '#fff');
                circle.setAttribute('stroke-width', '2');
                circle.style.cursor = 'pointer';
                
                // 添加节点标签
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', node.x);
                text.setAttribute('y', node.y + 35);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-size', '12');
                text.setAttribute('fill', '#333');
                text.textContent = node.label;
                
                svg.appendChild(circle);
                svg.appendChild(text);
            });
            
            topologyContainer.appendChild(svg);
            this.topologyInitialized = true;
            
            console.log('拓扑图初始化完成');
            
        } catch (error) {
            console.error('拓扑图初始化失败:', error);
            this.showError('拓扑图初始化失败: ' + error.message);
        }
    }

    /**
     * 渲染匹配视图
     */
    renderMatching() {
        this.updateMatchingTable();
    }

    /**
     * 渲染分析视图
     */
    renderAnalytics() {
        // 重新渲染图表
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.resize();
        });
    }

    /**
     * 处理节点选择
     */
    handleNodeSelection(node) {
        console.log('节点选择:', node);
        // 可以在这里添加节点选择后的处理逻辑
    }

    /**
     * 处理路线选择
     */
    handleRouteSelection(route) {
        console.log('路线选择:', route);
        // 可以在这里添加路线选择后的处理逻辑
    }

    /**
     * 显示节点详情
     */
    showNodeDetails(nodeId) {
        const node = this.data?.network?.nodes?.find(n => n.node_id === nodeId);
        if (!node) return;

        this.showModal('detail-modal', {
            title: `节点详情 - ${node.node_name}`,
            content: this.generateNodeDetailsHTML(node)
        });
    }

    /**
     * 显示路线详情
     */
    showRouteDetails(routeId) {
        const route = this.data?.routes?.routes?.find(r => r.route_id === routeId);
        if (!route) return;

        this.showModal('detail-modal', {
            title: `路线详情 - ${route.route_id}`,
            content: this.generateRouteDetailsHTML(route)
        });
    }

    /**
     * 生成节点详情HTML
     */
    generateNodeDetailsHTML(node) {
        return `
            <div class="detail-content">
                <div class="detail-section">
                    <h4>基本信息</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="label">节点ID:</span>
                            <span class="value">${node.node_id}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">节点名称:</span>
                            <span class="value">${node.node_name}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">节点类型:</span>
                            <span class="value">${node.node_type || '未知'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">处理能力:</span>
                            <span class="value">${node.capacity || '未设置'}</span>
                        </div>
                    </div>
                </div>
                <div class="detail-section">
                    <h4>地理位置</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="label">纬度:</span>
                            <span class="value">${node.location?.lat?.toFixed(6) || '未知'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">经度:</span>
                            <span class="value">${node.location?.lng?.toFixed(6) || '未知'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 生成路线详情HTML
     */
    generateRouteDetailsHTML(route) {
        return `
            <div class="detail-content">
                <div class="detail-section">
                    <h4>基本信息</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="label">路线ID:</span>
                            <span class="value">${route.route_id}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">起点:</span>
                            <span class="value">${route.origin_node}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">终点:</span>
                            <span class="value">${route.destination_node}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">总容量:</span>
                            <span class="value">${dataFormatter.formatNumber(route.capacity)} 吨</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">当前负载:</span>
                            <span class="value">${dataFormatter.formatNumber(route.current_load)} 吨</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">利用率:</span>
                            <span class="value">${dataFormatter.formatPercentage(route.utilization_rate)}</span>
                        </div>
                    </div>
                </div>
                <div class="detail-section">
                    <h4>成本和时间</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="label">运输成本:</span>
                            <span class="value">${dataFormatter.formatCost(route.cost)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">运输时间:</span>
                            <span class="value">${dataFormatter.formatTime(route.travel_time)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 显示模态框
     */
    showModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const titleElement = modal.querySelector('.modal-title');
        const contentElement = modal.querySelector('.modal-content');

        if (titleElement && options.title) {
            titleElement.textContent = options.title;
        }

        if (contentElement && options.content) {
            contentElement.innerHTML = options.content;
        }

        modal.style.display = 'flex';
        
        // 添加显示动画
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    /**
     * 关闭模态框
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('show');
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    /**
     * 更新筛选器
     */
    updateFilter(filterName, value) {
        this.filters[filterName] = value;
        this.applyFilters();
    }

    /**
     * 应用筛选器
     */
    applyFilters() {
        // 根据当前筛选条件过滤数据
        const filteredData = this.filterData(this.data, this.filters);
        
        // 更新显示
        this.updateData(filteredData);
        this.updateCharts(filteredData);
        this.updateMap(filteredData);
    }

    /**
     * 过滤数据
     */
    filterData(data, filters) {
        if (!data) return data;

        let filteredData = { ...data };

        // 根据优先级过滤
        if (filters.priority !== 'all') {
            if (filteredData.shipments?.shipments) {
                filteredData.shipments.shipments = filteredData.shipments.shipments.filter(
                    shipment => shipment.priority == filters.priority
                );
            }
        }

        // 根据状态过滤
        if (filters.status !== 'all') {
            if (filteredData.matching?.matchings) {
                filteredData.matching.matchings = filteredData.matching.matchings.filter(
                    matching => matching.status === filters.status
                );
            }
        }

        return filteredData;
    }

    /**
     * 执行搜索
     */
    performSearch(query) {
        if (!query.trim()) {
            this.applyFilters();
            return;
        }

        // 在数据中搜索匹配项
        const searchResults = this.searchData(this.data, query);
        
        // 更新显示
        this.updateData(searchResults);
        this.updateCharts(searchResults);
        this.updateMap(searchResults);
    }

    /**
     * 搜索数据
     */
    searchData(data, query) {
        if (!data) return data;

        const lowerQuery = query.toLowerCase();
        
        let searchResults = { ...data };

        // 搜索货物
        if (searchResults.shipments?.shipments) {
            searchResults.shipments.shipments = searchResults.shipments.shipments.filter(
                shipment => 
                    shipment.shipment_id.toLowerCase().includes(lowerQuery) ||
                    shipment.origin_node.toLowerCase().includes(lowerQuery) ||
                    shipment.destination_node.toLowerCase().includes(lowerQuery)
            );
        }

        // 搜索路线
        if (searchResults.routes?.routes) {
            searchResults.routes.routes = searchResults.routes.routes.filter(
                route => 
                    route.route_id.toLowerCase().includes(lowerQuery) ||
                    route.origin_node.toLowerCase().includes(lowerQuery) ||
                    route.destination_node.toLowerCase().includes(lowerQuery)
            );
        }

        return searchResults;
    }

    /**
     * 刷新数据
     */
    async refreshData() {
        try {
            const data = await dataLoader.refreshData();
            this.updateData(data);
            this.updateCharts(data);
            this.updateMap(data);
            this.showSuccess('数据已刷新');
        } catch (error) {
            console.error('数据刷新失败:', error);
            this.showError('数据刷新失败: ' + error.message);
        }
    }

    /**
     * 启动自动刷新
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, this.config.refreshInterval);
    }

    /**
     * 停止自动刷新
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        this.config.theme = this.config.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.config.theme);
        
        // 更新图表主题
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.options.plugins.legend.labels.color = this.config.theme === 'dark' ? '#e5e7eb' : '#374151';
                chart.update();
            }
        });
    }

    /**
     * 显示加载指示器
     */
    showLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'block';
        }
    }

    /**
     * 隐藏加载指示器
     */
    hideLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * 显示成功消息
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 重新渲染图表
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.resize();
        });
    }

    /**
     * 处理键盘快捷键
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + R: 刷新数据
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.refreshData();
        }
        
        // Ctrl/Cmd + F: 聚焦搜索
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }

    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 触发事件
     */
    triggerEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }

    /**
     * 添加事件监听器
     */
    addEventListener(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
        
        window.addEventListener(eventName, callback);
    }

    /**
     * 移除事件监听器
     */
    removeEventListener(eventName, callback) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
                window.removeEventListener(eventName, callback);
            }
        }
    }

    /**
     * 销毁应用
     */
    destroy() {
        // 停止自动刷新
        this.stopAutoRefresh();
        
        // 销毁地图
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        // 销毁网络图地图
        if (this.networkMap) {
            this.networkMap.remove();
            this.networkMap = null;
        }
        
        // 销毁图表
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        
        // 移除事件监听器
        this.eventListeners.forEach((listeners, eventName) => {
            listeners.forEach(callback => {
                window.removeEventListener(eventName, callback);
            });
        });
        
        this.eventListeners.clear();
    }
}

// 创建全局应用实例
let app;

/**
 * 初始化应用
 */
function initApp() {
    app = new LogisticsApp();
    return app;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LogisticsApp, initApp };
}