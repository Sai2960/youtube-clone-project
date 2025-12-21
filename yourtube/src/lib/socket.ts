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
  if (socket?.connected && currentUserId === userId && isRegistered) {
    console.log("✅ Socket already connected for user:", userId);
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
    transports: ["polling", "websocket"], // ✅ Match backend order
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 45000, // ✅ Match backend timeout
    autoConnect: true,
    withCredentials: true,
    secure: isSecure,
    rejectUnauthorized: false,
    query: { userId },
    path: "/socket.io/",
    forceNew: false,
  });

  // ✅ Force immediate connection
  if (!socket.connected) {
    console.log("🔄 Forcing socket connection...");
    socket.connect();
  }

  // ✅ Expose to window for debugging
  if (typeof window !== "undefined") {
    (window as any).__socket = socket;
    console.log("✅ Socket exposed to window.__socket");
  }

  // Connection handlers
  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket?.id);
    console.log("   Transport:", socket?.io.engine.transport.name);
    reconnectAttempts = 0;

    // Register user immediately
    if (userId && socket && !isRegistered) {
      console.log("📝 Registering user:", userId);
      socket.emit("register-user", userId);
      // Don't set isRegistered here - wait for confirmation
    }
  });

  socket.on("user-registered", (data) => {
    console.log("✅ User registration confirmed:", data);
    isRegistered = true;
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error.message);
    console.error("   URL:", SOCKET_URL);
    console.error(
      "   Transport:",
      socket?.io.engine?.transport?.name || "none"
    );
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
    if (!socket) {
      reject(new Error("Socket not initialized. Call initializeSocket first."));
      return;
    }

    // If already connected AND registered, resolve immediately
    if (socket.connected && isRegistered) {
      console.log("✅ Socket connected and registered - resolving immediately");
      resolve(socket);
      return;
    }

    // If connected but not registered, wait for registration
    if (socket.connected && !isRegistered) {
      console.log("⏳ Socket connected, waiting for registration...");

      const registrationHandler = () => {
        console.log("✅ Registration confirmed");
        socket?.off("user-registered", registrationHandler);
        clearTimeout(registrationTimeout);
        resolve(socket!);
      };

      socket.on("user-registered", registrationHandler);

      const registrationTimeout = setTimeout(() => {
        socket?.off("user-registered", registrationHandler);
        console.log("✅ Registration timeout - assuming success");
        resolve(socket!);
      }, 2000);

      return;
    }

    console.log("⏳ Waiting for socket connection...");
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      if (socket?.connected) {
        console.log(`✅ Socket connected after ${elapsed}ms`);
        clearInterval(checkInterval);

        // Wait briefly for registration, then resolve
        if (isRegistered) {
          resolve(socket);
        } else {
          setTimeout(() => resolve(socket!), 500);
        }
      } else if (elapsed > maxWaitMs) {
        clearInterval(checkInterval);
        const msg = `Socket connection timeout after ${elapsed}ms`;
        console.error("❌", msg);
        reject(new Error(msg));
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
