/* eslint-disable import/no-anonymous-default-export */
// src/lib/socket.ts - FULLY MERGED AND FIXED VERSION WITH TIMEOUT
import { io, Socket } from "socket.io-client";

// ✅ State management for socket lifecycle
let socket: Socket | null = null;
let currentUserId: string | null = null;
let isRegistered = false;
let reconnectAttempts = 0;
let connectionTimeout: NodeJS.Timeout | null = null; // ✅ NEW: Track timeout
const MAX_RECONNECT_ATTEMPTS = 10;
const CONNECTION_TIMEOUT_MS = 10000; // ✅ NEW: 10 second timeout

// ✅ ENHANCED: Smart socket URL detection with environment support
const getSocketURL = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:5000";
  }

  const hostname = window.location.hostname;

  // ✅ Local development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5000";
  }

  // ✅ Production - Railway with WSS (secure WebSocket) for HTTPS sites
  return "https://youtube-clone-project-production.up.railway.app";
};

const SOCKET_URL = getSocketURL();

console.log("🔧 Socket.IO Configuration:");
console.log("   URL:", SOCKET_URL);
console.log(
  "   Protocol:",
  SOCKET_URL.startsWith("https") ? "WSS/HTTPS" : "WS/HTTP"
);
console.log("   Environment:", process.env.NODE_ENV || "development");
// ✅ FEATURE-RICH: Initialize socket with user registration
export const initializeSocket = (userId?: string): Socket => {
  // ✅ Clear any existing timeout
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }

  // ✅ FEATURE 1: Return existing socket if conditions are met
  if (socket?.connected && currentUserId === userId && isRegistered) {
    console.log("✅ Socket already connected and registered");
    console.log("   User:", userId || "anonymous");
    console.log("   Socket ID:", socket.id);
    return socket;
  }

  // ✅ FEATURE 2: Handle user change - disconnect old socket
  if (socket && userId && currentUserId !== userId) {
    console.log("🔄 User changed, reconnecting socket");
    console.log("   Old User:", currentUserId);
    console.log("   New User:", userId);
    socket.disconnect();
    socket = null;
    isRegistered = false;
    reconnectAttempts = 0;
  }

  // Update current user
  if (userId) {
    currentUserId = userId;
  }

  console.log("🔌 Initializing Socket.IO");
  console.log("   User:", userId || "anonymous");
  console.log("   URL:", SOCKET_URL);
  console.log("   Timestamp:", new Date().toISOString());

  const isSecure = SOCKET_URL.startsWith("https");
  // ✅ FEATURE 3: Create socket with comprehensive configuration
  socket = io(SOCKET_URL, {
    // ✅ CRITICAL: Transport order must match backend
    transports: ["websocket", "polling"], // Try WebSocket first, fallback to polling
    upgrade: true, // Allow upgrade from polling to WebSocket

    // ✅ Reconnection strategy
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000, // Start with 1 second
    reconnectionDelayMax: 5000, // Max 5 seconds between attempts

    // ✅ Connection timeouts
    timeout: 45000, // 45 seconds - matches backend

    // ✅ Connection behavior
    autoConnect: true, // Connect immediately
    forceNew: false, // Reuse existing connection if possible

    // ✅ Security and credentials
    withCredentials: true, // Send cookies with requests
    secure: isSecure, // Use secure connection if HTTPS
    rejectUnauthorized: false, // Allow self-signed certificates (development)

    // ✅ User identification
    query: userId ? { userId } : {}, // Send userId in connection query

    // ✅ Path configuration
    path: "/socket.io/", // Socket.IO endpoint path
  });

  // ✅ FEATURE 4: Force immediate connection
  if (!socket.connected) {
    console.log("🔄 Forcing socket connection...");
    socket.connect();
  }
  // ✅ FEATURE 5: Expose socket to window for debugging
  if (typeof window !== "undefined") {
    (window as any).__socket = socket;
    (window as any).__socketDebug = {
      getStatus: () => ({
        connected: socket?.connected,
        id: socket?.id,
        userId: currentUserId,
        isRegistered,
        reconnectAttempts,
        transport: socket?.io.engine?.transport?.name,
      }),
      forceReconnect: () => socket?.connect(),
      disconnect: () => socket?.disconnect(),
      clearTimeout: () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
          console.log("✅ Connection timeout cleared");
        }
      },
    };
    console.log("✅ Socket exposed to window.__socket");
    console.log("✅ Debug tools available at window.__socketDebug");
  }
  // ✅ NEW FEATURE: Connection timeout warning
  connectionTimeout = setTimeout(() => {
    if (!socket?.connected) {
      console.error("⏰ Socket connection timeout after 10 seconds");
      console.error("   URL:", SOCKET_URL);
      console.error("   Current time:", new Date().toISOString());
      console.error("   Possible issues:");
      console.error("   1. Backend server is down or unreachable");
      console.error("   2. CORS configuration blocking connection");
      console.error("   3. Network/firewall blocking WebSocket");
      console.error("   4. Wrong server URL configured");
      console.error("   5. Server not accepting connections");
      console.error("");
      console.error("   Debug info:");
      console.error("   - Socket ID:", socket?.id || "none");
      console.error("   - User ID:", currentUserId || "none");
      console.error("   - Reconnect attempts:", reconnectAttempts);
      console.error("   - Is registered:", isRegistered);
    }
    connectionTimeout = null; // Clear reference after firing
  }, CONNECTION_TIMEOUT_MS);

  // ✅ FEATURE 6: Connection success handler
  socket.on("connect", () => {
    // ✅ Clear timeout on successful connection
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }

    console.log("✅ Socket.IO connected successfully!");
    console.log("   Socket ID:", socket?.id);
    console.log("   Transport:", socket?.io.engine.transport.name);
    console.log("   Timestamp:", new Date().toISOString());

    // Reset reconnection counter on successful connection
    reconnectAttempts = 0;

    // ✅ FEATURE 7: Auto-register user on connect
    if (userId && socket && !isRegistered) {
      console.log("📝 Registering user with server:", userId);
      socket.emit("register-user", userId);
      // Note: Don't set isRegistered here - wait for server confirmation
    }
  });

  // ✅ FEATURE 8: User registration confirmation
  socket.on("user-registered", (data) => {
    console.log("✅ User registration confirmed by server");
    console.log("   Data:", data);
    console.log("   User:", currentUserId);
    isRegistered = true;
  });
  // ✅ FEATURE 9: Connection error handler
  socket.on("connect_error", (error) => {
    console.error("❌ Socket.IO connection error");
    console.error("   Message:", error.message);
    console.error("   URL:", SOCKET_URL);
    console.error(
      "   Transport:",
      socket?.io.engine?.transport?.name || "none"
    );
    console.error("   Attempt:", reconnectAttempts + 1);

    // Reset registration flag on error
    isRegistered = false;
    reconnectAttempts++;

    // ✅ FEATURE 10: Max reconnection attempts handling
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("❌ Max reconnection attempts reached");
      console.error("   Total attempts:", reconnectAttempts);
      console.error("   Consider checking:");
      console.error("   - Backend server status");
      console.error("   - Network connectivity");
      console.error("   - CORS configuration");

      // Clear timeout when giving up
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
    }
  });
  // ✅ FEATURE 11: Disconnection handler
  socket.on("disconnect", (reason) => {
    console.log("❌ Socket.IO disconnected");
    console.log("   Reason:", reason);
    console.log("   Was registered:", isRegistered);

    // Reset registration flag
    isRegistered = false;

    // Clear timeout on disconnect
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }

    // ✅ Handle different disconnect reasons
    if (reason === "io server disconnect") {
      // Server initiated disconnect - reconnect manually
      console.log("🔄 Server disconnected, reconnecting manually...");
      socket?.connect();
    } else if (reason === "io client disconnect") {
      // Client initiated disconnect - don't reconnect
      console.log("🔌 Client initiated disconnect");
    } else if (reason === "ping timeout") {
      // Connection lost - will auto-reconnect
      console.log("⏱️ Connection timeout - auto-reconnecting...");
    } else if (reason === "transport close") {
      // Transport closed - will auto-reconnect
      console.log("🚪 Transport closed - auto-reconnecting...");
    } else if (reason === "transport error") {
      // Transport error - will auto-reconnect
      console.log("❌ Transport error - auto-reconnecting...");
    }
  });
  // ✅ FEATURE 12: Reconnection success handler
  socket.on("reconnect", (attemptNumber) => {
    // Clear timeout on reconnect
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }

    console.log("✅ Socket.IO reconnected successfully!");
    console.log("   After attempts:", attemptNumber);
    console.log("   New Socket ID:", socket?.id);

    // Reset reconnection counter
    reconnectAttempts = 0;

    // ✅ Re-register user after reconnection
    if (userId && socket) {
      console.log("📝 Re-registering user after reconnection:", userId);
      socket.emit("register-user", userId);
    }
  });

  // ✅ FEATURE 13: Reconnection attempt handler
  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(
      `🔄 Reconnection attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS}`
    );
  });

  // ✅ FEATURE 14: Reconnection error handler
  socket.on("reconnect_error", (error) => {
    console.error("❌ Reconnection error:", error.message);
  });

  // ✅ FEATURE 15: Reconnection failed handler
  socket.on("reconnect_failed", () => {
    console.error("❌ All reconnection attempts failed");
    console.error("   Max attempts reached:", MAX_RECONNECT_ATTEMPTS);

    // Clear timeout when all attempts fail
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
  });

  return socket;
};
// ✅ FEATURE 16: Get current socket instance
export const getSocket = (): Socket => {
  if (!socket) {
    throw new Error("Socket not initialized. Call initializeSocket() first.");
  }
  return socket;
};

// ✅ FEATURE 17: Check socket connection status
export const isSocketConnected = (): boolean => {
  const connected = socket?.connected ?? false;
  console.log("🔍 Socket connection check:", connected);
  return connected;
};

// ✅ FEATURE 18: Get socket connection info
export const getSocketInfo = () => {
  return {
    connected: socket?.connected ?? false,
    id: socket?.id ?? null,
    userId: currentUserId,
    isRegistered,
    reconnectAttempts,
    transport: socket?.io.engine?.transport?.name ?? null,
    url: SOCKET_URL,
    hasTimeout: connectionTimeout !== null,
  };
};
// ✅ FEATURE 19: Wait for socket connection with timeout
export const waitForSocket = (maxWaitMs: number = 15000): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    // Validate socket exists
    if (!socket) {
      const error = "Socket not initialized. Call initializeSocket() first.";
      console.error("❌", error);
      reject(new Error(error));
      return;
    }

    // ✅ Case 1: Already connected AND registered
    if (socket.connected && isRegistered) {
      console.log("✅ Socket already connected and registered");
      console.log("   Resolving immediately");
      resolve(socket);
      return;
    }

    // ✅ Case 2: Connected but waiting for registration
    if (socket.connected && !isRegistered) {
      console.log("⏳ Socket connected, waiting for user registration...");

      const registrationHandler = () => {
        console.log("✅ User registration confirmed");
        socket?.off("user-registered", registrationHandler);
        clearTimeout(registrationTimeout);
        resolve(socket!);
      };

      // Listen for registration confirmation
      socket.on("user-registered", registrationHandler);

      // Timeout fallback for registration
      const registrationTimeout = setTimeout(() => {
        socket?.off("user-registered", registrationHandler);
        console.log("⏱️ Registration timeout - assuming success");
        resolve(socket!);
      }, 2000);

      return;
    }
    // ✅ Case 3: Not connected yet - wait for connection
    console.log("⏳ Waiting for socket connection...");
    console.log("   Max wait time:", maxWaitMs, "ms");
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      // Check if connected
      if (socket?.connected) {
        console.log(`✅ Socket connected after ${elapsed}ms`);
        clearInterval(checkInterval);

        // Wait for registration or resolve after short delay
        if (isRegistered) {
          console.log("   User already registered");
          resolve(socket);
        } else {
          console.log("   Waiting for registration...");
          setTimeout(() => {
            console.log("   Resolving after registration delay");
            resolve(socket!);
          }, 500);
        }
      }
      // Check if timeout exceeded
      else if (elapsed > maxWaitMs) {
        clearInterval(checkInterval);
        const msg = `Socket connection timeout after ${elapsed}ms`;
        console.error("❌", msg);
        console.error("   Socket URL:", SOCKET_URL);
        console.error("   Consider increasing timeout or checking backend");
        reject(new Error(msg));
      }
      // Still waiting
      else {
        if (elapsed % 1000 < 100) {
          // Log every second
          console.log(`   Still waiting... ${elapsed}ms elapsed`);
        }
      }
    }, 100); // Check every 100ms
  });
};
// ✅ FEATURE 20: Disconnect and cleanup socket
export const disconnectSocket = (): void => {
  // Clear any pending timeout
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
    console.log("✅ Connection timeout cleared during disconnect");
  }

  if (socket) {
    console.log("🔌 Disconnecting Socket.IO");
    console.log("   Socket ID:", socket.id);
    console.log("   User:", currentUserId);

    // Disconnect socket
    socket.disconnect();

    // Reset all state
    socket = null;
    isRegistered = false;
    currentUserId = null;
    reconnectAttempts = 0;

    console.log("✅ Socket disconnected and cleaned up");
  } else {
    console.log("ℹ️ No socket to disconnect");
  }
};

// ✅ FEATURE 21: Force reconnect socket
export const reconnectSocket = (): void => {
  // Clear any existing timeout before reconnecting
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }

  if (socket) {
    console.log("🔄 Force reconnecting socket...");
    socket.connect();

    // Set new timeout for this reconnection attempt
    connectionTimeout = setTimeout(() => {
      if (!socket?.connected) {
        console.error("⏰ Reconnection timeout after 10 seconds");
        console.error("   Manual reconnect failed");
      }
      connectionTimeout = null;
    }, CONNECTION_TIMEOUT_MS);
  } else {
    console.warn("⚠️ No socket to reconnect");
  }
};
// ✅ FEATURE 22: Clear connection timeout (utility function)
export const clearConnectionTimeout = (): void => {
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
    console.log("✅ Connection timeout manually cleared");
  } else {
    console.log("ℹ️ No active connection timeout to clear");
  }
};

// ✅ Default export object with all functions
export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  isSocketConnected,
  waitForSocket,
  reconnectSocket,
  getSocketInfo,
  clearConnectionTimeout,
};

// ✅ Export socket URL for reference
export { SOCKET_URL };
