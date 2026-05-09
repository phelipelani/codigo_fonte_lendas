// Arquivo: src/api/index.ts
import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

// Na Hostinger: VITE_API_URL=/api → chamadas vão para /api/*
// Em dev local: proxy do vite redireciona /api → localhost:8000
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.replace('/login');
    }
    return Promise.reject(error);
  },
);

export default api;
