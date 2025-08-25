import axios from 'axios';

export const API_BASE = 'http://localhost:8001/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Error en llamada API:', error);
    return Promise.reject(error);
  }
);

export default api;