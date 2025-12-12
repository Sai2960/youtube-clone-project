import axios, { AxiosInstance } from 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    timeout?: number;
  }
}

const getBackendURL = (): string => {
  const removeTrailingSlash = (url: string): string => url.replace(/\/$/, '');
  
  if (process.env.NEXT_PUBLIC_API_URL) {
    return removeTrailingSlash(process.env.NEXT_PUBLIC_API_URL);
  }
  
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return removeTrailingSlash(process.env.NEXT_PUBLIC_BACKEND_URL);
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname.includes('vercel.app')) {
      console.log('🌐 Vercel detected - using Render backend');
      return 'https://youtube-clone-project-q3pd.onrender.com';
    }
    
    if (hostname.startsWith('192.168.')) {
      console.log('📱 Local network detected');
      return `http://${hostname}:5000`;
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('💻 Localhost detected');
      return 'http://localhost:5000';
    }
  }
  
  console.warn('⚠️ No hostname detected, using production backend');
  return 'https://youtube-clone-project-q3pd.onrender.com';
};

const BACKEND_URL: string = getBackendURL();

console.log('🔧 Axios Configuration:');
console.log('   Backend URL:', BACKEND_URL);
console.log('   Is HTTPS:', BACKEND_URL.startsWith('https'));

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000, // ✅ INCREASED to 30 seconds for mobile
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  validateStatus: (status) => status < 500,
});

// ✅ CRITICAL: Request Interceptor with better mobile handling
// ✅ ANDROID FIX: Request Interceptor with proper order
axiosInstance.interceptors.request.use(
  (config) => {
    // ✅ STEP 1: Initialize headers FIRST
    if (!config.headers) {
      config.headers = {} as any;
    }
    
    // ✅ STEP 2: Add cache-busting headers BEFORE anything else
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
    config.headers['If-None-Match'] = '*'; // ✅ Force revalidation
    config.headers['If-Modified-Since'] = '0'; // ✅ Bypass 304
    
    // ✅ STEP 3: Add timestamp to params
    if (!config.params) {
      config.params = {};
    }
    config.params._nocache = Date.now();
    config.params._android = 'true';
    
    // ✅ STEP 4: Add authentication token
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('token');
      
      if (token && token !== 'null' && token !== 'undefined') {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // ✅ STEP 5: Extended timeout for uploads
    if (config.url?.includes('/upload') || config.url?.includes('/video')) {
      config.timeout = 600000;
      console.log('⏱️ Extended timeout to 10 minutes for upload');
    }
    
    console.log('📤 Request:', {
      url: config.url,
      headers: config.headers,
      params: config.params
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

export default axiosInstance;
export { BACKEND_URL };