import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats/overview'),
};

// Clients API
export const clientsAPI = {
  getAll: (search = '') => api.get('/clients', { params: { search } }),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  getStats: () => api.get('/clients/stats/overview'),
  getTopClients: (limit = 10) => api.get('/clients/stats/top-clients', { params: { limit } }),
};

// Sales API
export const salesAPI = {
  getAll: (filters = {}) => api.get('/sales', { params: filters }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (formData) => api.post('/sales', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/sales/${id}`, data),
  delete: (id) => api.delete(`/sales/${id}`),
  approve: (id) => api.post(`/sales/${id}/approve`),
  reject: (id, reason) => api.post(`/sales/${id}/reject`, { rejection_reason: reason }),
  getStats: () => api.get('/sales/stats/overview'),
  getRevenueTrend: (period = 'month') => api.get('/sales/stats/revenue-trend', { params: { period } }),
  getSalesByAdType: () => api.get('/sales/stats/by-ad-type'),
  getLeaderboard: (limit = 10) => api.get('/sales/stats/leaderboard', { params: { limit } }),
};

// Invoices API
export const invoicesAPI = {
  getAll: () => api.get('/invoices'),
  getById: (id) => api.get(`/invoices/${id}`),
  generate: (saleId) => api.post(`/invoices/generate/${saleId}`),
  download: (id) => {
    return api.get(`/invoices/${id}/download`, {
      responseType: 'blob',
    });
  },
  delete: (id) => api.delete(`/invoices/${id}`),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRevenueTrend: (params = {}) => api.get('/analytics/revenue-trend', { params }),
  getSalesByAdType: () => api.get('/analytics/sales-by-ad-type'),
  getSalesByPaymentMethod: () => api.get('/analytics/sales-by-payment-method'),
  getLeaderboard: (params = {}) => api.get('/analytics/leaderboard', { params }),
  getTopClients: (params = {}) => api.get('/analytics/top-clients', { params }),
  getRecentSales: (params = {}) => api.get('/analytics/recent-sales', { params }),
  exportSales: (params = {}) => {
    return api.get('/analytics/export/sales', {
      params,
      responseType: 'blob',
    });
  },
};

// Settings API
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getByKey: (key) => api.get(`/settings/${key}`),
  update: (key, value) => api.put(`/settings/${key}`, { value }),
  bulkUpdate: (settings) => api.post('/settings/bulk-update', { settings }),
  delete: (key) => api.delete(`/settings/${key}`),
  resetDefaults: () => api.post('/settings/reset-defaults'),
};

// Commission Payments API
export const commissionPaymentsAPI = {
  getAll: () => api.get('/commission-payments'),
  getById: (id) => api.get(`/commission-payments/${id}`),
  create: (data) => api.post('/commission-payments', data),
  update: (id, data) => api.put(`/commission-payments/${id}`, data),
  delete: (id) => api.delete(`/commission-payments/${id}`),
  getJournalistSummary: (journalistId) => 
    api.get(`/commission-payments/journalist/${journalistId}/summary`),
  getAllJournalistsStats: () => api.get('/commission-payments/stats/all-journalists'),
};

export default api;
