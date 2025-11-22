import axios from 'axios';

// Use the correct working backend URL
const API_BASE_URL = 'https://afrogazette-platform.onrender.com';

console.log('🔧 Frontend API Debug:');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('API_BASE_URL:', API_BASE_URL);

// Create axios instance with correct URL
const api = axios.create({
  baseURL: API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

console.log('📡 Final API baseURL:', api.defaults.baseURL);

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('📤 Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    console.log(`📥 API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('📥 API Error Details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data
    });

    // Handle different error types
    if (error.code === 'NETWORK_ERROR') {
      console.error('🔌 Network Error - Check backend connectivity');
    }
    
    if (error.message.includes('CORS')) {
      console.error('🌐 CORS Error - Check server CORS configuration');
    }

    // Handle 401 but don't auto-redirect on login attempts
    if (error.response?.status === 401) {
      // Only clear token and redirect if it's not a login attempt
      if (!error.config?.url?.includes('/auth/login')) {
        console.log('🔐 Authentication expired - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        console.log('🔐 Login attempt failed - keeping user on login page');
      }
    }

    return Promise.reject(error);
  }
);

// Enhanced Auth API with better error handling
export const authAPI = {
  login: async (credentials) => {
    try {
      console.log('🔐 Attempting login with backend:', API_BASE_URL);
      const response = await api.post('/auth/login', credentials);
      console.log('✅ Login successful');
      return response;
    } catch (error) {
      console.error('❌ Login failed:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      
      // Don't throw the error, let the component handle it
      throw {
        ...error,
        message: error.response?.data?.message || 'Login failed',
        status: error.response?.status
      };
    }
  },
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Test connectivity on load
const testBackendConnection = async () => {
  try {
    console.log('🧪 Testing backend connectivity...');
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend connection successful:', data);
    } else {
      console.error('❌ Backend health check failed:', response.status);
    }
  } catch (error) {
    console.error('❌ Backend connectivity test failed:', error.message);
  }
};

// Run connectivity test
testBackendConnection();

// Keep all other API exports the same...
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats/overview'),
};

export const clientsAPI = {
  getAll: (search = '') => api.get('/clients', { params: { search } }),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  getStats: () => api.get('/clients/stats/overview'),
  getTopClients: (limit = 10) => api.get('/clients/stats/top-clients', { params: { limit } }),
};

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

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getByKey: (key) => api.get(`/settings/${key}`),
  update: (key, value) => api.put(`/settings/${key}`, { value }),
  bulkUpdate: (settings) => api.post('/settings/bulk-update', { settings }),
  delete: (key) => api.delete(`/settings/${key}`),
  resetDefaults: () => api.post('/settings/reset-defaults'),
};

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
