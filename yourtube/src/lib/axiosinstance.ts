// src/lib/axiosinstance.ts - FULLY FIXED VERSION
import axios, { AxiosInstance } from "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    timeout?: number;
  }
}

const getBackendURL = (): string => {
  const removeTrailingSlash = (url: string): string => url.replace(/\/$/, "");

  if (process.env.NEXT_PUBLIC_API_URL) {
    return removeTrailingSlash(process.env.NEXT_PUBLIC_API_URL);
  }

  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return removeTrailingSlash(process.env.NEXT_PUBLIC_BACKEND_URL);
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (hostname.includes("vercel.app")) {
      console.log("🌐 Vercel detected - using Render backend");
      return "https://youtube-clone-project-q3pd.onrender.com";
    }

    if (hostname.startsWith("192.168.")) {
      console.log("📱 Local network detected");
      return `http://${hostname}:5000`;
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("💻 Localhost detected");
      return "http://localhost:5000";
    }
  }

  console.warn("⚠️ No hostname detected, using production backend");
  return "https://youtube-clone-project-q3pd.onrender.com";
};

const BACKEND_URL: string = getBackendURL();

console.log("🔧 Axios Configuration:");
console.log("   Backend URL:", BACKEND_URL);
console.log("   Is HTTPS:", BACKEND_URL.startsWith("https"));

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  validateStatus: (status) => status < 500,
});

// ✅ CRITICAL: Request Interceptor with aggressive cache busting
axiosInstance.interceptors.request.use(
  (config) => {
    // ✅ Extended timeout for uploads
    if (config.url?.includes("/upload") || config.url?.includes("/video")) {
      config.timeout = 600000;
      console.log("⏱️ Extended timeout to 10 minutes for upload");
    }

    // ✅ CRITICAL: Remove ALL cache-related headers that cause CORS issues
    if (config.headers) {
      delete config.headers["If-None-Match"];
      delete config.headers["If-Modified-Since"];
      delete config.headers["ETag"];
      delete config.headers["Last-Modified"];
    }

    // ✅ Read fresh token
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("token");

      if (token && token !== "null" && token !== "undefined") {
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // ✅ ANDROID: Ultra-aggressive cache busting
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers["Cache-Control"] =
      "no-cache, no-store, must-revalidate, max-age=0";
    config.headers["Pragma"] = "no-cache";
    config.headers["Expires"] = "0";

    // ✅ ANDROID: Force unique request with multiple cache busters
    if (!config.params) {
      config.params = {};
    }
    config.params._t = Date.now();
    config.params._r = Math.random().toString(36).substring(7);

    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject(error);
  }
);

// ✅ Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", {
      url: response.config.url,
      status: response.status,
      dataSize: JSON.stringify(response.data).length,
    });
    return response;
  },
  (error) => {
    console.error("❌ API Error:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.code,
    });

    if (error.code === "ERR_NETWORK") {
      console.error("🌐 NETWORK ERROR - Backend unreachable");
      console.error("   Backend URL:", BACKEND_URL);
    }

    if (error.message?.includes("CORS")) {
      console.error("🚫 CORS ERROR - Origin not allowed");
    }

    // ============ HANDLE APPROVAL PENDING ============
    if (error.response?.status === 403) {
      const message = error.response?.data?.message;

      if (
        message?.includes("pending admin approval") ||
        error.response?.data?.status === "pending_approval"
      ) {
        console.log("⏳ Account pending admin approval");
        // Don't redirect - let the component handle this
        return Promise.reject(error);
      }
    }
    // =================================================

    if (error.response?.status === 401) {
      console.log("🔒 Unauthorized - Token expired or invalid");

      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;

        if (!currentPath.includes("/login")) {
          console.log("   Redirecting to login");
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
