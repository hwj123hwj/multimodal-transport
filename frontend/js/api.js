/**
 * API 服务模块
 * 处理与后端的所有数据交互
 */

class APIService {
    constructor() {
        this.baseURL = 'http://localhost:8000/api';
        this.timeout = 30000; // 30秒超时
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1秒重试延迟
    }

    /**
     * 统一的请求方法
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        let lastError;
        
        for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
            try {
                console.log(`尝试请求: ${url} (尝试 ${attempt + 1}/${this.retryAttempts})`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal,
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log(`请求成功: ${url}`);
                return data;
                
            } catch (error) {
                lastError = error;
                console.error(`请求失败: ${url} - ${error.message}`);
                
                if (attempt < this.retryAttempts - 1) {
                    // 等待重试延迟
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
                    continue;
                }
            }
        }
        
        throw new Error(`API请求失败 (${endpoint}): ${lastError.message}`);
    }

    /**
     * 获取网络节点数据
     */
    async getNetworkNodes() {
        return this.request('/network');
    }

    /**
     * 获取货物数据
     */
    async getShipments() {
        return this.request('/shipments');
    }

    /**
     * 获取路线数据
     */
    async getRoutes() {
        return this.request('/routes');
    }

    /**
     * 获取匹配结果
     */
    async getMatchingResults() {
        return this.request('/matching-result');
    }

    /**
     * 获取所有匹配结果
     */
    async getAllMatchings() {
        try {
            const response = await this.request('/matching/');
            return response.data;
        } catch (error) {
            console.error('获取所有匹配结果失败:', error);
            throw error;
        }
    }

    /**
     * 获取匹配摘要
     */
    async getMatchingSummary() {
        try {
            const response = await this.request('/matching/summary');
            return response.data;
        } catch (error) {
            console.error('获取匹配摘要失败:', error);
            throw error;
        }
    }

    /**
     * 根据目的地搜索货物
     */
    async searchShipmentsByDestination(destinationId) {
        try {
            const response = await this.request(`/search/shipments?destination=${destinationId}`);
            return response;
        } catch (error) {
            console.error('搜索货物失败:', error);
            throw error;
        }
    }

    /**
     * 根据节点筛选路线
     */
    async filterRoutesByNodes(origin, destination) {
        try {
            const params = new URLSearchParams();
            if (origin) params.append('origin', origin);
            if (destination) params.append('destination', destination);
            
            const response = await this.request(`/filter/routes?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('筛选路线失败:', error);
            throw error;
        }
    }

    /**
     * 根据容量条件筛选路线
     */
    async filterRoutesByCapacity(minAvailableCapacity, maxUtilizationRate) {
        try {
            const params = new URLSearchParams();
            if (minAvailableCapacity) params.append('min_available_capacity', minAvailableCapacity);
            if (maxUtilizationRate) params.append('max_utilization_rate', maxUtilizationRate);
            
            const response = await this.request(`/filter/routes-by-capacity?${params.toString()}`);
            return response;
        } catch (error) {
            console.error('按容量筛选路线失败:', error);
            throw error;
        }
    }

    /**
     * 获取特定货物的匹配结果
     */
    async getShipmentMatching(shipmentId) {
        try {
            const response = await this.request(`/matching/shipment/${shipmentId}`);
            return response.data;
        } catch (error) {
            console.error(`获取货物 ${shipmentId} 匹配结果失败:`, error);
            throw error;
        }
    }

    /**
     * 获取特定路线的匹配结果
     */
    async getRouteMatching(routeId) {
        try {
            const response = await this.request(`/matching/route/${routeId}`);
            return response.data;
        } catch (error) {
            console.error(`获取路线 ${routeId} 匹配结果失败:`, error);
            throw error;
        }
    }

    /**
     * 获取所有数据（并行请求）
     */
    async getAllData() {
        try {
            console.log('开始并行加载所有数据...');
            const [networkData, shipmentsData, routesData, matchingData] = await Promise.allSettled([
                this.getNetworkNodes(),
                this.getShipments(),
                this.getRoutes(),
                this.getMatchingResults()
            ]);

            console.log('数据加载完成:', {
                network: networkData.status,
                shipments: shipmentsData.status,
                routes: routesData.status,
                matching: matchingData.status
            });

            const result = {
                network: networkData.status === 'fulfilled' ? networkData.value : null,
                shipments: shipmentsData.status === 'fulfilled' ? shipmentsData.value : null,
                routes: routesData.status === 'fulfilled' ? routesData.value : null,
                matching: matchingData.status === 'fulfilled' ? matchingData.value : null,
                errors: [
                    networkData.status === 'rejected' ? networkData.reason : null,
                    shipmentsData.status === 'rejected' ? shipmentsData.reason : null,
                    routesData.status === 'rejected' ? routesData.reason : null,
                    matchingData.status === 'rejected' ? matchingData.reason : null
                ].filter(Boolean)
            };

            if (result.errors.length > 0) {
                console.error('数据加载错误:', result.errors);
            }

            return result;
        } catch (error) {
            console.error('获取所有数据失败:', error);
            throw error;
        }
    }

    /**
     * 检查API连接状态
     */
    async checkConnection() {
        try {
            const response = await this.request('/network', { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

/**
 * 数据缓存服务
 */
class DataCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5分钟默认TTL
    }

    /**
     * 设置缓存
     */
    set(key, data, ttl = this.defaultTTL) {
        const expiry = Date.now() + ttl;
        this.cache.set(key, { data, expiry });
    }

    /**
     * 获取缓存
     */
    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() > cached.expiry) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * 删除缓存
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * 清空缓存
     */
    clear() {
        this.cache.clear();
    }

    /**
     * 检查缓存是否存在且有效
     */
    has(key) {
        const cached = this.cache.get(key);
        if (!cached) return false;

        if (Date.now() > cached.expiry) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }
}

/**
 * 数据格式化工具
 */
class DataFormatter {
    /**
     * 格式化数字
     */
    static formatNumber(num, decimals = 0) {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString('zh-CN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * 格式化百分比
     */
    static formatPercentage(value, decimals = 1) {
        if (value === null || value === undefined) return '0%';
        return `${Number(value * 100).toFixed(decimals)}%`;
    }

    /**
     * 格式化重量
     */
    static formatWeight(weight) {
        if (weight === null || weight === undefined) return '0 吨';
        return `${this.formatNumber(weight, 1)} 吨`;
    }

    /**
     * 格式化体积
     */
    static formatVolume(volume) {
        if (volume === null || volume === undefined) return '0 m³';
        return `${this.formatNumber(volume, 1)} m³`;
    }

    /**
     * 格式化成本
     */
    static formatCost(cost) {
        if (cost === null || cost === undefined) return '¥0';
        return `¥${this.formatNumber(cost, 2)}`;
    }

    /**
     * 格式化时间
     */
    static formatTime(hours) {
        if (hours === null || hours === undefined) return '0小时';
        if (hours < 1) return `${Math.round(hours * 60)}分钟`;
        if (hours < 24) return `${hours.toFixed(1)}小时`;
        return `${(hours / 24).toFixed(1)}天`;
    }

    /**
     * 格式化优先级
     */
    static formatPriority(priority) {
        const priorityMap = {
            1: { name: '低优先级', color: 'var(--priority-1)' },
            2: { name: '中等优先级', color: 'var(--priority-2)' },
            3: { name: '高优先级', color: 'var(--priority-3)' },
            4: { name: '最高优先级', color: 'var(--priority-4)' }
        };
        return priorityMap[priority] || { name: '未知', color: 'var(--text-muted)' };
    }

    /**
     * 格式化匹配状态
     */
    static formatMatchingStatus(status) {
        if (status === 'Self') return { name: '未匹配', type: 'pending' };
        if (typeof status === 'number') return { name: '已匹配', type: 'success' };
        return { name: '未知', type: 'default' };
    }
}

// 创建全局实例
const apiService = new APIService();
const dataCache = new DataCache();
const dataFormatter = DataFormatter;

/**
 * 数据加载器
 */
class DataLoader {
    constructor() {
        this.loading = false;
        this.subscribers = new Set();
    }

    /**
     * 订阅数据变化
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * 通知订阅者
     */
    notify(data) {
        this.subscribers.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('订阅者回调错误:', error);
            }
        });
    }

    /**
     * 加载所有数据
     */
    async loadAllData(forceRefresh = false) {
        if (this.loading) return;

        this.loading = true;
        const startTime = Date.now();

        try {
            // 检查缓存
            if (!forceRefresh && dataCache.has('allData')) {
                const cachedData = dataCache.get('allData');
                this.notify({ type: 'data_loaded', data: cachedData, cached: true });
                return cachedData;
            }

            // 显示加载状态
            this.notify({ type: 'loading_start' });

            // 并行加载所有数据
            const allData = await apiService.getAllData();
            
            // 缓存数据
            dataCache.set('allData', allData);

            // 处理数据
            const processedData = this.processData(allData);
            
            // 通知完成
            const loadTime = Date.now() - startTime;
            this.notify({ 
                type: 'data_loaded', 
                data: processedData, 
                cached: false,
                loadTime 
            });

            return processedData;

        } catch (error) {
            console.error('数据加载失败:', error);
            this.notify({ 
                type: 'loading_error', 
                error: error.message 
            });
            throw error;
        } finally {
            this.loading = false;
            this.notify({ type: 'loading_end' });
        }
    }

    /**
     * 处理数据
     */
    processData(rawData) {
        const { network, shipments, routes, matching } = rawData;

        // 处理网络节点数据
        const processedNetwork = this.processNetworkData(network);
        
        // 处理货物数据
        const processedShipments = this.processShipmentsData(shipments);
        
        // 处理路线数据
        const processedRoutes = this.processRoutesData(routes);
        
        // 处理匹配数据
        const processedMatching = this.processMatchingData(matching);

        return {
            network: processedNetwork,
            shipments: processedShipments,
            routes: processedRoutes,
            matching: processedMatching,
            raw: rawData
        };
    }

    /**
     * 处理网络节点数据
     */
    processNetworkData(data) {
        // 检查数据结构，处理嵌套的data字段
        const actualData = data.data || data;
        
        if (!actualData || !actualData.nodes) return { nodes: [], totalCount: 0 };

        // 添加地理位置信息（模拟数据）
        const nodesWithLocation = actualData.nodes.map(node => ({
            ...node,
            location: this.getNodeLocation(node.id || node.node_id, node.name || node.node_name)
        }));

        return {
            nodes: nodesWithLocation,
            totalCount: actualData.nodes_number || actualData.total_count || nodesWithLocation.length
        };
    }

    /**
     * 处理货物数据
     */
    processShipmentsData(data) {
        // 检查数据结构，处理嵌套的data字段
        const actualData = data.data || data;
        
        if (!actualData || !actualData.shipments) return { shipments: [], totalCount: 0 };

        const shipments = actualData.shipments.map(shipment => ({
            ...shipment,
            // 添加格式化数据
            formattedWeight: dataFormatter.formatWeight(shipment.weight),
            formattedVolume: dataFormatter.formatVolume(shipment.volume),
            priorityInfo: dataFormatter.formatPriority(shipment.priority)
        }));

        return {
            shipments,
            totalCount: actualData.total_count || shipments.length,
            priorityBreakdown: actualData.priority_breakdown || {}
        };
    }

    /**
     * 处理路线数据
     */
    processRoutesData(data) {
        // 检查数据结构，处理嵌套的data字段
        const actualData = data.data || data;
        
        if (!actualData || !actualData.routes) return { routes: [], totalCount: 0 };

        const routes = actualData.routes.map(route => ({
            ...route,
            // 添加格式化数据
            formattedCapacity: dataFormatter.formatNumber(route.capacity),
            formattedAvailableCapacity: dataFormatter.formatNumber(route.available_capacity),
            formattedUtilizationRate: dataFormatter.formatPercentage(route.utilization_rate)
        }));

        return {
            routes,
            totalCount: actualData.total_count || routes.length
        };
    }

    /**
     * 处理匹配结果数据
     */
    processMatchingData(data) {
        // 检查数据结构，处理嵌套的data字段
        const actualData = data.data || data;
        
        if (!actualData || !actualData.matchings) return { matchings: [], totalCount: 0 };

        const matchings = actualData.matchings.map(matching => ({
            ...matching,
            // 添加格式化数据
            formattedStatus: dataFormatter.formatMatchingStatus(matching.status),
            formattedCost: dataFormatter.formatCost(matching.total_cost)
        }));

        return {
            matchings,
            totalCount: actualData.total_count || matchings.length,
            summary: actualData.summary || {}
        };
    }

    /**
     * 获取节点地理位置（模拟数据）
     */
    getNodeLocation(nodeId, nodeName) {
        // 根据实际网络节点数据的城市坐标
        const cityLocations = {
            '成都': { lat: 30.5728, lng: 104.0668 },
            '重庆': { lat: 29.5630, lng: 106.5516 },
            '贵阳': { lat: 26.6477, lng: 106.6302 },
            '南宁': { lat: 22.8170, lng: 108.3665 },
            '昆明': { lat: 25.0430, lng: 102.7065 },
            '万象': { lat: 17.9757, lng: 102.6331 },
            '曼谷': { lat: 13.7563, lng: 100.5018 },
            '新加坡': { lat: 1.3521, lng: 103.8198 },
            '北部湾': { lat: 21.4828, lng: 109.1200 },
            '胡志明': { lat: 10.8231, lng: 106.6297 }
        };

        // 根据城市名称返回位置，如果没有则返回默认位置（随机生成）
        const location = cityLocations[nodeName] || {
            lat: 25.0 + (Math.random() - 0.5) * 20,  // 15-35度纬度范围
            lng: 100.0 + (Math.random() - 0.5) * 20   // 90-110度经度范围
        };

        return location;
    }

    /**
     * 刷新数据
     */
    async refreshData() {
        dataCache.clear();
        return await this.loadAllData(true);
    }
}

// 创建全局数据加载器实例
const dataLoader = new DataLoader();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIService, DataCache, DataFormatter, DataLoader };
}