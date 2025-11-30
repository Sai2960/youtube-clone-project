// server/index.js
// Main server file for YouTube Clone Backend
// Handles video streaming, real-time calls, and content management
// MERGED VERSION - Enhanced CORS + All Features Preserved

// =================== ENVIRONMENT SETUP (MUST BE FIRST) ===================
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from "path";

// Get directory path for ES modules (needed since __dirname doesn't exist in ES6)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env with explicit path - THIS MUST HAPPEN BEFORE OTHER IMPORTS
const envPath = path.join(__dirname, '.env');
console.log('📁 Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Verify critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL ERROR: JWT_SECRET not found in .env');
  console.error('   .env path:', envPath);
  console.error('   Current directory:', __dirname);
  console.error('   Please create a .env file with JWT_SECRET');
  process.exit(1);
}

console.log('🔐 Environment Check:');
console.log('   JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('   JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
console.log('   JWT_SECRET preview:', process.env.JWT_SECRET?.substring(0, 15) + '...');
console.log('   DB_URL exists:', !!process.env.DB_URL);
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');

// =================== NOW IMPORT EVERYTHING ELSE ===================
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import fs from 'fs';
import http from 'http';
import { Server } from 'socket.io';

// Route imports - organized by feature
import translationroutes from "./routes/translation.js";
import commentroutes from "./routes/comment.js";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import subscriptionroutes from "./routes/subscription.js";
import downloadroutes from "./routes/download.js";
import historyroutes from "./routes/history.js";
import likeroutes from "./routes/like.js";
import watchroutes from "./routes/watchlater.js";
import locationRoutes from './routes/location.js';
import callroutes from "./routes/call.js";
import shortroutes from "./routes/short.js";
import reportRoutes from './routes/report.js';
import shortTranslationRoutes from './routes/shortTranslation.js';
import otpRoutes from './routes/otp.js';
import imageProxyRouter from './routes/imageProxy.js';
import adminRoutes from './routes/admin.js';

// Cron job services for scheduled tasks
import { startAllCronJobs, stopAllCronJobs } from './services/cronJobs.js';

const app = express();

// Track server state
let mongoConnected = false;
let cronJobsRunning = false;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
// =================== ENHANCED CORS CONFIGURATION - CRITICAL FOR VERCEL ===================
// Build allowed origins array
const allowedOrigins = [
  // Local development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://192.168.0.181:3000',
  
  // Vercel production
  'https://youtube-clone-project-eosin.vercel.app',
];

// Add environment variable origins if provided
if (process.env.ALLOWED_ORIGINS) {
  const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  allowedOrigins.push(...envOrigins);
}

console.log('🌐 CORS Configuration:');
console.log('   Allowed origins:', allowedOrigins.length);
allowedOrigins.forEach(origin => console.log('   ✓', origin));


const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow requests with no origin
  
  // Check exact matches
  if (allowedOrigins.includes(origin)) return true;
  
  // Check if it's a Vercel preview domain
  const vercelPattern = /^https:\/\/youtube-clone-project-[a-z0-9]+-sais-projects-daab7a9a\.vercel\.app$/;
  if (vercelPattern.test(origin)) return true;
  
  return false;
};

console.log('🌐 CORS Configuration:');
console.log('   Allowed origins:', allowedOrigins.length);
allowedOrigins.forEach(origin => console.log('   ✓', origin));
console.log('   + All Vercel preview domains (via regex)');

// Socket.IO configuration with enhanced CORS settings
const io = new Server(server, {
    cors: {
        origin: function(origin, callback) {
            if (!origin || isOriginAllowed(origin)) {
                callback(null, true);
            } else {
                console.log('   ❌ Socket.IO CORS blocked:', origin);
                callback(new Error('Not allowed by CORS policy'));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['Content-Range', 'X-Content-Range']
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    pingTimeout: 60000,
    pingInterval: 25000,
});

console.log('🌐 Socket.IO configured with', allowedOrigins.length, 'allowed origin(s)');
// Define upload directories for different content types
// These need to exist before the server starts accepting uploads
const directories = {
    videos: path.join(__dirname, 'uploads', 'videos'),
    channelImages: path.join(__dirname, 'uploads', 'channel-images'),
    shortsVideos: path.join(__dirname, 'uploads', 'shorts', 'videos'),
    shortsThumbnails: path.join(__dirname, 'uploads', 'shorts', 'thumbnails'),
    recordings: path.join(__dirname, 'uploads', 'recordings'),
    invoices: path.join(__dirname, 'invoices')
};

// Make sure all upload directories exist
// Creates them recursively if they don't
Object.entries(directories).forEach(([name, dirPath]) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created ${name} directory: ${dirPath}`);
    }
});

// =================== ENHANCED CORS MIDDLEWARE ===================
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            console.log('   ℹ️  Request with no origin - allowing');
            return callback(null, true);
        }
        
        // Check if origin is allowed
        if (isOriginAllowed(origin)) {
            console.log('   ✅ Allowed origin:', origin);
            callback(null, true);
        } else {
            console.log('   ❌ CORS blocked origin:', origin);
            console.log('   💡 Add this to ALLOWED_ORIGINS env variable');
            callback(new Error('Not allowed by CORS policy'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600
}));

// Handle preflight requests explicitly
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Parse JSON and URL-encoded request bodies
// Increased limit to 30mb for video uploads
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(bodyParser.json());

// Static file serving for uploads and invoices
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));
// =================== API Routes ===================
console.log('📋 Setting up API routes...');

// Authentication and user management
app.use("/auth", userroutes);
app.use("/user", userroutes);

// Video content routes
app.use("/video", videoroutes);
app.use("/subscription", subscriptionroutes);
app.use("/download", downloadroutes);
app.use("/history", historyroutes);
app.use("/like", likeroutes);
app.use("/watch", watchroutes);
app.use("/translate", translationroutes);
app.use("/comment", commentroutes);

// Shorts (short-form video) routes - multiple paths for backward compatibility
app.use("/api/shorts/translate", shortTranslationRoutes);
app.use("/api/shorts", shortroutes);
app.use("/shorts", shortroutes);

// Other features
app.use('/api/location', locationRoutes);
app.use('/call', callroutes);
app.use('/report', reportRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api', imageProxyRouter);
app.use('/api/admin', adminRoutes);

console.log('✅ All routes registered successfully');

// Root endpoint - shows available API endpoints
app.get("/", (req, res) => {
    res.json({
        message: "YouTube Clone Backend API",
        status: "OK",
        version: "2.0.0",
        environment: process.env.NODE_ENV || 'development',
        mongoConnected: mongoConnected,
        cronJobsActive: cronJobsRunning,
        socketConnections: io.sockets.sockets.size,
        allowedOrigins: allowedOrigins,
        endpoints: {
            auth: "/auth",
            users: "/user",
            videos: "/video",
            shorts: "/api/shorts",
            shortsAlt: "/shorts",
            shortsTranslation: "/api/shorts/translate",
            calls: "/call",
            subscriptions: "/subscription",
            comments: "/comment",
            location: "/api/location/check-location",
            uploads: "/uploads",
            channelImages: "/uploads/channel-images",
            health: "/health",
            testEnv: "/test-env"
        }
    });
});

// Environment test endpoint (for debugging)
app.get('/test-env', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV || 'development',
    hasJwtSecret: !!process.env.JWT_SECRET,
    secretLength: process.env.JWT_SECRET?.length || 0,
    secretPreview: process.env.JWT_SECRET 
      ? process.env.JWT_SECRET.substring(0, 10) + '...' 
      : 'NOT LOADED',
    hasDbUrl: !!process.env.DB_URL,
    port: process.env.PORT || 5000,
    allowedOrigins: allowedOrigins.length,
    origins: allowedOrigins,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint - useful for monitoring
app.get("/health", (req, res) => {
    res.json({
        message: "Server is running",
        status: "OK",
        mongodb: mongoConnected ? "Connected" : "Disconnected",
        cronJobs: cronJobsRunning ? "Active" : "Inactive",
        socketConnections: io.sockets.sockets.size,
        registeredUsers: userToSocket.size,
        activeRooms: activeCallRooms.size,
        allowedOrigins: allowedOrigins.length,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
    });
});
// =================== Socket.IO User Management ===================
// Maps to track online users and their socket connections
const userToSocket = new Map(); // userId -> socketId
const socketToUser = new Map(); // socketId -> userId
const activeCallRooms = new Map(); // roomId -> Set of socketIds

// =================== Socket.IO Connection Handler ===================
io.on('connection', (socket) => {
    console.log('\n👤 New user connected');
    console.log('   Socket ID:', socket.id);
    console.log('   Total connections:', io.sockets.sockets.size);

    // User registration - links userId to socketId
    socket.on('register-user', (userId) => {
        if (!userId) {
            console.error('❌ Registration failed: No userId provided');
            socket.emit('registration-error', { message: 'userId is required' });
            return;
        }

        // Check if user already has a socket connection
        const existingSocketId = userToSocket.get(userId);
        if (existingSocketId && existingSocketId !== socket.id) {
            console.log(`   ℹ️  User ${userId} reconnected with new socket`);
            console.log(`   Old socket: ${existingSocketId}`);
            console.log(`   New socket: ${socket.id}`);
            socketToUser.delete(existingSocketId);
        }

        // Update mappings
        userToSocket.set(userId, socket.id);
        socketToUser.set(socket.id, userId);

        console.log(`✅ User registered: ${userId}`);
        console.log(`   Total registered users: ${userToSocket.size}`);

        // Confirm registration to the user
        socket.emit('user-registered', {
            success: true,
            userId: userId,
            socketId: socket.id,
            timestamp: Date.now()
        });

        // Notify other users that this user is online
        socket.broadcast.emit('user-online', {
            userId,
            socketId: socket.id,
            timestamp: Date.now()
        });
    });

    // Join a call room
    socket.on('join-room', (roomId, userId) => {
        console.log('\n📞 Join room request');
        console.log('   Socket:', socket.id);
        console.log('   User:', userId || 'anonymous');
        console.log('   Room:', roomId);

        if (!roomId) {
            console.error('❌ Join failed: No room ID provided');
            socket.emit('join-error', { message: 'Room ID is required' });
            return;
        }

        // Add socket to the room
        socket.join(roomId);

        // Track room membership
        if (!activeCallRooms.has(roomId)) {
            activeCallRooms.set(roomId, new Set());
        }
        activeCallRooms.get(roomId).add(socket.id);

        // Get current room info
        const room = io.sockets.adapter.rooms.get(roomId);
        const participantCount = room ? room.size : 0;

        console.log(`   Participants in room: ${participantCount}`);

        // Tell others in the room that someone joined
        socket.to(roomId).emit('user-joined', {
            userId: userId || socket.id,
            socketId: socket.id,
            roomId: roomId
        });

        // Confirm join to this socket
        socket.emit('room-joined', {
            roomId,
            userCount: participantCount,
            socketId: socket.id
        });

        // Special signal when exactly 2 users are ready (for 1-on-1 calls)
        if (participantCount === 2) {
            console.log('✅ Both participants ready - call can begin');
            io.to(roomId).emit('both-users-ready', {
                roomId,
                userCount: 2,
                timestamp: Date.now()
            });
        }

        console.log('✅ User joined room successfully\n');
    });
    // WebRTC signaling - offer
    socket.on('offer', (roomId, offer) => {
        console.log('\n📤 WebRTC Offer received');
        console.log('   From:', socket.id);
        console.log('   Room:', roomId);
        console.log('   Offer type:', offer?.type);

        if (!roomId || !offer) {
            console.error('❌ Invalid offer: missing data');
            return;
        }

        const room = io.sockets.adapter.rooms.get(roomId);
        if (!room) {
            console.error('❌ Room does not exist:', roomId);
            return;
        }

        // Forward offer to everyone else in the room
        socket.to(roomId).emit('offer', {
            offer: offer,
            from: socket.id
        });

        console.log('✅ Offer broadcasted\n');
    });

    // WebRTC signaling - answer
    socket.on('answer', (roomId, answer) => {
        console.log('\n📤 WebRTC Answer received');
        console.log('   From:', socket.id);
        console.log('   Room:', roomId);

        if (!roomId || !answer) {
            console.error('❌ Invalid answer: missing data');
            return;
        }

        // Forward answer to everyone else in the room
        socket.to(roomId).emit('answer', {
            answer: answer,
            from: socket.id
        });

        console.log('✅ Answer broadcasted\n');
    });

    // WebRTC signaling - ICE candidate
    socket.on('ice-candidate', (roomId, candidate) => {
        if (!roomId || !candidate) {
            console.error('❌ Invalid ICE candidate: missing data');
            return;
        }

        console.log('❄️  Forwarding ICE candidate to room:', roomId);

        socket.to(roomId).emit('ice-candidate', {
            candidate: candidate,
            from: socket.id
        });
    });
    // Initiate a call to another user
    socket.on('call-user', (callData) => {
        console.log('\n📞 Initiating call');
        console.log('   To:', callData.userToCall);
        console.log('   From:', callData.from);
        console.log('   Room:', callData.roomId);

        if (!callData.userToCall || !callData.from || !callData.roomId) {
            console.error('❌ Call initiation failed: missing required data');
            socket.emit('call-error', { message: 'Missing required call data' });
            return;
        }

        // Find the receiver's socket
        const receiverSocket = userToSocket.get(callData.userToCall);

        if (receiverSocket) {
            console.log(`✅ Found receiver socket: ${receiverSocket}`);

            // Send call notification to receiver
            io.to(receiverSocket).emit('incoming-call', {
                from: callData.from,
                name: callData.name,
                roomId: callData.roomId,
                image: callData.image || '',
                callId: callData.callId,
                timestamp: Date.now()
            });

            console.log('✅ Call notification sent');

            // Confirm to caller that call was initiated
            socket.emit('call-initiated', {
                success: true,
                receiverId: callData.userToCall,
                roomId: callData.roomId
            });
        } else {
            console.log(`❌ Receiver not available: ${callData.userToCall}`);
            socket.emit('call-error', {
                success: false,
                message: 'User not available or offline'
            });
        }
    });

    // Accept an incoming call
    socket.on('accept-call', (roomId) => {
        console.log('✅ Call accepted in room:', roomId);
        if (!roomId) return;

        socket.to(roomId).emit('call-accepted', {
            acceptedBy: socket.id
        });
    });

    // Reject an incoming call
    socket.on('reject-call', (roomId) => {
        console.log('❌ Call rejected in room:', roomId);
        if (!roomId) return;

        socket.to(roomId).emit('call-rejected', {
            rejectedBy: socket.id
        });

        // Clean up room
        socket.leave(roomId);
        const roomSockets = activeCallRooms.get(roomId);
        if (roomSockets) {
            roomSockets.delete(socket.id);
            if (roomSockets.size === 0) {
                activeCallRooms.delete(roomId);
            }
        }
    });

    // End an ongoing call
    socket.on('end-call', (roomId) => {
        console.log('\n📴 Call ended');
        console.log('   Room:', roomId);
        console.log('   Ended by:', socket.id);

        if (!roomId) return;

        // Notify others in the room
        socket.to(roomId).emit('call-ended', {
            endedBy: socket.id,
            reason: 'user-action'
        });

        // Clean up room
        socket.leave(roomId);
        const roomSockets = activeCallRooms.get(roomId);
        if (roomSockets) {
            roomSockets.delete(socket.id);
            if (roomSockets.size === 0) {
                activeCallRooms.delete(roomId);
            }
        }

        console.log('✅ Call ended successfully\n');
    });
    // Screen sharing started
    socket.on('start-screen-share', (roomId) => {
        console.log('🖥️  Screen sharing started in room:', roomId);
        if (!roomId) return;

        socket.to(roomId).emit('screen-share-started', {
            socketId: socket.id,
            timestamp: Date.now()
        });
    });

    // Screen sharing stopped
    socket.on('stop-screen-share', (roomId) => {
        console.log('🖥️  Screen sharing stopped in room:', roomId);
        if (!roomId) return;

        socket.to(roomId).emit('screen-share-stopped', {
            socketId: socket.id,
            timestamp: Date.now()
        });
    });

    // Recording started notification
    socket.on('recording-started', (roomId, userId) => {
        console.log('🔴 Recording started in room:', roomId);
        if (!roomId) return;

        socket.to(roomId).emit('recording-started', {
            userId: userId || socket.id,
            socketId: socket.id,
            timestamp: Date.now()
        });
    });

    // Recording stopped notification
    socket.on('recording-stopped', (roomId, userId, recordingData) => {
        console.log('⏹️  Recording stopped in room:', roomId);
        if (!roomId) return;

        socket.to(roomId).emit('recording-stopped', {
            userId: userId || socket.id,
            socketId: socket.id,
            recordingData,
            timestamp: Date.now()
        });
    });

    // Audio toggle notification
    socket.on('audio-toggled', (roomId, isEnabled) => {
        if (!roomId) return;

        console.log(`🎤 Audio ${isEnabled ? 'enabled' : 'disabled'} in room: ${roomId}`);

        socket.to(roomId).emit('peer-audio-toggled', {
            socketId: socket.id,
            enabled: isEnabled,
            timestamp: Date.now()
        });
    });

    // Video toggle notification
    socket.on('video-toggled', (roomId, isEnabled) => {
        if (!roomId) return;

        console.log(`📹 Video ${isEnabled ? 'enabled' : 'disabled'} in room: ${roomId}`);

        socket.to(roomId).emit('peer-video-toggled', {
            socketId: socket.id,
            enabled: isEnabled,
            timestamp: Date.now()
        });
    });
    // Handle disconnection
    socket.on('disconnect', (reason) => {
        console.log('\n👋 User disconnected');
        console.log('   Socket:', socket.id);
        console.log('   Reason:', reason);

        const disconnectedUserId = socketToUser.get(socket.id);

        if (disconnectedUserId) {
            userToSocket.delete(disconnectedUserId);
            console.log('   Removed user:', disconnectedUserId);

            // Notify others that user went offline
            io.emit('user-offline', {
                userId: disconnectedUserId,
                timestamp: Date.now()
            });
        }

        socketToUser.delete(socket.id);

        // Clean up all rooms this socket was in
        for (const [roomId, sockets] of activeCallRooms.entries()) {
            if (sockets.has(socket.id)) {
                sockets.delete(socket.id);

                // Notify others in the room
                socket.to(roomId).emit('user-disconnected', {
                    socketId: socket.id,
                    userId: disconnectedUserId
                });

                socket.to(roomId).emit('call-ended', {
                    reason: 'user-disconnected',
                    socketId: socket.id,
                    endedBy: disconnectedUserId
                });

                // Remove empty rooms
                if (sockets.size === 0) {
                    activeCallRooms.delete(roomId);
                }
            }
        }

        console.log(`   Remaining users: ${userToSocket.size}`);
        console.log(`   Active rooms: ${activeCallRooms.size}\n`);
    });

    // Error handling
    socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
    });

    socket.on('call-error', (roomId, error) => {
        if (!roomId) return;

        console.error('❌ Call error in room', roomId, ':', error);

        socket.to(roomId).emit('call-error', {
            error,
            from: socket.id,
            timestamp: Date.now()
        });
    });

    // Simple ping/pong for connection monitoring
    socket.on('ping', (roomId) => {
        socket.emit('pong', {
            roomId,
            timestamp: Date.now()
        });
    });
});
// =================== Error Handling Middleware ===================
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);

    // Special handling for CORS errors
    if (err.message === 'Not allowed by CORS policy') {
        return res.status(403).json({ 
            error: 'CORS Error',
            message: 'This origin is not allowed to access this resource',
            origin: req.headers.origin,
            hint: 'Add your domain to ALLOWED_ORIGINS environment variable or allowedOrigins array'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Something went wrong!',
        // Only show stack trace in development
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 404 handler for undefined routes
app.use((req, res) => {
    console.log('❌ 404 - Route not found:', req.method, req.path);

    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// =================== Database Connection & Server Startup ===================
const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DB_URL;

// Start the server (listening on all network interfaces)
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ===== SERVER STARTED =====`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Local: http://localhost:${PORT}`);
    console.log(`   Network: http://0.0.0.0:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   CORS Origins: ${allowedOrigins.length}`);
    console.log(`===== SERVER READY =====\n`);
});

// Connect to MongoDB if connection string is provided
if (DATABASE_URL) {
    mongoose.set('strictQuery', false);

    const connectToDatabase = async () => {
        try {
            await mongoose.connect(DATABASE_URL, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
});

            console.log("✅ MongoDB connected successfully");
            mongoConnected = true;

            // Start cron jobs after successful database connection
            if (!cronJobsRunning) {
                console.log('\n⏰ ===== STARTING CRON JOBS =====');
                try {
                    startAllCronJobs();
                    cronJobsRunning = true;
                    console.log('✅ Cron jobs started successfully');
                    console.log('===== CRON JOBS ACTIVE =====\n');
                } catch (error) {
                    console.error('❌ Failed to start cron jobs:', error.message);
                }
            }
        } catch (error) {
            console.error("❌ MongoDB connection failed:", error.message);
            console.log("   Retrying in 30 seconds...");
            setTimeout(connectToDatabase, 30000);
        }
    };

    // MongoDB event listeners
    mongoose.connection.on('connected', () => {
        mongoConnected = true;
        console.log('✅ MongoDB connection established');
    });

    mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB error:', err.message);
        mongoConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
        mongoConnected = false;
        if (cronJobsRunning) {
            console.log('⚠️  MongoDB disconnected - Cron jobs may not work properly');
        }
        console.log('❌ MongoDB disconnected. Attempting to reconnect...');
    });

    // Initial connection attempt
    connectToDatabase();
} else {
    console.warn('⚠️  No MongoDB connection string provided');
    console.warn('⚠️  Set DB_URL in your    .env file');
console.warn('⚠️  Database features and cron jobs will not be available');
}


const handleShutdown = async (signal) => {
    console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

    // Stop cron jobs first
    if (cronJobsRunning) {
        console.log('⏰ Stopping cron jobs...');
        try {
            stopAllCronJobs();
            cronJobsRunning = false;
            console.log('✅ Cron jobs stopped');
        } catch (error) {
            console.error('❌ Error stopping cron jobs:', error.message);
        }
    }

    // Close Socket.IO connections
    console.log('🔌 Closing Socket.IO connections...');
    io.close(() => {
        console.log('✅ Socket.IO closed');
    });

    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
        try {
            await mongoose.connection.close(false);
            console.log('✅ MongoDB connection closed');
        } catch (error) {
            console.error('❌ Error closing MongoDB:', error.message);
        }
    }

    console.log('✅ Graceful shutdown complete');
    process.exit(0);
};

// Listen for shutdown signals
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection at:', promise);
    console.error('   Reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('   Stack:', error.stack);
    handleShutdown('UNCAUGHT_EXCEPTION');
});

// Export for use in other modules
export { mongoConnected as isMongoConnected, io, userToSocket as userSocketMap };
