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

// Authentication APIs
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  logout: () =>
    api.post('/auth/logout'),

  checkAuth: () =>
    api.get('/auth/check')
};

// Timesheet APIs
export const timesheetAPI = {
  getCompanies: () =>
    api.get('/timesheet/companies'),

  getWorkIds: () =>
    api.get('/timesheet/work-ids'),

  getEmployees: () =>
    api.get('/timesheet/employees'),

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
