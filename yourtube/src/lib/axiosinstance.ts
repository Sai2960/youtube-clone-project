// src/lib/axiosinstance.ts - FULLY MERGED AND FIXED VERSION
import axios, { AxiosInstance } from "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    timeout?: number;
  }
}
// ✅ ENHANCED: Smart backend URL detection with fallback
const getBackendURL = (): string => {
  // Priority 1: Check environment variable first
  if (process.env.NEXT_PUBLIC_API_URL) {
    const cleanURL = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
    console.log("🔧 Using environment variable:", cleanURL);
    return cleanURL;
  }

  // Priority 2: Local development detection
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("💻 Local development detected");
      return "http://localhost:5000";
    }
  }

  // Priority 3: Production - Always use Railway backend
  const RAILWAY_BACKEND =
    "https://youtube-clone-project-production.up.railway.app";
  console.log("🌐 Production: Using Railway backend");
  return RAILWAY_BACKEND;
};

const BACKEND_URL: string = getBackendURL();

console.log("🔧 Axios Configuration:");
console.log("   Backend URL:", BACKEND_URL);
console.log("   Is HTTPS:", BACKEND_URL.startsWith("https"));
console.log("   Environment:", process.env.NODE_ENV || "development");
// ✅ Create axios instance with production-ready configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BACKEND_URL, // Will be https://youtube-clone-project-q3pd.onrender.com in production
  timeout: 30000, // 30 seconds default timeout
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookies and auth
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors
});
// ✅ CRITICAL: Request Interceptor with comprehensive handling
axiosInstance.interceptors.request.use(
  (config) => {
    // ✅ FEATURE 1: Extended timeout for uploads and video operations
    if (config.url?.includes("/upload") || config.url?.includes("/video")) {
      config.timeout = 600000; // 10 minutes for large file uploads
      console.log(
        "⏱️ Extended timeout to 10 minutes for upload/video operation"
      );
    }

    // ✅ FEATURE 2: CRITICAL - Remove ALL cache-related headers that cause CORS issues
    // This prevents Android and browser caching problems
    if (config.headers) {
      delete config.headers["If-None-Match"];
      delete config.headers["If-Modified-Since"];
      delete config.headers["ETag"];
      delete config.headers["Last-Modified"];
    }
    // ✅ FEATURE 3: Authorization token injection
    // Read fresh token from localStorage and attach to request
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("token");

      if (token && token !== "null" && token !== "undefined") {
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers.Authorization = `Bearer ${token}`;
        console.log("🔐 Token attached to request");
      }
    }
    // ✅ FEATURE 4: ANDROID & BROWSER - Ultra-aggressive cache busting
    // This ensures fresh data on every request, especially important for Android
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers["Cache-Control"] =
      "no-cache, no-store, must-revalidate, max-age=0";
    config.headers["Pragma"] = "no-cache";
    config.headers["Expires"] = "0";

    // ✅ FEATURE 5: Multiple cache busters in URL params
    // Double protection with timestamp + random string
    if (!config.params) {
      config.params = {};
    }
    config.params._t = Date.now(); // Timestamp cache buster
    config.params._r = Math.random().toString(36).substring(7); // Random string cache buster

    console.log("📤 Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasAuth: !!config.headers.Authorization,
    });

    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject(error);
  }
);
// ✅ Response Interceptor with comprehensive error handling
axiosInstance.interceptors.response.use(
  (response) => {
    // ✅ FEATURE 6: Response logging for debugging
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
    // ✅ FEATURE 7: Detailed error logging
    console.error("❌ API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    });

    // ✅ FEATURE 8: Network error detection
    if (error.code === "ERR_NETWORK") {
      console.error("🌐 NETWORK ERROR - Backend unreachable");
      console.error("   Backend URL:", BACKEND_URL);
      console.error("   Check if backend server is running");
      console.error("   Check CORS configuration on backend");
    }

    // ✅ FEATURE 9: CORS error detection
    if (error.message?.includes("CORS")) {
      console.error("🚫 CORS ERROR - Origin not allowed");
      console.error("   Frontend origin needs to be whitelisted on backend");
    }
    // ✅ FEATURE 10: Handle approval pending (403 Forbidden)
    // This allows the UI to show appropriate messages for pending accounts
    if (error.response?.status === 403) {
      const message = error.response?.data?.message;
      const status = error.response?.data?.status;

      if (
        message?.includes("pending admin approval") ||
        status === "pending_approval"
      ) {
        console.log("⏳ Account pending admin approval");
        console.log("   User needs to wait for admin approval");
        // Don't redirect - let the component handle this gracefully
        return Promise.reject(error);
      }

      // Other 403 errors
      console.log("🚫 Forbidden - Access denied");
      return Promise.reject(error);
    }
    // ✅ FEATURE 11: Handle unauthorized (401) - Token expired or invalid
    if (error.response?.status === 401) {
      console.log("🔒 Unauthorized - Token expired or invalid");

      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;

        // Don't redirect if already on login page (prevents redirect loop)
        if (!currentPath.includes("/login")) {
          console.log("   Clearing authentication data");
          console.log("   Redirecting to login page");

          // Clear all auth data
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          // Redirect to login
          window.location.href = "/login";
        } else {
          console.log("   Already on login page, skipping redirect");
        }
      }
    }

    return Promise.reject(error);
  }
);
// ✅ Export configured axios instance and backend URL
export default axiosInstance;
export { BACKEND_URL };
