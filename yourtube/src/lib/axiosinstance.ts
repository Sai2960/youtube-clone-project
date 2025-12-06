import axios, { AxiosInstance } from 'axios';



declare module 'axios' {
  export interface AxiosRequestConfig {
    timeout?: number;
  }
}
// ✅ Type-safe backend URL getter
const getBackendURL = (): string => {
  // Helper to remove trailing slash
  const removeTrailingSlash = (url: string): string => url.replace(/\/$/, '');
  
  // ✅ PRIORITY 1: Use environment variable (set in Vercel dashboard)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return removeTrailingSlash(process.env.NEXT_PUBLIC_API_URL);
  }
  
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return removeTrailingSlash(process.env.NEXT_PUBLIC_BACKEND_URL);
  }
  
  // ✅ PRIORITY 2: Production detection (if env vars not set)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Vercel production/preview domains ALWAYS use Render backend
    if (hostname.includes('vercel.app')) {
      console.log('🌐 Vercel detected - using Render backend');
      return 'https://youtube-clone-project-q3pd.onrender.com';
    }
    
    // Local network access for mobile testing (192.168.x.x)
    if (hostname.startsWith('192.168.')) {
      console.log('📱 Local network detected');
      return `http://${hostname}:5000`;
    }
    
    // Localhost development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('💻 Localhost detected');
      return 'http://localhost:5000';
    }
  }
  
  // ✅ Default fallback to production
  console.warn('⚠️ No hostname detected, using production backend');
  return 'https://youtube-clone-project-q3pd.onrender.com';
};

const BACKEND_URL: string = getBackendURL();

console.log('🔧 Axios Configuration:');
console.log('   Backend URL:', BACKEND_URL);
console.log('   Is HTTPS:', BACKEND_URL.startsWith('https'));
console.log('   Environment:', process.env.NODE_ENV);

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 300000, // ✅ 5 minutes default timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // ✅ Don't retry 4xx errors
  validateStatus: (status) => status < 500,
});

// ✅ CRITICAL: Request Interceptor - Upload timeout override + token attachment
axiosInstance.interceptors.request.use(
  (config) => {
    // ✅ EXTENDED TIMEOUT FOR UPLOADS (10 minutes)
    if (config.url?.includes('/upload') || config.url?.includes('/video')) {
      config.timeout = 600000; // 10 minutes for uploads
      console.log('⏱️ Extended timeout to 10 minutes for upload');
    }
    
    // ✅ Attach authentication token
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token attached to request');
      } else {
        console.log('⚠️ No token found in localStorage');
      }
    }
    
    console.log('📤 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullUrl: `${config.baseURL}${config.url}`,
      hasToken: !!(config.headers?.Authorization),
      timeout: config.timeout
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ✅ Response Interceptor - Handle responses and errors
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