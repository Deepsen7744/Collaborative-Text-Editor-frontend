import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Documents API
export const documentsAPI = {
  getAll: () => api.get('/documents'),
  getById: (id) => api.get(`/documents/${id}`),
  create: (data) => api.post('/documents', data),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  share: (id) => api.post(`/documents/${id}/share`),
  acceptShare: (shareLink) => api.post(`/documents/accept-share/${shareLink}`),
};

// AI API
export const aiAPI = {
  grammarCheck: (text) => api.post('/ai/grammar-check', { text }),
  enhance: (text, options) => api.post('/ai/enhance', { text, ...options }),
  summarize: (text, maxLength) => api.post('/ai/summarize', { text, maxLength }),
  complete: (text, context) => api.post('/ai/complete', { text, context }),
  suggestions: (text, type) => api.post('/ai/suggestions', { text, type }),
};

export default api;

