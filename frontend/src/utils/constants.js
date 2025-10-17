// 系统常量定义

// API基础配置
export const API_CONFIG = {
  BASE_URL: '/api',
  TIMEOUT: 10000,
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000
};

// 地图配置
export const MAP_CONFIG = {
  DEFAULT_CENTER: {
    longitude: 106.5,
    latitude: 26.0
  },
  DEFAULT_ZOOM: 7,
  MIN_ZOOM: 5,
  MAX_ZOOM: 18,
  ENABLE_SCROLL_WHEEL_ZOOM: true,
  ENABLE_DOUBLE_CLICK_ZOOM: true,
  ENABLE_KEYBOARD: true,
  ENABLE_INERTIA_DRAG: true
};

// 路线颜色配置
export const ROUTE_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#fa541c', '#eb2f96', '#2f54eb', '#a0d911',
  '#fa8c16', '#fadb14', '#a0d911', '#13a8a8', '#597ef7'
];

// 匹配状态配置
export const MATCHING_STATUS = {
  MATCHED: {
    key: 'matched',
    label: '已匹配',
    color: '#52c41a',
    icon: '✓'
  },
  UNMATCHED: {
    key: 'unmatched',
    label: '未匹配',
    color: '#f5222d',
    icon: '✗'
  },
  SELF: {
    key: 'self',
    label: '自营',
    color: '#faad14',
    icon: '◎'
  },
  PENDING: {
    key: 'pending',
    label: '待定',
    color: '#1890ff',
    icon: '○'
  }
};

// 表格配置
export const TABLE_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: ['10', '20', '50', '100'],
  SHOW_SIZE_CHANGER: true,
  SHOW_QUICK_JUMPER: true,
  SHOW_TOTAL: true,
  SIZE: 'middle',
  SCROLL: { x: 'max-content' }
};

// 分页配置
export const PAGINATION_CONFIG = {
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
  pageSizeOptions: ['10', '20', '50', '100'],
  defaultPageSize: 10,
  size: 'middle'
};

// 路由配置
export const ROUTES_CONFIG = {
  ROUTES_VIEW: '/routes',
  SHIPMENTS_VIEW: '/shipments',
  MATCHING_VIEW: '/matching',
  HOME: '/'
};

// 消息配置
export const MESSAGE_CONFIG = {
  DURATION: 3,
  MAX_COUNT: 3,
  TOP: 24
};

// 加载状态配置
export const LOADING_CONFIG = {
  DELAY: 300,
  SIZE: 'large',
  TIP: '数据加载中...'
};

// 错误消息配置
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  SERVER_ERROR: '服务器错误，请稍后重试',
  TIMEOUT_ERROR: '请求超时，请稍后重试',
  DATA_ERROR: '数据格式错误',
  VALIDATION_ERROR: '数据验证失败',
  NOT_FOUND_ERROR: '请求的资源不存在',
  UNAUTHORIZED_ERROR: '未授权访问',
  FORBIDDEN_ERROR: '访问被拒绝'
};

// 成功消息配置
export const SUCCESS_MESSAGES = {
  LOAD_SUCCESS: '数据加载成功',
  SAVE_SUCCESS: '保存成功',
  DELETE_SUCCESS: '删除成功',
  UPDATE_SUCCESS: '更新成功',
  OPERATION_SUCCESS: '操作成功'
};

// 确认消息配置
export const CONFIRM_MESSAGES = {
  DELETE_CONFIRM: '确定要删除这条记录吗？',
  BATCH_DELETE_CONFIRM: '确定要删除选中的记录吗？',
  LEAVE_CONFIRM: '您有未保存的更改，确定要离开吗？'
};

// 地图控件配置
export const MAP_CONTROLS = {
  NAVIGATION: {
    anchor: 'BMAP_ANCHOR_TOP_LEFT',
    type: 'BMAP_NAVIGATION_CONTROL_LARGE',
    enableGeolocation: false
  },
  SCALE: {
    anchor: 'BMAP_ANCHOR_BOTTOM_LEFT'
  },
  OVERVIEW: {
    anchor: 'BMAP_ANCHOR_BOTTOM_RIGHT',
    isOpen: false
  }
};

// 图表配置
export const CHART_CONFIG = {
  COLOR: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
  BACKGROUND_COLOR: '#fff',
  TEXT_COLOR: '#333',
  AXIS_LINE_COLOR: '#d9d9d9',
  GRID_LINE_COLOR: '#f0f0f0',
  TOOLTIP_BACKGROUND: 'rgba(0, 0, 0, 0.75)',
  TOOLTIP_TEXT_COLOR: '#fff'
};

// 响应式配置
export const RESPONSIVE_CONFIG = {
  BREAKPOINTS: {
    xs: 480,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1600
  },
  GUTTER: [16, 16]
};

// 动画配置
export const ANIMATION_CONFIG = {
  DURATION: 300,
  EASING: 'ease-in-out',
  DELAY: 100
};

// 创建常量对象并导出
const Constants = {
  API_CONFIG,
  MAP_CONFIG,
  ROUTE_COLORS,
  MATCHING_STATUS,
  TABLE_CONFIG,
  PAGINATION_CONFIG,
  ROUTES_CONFIG,
  MESSAGE_CONFIG,
  LOADING_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CONFIRM_MESSAGES,
  MAP_CONTROLS,
  CHART_CONFIG,
  RESPONSIVE_CONFIG,
  ANIMATION_CONFIG
};

export default Constants;