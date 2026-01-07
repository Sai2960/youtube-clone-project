// src/lib/axiosinstance.ts
import axios, { AxiosInstance } from "axios";

// ✅ HARDCODED RAILWAY URL - UPDATE THIS IF YOUR URL IS DIFFERENT
const RAILWAY_BACKEND_URL =
  "https://youtube-clone-project-production.up.railway.app";

/**
 * Determines the backend URL based on environment
 * @returns Backend URL string
 */
const getBackendURL = (): string => {
  // Check if running in browser
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // Local development detection
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("💻 Local Development Mode");
      return "http://localhost:5000";
    }
  }

  // Production - use Railway
  console.log(
    "🌐 Production Mode - Using Railway Backend:",
    RAILWAY_BACKEND_URL
  );
  return RAILWAY_BACKEND_URL;
};

// Initialize backend URL
const BACKEND_URL: string = getBackendURL();

console.log("🔧 Axios Instance Initialized with Backend URL:", BACKEND_URL);

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 60000, // 60 seconds default timeout
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable cookies/credentials
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors
  maxContentLength: Infinity, // No limit on response size
  maxBodyLength: Infinity, // No limit on request size
});

axiosInstance.interceptors.request.use(
  (config) => {
    // ✅ EXTENDED TIMEOUT FOR UPLOADS AND VIDEO OPERATIONS
    if (
      config.url?.includes("/upload") ||
      config.url?.includes("/video") ||
      config.url?.includes("/videos")
    ) {
      config.timeout = 600000; // 10 minutes for large uploads
      console.log("⏱️ Extended timeout for upload/video operation");
    }

    // ✅ REMOVE OLD CACHE HEADERS
    if (config.headers) {
      delete config.headers["If-None-Match"];
      delete config.headers["If-Modified-Since"];
      delete config.headers["ETag"];
      delete config.headers["Last-Modified"];
    }

    // ✅ ADD AUTHENTICATION TOKEN
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("token");

      // Only add valid tokens
      if (
        token &&
        token !== "null" &&
        token !== "undefined" &&
        token.trim() !== ""
      ) {
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers.Authorization = `Bearer ${token}`;
        console.log("🔑 Auth token added to request");
      }
    }

    // ✅ COMPREHENSIVE CACHE BUSTING
    if (!config.headers) {
      config.headers = {} as any;
    }

    config.headers["Cache-Control"] =
      "no-cache, no-store, must-revalidate, max-age=0";
    config.headers["Pragma"] = "no-cache";
    config.headers["Expires"] = "0";

    // Add timestamp and random string to prevent caching
    if (!config.params) {
      config.params = {};
    }
    config.params._t = Date.now(); // Timestamp
    config.params._r = Math.random().toString(36).substring(7); // Random string

    // ✅ DETAILED REQUEST LOGGING
    console.log("📤 Outgoing Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullURL: `${BACKEND_URL}${config.url}`,
      hasAuth: !!config.headers.Authorization,
      timeout: config.timeout,
      timestamp: new Date().toISOString(),
    });

    return config;
  },
  (error) => {
    console.error("❌ Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    // ✅ SUCCESS RESPONSE LOGGING
    console.log("✅ Response Received:", {
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      status: response.status,
      statusText: response.statusText,
      dataSize: JSON.stringify(response.data).length + " bytes",
      timestamp: new Date().toISOString(),
    });

    return response;
  },
  (error) => {
    // ✅ DETAILED ERROR LOGGING
    console.error("❌ API Error Details:", {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      errorCode: error.code,
      backendURL: BACKEND_URL,
      timestamp: new Date().toISOString(),
    });

    // ✅ HANDLE 401 UNAUTHORIZED - AUTO LOGOUT
    if (error.response?.status === 401) {
      console.log("🔒 Unauthorized Access - Token expired or invalid");

      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;

        // Clear auth data
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Redirect to login (avoid loop)
        if (
          !currentPath.includes("/login") &&
          !currentPath.includes("/signup")
        ) {
          console.log("🔄 Redirecting to login...");
          window.location.href = "/login";
        }
      }
    }

    // ✅ HANDLE NETWORK ERRORS
    if (error.code === "ECONNABORTED") {
      console.error("⏱️ Request Timeout - Server took too long to respond");
    } else if (error.code === "ERR_NETWORK") {
      console.error("🌐 Network Error - Check your internet connection");
    }

    return Promise.reject(error);
  }
);

/**
 * EXPORTS
 */
export default axiosInstance;
export { BACKEND_URL };
