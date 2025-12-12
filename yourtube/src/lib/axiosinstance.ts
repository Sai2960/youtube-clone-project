// src/lib/axiosinstance.ts - FULLY FIXED VERSION
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
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  validateStatus: (status) => status < 500,
});

// ✅ CRITICAL: Request Interceptor with aggressive cache busting
// ✅ REPLACE ENTIRE REQUEST INTERCEPTOR
axiosInstance.interceptors.request.use(
  (config) => {
    // Extended timeout for uploads
    if (config.url?.includes('/upload') || config.url?.includes('/video')) {
      config.timeout = 600000;
      console.log('⏱️ Extended timeout to 10 minutes for upload');
    }
    
    // ✅ CRITICAL: Remove ALL ETag headers
    if (config.headers) {
      delete config.headers['If-None-Match'];
      delete config.headers['If-Modified-Since'];
      delete config.headers['ETag'];
      delete config.headers['Last-Modified'];
    }
    
    // Read token
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('token');
      
      if (token && token !== 'null' && token !== 'undefined') {
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // ✅ Ultra-aggressive cache busting
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
    
    // ✅ ANDROID: Triple cache busters
    if (!config.params) {
      config.params = {};
    }
    config.params._t = Date.now();
    config.params._r = Math.random().toString(36).substring(7);
    config.params._m = 'android'; // Mobile flag
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

export default axiosInstance;
export { BACKEND_URL };