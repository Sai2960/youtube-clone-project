// lib/callEvents.ts - Socket event handlers for screen sharing
import { Socket } from 'socket.io-client';

export interface CallEventHandlers {
  onScreenShareStarted?: (userId: string) => void;
  onScreenShareStopped?: (userId: string) => void;
  onRecordingStarted?: (userId: string) => void;
  onRecordingStopped?: (userId: string) => void;
}

/**
 * Setup call-related socket event listeners
 */
export const setupCallEvents = (
  socket: Socket,
  roomId: string,
  handlers: CallEventHandlers
): (() => void) => {
  
  // Screen share started by remote peer
  const handleScreenShareStarted = (userId: string) => {
    console.log('🖥️ Remote peer started screen sharing:', userId);
    handlers.onScreenShareStarted?.(userId);
  };

  // Screen share stopped by remote peer
  const handleScreenShareStopped = (userId: string) => {
    console.log('🖥️ Remote peer stopped screen sharing:', userId);
    handlers.onScreenShareStopped?.(userId);
  };

  // Recording started notification
  const handleRecordingStarted = (userId: string) => {
    console.log('🔴 Recording started by:', userId);
    handlers.onRecordingStarted?.(userId);
  };

  // Recording stopped notification
  const handleRecordingStopped = (userId: string) => {
    console.log('⏹️ Recording stopped by:', userId);
    handlers.onRecordingStopped?.(userId);
  };

  // Register listeners
  socket.on('screen-share-started', handleScreenShareStarted);
  socket.on('screen-share-stopped', handleScreenShareStopped);
  socket.on('recording-started', handleRecordingStarted);
  socket.on('recording-stopped', handleRecordingStopped);

  console.log('✅ Call event listeners registered for room:', roomId);

  // Cleanup function
  return () => {
    socket.off('screen-share-started', handleScreenShareStarted);
    socket.off('screen-share-stopped', handleScreenShareStopped);
    socket.off('recording-started', handleRecordingStarted);
    socket.off('recording-stopped', handleRecordingStopped);
    console.log('🧹 Call event listeners removed for room:', roomId);
  };
};

/**
 * Emit screen share started event
 */
export const emitScreenShareStarted = (socket: Socket, roomId: string, userId: string): void => {
  socket.emit('start-screen-share', roomId, userId);
  console.log('📤 Screen share started event emitted');
};

/**
 * Emit screen share stopped event
 */
export const emitScreenShareStopped = (socket: Socket, roomId: string, userId: string): void => {
  socket.emit('stop-screen-share', roomId, userId);
  console.log('📤 Screen share stopped event emitted');
};

/**
 * Emit recording started event
 */
export const emitRecordingStarted = (socket: Socket, roomId: string, userId: string): void => {
  socket.emit('recording-started', roomId, userId);
  console.log('📤 Recording started event emitted');
};

/**
 * Emit recording stopped event
 */
export const emitRecordingStopped = (socket: Socket, roomId: string, userId: string): void => {
  socket.emit('recording-stopped', roomId, userId);
  console.log('📤 Recording stopped event emitted');
};