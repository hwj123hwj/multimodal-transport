/**
 * 物流可视化系统主入口文件
 * 负责初始化所有模块和协调应用启动
 */

/**
 * 全局配置
 */
const CONFIG = {
    // API配置
    API: {
        BASE_URL: window.location.origin.includes('localhost') ? 'http://localhost:8000' : window.location.origin,
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },
    
    // 地图配置
    MAP: {
        DEFAULT_CENTER: [31.2304, 121.4737], // 上海
        DEFAULT_ZOOM: 8,
        MIN_ZOOM: 3,
        MAX_ZOOM: 18,
        TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        TILE_ATTRIBUTION: '© OpenStreetMap contributors'
    },
    
    // 动画配置
    ANIMATION: {
        ENABLED: true,
        DURATION: 1000,
        EASING: 'ease-out'
    },
    
    // 图表配置
    CHARTS: {
        COLORS: {
            primary: '#3b82f6',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#06b6d4',
            secondary: '#6b7280'
        }
    },
    
    // 主题配置
    THEME: {
        DEFAULT: 'light',
        STORAGE_KEY: 'logistics-theme'
    },
    
    // 缓存配置
    CACHE: {
        ENABLED: true,
        TTL: 5 * 60 * 1000, // 5分钟
        STORAGE_KEY: 'logistics-cache'
    },
    
    // 自动刷新配置
    AUTO_REFRESH: {
        ENABLED: false,
        INTERVAL: 30000, // 30秒
        STORAGE_KEY: 'logistics-auto-refresh'
    }
};

/**
 * 工具函数
 */
const Utils = {
    /**
     * 防抖函数
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    },

    /**
     * 节流函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 深度克隆对象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },

    /**
     * 生成唯一ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * 格式化日期时间
     */
    formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    },

    /**
     * 计算两点间距离（Haversine公式）
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // 地球半径（公里）
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * 角度转弧度
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    },

    /**
     * 弧度转角度
     */
    toDegrees(radians) {
        return radians * (180 / Math.PI);
    },

    /**
     * 获取随机颜色
     */
    getRandomColor() {
        const colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    /**
     * 颜色混合
     */
    blendColors(color1, color2, ratio) {
        const hex = (x) => {
            x = x.toString(16);
            return (x.length === 1) ? '0' + x : x;
        };
        
        const r = Math.ceil(parseInt(color1.substring(1, 3), 16) * ratio + 
                         parseInt(color2.substring(1, 3), 16) * (1 - ratio));
        const g = Math.ceil(parseInt(color1.substring(3, 5), 16) * ratio + 
                         parseInt(color2.substring(3, 5), 16) * (1 - ratio));
        const b = Math.ceil(parseInt(color1.substring(5, 7), 16) * ratio + 
                         parseInt(color2.substring(5, 7), 16) * (1 - ratio));
        
        return '#' + hex(r) + hex(g) + hex(b);
    },

    /**
     * 本地存储操作
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('读取本地存储失败:', error);
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.warn('写入本地存储失败:', error);
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn('删除本地存储失败:', error);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.warn('清空本地存储失败:', error);
                return false;
            }
        }
    },

    /**
     * 性能监控
     */
    performance: {
        marks: new Map(),

        mark(name) {
            this.marks.set(name, performance.now());
        },

        measure(name, startMark, endMark = null) {
            if (!endMark) {
                endMark = name + '_end';
                this.mark(endMark);
            }
            
            const start = this.marks.get(startMark);
            const end = this.marks.get(endMark);
            
            if (start && end) {
                const duration = end - start;
                console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
                return duration;
            }
            
            return null;
        },

        clear() {
            this.marks.clear();
        }
    },

    /**
     * 错误处理
     */
    errorHandler: {
        log(error, context = '') {
            const errorInfo = {
                message: error.message || error,
                stack: error.stack || '',
                context: context,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };
            
            console.error('Error:', errorInfo);
            
            // 可以在这里添加错误上报逻辑
            // this.reportError(errorInfo);
        },

        reportError(errorInfo) {
            // 错误上报到服务器
            // fetch('/api/errors', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(errorInfo)
            // });
        }
    }
};

/**
 * 日志管理器
 */
class Logger {
    constructor(name, level = 'info') {
        this.name = name;
        this.level = level;
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }

    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.debug(`[${this.name}] DEBUG:`, message, ...args);
        }
    }

    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.info(`[${this.name}] INFO:`, message, ...args);
        }
    }

    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(`[${this.name}] WARN:`, message, ...args);
        }
    }

    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(`[${this.name}] ERROR:`, message, ...args);
        }
    }

    shouldLog(level) {
        return this.levels[level] >= this.levels[this.level];
    }
}

/**
 * 事件总线
 */
class EventBus {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    once(event, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }
}

/**
 * 全局事件总线
 */
const eventBus = new EventBus();

/**
 * 初始化函数
 */
async function initializeApp() {
    const logger = new Logger('Main');
    
    try {
        logger.info('开始初始化物流可视化系统...');
        
        // 性能监控开始
        Utils.performance.mark('app_init_start');
        
        // 检查浏览器兼容性
        checkBrowserCompatibility();
        
        // 加载配置
        await loadConfiguration();
        
        // 初始化主题
        initializeTheme();
        
        // 初始化缓存
        initializeCache();
        
        // 初始化服务
        await initializeServices();
        
        // 性能监控结束
        const initTime = Utils.performance.measure('app_init', 'app_init_start');
        
        logger.info(`系统初始化完成，耗时 ${initTime?.toFixed(2) || 'N/A'}ms`);
        
        // 触发初始化完成事件
        eventBus.emit('app:initialized', { initTime });
        
    } catch (error) {
        logger.error('系统初始化失败:', error);
        Utils.errorHandler.log(error, 'App Initialization');
        
        // 显示错误页面
        showErrorPage(error);
    }
}

/**
 * 检查浏览器兼容性
 */
function checkBrowserCompatibility() {
    const requiredFeatures = [
        'Promise',
        'fetch',
        'Map',
        'Set',
        'localStorage',
        'requestAnimationFrame'
    ];
    
    const unsupported = requiredFeatures.filter(feature => 
        typeof window[feature] === 'undefined'
    );
    
    if (unsupported.length > 0) {
        throw new Error(`浏览器不支持以下功能: ${unsupported.join(', ')}`);
    }
    
    // 检查Leaflet
    if (typeof L === 'undefined') {
        throw new Error('Leaflet地图库未加载');
    }
    
    // 检查Chart.js
    if (typeof Chart === 'undefined') {
        throw new Error('Chart.js图表库未加载');
    }
}

/**
 * 加载配置
 */
async function loadConfiguration() {
    // 从本地存储加载用户配置
    const userConfig = Utils.storage.get('logistics-config', {});
    
    // 合并配置
    Object.assign(CONFIG, userConfig);
    
    // 设置全局配置
    window.LOGISTICS_CONFIG = CONFIG;
}

/**
 * 初始化主题
 */
function initializeTheme() {
    const savedTheme = Utils.storage.get(CONFIG.THEME.STORAGE_KEY, CONFIG.THEME.DEFAULT);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // 监听主题变化
    eventBus.on('theme:changed', (theme) => {
        Utils.storage.set(CONFIG.THEME.STORAGE_KEY, theme);
    });
}

/**
 * 初始化缓存
 */
function initializeCache() {
    if (!CONFIG.CACHE.ENABLED) return;
    
    // 清理过期缓存
    const cache = Utils.storage.get(CONFIG.CACHE.STORAGE_KEY, {});
    const now = Date.now();
    
    Object.keys(cache).forEach(key => {
        if (cache[key].timestamp && (now - cache[key].timestamp) > CONFIG.CACHE.TTL) {
            delete cache[key];
        }
    });
    
    Utils.storage.set(CONFIG.CACHE.STORAGE_KEY, cache);
}

/**
 * 初始化服务
 */
async function initializeServices() {
    // 这里可以初始化其他服务
    // 例如：WebSocket连接、推送服务等
    
    return Promise.resolve();
}

/**
 * 显示错误页面
 */
function showErrorPage(error) {
    document.body.innerHTML = `
        <div class="error-page">
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <h1>系统初始化失败</h1>
                <p class="error-message">${error.message}</p>
                <p class="error-suggestion">请尝试刷新页面或联系技术支持</p>
                <button class="btn btn-primary" onclick="location.reload()">重新加载</button>
            </div>
        </div>
    `;
    
    // 添加错误页面样式
    const style = document.createElement('style');
    style.textContent = `
        .error-page {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .error-container {
            text-align: center;
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
        }
        
        .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        
        .error-container h1 {
            color: #333;
            margin-bottom: 1rem;
            font-size: 2rem;
        }
        
        .error-message {
            color: #666;
            margin-bottom: 1.5rem;
            font-size: 1.1rem;
        }
        
        .error-suggestion {
            color: #999;
            margin-bottom: 2rem;
        }
        
        .btn {
            padding: 0.75rem 2rem;
            border: none;
            border-radius: 0.5rem;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb;
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(style);
}

/**
 * 全局错误处理
 */
window.addEventListener('error', (event) => {
    Utils.errorHandler.log(event.error, 'Global Error');
});

window.addEventListener('unhandledrejection', (event) => {
    Utils.errorHandler.log(event.reason, 'Unhandled Promise Rejection');
});

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * 页面卸载时清理
 */
window.addEventListener('beforeunload', () => {
    // 清理资源
    eventBus.emit('app:beforeunload');
});

/**
 * 导出全局对象
 */
window.LogisticsSystem = {
    CONFIG,
    Utils,
    Logger,
    EventBus,
    eventBus,
    initializeApp
};