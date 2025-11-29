// yourtube/src/lib/axiosinstance.js - NETWORK ACCESS FIXED
import axios from 'axios';

// ✅ CRITICAL: Use network IP for mobile access
const getBackendURL = () => {
  // Check if we're in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If accessing via network IP, use network IP for backend
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:5000`;
    }
  }
  
  // Default to environment variable or network IP
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.0.181:5000';
};

const BACKEND_URL = getBackendURL();

console.log('🔧 Axios Configuration:');
console.log('   Backend URL:', BACKEND_URL);
console.log('   Environment:', process.env.NODE_ENV);
console.log('   Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'server');

const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('📤 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullUrl: `${config.baseURL}${config.url}`,
      hasToken: !!token
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      url: response.config.url,
      status: response.status,
      success: response.data?.success
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      networkError: error.code === 'ERR_NETWORK'
    });

    // Specific handling for network errors
    if (error.code === 'ERR_NETWORK') {
      console.error('🌐 NETWORK ERROR - Cannot reach backend');
      console.error('   Backend URL:', BACKEND_URL);
      console.error('   Make sure backend is running and accessible from this device');
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized - Token expired or invalid');
      
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.log('⛔ Forbidden - Premium required');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
export { BACKEND_URL };