// server/sockets/callHandler.js - FINAL MERGED VERSION
export const setupCallHandlers = (io, socket) => {
  console.log('📞 Setting up call handlers for socket:', socket.id);

  // ==========================================
  // ROOM MANAGEMENT
  // ==========================================
  socket.on('join-room', (roomId, userId) => {
    console.log('👥 USER JOINING ROOM');
    console.log('   Room ID:', roomId);
    console.log('   Socket ID:', socket.id);
    console.log('   User ID:', userId);
    
    if (!roomId) {
      console.error('❌ Missing roomId');
      socket.emit('join-error', { message: 'Room ID is required' });
      return;
    }

    socket.join(roomId);
    const room = io.sockets.adapter.rooms.get(roomId);
    const userCount = room ? room.size : 0;
    
    console.log(`   Users in room: ${userCount}`);
    socket.to(roomId).emit('user-joined', {
      userId: userId || socket.id,
      socketId: socket.id
    });
    socket.emit('room-joined', {
      roomId,
      userCount,
      socketId: socket.id
    });
  });

  // ==========================================
  // WEBRTC SIGNALING - MERGED CRITICAL FIX
  // ==========================================
  socket.on('offer', (roomId, offer, mediaType) => {
    console.log('📤 ===== FORWARDING OFFER =====');
    console.log('   From Socket:', socket.id);
    console.log('   Room:', roomId);
    console.log('   Type:', offer?.type);
    console.log('   Media Type:', mediaType || 'video');
    
    if (!roomId || !offer) {
      console.error('❌ Missing roomId or offer');
      return;
    }

    const room = io.sockets.adapter.rooms.get(roomId);
    if (room) {
      console.log('   Room members:', Array.from(room));
      console.log('   Broadcasting to', room.size - 1, 'other users');
    } else {
      console.error('❌ Room does not exist:', roomId);
      return;
    }

    socket.to(roomId).emit('offer', {
      offer,
      from: socket.id,
      mediaType: mediaType || 'video'
    });
    console.log('✅ Offer broadcasted to room');
  });

  socket.on('answer', (roomId, answer, mediaType) => {
    console.log('📤 ===== FORWARDING ANSWER =====');
    console.log('   From Socket:', socket.id);
    console.log('   Room:', roomId);
    console.log('   Type:', answer?.type);
    console.log('   Media Type:', mediaType || 'video');
    
    if (!roomId || !answer) {
      console.error('❌ Missing roomId or answer');
      return;
    }

    const room = io.sockets.adapter.rooms.get(roomId);
    if (room) console.log('   Room members:', Array.from(room));
    
    socket.to(roomId).emit('answer', {
      answer,
      from: socket.id,
      mediaType: mediaType || 'video'
    });
    console.log('✅ Answer broadcasted to room');
  });

  socket.on('ice-candidate', (roomId, candidate) => {
    if (!roomId || !candidate) return;
    console.log('❄️ Forwarding ICE candidate');
    socket.to(roomId).emit('ice-candidate', {
      candidate,
      from: socket.id
    });
  });

  // ==========================================
  // CALL CONTROL
  // ==========================================
  socket.on('end-call', (roomId) => {
    console.log('📞 CALL ENDED');
    console.log('   Room:', roomId);
    console.log('   Ended by:', socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('call-ended', { endedBy: socket.id });
    socket.leave(roomId);
    console.log('   User left room:', roomId);
  });

  socket.on('reject-call', (roomId) => {
    console.log('❌ CALL REJECTED');
    console.log('   Room:', roomId);
    console.log('   Rejected by:', socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('call-rejected', { rejectedBy: socket.id });
    socket.leave(roomId);
  });

  socket.on('accept-call', (roomId) => {
    console.log('✅ CALL ACCEPTED');
    console.log('   Room:', roomId);
    console.log('   Accepted by:', socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('call-accepted', { acceptedBy: socket.id });
  });

  // ==========================================
  // SCREEN SHARING
  // ==========================================
  socket.on('start-screen-share', (roomId, userId, streamType) => {
    console.log('🖥️ SCREEN SHARE STARTED');
    console.log('   Room:', roomId);
    console.log('   User:', userId || socket.id);
    console.log('   Stream Type:', streamType || 'screen');
    if (!roomId) return;
    socket.to(roomId).emit('screen-share-started', {
      userId: userId || socket.id,
      socketId: socket.id,
      streamType: streamType || 'screen'
    });
  });

  socket.on('stop-screen-share', (roomId, userId) => {
    console.log('🖥️ SCREEN SHARE STOPPED');
    console.log('   Room:', roomId);
    console.log('   User:', userId || socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('screen-share-stopped', {
      userId: userId || socket.id,
      socketId: socket.id
    });
  });

  socket.on('screen-offer', (roomId, offer) => {
    console.log('📤 FORWARDING SCREEN SHARE OFFER');
    if (!roomId || !offer) return;
    socket.to(roomId).emit('screen-offer', { offer, from: socket.id });
  });

  socket.on('screen-answer', (roomId, answer) => {
    console.log('📤 FORWARDING SCREEN SHARE ANSWER');
    if (!roomId || !answer) return;
    socket.to(roomId).emit('screen-answer', { answer, from: socket.id });
  });

  // ==========================================
  // RECORDING
  // ==========================================
  socket.on('recording-started', (roomId, userId) => {
    console.log('🔴 RECORDING STARTED');
    if (!roomId) return;
    socket.to(roomId).emit('recording-started', {
      userId: userId || socket.id,
      socketId: socket.id,
      timestamp: Date.now()
    });
  });

  socket.on('recording-stopped', (roomId, userId, recordingData) => {
    console.log('⏹️ RECORDING STOPPED');
    if (!roomId) return;
    socket.to(roomId).emit('recording-stopped', {
      userId: userId || socket.id,
      socketId: socket.id,
      recordingData,
      timestamp: Date.now()
    });
  });

  // ==========================================
  // MEDIA CONTROLS
  // ==========================================
  socket.on('audio-toggled', (roomId, enabled) => {
    if (!roomId) return;
    console.log(`🎤 Audio ${enabled ? 'enabled' : 'disabled'} in room: ${roomId}`);
    socket.to(roomId).emit('peer-audio-toggled', {
      socketId: socket.id,
      enabled,
      timestamp: Date.now()
    });
  });

  socket.on('video-toggled', (roomId, enabled) => {
    if (!roomId) return;
    console.log(`📹 Video ${enabled ? 'enabled' : 'disabled'} in room: ${roomId}`);
    socket.to(roomId).emit('peer-video-toggled', {
      socketId: socket.id,
      enabled,
      timestamp: Date.now()
    });
  });

  socket.on('fullscreen-request', (roomId, enabled) => {
    if (!roomId) return;
    console.log(`🖥️ Fullscreen ${enabled ? 'enabled' : 'disabled'} in room: ${roomId}`);
    socket.to(roomId).emit('peer-fullscreen-changed', {
      socketId: socket.id,
      enabled,
      timestamp: Date.now()
    });
  });

  // ==========================================
  // NETWORK QUALITY
  // ==========================================
  socket.on('network-quality', (roomId, quality) => {
    if (!roomId) return;
    socket.to(roomId).emit('peer-network-quality', {
      socketId: socket.id,
      quality,
      timestamp: Date.now()
    });
  });

  // ==========================================
  // CONNECTION MANAGEMENT
  // ==========================================
  socket.on('disconnect', (reason) => {
    console.log('❌ SOCKET DISCONNECTED');
    console.log('   Socket ID:', socket.id);
    console.log('   Reason:', reason);
    const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    rooms.forEach(roomId => {
      console.log(`   Notifying room ${roomId} of disconnect`);
      socket.to(roomId).emit('user-disconnected', {
        socketId: socket.id,
        reason,
        timestamp: Date.now()
      });
      socket.to(roomId).emit('call-ended', {
        reason: 'user-disconnected',
        socketId: socket.id
      });
    });
  });

  // ==========================================
  // ERROR HANDLING
  // ==========================================
  socket.on('error', (error) => console.error('❌ SOCKET ERROR:', error));
  socket.on('call-error', (roomId, error) => {
    if (!roomId) return;
    console.error('❌ CALL ERROR:', error);
    socket.to(roomId).emit('call-error', {
      error,
      from: socket.id,
      timestamp: Date.now()
    });
  });

  // ==========================================
  // PING/PONG
  // ==========================================
  socket.on('ping', (roomId) => {
    socket.emit('pong', { roomId, timestamp: Date.now() });
  });
};
