// src/lib/axiosinstance.ts - FIXED VERSION
import axios, { AxiosInstance } from "axios";

// ✅ CRITICAL: Hardcoded Railway URL with correct configuration
const RAILWAY_BACKEND_URL = "https://youtube-clone-project-production.up.railway.app";
const LOCAL_BACKEND_URL = "http://localhost:8080"; // ✅ CHANGED from 5000 to 8080

const getBackendURL = (): string => {
  // Check if we're in browser
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("💻 Using local backend:", LOCAL_BACKEND_URL);
      return LOCAL_BACKEND_URL;
    }
    
    // Vercel preview/production
    console.log("🚀 Using Railway backend:", RAILWAY_BACKEND_URL);
    return RAILWAY_BACKEND_URL;
  }
  
  // SSR fallback - always use Railway
  console.log("🔧 SSR: Using Railway backend:", RAILWAY_BACKEND_URL);
  return RAILWAY_BACKEND_URL;
};

const BACKEND_URL: string = getBackendURL();

console.log("🔧 Axios initialized with backend:", BACKEND_URL);

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 60000, // ✅ Increased from 30s to 60s for Railway
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  validateStatus: (status) => status < 500,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // ✅ Extended timeout for specific routes
    if (
      config.url?.includes("/upload") || 
      config.url?.includes("/video") ||
      config.url?.includes("/subscription") // ✅ Added subscription routes
    ) {
      config.timeout = 120000; // 2 minutes for these routes
    }

    // Remove cache headers
    if (config.headers) {
      delete config.headers["If-None-Match"];
      delete config.headers["If-Modified-Since"];
      delete config.headers["ETag"];
      delete config.headers["Last-Modified"];
    }

    // ✅ Auth token handling
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("token");
      if (token && token !== "null" && token !== "undefined") {
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // ✅ Cache busting
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    config.headers["Pragma"] = "no-cache";
    config.headers["Expires"] = "0";

    // ✅ Add timestamp to prevent caching
    if (!config.params) {
      config.params = {};
    }
    config.params._t = Date.now();

    console.log("📤 Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullURL: `${BACKEND_URL}${config.url}`,
      hasAuth: !!config.headers.Authorization,
      timeout: config.timeout,
    });

    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log("✅ Response:", {
      url: response.config.url,
      status: response.status,
      hasData: !!response.data,
    });
    return response;
  },
  (error) => {
    console.error("❌ API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.code,
    });

    // ✅ Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.log("🔒 Unauthorized - Clearing auth");
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        // Don't redirect if already on login page
        if (!currentPath.includes("/login") && !currentPath.includes("/signup")) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.dispatchEvent(new Event("tokenExpired"));
          setTimeout(() => {
            window.location.href = `/login?returnUrl=${encodeURIComponent(currentPath)}`;
          }, 100);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
export { BACKEND_URL };