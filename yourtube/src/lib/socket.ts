// lib/socket.ts - ENHANCED VERSION
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

  // ✅ HARDCODED FALLBACK
  const PRODUCTION_URL = "https://youtube-clone-project-q3pd.onrender.com";

  const envUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

  if (envUrl) {
    console.log("🔧 Using environment URL:", envUrl);
    return envUrl;
  }

  const hostname = window.location.hostname;
  if (hostname.includes("vercel.app") || hostname.includes("netlify.app")) {
    console.log("🌐 Production detected - using Render backend");
    return PRODUCTION_URL;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5000";
  }

  console.log("🔧 Using fallback URL");
  return PRODUCTION_URL;
};

const SOCKET_URL = getSocketURL();

console.log("🔧 Socket Configuration:");
console.log("   URL:", SOCKET_URL);
console.log("   Protocol:", SOCKET_URL.startsWith("https") ? "HTTPS" : "HTTP");

export const initializeSocket = (userId: string): Socket => {
  if (socket?.connected && currentUserId === userId) {
    console.log("✅ Socket already connected for user:", userId);
    if (!isRegistered) {
      socket.emit("register-user", userId);
    }
    return socket;
  }

  if (socket && currentUserId !== userId) {
    console.log("🔄 User changed, reconnecting");
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
    transports: ["websocket", "polling"], // ✅ Try WebSocket first
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 500, // ✅ Faster reconnect
    reconnectionDelayMax: 3000, // ✅ Reduced max delay
    timeout: 20000, // ✅ Reduced timeout
    autoConnect: true,
    withCredentials: true,
    secure: isSecure,
    rejectUnauthorized: false,
    query: { userId },
    path: "/socket.io/",
    forceNew: false, // ✅ Reuse connections
  });

  // ✅ ENHANCED: Immediate connection attempt
  if (!socket.connected) {
    console.log("🔄 Forcing immediate connection");
    socket.connect();
  }

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket?.id);
    console.log("   Transport:", socket?.io.engine.transport.name);
    reconnectAttempts = 0;

    if (userId && socket) {
      socket.emit("register-user", userId);
      console.log("📤 Sent registration for:", userId);
    }
  });

  socket.on("user-registered", (data) => {
    console.log("✅ User registration confirmed:", data);
    isRegistered = true;
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error.message);
    console.error("   URL:", SOCKET_URL);
    console.error("   Transport:", socket?.io.engine?.transport?.name);
    isRegistered = false;
    reconnectAttempts++;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("❌ Max reconnection attempts reached");
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
    isRegistered = false;

    if (reason === "io server disconnect") {
      console.log("🔄 Server disconnected, reconnecting...");
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

  // ✅ SIMPLE FIX: Only keep ping monitoring
  socket.io.on("ping", () => {
    console.log("🏓 Ping/Pong active");
  });

  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) {
    throw new Error("Socket not initialized. Call initializeSocket first.");
  }
  return socket;
};

export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};

// ✅ ENHANCED: Better timeout handling
export const waitForSocket = (maxWaitMs: number = 15000): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    // Check immediately
    if (socket?.connected && isRegistered) {
      console.log("✅ Socket already ready");
      resolve(socket);
      return;
    }

    console.log(`⏳ Waiting for socket (max ${maxWaitMs}ms)...`);
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      if (socket?.connected && isRegistered) {
        clearInterval(checkInterval);
        console.log(`✅ Socket ready after ${elapsed}ms`);
        resolve(socket);
      } else if (elapsed > maxWaitMs) {
        clearInterval(checkInterval);
        console.error(`❌ Socket timeout after ${elapsed}ms`);
        console.error("   Connected:", socket?.connected);
        console.error("   Registered:", isRegistered);
        reject(
          new Error("Socket connection timeout - backend may be down or slow")
        );
      } else {
        // Log progress every 2 seconds
        if (elapsed % 2000 < 100) {
          console.log(
            `⏳ Still waiting... (${Math.floor(elapsed / 1000)}s/${Math.floor(
              maxWaitMs / 1000
            )}s)`
          );
          console.log(
            `   Connected: ${socket?.connected}, Registered: ${isRegistered}`
          );
        }
      }
    }, 100);
  });
};

export const disconnectSocket = (): void => {
  if (socket) {
    console.log("🔌 Disconnecting socket");
    socket.disconnect();
    socket = null;
    isRegistered = false;
    currentUserId = null;
    reconnectAttempts = 0;
  }
};

export default initializeSocket;
