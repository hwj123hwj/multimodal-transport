import axios from 'axios';
import { message } from 'antd';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      message.error(error.response.data.detail || '请求失败');
    } else if (error.request) {
      message.error('网络连接失败');
    } else {
      message.error('请求配置错误');
    }
    return Promise.reject(error);
  }
);

// API方法
export const routesAPI = {
  getAll: () => api.get('/routes'),
  getById: (id) => api.get(`/routes/${id}`),
  filter: (params) => api.get('/filter/routes', { params }),
};

export const shipmentsAPI = {
  getAll: () => api.get('/shipments'),
  search: (params) => api.get('/search/shipments', { params }),
};

export const matchingAPI = {
  getAll: () => api.get('/matchings'),
  getShipment: (id) => api.get(`/shipment/${id}`),
  getRoute: (id) => api.get(`/route/${id}`),
};

export default api;