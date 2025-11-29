import axios from 'axios';

// ✅ PRODUCTION FIX: Always use HTTPS in production
const getBackendURL = () => {
  // Use environment variable first (set in Vercel)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Fallback logic for development
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Production domains use HTTPS backend
    if (hostname.includes('vercel.app')) {
      return 'https://youtube-clone-project-q3pd.onrender.com';
    }
    
    // Local network access (for mobile testing)
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
console.log('   Environment:', process.env.NODE_ENV);

const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor - Attach token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token attached to request');
    } else {
      console.log('⚠️ No token found in localStorage');
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
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor - Handle responses and errors
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      url: response.config.url,
      status: response.status,
      statusText: response.statusText
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      code: error.code
    });

    // Network error - backend unreachable
    if (error.code === 'ERR_NETWORK') {
      console.error('🌐 NETWORK ERROR - Backend unreachable');
      console.error('   Backend URL:', BACKEND_URL);
      console.error('   Make sure backend is running');
    }

    // CORS error
    if (error.message?.includes('CORS')) {
      console.error('🚫 CORS ERROR - Origin not allowed');
      console.error('   Add your domain to backend ALLOWED_ORIGINS');
    }

    // 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized - Token expired or invalid');
      
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        
        // Don't redirect if already on login page
        if (!currentPath.includes('/login')) {
          console.log('   Clearing auth data and redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }

    // 403 Forbidden
    if (error.response?.status === 403) {
      console.log('⛔ Forbidden - Insufficient permissions');
    }

    // 500 Server Error
    if (error.response?.status === 500) {
      console.error('💥 Server Error - Backend issue');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
export { BACKEND_URL };