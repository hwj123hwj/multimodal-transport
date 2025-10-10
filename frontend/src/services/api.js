import axios from 'axios';
import {message} from 'antd';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 文件上传专用API实例
const uploadApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30秒超时，适合大文件上传
    headers: {
        'Content-Type': 'multipart/form-data',
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

// 文件上传API的响应拦截器
uploadApi.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        const errorMessage = error.response?.data?.message || error.message || '请求失败';
        message.error(errorMessage);
        return Promise.reject(new Error(errorMessage));
    }
);

// API方法
export const routesAPI = {
    getAll: () => api.get('/routes'),
    getById: (id) => api.get(`/routes/${id}`),
    filter: (params) => api.get('/filter/routes', {params}),
};

export const shipmentsAPI = {
    getAll: () => api.get('/shipments'),
    search: (params) => api.get('/search/shipments', {params}),
};

export const matchingAPI = {
    getAll: () => api.get('/matchings'),
    getMatching: () => api.get(`/shipment-route-mapping`),
    getDetailed: () => api.get('/matchings/detailed'),
    getShipment: (id) => api.get(`/shipment/${id}`),
    getRoute: (id) => api.get(`/route/${id}`),
    getSummary: () => api.get('/summary'),
};

// 数据上传API
export const uploadDataAPI = {
    /**
     * 上传单个数据文件
     * @param {File} file - 要上传的文件
     * @param {string} fileType - 文件类型 (shipment 或 route)
     * @param {string} description - 文件描述
     * @returns {Promise} 上传结果
     */
    uploadFile: async (file, fileType, description = '') => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('file_type', fileType);
            formData.append('description', description);

            const response = await uploadApi.post('/upload', formData, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    console.log(`上传进度: ${percentCompleted}%`);
                },
            });
            return response;
        } catch (error) {
            console.error('文件上传失败:', error);
            throw error;
        }
    },

    /**
     * 获取上传历史记录
     * @returns {Promise} 上传历史记录
     */
    getUploadHistory: async () => {
        try {
            const response = await api.get('/uploads');
            return response;
        } catch (error) {
            console.error('获取上传历史失败:', error);
            throw error;
        }
    },

    /**
     * 预览数据文件内容
     * @param {string} filename - 文件名
     * @returns {Promise} 文件内容预览
     */
    previewFile: async (filename) => {
        try {
            const response = await api.get(`/uploads/preview/${filename}`);
            return response;
        } catch (error) {
            console.error('预览文件失败:', error);
            throw error;
        }
    },

    /**
     * 删除上传的文件
     * @param {string} filename - 文件名
     * @returns {Promise} 删除结果
     */
    deleteFile: async (filename) => {
        try {
            const response = await api.delete(`/uploads/${filename}`);
            return response;
        } catch (error) {
            console.error('删除文件失败:', error);
            throw error;
        }
    },
};

// 算法执行API
export const executeAlgorithmAPI = {
    /**
     * 执行匹配算法
     * @param {Object} params - 算法参数
     * @returns {Promise} 执行结果
     */
    runMatching: async (params = {}) => {
        try {
            const response = await api.post('/matching/execute', params, {
                timeout: 300000, // 5分钟超时
            });
            return response;
        } catch (error) {
            console.error('算法执行失败:', error);
            throw error;
        }
    },

    /**
     * 获取算法执行状态
     * @returns {Promise} 算法状态
     */
    getAlgorithmStatus: async () => {
        try {
            const response = await api.get('/algorithm/status');
            return response;
        } catch (error) {
            console.error('获取算法状态失败:', error);
            throw error;
        }
    },

    /**
     * 获取算法执行历史
     * @returns {Promise} 执行历史
     */
    getExecutionHistory: async () => {
        try {
            const response = await api.get('/algorithm/history');
            return response;
        } catch (error) {
            console.error('获取执行历史失败:', error);
            throw error;
        }
    },
};

export default api;