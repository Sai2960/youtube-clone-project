// lib/callEvents.ts - Socket event handlers for screen sharing and recording
import { Socket } from 'socket.io-client';

export interface CallEventHandlers {
  onScreenShareStarted?: (data: { userId: string; socketId: string; streamType: string }) => void;
  onScreenShareStopped?: (data: { userId: string; socketId: string }) => void;
  onRecordingStarted?: (data: { userId: string; socketId: string; timestamp: number }) => void;
  onRecordingStopped?: (data: { userId: string; socketId: string; recordingData?: any; timestamp: number }) => void;
  onPeerAudioToggled?: (data: { socketId: string; enabled: boolean; timestamp: number }) => void;
  onPeerVideoToggled?: (data: { socketId: string; enabled: boolean; timestamp: number }) => void;
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
  const handleScreenShareStarted = (data: { userId: string; socketId: string; streamType: string }) => {
    console.log('🖥️ Remote peer started screen sharing:', data);
    handlers.onScreenShareStarted?.(data);
  };

  // Screen share stopped by remote peer
  const handleScreenShareStopped = (data: { userId: string; socketId: string }) => {
    console.log('🖥️ Remote peer stopped screen sharing:', data);
    handlers.onScreenShareStopped?.(data);
  };

  // Recording started notification
  const handleRecordingStarted = (data: { userId: string; socketId: string; timestamp: number }) => {
    console.log('🔴 Recording started by:', data);
    handlers.onRecordingStarted?.(data);
  };

  // Recording stopped notification
  const handleRecordingStopped = (data: { userId: string; socketId: string; recordingData?: any; timestamp: number }) => {
    console.log('⏹️ Recording stopped by:', data);
    handlers.onRecordingStopped?.(data);
  };

  // Audio toggled by peer
  const handlePeerAudioToggled = (data: { socketId: string; enabled: boolean; timestamp: number }) => {
    console.log(`🎤 Peer ${data.enabled ? 'enabled' : 'disabled'} audio`);
    handlers.onPeerAudioToggled?.(data);
  };

  // Video toggled by peer
  const handlePeerVideoToggled = (data: { socketId: string; enabled: boolean; timestamp: number }) => {
    console.log(`📹 Peer ${data.enabled ? 'enabled' : 'disabled'} video`);
    handlers.onPeerVideoToggled?.(data);
  };

  // Register listeners
  socket.on('screen-share-started', handleScreenShareStarted);
  socket.on('screen-share-stopped', handleScreenShareStopped);
  socket.on('recording-started', handleRecordingStarted);
  socket.on('recording-stopped', handleRecordingStopped);
  socket.on('peer-audio-toggled', handlePeerAudioToggled);
  socket.on('peer-video-toggled', handlePeerVideoToggled);

  console.log('✅ Call event listeners registered for room:', roomId);

  // Cleanup function
  return () => {
    socket.off('screen-share-started', handleScreenShareStarted);
    socket.off('screen-share-stopped', handleScreenShareStopped);
    socket.off('recording-started', handleRecordingStarted);
    socket.off('recording-stopped', handleRecordingStopped);
    socket.off('peer-audio-toggled', handlePeerAudioToggled);
    socket.off('peer-video-toggled', handlePeerVideoToggled);
    console.log('🧹 Call event listeners removed for room:', roomId);
  };
};

/**
 * Emit screen share started event
 */
export const emitScreenShareStarted = (
  socket: Socket, 
  roomId: string, 
  userId: string, 
  streamType: string = 'screen'
): void => {
  socket.emit('start-screen-share', roomId, userId, streamType);
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
export const emitRecordingStopped = (
  socket: Socket, 
  roomId: string, 
  userId: string, 
  recordingData?: any
): void => {
  socket.emit('recording-stopped', roomId, userId, recordingData);
  console.log('📤 Recording stopped event emitted');
};

/**
 * Emit audio toggle event
 */
export const emitAudioToggled = (socket: Socket, roomId: string, enabled: boolean): void => {
  socket.emit('audio-toggled', roomId, enabled);
  console.log(`📤 Audio ${enabled ? 'enabled' : 'disabled'} event emitted`);
};

/**
 * Emit video toggle event
 */
export const emitVideoToggled = (socket: Socket, roomId: string, enabled: boolean): void => {
  socket.emit('video-toggled', roomId, enabled);
  console.log(`📤 Video ${enabled ? 'enabled' : 'disabled'} event emitted`);
};