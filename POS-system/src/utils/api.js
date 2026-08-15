import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  getCategories: () => api.get('/products/categories'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  adjustStock: (id, adjustment) => api.patch(`/products/${id}/stock`, { adjustment }),
  delete: (id) => api.delete(`/products/${id}`)
};

// Sales API
export const salesAPI = {
  checkout: (data) => api.post('/sales/checkout', data),
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`)
};

// Settings API
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data)
};

// Reports API
export const reportsAPI = {
  getDailySummary: (date) => api.get('/reports/daily-summary', { params: { date } }),
  getDailyChart: (days) => api.get('/reports/daily-chart', { params: { days } }),
  getTopProducts: (days, limit) => api.get('/reports/top-products', { params: { days, limit } }),
  getLowStock: () => api.get('/reports/low-stock')
};

export default api;
