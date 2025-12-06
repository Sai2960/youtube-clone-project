import { createContext, useContext, useEffect, useState, useRef, ReactNode, useMemo } from 'react';
import { initializeSocket, disconnectSocket } from './socket';
import { useUser } from './AuthContext';
import { Socket } from 'socket.io-client';

interface SocketContextType {
  isConnected: boolean;
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  socket: null
});

// ✅ CRITICAL FIX: Move state outside component
const globalSocketState = {
  currentUserId: null as string | null,
  socketInstance: null as Socket | null,
  isInitializing: false,
};

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const userId = user?._id;
    
    // ✅ Skip if already initializing
    if (globalSocketState.isInitializing) {
      console.log('⏸️ Socket initialization already in progress');
      return;
    }
    
    // ✅ Skip if already connected for same user
    if (userId && globalSocketState.currentUserId === userId && globalSocketState.socketInstance) {
      console.log('✅ Socket already connected for user:', userId);
      if (socket !== globalSocketState.socketInstance) {
        setSocket(globalSocketState.socketInstance);
        setIsConnected(globalSocketState.socketInstance.connected);
      }
      return;
    }

    // ✅ Clean up if user changed
    if (globalSocketState.currentUserId && globalSocketState.currentUserId !== userId) {
      console.log('🔄 User changed, cleaning up old socket');
      if (globalSocketState.socketInstance) {
        globalSocketState.socketInstance.off('connect');
        globalSocketState.socketInstance.off('disconnect');
      }
      disconnectSocket();
      globalSocketState.socketInstance = null;
      globalSocketState.currentUserId = null;
    }

    if (userId) {
      globalSocketState.isInitializing = true;
      console.log('🔌 SocketProvider: Initializing for user:', userId);
      globalSocketState.currentUserId = userId;
      
      try {
        const socketInstance = initializeSocket(userId);
        globalSocketState.socketInstance = socketInstance;
        setSocket(socketInstance);

        const handleConnect = () => {
          console.log('✅ SocketProvider: Connected');
          setIsConnected(true);
        };

        const handleDisconnect = () => {
          console.log('❌ SocketProvider: Disconnected');
          setIsConnected(false);
        };

        socketInstance.on('connect', handleConnect);
        socketInstance.on('disconnect', handleDisconnect);

        setIsConnected(socketInstance.connected);
        globalSocketState.isInitializing = false;

        return () => {
          console.log('🧹 SocketProvider: Cleaning up listeners');
          socketInstance.off('connect', handleConnect);
          socketInstance.off('disconnect', handleDisconnect);
        };
      } catch (error) {
        console.error('❌ SocketProvider: Error:', error);
        globalSocketState.currentUserId = null;
        globalSocketState.isInitializing = false;
      }
    } else if (!userId && globalSocketState.currentUserId) {
      console.log('🔌 SocketProvider: User logged out, disconnecting');
      disconnectSocket();
      setIsConnected(false);
      setSocket(null);
      globalSocketState.currentUserId = null;
      globalSocketState.socketInstance = null;
    }
  }, [user?._id]); // ✅ Only user ID

  // ✅ CRITICAL FIX: Memoize context value
  const contextValue = useMemo(() => ({
    isConnected,
    socket
  }), [isConnected, socket]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};