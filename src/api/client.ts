// kpa_health_ui/src/api/client.ts
import axios from 'axios';

// Set base URL without /api/v1 - just the root domain
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://kpa-health-api.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;