import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let currentUserId: string | null = null;
let isRegistered = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

const getSocketURL = () => {
  if (typeof window === "undefined") {
    return "http://localhost:5000";
  }

  // ✅ CRITICAL: Check environment variables first
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                 process.env.NEXT_PUBLIC_BACKEND_URL;
  
  if (envUrl) {
    console.log("🔧 Using environment URL:", envUrl);
    return envUrl;
  }

  // ✅ Production detection
  const hostname = window.location.hostname;
  if (hostname.includes("vercel.app")) {
    console.log("🌐 Vercel detected - using Render backend");
    return "https://youtube-clone-project-q3pd.onrender.com";
  }

  // Development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5000";
  }

  // Fallback
  return "https://youtube-clone-project-q3pd.onrender.com";
};

const SOCKET_URL = getSocketURL();

console.log("🔧 Socket Configuration:");
console.log("   URL:", SOCKET_URL);
console.log("   Secure:", SOCKET_URL.startsWith("https"));

export const initializeSocket = (userId: string): Socket => {
  if (socket?.connected && currentUserId === userId) {
    console.log("✅ Socket already connected");
    if (!isRegistered) {
      socket.emit("register-user", userId);
    }
    return socket;
  }

  if (socket && currentUserId !== userId) {
    console.log("🔄 Switching user");
    socket.disconnect();
    socket = null;
    isRegistered = false;
  }

  currentUserId = userId;
  console.log("🔌 Initializing Socket.IO");
  console.log("   User:", userId);
  console.log("   URL:", SOCKET_URL);

  const isSecure = SOCKET_URL.startsWith("https");

  socket = io(SOCKET_URL, {
    transports: ["polling", "websocket"], // ✅ Start with polling
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 30000,
    autoConnect: true,
    withCredentials: true,
    secure: isSecure,
    rejectUnauthorized: false,
    query: { userId },
    path: "/socket.io/",
  });

  // ===== Event Handlers =====
  socket.on("connect", () => {
    console.log("✅ Connected:", socket?.id);
    console.log("   Transport:", socket?.io.engine.transport.name);
    reconnectAttempts = 0;

    if (userId && socket) {
      socket.emit("register-user", userId);
    }
  });

  socket.on("user-registered", (data) => {
    console.log("✅ Registration confirmed:", data);
    isRegistered = true;
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Connection error:", error.message);
    isRegistered = false;
    reconnectAttempts++;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("❌ Max reconnection attempts");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("socket-connection-failed", {
            detail: { error: error.message },
          })
        );
      }
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Disconnected:", reason);
    isRegistered = false;
    if (reason === "io server disconnect") {
      socket?.connect();
    }
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    reconnectAttempts = 0;
    if (userId && socket) {
      socket.emit("register-user", userId);
    }
  });

  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) {
    throw new Error("Socket not initialized");
  }
  return socket;
};

export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};

export const waitForSocket = (maxWaitMs: number = 15000): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    if (socket?.connected && isRegistered) {
      resolve(socket);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (socket?.connected && isRegistered) {
        clearInterval(checkInterval);
        resolve(socket);
      } else if (Date.now() - startTime > maxWaitMs) {
        clearInterval(checkInterval);
        reject(new Error("Socket connection timeout"));
      }
    }, 100);
  });
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    isRegistered = false;
    currentUserId = null;
    reconnectAttempts = 0;
  }
};

export default initializeSocket;