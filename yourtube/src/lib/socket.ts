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

  const PRODUCTION_URL = "https://youtube-clone-project-q3pd.onrender.com";
  const hostname = window.location.hostname;
  
  // ✅ Local development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("🏠 Local environment");
    return "http://localhost:5000";
  }

  // ✅ Production (Vercel/Netlify)
  console.log("🌐 Production environment:", hostname);
  console.log("🔧 Using backend:", PRODUCTION_URL);
  return PRODUCTION_URL;
};

const SOCKET_URL = getSocketURL();

console.log("🔧 Socket Configuration:");
console.log("   URL:", SOCKET_URL);
console.log("   Protocol:", SOCKET_URL.startsWith("https") ? "HTTPS" : "HTTP");

export const initializeSocket = (userId: string): Socket => {
  // Return existing socket if already connected
  if (socket?.connected && currentUserId === userId) {
    console.log("✅ Socket already connected for user:", userId);
    if (!isRegistered) {
      socket.emit("register-user", userId);
    }
    return socket;
  }

  // Disconnect old socket if user changed
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
    transports: ["polling", "websocket"],
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

  // ✅ CRITICAL: Force immediate connection attempt
  console.log("🔄 Forcing socket connection...");
  socket.connect();

  // ✅ CRITICAL: Expose socket to window for debugging
  if (typeof window !== 'undefined') {
    (window as any).__socket = socket;
    console.log("✅ Socket exposed to window.__socket");
    
    // ✅ NEW: Log all socket events
    socket.onAny((eventName, ...args) => {
      console.log(`📨 Socket event: ${eventName}`, args);
    });
  }

  // Connection handlers
  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket?.id);
    console.log("   Transport:", socket?.io.engine.transport.name);
    reconnectAttempts = 0;

    if (userId && socket) {
      console.log("📝 Registering user:", userId);
      socket.emit("register-user", userId);
    }
  });

  socket.on("user-registered", (data) => {
    console.log("✅ User registration confirmed:", data);
    isRegistered = true;
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error.message);
    console.error("   URL:", SOCKET_URL);
    console.error("   Stack:", error.stack);
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

  // ✅ NEW: Log connection state changes
  socket.io.on("ping", () => {
    console.log("🏓 Ping sent");
  });

  socket.io.on("packet", (packet) => {
    console.log("📦 Packet:", packet.type, packet.data);
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

export const waitForSocket = (maxWaitMs: number = 15000): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    // ✅ CRITICAL FIX: Check if socket exists first
    if (!socket) {
      reject(new Error("Socket not initialized. Call initializeSocket first."));
      return;
    }

    // ✅ If already connected and registered, resolve immediately
    if (socket.connected && isRegistered) {
      console.log("✅ Socket already ready");
      resolve(socket);
      return;
    }

    console.log("⏳ Waiting for socket connection...");
    console.log("   Current state: connected =", socket.connected, "registered =", isRegistered);

    const startTime = Date.now();
    
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      if (socket?.connected && isRegistered) {
        console.log(`✅ Socket ready after ${elapsed}ms`);
        clearInterval(checkInterval);
        resolve(socket);
      } else if (elapsed > maxWaitMs) {
        clearInterval(checkInterval);
        const msg = `Socket timeout after ${elapsed}ms (connected: ${socket?.connected}, registered: ${isRegistered})`;
        console.error("❌", msg);
        reject(new Error(msg));
      } else if (elapsed % 1000 === 0) {
        // Log every second
        console.log(`   Still waiting... ${Math.floor(elapsed / 1000)}s (connected: ${socket?.connected}, registered: ${isRegistered})`);
      }
    }, 100);

    // ✅ Also try to trigger registration if connected but not registered
    if (socket?.connected && !isRegistered && currentUserId) {
      console.log("🔄 Triggering re-registration");
      socket.emit("register-user", currentUserId);
    }
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