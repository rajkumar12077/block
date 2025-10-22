import axios from 'axios';

// Use the Vite proxy configuration for API calls
// The proxy will forward requests to http://localhost:3000
const instance = axios.create({
  baseURL: '/api'
});

// Add a request interceptor to include the auth token
instance.interceptors.request.use(
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

export default instance;