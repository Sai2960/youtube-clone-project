import axios from 'axios';

// ✅ PRODUCTION FIX: Always use HTTPS in production
const getBackendURL = () => {
  // Use environment variable first
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  
  // Fallback for development
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Production domains use HTTPS backend
    if (hostname.includes('vercel.app')) {
      return 'https://youtube-clone-project-q3pd.onrender.com';
    }
    
    // Local network access
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:5000`;
    }
  }
  
  // Default localhost
  return 'http://localhost:5000';
};

const BACKEND_URL = getBackendURL();

console.log('🔧 Axios Configuration:');
console.log('   Backend URL:', BACKEND_URL);
console.log('   Is HTTPS:', BACKEND_URL.startsWith('https'));

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
      console.log('🔑 Token attached to request');
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
      status: response.status
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });

    if (error.code === 'ERR_NETWORK') {
      console.error('🌐 NETWORK ERROR - Check backend URL:', BACKEND_URL);
    }

    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized - clearing auth');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
export { BACKEND_URL };