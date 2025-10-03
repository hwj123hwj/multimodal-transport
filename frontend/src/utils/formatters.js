// 数据格式化工具函数

// 格式化数字
export const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return '0';
  return parseFloat(num).toFixed(decimals);
};

// 格式化货币
export const formatCurrency = (amount, currency = '¥') => {
  if (amount === null || amount === undefined) return `${currency}0`;
  return `${currency}${formatNumber(amount)}`;
};

// 格式化重量
export const formatWeight = (weight) => {
  if (weight === null || weight === undefined) return '0kg';
  return `${formatNumber(weight)}kg`;
};

// 格式化体积
export const formatVolume = (volume) => {
  if (volume === null || volume === undefined) return '0m³';
  return `${formatNumber(volume)}m³`;
};

// 格式化时间
export const formatTime = (time) => {
  if (time === null || time === undefined) return '0小时';
  return `${formatNumber(time)}小时`;
};

// 格式化距离
export const formatDistance = (distance) => {
  if (distance === null || distance === undefined) return '0km';
  return `${formatNumber(distance)}km`;
};

// 格式化百分比
export const formatPercentage = (rate, decimals = 1) => {
  if (rate === null || rate === undefined) return '0%';
  return `${(rate * 100).toFixed(decimals)}%`;
};

// 格式化日期时间
export const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('zh-CN');
};

// 获取路线颜色
export const getRouteColor = (routeId) => {
  const colors = [
    '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
    '#13c2c2', '#fa541c', '#eb2f96', '#2f54eb', '#a0d911'
  ];
  return colors[routeId % colors.length];
};

// 获取匹配状态颜色
export const getMatchingStatusColor = (status) => {
  const statusColors = {
    'matched': '#52c41a',      // 已匹配 - 绿色
    'unmatched': '#f5222d',     // 未匹配 - 红色
    'self': '#faad14',          // 自营 - 橙色
    'pending': '#1890ff'        // 待定 - 蓝色
  };
  return statusColors[status] || '#d9d9d9';
};

// 获取匹配状态文本
export const getMatchingStatusText = (status) => {
  const statusTexts = {
    'matched': '已匹配',
    'unmatched': '未匹配',
    'self': '自营',
    'pending': '待定'
  };
  return statusTexts[status] || '未知';
};

// 计算路线统计信息
export const calculateRouteStats = (routes) => {
  if (!routes || routes.length === 0) {
    return {
      totalRoutes: 0,
      totalDistance: 0,
      avgDistance: 0,
      totalCost: 0,
      avgCost: 0,
      totalTime: 0,
      avgTime: 0
    };
  }

  const totalRoutes = routes.length;
  const totalDistance = routes.reduce((sum, route) => sum + (route.total_distance || 0), 0);
  const totalCost = routes.reduce((sum, route) => sum + (route.total_cost || 0), 0);
  const totalTime = routes.reduce((sum, route) => sum + (route.total_travel_time || 0), 0);

  return {
    totalRoutes,
    totalDistance,
    avgDistance: totalDistance / totalRoutes,
    totalCost,
    avgCost: totalCost / totalRoutes,
    totalTime,
    avgTime: totalTime / totalRoutes
  };
};

// 计算货物统计信息
export const calculateShipmentStats = (shipments) => {
  if (!shipments || shipments.length === 0) {
    return {
      totalShipments: 0,
      totalWeight: 0,
      totalVolume: 0,
      avgWeight: 0,
      avgVolume: 0,
      avgTimeValue: 0
    };
  }

  const totalShipments = shipments.length;
  const totalWeight = shipments.reduce((sum, shipment) => sum + (shipment.weight || 0), 0);
  const totalVolume = shipments.reduce((sum, shipment) => sum + (shipment.volume || 0), 0);
  const totalTimeValue = shipments.reduce((sum, shipment) => sum + (shipment.time_value || 0), 0);

  return {
    totalShipments,
    totalWeight,
    totalVolume,
    avgWeight: totalWeight / totalShipments,
    avgVolume: totalVolume / totalShipments,
    avgTimeValue: totalTimeValue / totalShipments
  };
};

// 计算匹配统计信息
export const calculateMatchingStats = (matchings) => {
  if (!matchings || matchings.length === 0) {
    return {
      totalMatchings: 0,
      matchedCount: 0,
      unmatchedCount: 0,
      matchingRate: 0,
      isStable: false
    };
  }

  const totalMatchings = matchings.length;
  const matchedCount = matchings.filter(m => m.assigned_route && m.assigned_route !== 'Self').length;
  const unmatchedCount = matchings.filter(m => !m.assigned_route || m.assigned_route === 'Self').length;
  const matchingRate = totalMatchings > 0 ? matchedCount / totalMatchings : 0;

  return {
    totalMatchings,
    matchedCount,
    unmatchedCount,
    matchingRate,
    isStable: matchingRate >= 0.7 // 匹配率70%以上认为稳定
  };
};

// 防抖函数
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 节流函数
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};