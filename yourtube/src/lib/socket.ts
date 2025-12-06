import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentUserId: string | null = null;
let isRegistered = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// ✅ PRODUCTION FIX: Use environment variable or fallback
const getSocketURL = () => {
  // Priority 1: Environment variable for Socket URL
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  
  // Priority 2: Environment variable for API URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Priority 3: Detect Vercel deployment - Force production URL
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    console.log('🌐 Detected Vercel deployment - using production socket');
    return 'https://youtube-clone-project-q3pd.onrender.com';
  }
  
  // Priority 4: Development fallback
  return 'http://localhost:5000';
};

const SOCKET_URL = getSocketURL();

console.log('🔧 Socket Configuration:');
console.log('   URL:', SOCKET_URL);
console.log('   Is Production:', SOCKET_URL.includes('render.com'));
console.log('   Environment:', process.env.NODE_ENV);

export const initializeSocket = (userId: string): Socket => {
  // Check if socket is already connected for the same user
  if (socket && socket.connected && isRegistered && currentUserId === userId) {
    console.log('✅ Socket already connected for user:', userId);
    return socket;
  }

  // Handle user switching - disconnect old socket
  if (socket && currentUserId !== userId) {
    console.log('🔄 Switching user, disconnecting old socket');
    socket.disconnect();
    socket = null;
    isRegistered = false;
    reconnectAttempts = 0;
  }

  currentUserId = userId;

  console.log('🔌 Initializing Socket.IO');
  console.log('   User ID:', userId);
  console.log('   Backend URL:', SOCKET_URL);
  // Line 49 - ADD this line
console.log('🔧 Socket Configuration:');
console.log('   URL:', SOCKET_URL);
console.log('   Environment:', process.env.NODE_ENV);
console.log('   Secure:', SOCKET_URL.startsWith('https'));

  // ✅ PRODUCTION: Use secure connection for HTTPS
  const isSecure = SOCKET_URL.startsWith('https');
  
  socket = io(SOCKET_URL, {
    transports: ['polling', 'websocket'], // Start with polling for better compatibility
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 30000,
    autoConnect: true,
    forceNew: false,
    withCredentials: true,
    secure: isSecure,
    rejectUnauthorized: false,
    query: { userId: userId },
    path: '/socket.io/'
    // ✅ REMOVED extraHeaders - clients should NOT send CORS headers
  });

  // ===== Connection Events =====
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
    console.log('   Transport:', socket?.io.engine.transport.name);
    reconnectAttempts = 0;
    
    if (userId && socket) {
      console.log('📝 Registering user:', userId);
      socket.emit('register-user', userId);
    }
  });

  socket.on('user-registered', (data) => {
    console.log('✅ User registration confirmed:', data);
    isRegistered = true;
  });

  socket.on('registration-error', (error) => {
    console.error('❌ Registration error:', error);
    isRegistered = false;
  });

  socket.io.engine.on('upgrade', (transport) => {
    console.log('⬆️ Socket upgraded to:', transport.name);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
    isRegistered = false;
    reconnectAttempts++;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnection attempts reached');
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    isRegistered = false;
    
    if (reason === 'io server disconnect') {
      console.log('🔄 Server disconnected socket, reconnecting...');
      socket?.connect();
    }
  });

  // ===== Reconnection Events =====
  socket.on('reconnect', (attemptNumber) => {
    console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    reconnectAttempts = 0;
    
    if (userId && socket) {
      console.log('📝 Re-registering user after reconnection');
      socket.emit('register-user', userId);
    }
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Reconnection attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS}`);
  });

  socket.on('reconnect_error', (error) => {
    console.error('❌ Reconnection error:', error.message);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Reconnection failed after all attempts');
  });

  return socket;
};

// ===== Exported Helper Functions =====

export const getSocket = (): Socket => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initializeSocket first.');
  }
  return socket;
};

export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};

export const isSocketRegistered = (): boolean => {
  return isRegistered && socket?.connected === true;
};

export const getCurrentUserId = (): string | null => {
  return currentUserId;
};

export const disconnectSocket = (): void => {
  if (socket) {
    console.log('🔌 Manually disconnecting socket');
    socket.disconnect();
    socket = null;
    isRegistered = false;
    currentUserId = null;
    reconnectAttempts = 0;
  }
};

export const waitForSocket = (maxWaitMs: number = 10000): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    if (socket && socket.connected && isRegistered) {
      resolve(socket);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (socket && socket.connected && isRegistered) {
        clearInterval(checkInterval);
        resolve(socket);
      } else if (Date.now() - startTime > maxWaitMs) {
        clearInterval(checkInterval);
        reject(new Error('Socket connection timeout'));
      }
    }, 100);
  });
};

export default initializeSocket;