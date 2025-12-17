import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add JWT token
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

// Authentication APIs
export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
    }
  },

  checkAuth: () =>
    api.get('/auth/check')
};

// User Management APIs
export const userAPI = {
  getUsers: () =>
    api.get('/users'),

  createUser: (data) =>
    api.post('/users', data),

  updateUser: (id, data) =>
    api.put(`/users/${id}`, data),

  deleteUser: (id) =>
    api.delete(`/users/${id}`)
};

// Timesheet APIs
export const timesheetAPI = {
  getCompanies: () =>
    api.get('/timesheet/companies'),

  createCompany: (data) =>
    api.post('/timesheet/companies', data),

  deleteCompany: (id) =>
    api.delete(`/timesheet/companies/${id}`),

  getJobTypes: () =>
    api.get('/timesheet/job-types'),

  createJobType: (data) =>
    api.post('/timesheet/job-types', data),

  deleteJobType: (id) =>
    api.delete(`/timesheet/job-types/${id}`),

  getCrewChiefs: (companyId = null) =>
    api.get('/timesheet/crew-chiefs', companyId ? { params: { company_id: companyId } } : {}),

  createCrewChief: (data) =>
    api.post('/timesheet/crew-chiefs', data),

  deleteCrewChief: (id) =>
    api.delete(`/timesheet/crew-chiefs/${id}`),

  getEntries: (params = {}) =>
    api.get('/timesheet/entries', { params }),

  getEntry: (id) =>
    api.get(`/timesheet/entries/${id}`),

  createEntry: (data) =>
    api.post('/timesheet/entries', data),

  updateEntry: (id, data) =>
    api.put(`/timesheet/entries/${id}`, data),

  deleteEntry: (id) =>
    api.delete(`/timesheet/entries/${id}`)
};

// Export API
export const exportAPI = {
  downloadExcel: (startDate, endDate) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    return api.get('/export/excel', {
      params,
      responseType: 'blob' // Important for file download
    });
  }
};

export default api;
