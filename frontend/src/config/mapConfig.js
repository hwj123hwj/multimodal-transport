// 地图配置
export const MAP_CONFIG = {
  // 百度地图API配置
  baiduMap: {
    // 请替换为您的百度地图API密钥
    // 获取地址: http://lbsyun.baidu.com/apiconsole/key
    apiKey: '2sk3LqUROeCwwE5S869w02OdBZTIi5mw', // 这是示例密钥，建议替换为自己的密钥
    version: '3.0',
    url: 'https://api.map.baidu.com/api'
  },
  
  // 地图默认配置
  default: {
    center: { lng: 116.404, lat: 39.915 }, // 北京
    zoom: 11,
    enableScrollWheelZoom: true,
    enableMapClick: false
  },
  
  // 地图控件配置
  controls: {
    navigation: {
      anchor: 'BMAP_ANCHOR_TOP_LEFT',
      type: 'BMAP_NAVIGATION_CONTROL_LARGE',
      showZoomInfo: true
    },
    scale: {
      anchor: 'BMAP_ANCHOR_BOTTOM_LEFT'
    },
    overview: {
      anchor: 'BMAP_ANCHOR_BOTTOM_RIGHT',
      isOpen: false
    }
  }
};

// 获取百度地图API URL
export const getBaiduMapUrl = () => {
  const { url, version, apiKey } = MAP_CONFIG.baiduMap;
  return `${url}?v=${version}&ak=${apiKey}`;
};