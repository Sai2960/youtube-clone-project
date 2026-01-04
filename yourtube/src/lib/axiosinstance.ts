// src/lib/axiosinstance.ts - HARDCODED RAILWAY URL
import axios, { AxiosInstance } from "axios";

// ✅ HARDCODED RAILWAY URL - NO ENV VAR NEEDED
const getBackendURL = (): string => {
  // Local development
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("💻 Local development");
      return "http://localhost:5000";
    }
  }
  
  // ✅ ALWAYS use Railway in production
  const RAILWAY_URL = "https://youtube-clone-project-production.up.railway.app";
  console.log("🌐 Using Railway backend:", RAILWAY_URL);
  return RAILWAY_URL;
};

const BACKEND_URL: string = getBackendURL();

console.log("🔧 Axios Backend URL:", BACKEND_URL);

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
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
    // Extended timeout for uploads/videos
    if (config.url?.includes("/upload") || config.url?.includes("/video")) {
      config.timeout = 600000; // 10 minutes
    }

    // Remove cache headers
    if (config.headers) {
      delete config.headers["If-None-Match"];
      delete config.headers["If-Modified-Since"];
      delete config.headers["ETag"];
      delete config.headers["Last-Modified"];
    }

    // Auth token
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("token");
      if (token && token !== "null" && token !== "undefined") {
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Cache busting
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0";
    config.headers["Pragma"] = "no-cache";
    config.headers["Expires"] = "0";

    if (!config.params) {
      config.params = {};
    }
    config.params._t = Date.now();
    config.params._r = Math.random().toString(36).substring(7);

    console.log("📤 Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullURL: `${BACKEND_URL}${config.url}`,
      hasAuth: !!config.headers.Authorization,
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
    console.log("✅ API Response:", {
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      dataSize: JSON.stringify(response.data).length,
      timestamp: new Date().toISOString(),
    });
    return response;
  },
  (error) => {
    console.error("❌ API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      code: error.code,
      backendURL: BACKEND_URL,
    });

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.log("🔒 Unauthorized - Token expired");
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        if (!currentPath.includes("/login")) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
export { BACKEND_URL };