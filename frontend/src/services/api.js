import axios from 'axios';
import {message} from 'antd';

const API_BASE_URL = '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

const uploadApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
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

// 限制同时最多显示2条错误提示
message.config({ maxCount: 2 });

// 响应拦截器 — 静默失败，由调用方决定是否提示
api.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        // 只把错误往上抛，不在拦截器弹toast
        // 需要提示用户的地方（上传、执行算法等）在调用处自己catch处理
        return Promise.reject(error);
    }
);

// 文件上传API的响应拦截器
uploadApi.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        return Promise.reject(new Error(
            error.response?.data?.detail || error.response?.data?.message || error.message || '请求失败'
        ));
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
    runMatching: async () => {
        try {
            const response = await api.post('/matching/execute', {}, {timeout: 15000});
            return response;
        } catch (error) {
            console.error('算法执行失败:', error);
            throw error;
        }
    },
    getStatus: (taskId) => api.get('/matching/status', {params: taskId ? {task_id: taskId} : {}}),
};

export const analyticsAPI = {
    routeUtilization: (sceneId) => api.get('/analytics/route-utilization', { params: sceneId ? { scene_id: sceneId } : {} }),
    odFlow:           (sceneId) => api.get('/analytics/od-flow',            { params: sceneId ? { scene_id: sceneId } : {} }),
    timeValue:        (sceneId) => api.get('/analytics/time-value',         { params: sceneId ? { scene_id: sceneId } : {} }),
    algorithmQuality: (sceneId) => api.get('/analytics/algorithm-quality',  { params: sceneId ? { scene_id: sceneId } : {} }),
};

export default api;