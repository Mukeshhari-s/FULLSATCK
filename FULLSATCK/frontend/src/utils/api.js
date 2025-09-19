import axios from 'axios';

const baseURL = (import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:5000/api';

const api = axios.create({
    baseURL
});

// Add a request interceptor to add the auth token to all requests
api.interceptors.request.use(config => {
    const user = localStorage.getItem('user');
    if (user) {
        const token = JSON.parse(user).token;
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

export default api;