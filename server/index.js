// server/index.js
// Main server file for YouTube Clone Backend
// Handles video streaming, real-time calls, and content management
// FULLY MERGED VERSION - All Features + Fixed Timeouts

// =================== ENVIRONMENT SETUP (MUST BE FIRST) ===================
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env with explicit path - THIS MUST HAPPEN BEFORE OTHER IMPORTS
const envPath = path.join(__dirname, ".env");
console.log("📁 Loading .env from:", envPath);
dotenv.config({ path: envPath });

// Set BASE_URL if not provided
if (!process.env.BASE_URL) {
  if (process.env.RENDER) {
    process.env.BASE_URL = "https://youtube-clone-project-q3pd.onrender.com";
  } else {
    process.env.BASE_URL = "http://localhost:5000";
  }
  console.log("🌐 BASE_URL set to:", process.env.BASE_URL);
}

// Verify critical environment variables
if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL ERROR: JWT_SECRET not found in .env");
  console.error("   .env path:", envPath);
  console.error("   Current directory:", __dirname);
  console.error("   Please create a .env file with JWT_SECRET");
  process.exit(1);
}

console.log("🔐 Environment Check:");
console.log("   JWT_SECRET exists:", !!process.env.JWT_SECRET);
console.log("   JWT_SECRET length:", process.env.JWT_SECRET?.length || 0);
console.log(
  "   JWT_SECRET preview:",
  process.env.JWT_SECRET?.substring(0, 15) + "..."
);
console.log("   DB_URL exists:", !!process.env.DB_URL);
console.log("   NODE_ENV:", process.env.NODE_ENV || "development");

// =================== NOW IMPORT EVERYTHING ELSE ===================
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import fs from "fs";
import http from "http";
import { Server } from "socket.io";
import compression from "compression";

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
import locationRoutes from "./routes/location.js";
import callroutes from "./routes/call.js";
import shortroutes from "./routes/short.js";
import reportRoutes from "./routes/report.js";
import shortTranslationRoutes from "./routes/shortTranslation.js";
import otpRoutes from "./routes/otp.js";
import imageProxyRouter from "./routes/imageProxy.js";
import adminRoutes from "./routes/admin.js";
import healthRoutes from "./routes/health.js";
import { setupCallHandlers } from "./sockets/callHandler.js";

// Cron job services for scheduled tasks
import { startAllCronJobs, stopAllCronJobs } from "./services/cronJobs.js";

// Track server state
let mongoConnected = false;
let cronJobsRunning = false;
let serverReady = false;

// Create Express app FIRST
const app = express();
const server = http.createServer(app);
// =================== MIDDLEWARE ===================

// ✅ Compression middleware
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Good balance between speed and compression
  })
);

// ✅ CRITICAL: Smart timeout - LONGER for uploads
// ✅ CRITICAL: Smart timeout - LONGER for OTP operations
app.use((req, res, next) => {
  // OTP and upload routes: 2 minute timeout
  if (
    req.path.includes("/otp") ||
    req.path.includes("/upload") ||
    (req.method === "POST" &&
      req.headers["content-type"]?.includes("multipart/form-data"))
  ) {
    req.setTimeout(120000); // 2 minutes for OTP/uploads
    res.setTimeout(120000);
    console.log("⏱️ Extended timeout (2min) for:", req.path);
    return next();
  }

  // Regular routes: 25 second timeout
  req.setTimeout(25000);
  res.setTimeout(25000);

  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error("⏱️ Request timeout:", req.method, req.path);
      res.status(504).json({
        success: false,
        message: "Request timeout",
      });
    }
  }, 25000);

  res.on("finish", () => clearTimeout(timeout));
  next();
});

// =================== ENHANCED CORS CONFIGURATION ===================
// Build allowed origins array
const allowedOrigins = [
  // Local development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://192.168.0.181:3000",
  "http://127.0.0.1:3000",

  // ✅ ALL Vercel domains (add YOUR specific ones)
  "https://youtube-clone-project-eosin.vercel.app",
  "https://youtube-clone-project-git-main-sais-projects-daab7a9a.vercel.app",

  // ✅ Add more Vercel preview URLs if needed
  // "https://youtube-clone-project-abc123.vercel.app",
];

// ✅ CRITICAL: Allow ANY Vercel preview domain
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow no origin (mobile apps, Postman)

  // Exact match
  if (allowedOrigins.includes(origin)) {
    console.log("   ✅ Allowed origin (exact match):", origin);
    return true;
  }

  // ✅ Allow ANY Vercel domain (production or preview)
  if (/^https:\/\/youtube-clone-project.*\.vercel\.app$/.test(origin)) {
    console.log("   ✅ Allowed origin (Vercel domain):", origin);
    return true;
  }

  // ✅ Production: be permissive
  if (process.env.NODE_ENV === "production") {
    console.log("   ⚠️  Production: allowing origin:", origin);
    return true;
  }

  console.log("   ❌ Origin blocked:", origin);
  return false;
};

// ✅ Socket.IO CORS
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      console.log("🔍 Socket.IO CORS check:", origin || "no origin");

      // Allow no origin (mobile, Postman)
      if (!origin) {
        return callback(null, true);
      }

      // Check if allowed
      if (isOriginAllowed(origin)) {
        console.log("   ✅ Socket origin allowed");
        return callback(null, true);
      }

      // Production: permissive
      if (process.env.NODE_ENV === "production") {
        console.log("   ⚠️  Production: allowing socket origin");
        return callback(null, true);
      }

      console.log("   ❌ Socket origin blocked");
      callback(null, true); // ✅ ALLOW ANYWAY to prevent connection issues
    },
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  },

  // ✅ CRITICAL FIX: Match frontend transport order
  transports: ["websocket", "polling"],
  allowEIO3: true,
  allowUpgrades: true,

  // ✅ Timeouts
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e8,

  // Path
  path: "/socket.io/",

  // Server options
  serveClient: false,
  perMessageDeflate: false,
  httpCompression: false,
});

console.log("✅ Socket.IO configured with CORS");

// Define upload directories for different content types
const directories = {
  videos: path.join(__dirname, "uploads", "videos"),
  channelImages: path.join(__dirname, "uploads", "channel-images"),
  shortsVideos: path.join(__dirname, "uploads", "shorts", "videos"),
  shortsThumbnails: path.join(__dirname, "uploads", "shorts", "thumbnails"),
  recordings: path.join(__dirname, "uploads", "recordings"),
  invoices: path.join(__dirname, "invoices"),
};

// Make sure all upload directories exist
Object.entries(directories).forEach(([name, dirPath]) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created ${name} directory: ${dirPath}`);
  }
});
// =================== ENHANCED CORS MIDDLEWARE ===================
// =================== EXPRESS CORS MIDDLEWARE ===================
app.use(
  cors({
    origin: function (origin, callback) {
      console.log("🔍 Express CORS check:", origin || "no origin");

      // ✅ Always allow in production
      if (process.env.NODE_ENV === "production") {
        console.log("   ✅ Production: allowing all origins");
        return callback(null, true);
      }

      // ✅ Check if origin is allowed
      if (!origin || isOriginAllowed(origin)) {
        console.log("   ✅ Origin allowed");
        return callback(null, true);
      }

      console.log("   ⚠️  Origin not in list, but allowing anyway");
      callback(null, true); // ✅ Permissive fallback
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
      "Pragma",
      "Expires",
      "If-None-Match",
      "If-Modified-Since",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range", "ETag"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  })
);

console.log("✅ Express CORS configured");

// ✅ CRITICAL: Video streaming with Range support for Shorts
// ✅ ENHANCED: Better error handling and CORS
app.get("/uploads/shorts/videos/:filename", (req, res) => {
  const filename = req.params.filename;
  const videoPath = path.join(
    __dirname,
    "uploads",
    "shorts",
    "videos",
    filename
  );

  console.log("🎬 Video request:", {
    filename,
    path: videoPath,
    exists: fs.existsSync(videoPath),
  });

  if (!fs.existsSync(videoPath)) {
    console.error("❌ Video file not found:", videoPath);
    return res.status(404).json({ success: false, message: "Video not found" });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // ✅ CRITICAL: Set CORS headers FIRST
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges"
  );
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Cache-Control", "public, max-age=31536000"); // ✅ ADD: Cache for 1 year

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
      return res.end();
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });

    console.log("✅ Streaming range:", { start, end, chunksize, fileSize });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Content-Length": chunksize,
    });

    file.pipe(res);
  } else {
    console.log("✅ Streaming full video");
    res.writeHead(200, {
      "Content-Length": fileSize,
    });
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Debug endpoint to test video URL
app.get("/api/test-video/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;
    console.log("🔍 Testing video access for short:", shortId);

    const mongoose = await import("mongoose");
    const Short = mongoose.connection.model("Short");

    const short = await Short.findById(shortId);

    if (!short) {
      return res
        .status(404)
        .json({ success: false, message: "Short not found" });
    }

    const videoUrl = short.videoUrl;
    console.log("📹 Video URL:", videoUrl);

    // Check if file exists
    let fileExists = false;
    let filePath = "";

    if (videoUrl.includes("/uploads/")) {
      filePath = path.join(__dirname, videoUrl.replace(/^\//, ""));
      fileExists = fs.existsSync(filePath);
    }

    res.json({
      success: true,
      videoUrl,
      fileExists,
      filePath: fileExists ? filePath : "N/A",
      isCloudinary: videoUrl.includes("cloudinary.com"),
      isLocal: videoUrl.includes("/uploads/"),
    });
  } catch (error) {
    console.error("❌ Test video error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Same for regular videos
app.get("/uploads/videos/:filename", (req, res) => {
  const filename = req.params.filename;
  const videoPath = path.join(__dirname, "uploads", "videos", filename);

  if (!fs.existsSync(videoPath)) {
    console.error("❌ Video not found:", videoPath);
    return res.status(404).json({ success: false, message: "Video not found" });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges"
  );
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", "video/mp4");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
      return res.end();
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Content-Length": chunksize,
    });

    file.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
    });
    fs.createReadStream(videoPath).pipe(res);
  }
});
// ✅ ENHANCED CORS - COMPLETE FIX
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow all origins in production (or restrict to your Vercel domain)
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, Expires, Range, If-None-Match, If-Modified-Since, X-Auth-Token"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag, X-Request-Id"
  );

  // ✅ CRITICAL: Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

console.log("✅ CORS middleware configured");

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(bodyParser.json());

// Static file serving for uploads and invoices
// Static file serving for uploads and invoices
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      // Set proper MIME types
      if (filePath.endsWith(".mp4")) {
        res.set("Content-Type", "video/mp4");
      } else if (filePath.endsWith(".webm")) {
        res.set("Content-Type", "video/webm");
      } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
        res.set("Content-Type", "image/jpeg");
      } else if (filePath.endsWith(".png")) {
        res.set("Content-Type", "image/png");
      }

      // ✅ CRITICAL: Enable CORS for media files
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.set(
        "Access-Control-Allow-Headers",
        "Range, Content-Type, Authorization"
      );
      res.set(
        "Access-Control-Expose-Headers",
        "Content-Length, Content-Range, Accept-Ranges"
      );

      // ✅ CRITICAL: Enable range requests for video streaming
      res.set("Accept-Ranges", "bytes");

      // ✅ CRITICAL: Prevent caching issues
      res.set("Cache-Control", "public, max-age=3600");
      res.set("X-Content-Type-Options", "nosniff");
    },
  })
);
app.use("/invoices", express.static(path.join(__dirname, "invoices")));
// =================== API Routes ===================
console.log("📋 Setting up API routes...");

// Authentication and user management
app.use("/auth", userroutes);
app.use("/user", userroutes);

// Video content routes
// ✅ CRITICAL FIX: Add video list endpoint

app.use("/video", videoroutes);
// ✅ TEMPORARY: Add direct /video GET endpoint until routes are fixed
app.get("/video", async (req, res) => {
  try {
    const mongoose = await import("mongoose");
    const videofiles = mongoose.connection.model("videofiles");

    const videos = await videofiles
      .find({ visibility: { $ne: "private" } })
      .populate({
        path: "uploadedBy",
        select: "name email channelname image",
        options: { strictPopulate: false, lean: true },
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    console.log(`📹 Retrieved ${videos.length} videos via fallback route`);

    res.status(200).json({
      success: true,
      videos: videos,
      count: videos.length,
      message: "Using fallback video endpoint",
    });
  } catch (error) {
    console.error("❌ Fallback video endpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
      error: error.message,
    });
  }
});
app.use("/subscription", subscriptionroutes);
app.use("/api/download", downloadroutes);
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
app.use("/api/location", locationRoutes);
app.use("/call", callroutes);
app.use("/report", reportRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api", imageProxyRouter);
app.use("/api/admin", adminRoutes);
app.use("/api", healthRoutes);

console.log("✅ All routes registered successfully");

// Root endpoint - shows available API endpoints
app.get("/", (req, res) => {
  res.json({
    message: "YouTube Clone Backend API",
    status: "OK",
    version: "2.0.1",
    environment: process.env.NODE_ENV || "development",
    mongoConnected: mongoConnected,
    cronJobsActive: cronJobsRunning,
    socketConnections: io.sockets.sockets.size,
    allowedOrigins: allowedOrigins.length,
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
      healthDetailed: "/health/detailed",
      testEnv: "/test-env",
    },
  });
});

// Environment test endpoint (for debugging)
app.get("/test-env", (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV || "development",
    hasJwtSecret: !!process.env.JWT_SECRET,
    secretLength: process.env.JWT_SECRET?.length || 0,
    secretPreview: process.env.JWT_SECRET
      ? process.env.JWT_SECRET.substring(0, 10) + "..."
      : "NOT LOADED",
    hasDbUrl: !!process.env.DB_URL,
    port: process.env.PORT || 5000,
    allowedOrigins: allowedOrigins.length,
    origins: allowedOrigins,
    timestamp: new Date().toISOString(),
  });
});

// =================== HEALTH CHECK ENDPOINTS ===================

// Simple health check for Render (fast response)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/keep-alive", (req, res) => {
  console.log("🔔 Keep-alive ping received at", new Date().toISOString());

  res.status(200).json({
    status: "alive",
    message: "Server is awake and running",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    mongodb: mongoConnected ? "connected" : "disconnected",
    cronJobs: cronJobsRunning ? "active" : "inactive",
    socketConnections: io.sockets.sockets.size,
    environment: process.env.NODE_ENV || "development",
  });
});

// Detailed health check for monitoring
app.get("/health/detailed", (req, res) => {
  try {
    res.status(200).json({
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
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
// =================== Socket.IO User Management ===================
// Maps to track online users and their socket connections
const userToSocket = new Map(); // userId -> socketId
const socketToUser = new Map(); // socketId -> userId
const activeCallRooms = new Map(); // roomId -> Set of socketIds

// =================== Socket.IO Connection Handler ===================
io.on("connection", (socket) => {
  console.log("\n👤 New user connected");
  console.log("   Socket ID:", socket.id);
  console.log("   Total connections:", io.sockets.sockets.size);

  // ✅ CRITICAL FIX: Setup call handlers from external file
  try {
    setupCallHandlers(io, socket);
    console.log("✅ Call handlers initialized for socket:", socket.id);
  } catch (error) {
    console.error("❌ Failed to setup call handlers:", error);
  }

  // User registration - links userId to socketId
  socket.on("register-user", (userId) => {
    if (!userId) {
      console.error("❌ Registration failed: No userId provided");
      socket.emit("registration-error", { message: "userId is required" });
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
    socket.emit("user-registered", {
      success: true,
      userId: userId,
      socketId: socket.id,
      timestamp: Date.now(),
    });

    // Notify other users that this user is online
    socket.broadcast.emit("user-online", {
      userId,
      socketId: socket.id,
      timestamp: Date.now(),
    });
  });

  // Initiate a call to another user
  socket.on("call-user", (callData) => {
    console.log("\n📞 Initiating call");
    console.log("   To:", callData.userToCall);
    console.log("   From:", callData.from);
    console.log("   Room:", callData.roomId);

    if (!callData.userToCall || !callData.from || !callData.roomId) {
      console.error("❌ Call initiation failed: missing required data");
      socket.emit("call-error", { message: "Missing required call data" });
      return;
    }

    // Find the receiver's socket
    const receiverSocket = userToSocket.get(callData.userToCall);

    if (receiverSocket) {
      console.log(`✅ Found receiver socket: ${receiverSocket}`);

      // Send call notification to receiver
      io.to(receiverSocket).emit("incoming-call", {
        from: callData.from,
        name: callData.name,
        roomId: callData.roomId,
        image: callData.image || "",
        callId: callData.callId,
        timestamp: Date.now(),
      });

      console.log("✅ Call notification sent");

      // Confirm to caller that call was initiated
      socket.emit("call-initiated", {
        success: true,
        receiverId: callData.userToCall,
        roomId: callData.roomId,
      });
    } else {
      console.log(`❌ Receiver not available: ${callData.userToCall}`);
      socket.emit("call-error", {
        success: false,
        message: "User not available or offline",
      });
    }
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log("\n👋 User disconnected");
    console.log("   Socket:", socket.id);
    console.log("   Reason:", reason);

    const disconnectedUserId = socketToUser.get(socket.id);

    if (disconnectedUserId) {
      userToSocket.delete(disconnectedUserId);
      console.log("   Removed user:", disconnectedUserId);

      // Notify others that user went offline
      io.emit("user-offline", {
        userId: disconnectedUserId,
        timestamp: Date.now(),
      });
    }

    socketToUser.delete(socket.id);

    // Clean up all rooms this socket was in
    for (const [roomId, sockets] of activeCallRooms.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);

        // Notify others in the room
        socket.to(roomId).emit("user-disconnected", {
          socketId: socket.id,
          userId: disconnectedUserId,
        });

        socket.to(roomId).emit("call-ended", {
          reason: "user-disconnected",
          socketId: socket.id,
          endedBy: disconnectedUserId,
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
  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });

  // Simple ping/pong for connection monitoring
  socket.on("ping", (roomId) => {
    socket.emit("pong", {
      roomId,
      timestamp: Date.now(),
    });
  });
});
// =================== Error Handling Middleware ===================
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.stack);

  // Special handling for CORS errors
  if (err.message === "Not allowed by CORS policy") {
    return res.status(403).json({
      error: "CORS Error",
      message: "This origin is not allowed to access this resource",
      origin: req.headers.origin,
      hint: "Add your domain to ALLOWED_ORIGINS environment variable or allowedOrigins array",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
    // Only show stack trace in development
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// =================== Database Connection & Server Startup ===================
const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DB_URL;

// =================== Database Connection Setup ===================
const connectToDatabase = async () => {
  if (!DATABASE_URL) {
    console.warn("⚠️  No MongoDB connection string provided");
    console.warn("⚠️  Set DB_URL in your .env file");
    console.warn("⚠️  Database features and cron jobs will not be available");
    return;
  }

  mongoose.set("strictQuery", false);

  try {
    await mongoose.connect(DATABASE_URL, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected successfully");
    mongoConnected = true;

    // Start cron jobs after successful database connection
    if (!cronJobsRunning) {
      console.log("\n⏰ ===== STARTING CRON JOBS =====");
      try {
        startAllCronJobs();
        cronJobsRunning = true;
        console.log("✅ Cron jobs started successfully");
        console.log("===== CRON JOBS ACTIVE =====\n");
      } catch (error) {
        console.error("❌ Failed to start cron jobs:", error.message);
      }
    }
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.log("   Retrying in 30 seconds...");
    setTimeout(connectToDatabase, 30000);
  }
};

// MongoDB event listeners
mongoose.connection.on("connected", () => {
  mongoConnected = true;
  console.log("✅ MongoDB connection established");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
  mongoConnected = false;
});

mongoose.connection.on("disconnected", () => {
  mongoConnected = false;
  if (cronJobsRunning) {
    console.log("⚠️  MongoDB disconnected - Cron jobs may not work properly");
  }
  console.log("❌ MongoDB disconnected. Attempting to reconnect...");
});

// Start the server (listening on all network interfaces)
// Start the server (listening on all network interfaces)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 ===== SERVER STARTED =====`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Network: http://0.0.0.0:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   CORS Origins: ${allowedOrigins.length}`);
  console.log(`   Socket.IO: Configured`);
  console.log(`===== SERVER READY =====\n`);

  serverReady = true;

  // ✅ CRITICAL: Start MongoDB connection AFTER server is listening
  // This prevents Render timeout issues
  if (DATABASE_URL) {
    connectToDatabase();
  }
});
// Connect to MongoDB if connection string is provided
if (DATABASE_URL) {
  mongoose.set("strictQuery", false);

  // Initial connection attempt
  connectToDatabase();
} else {
  console.warn("⚠️  No MongoDB connection string provided");
  console.warn("⚠️  Set DB_URL in your .env file");
  console.warn("⚠️  Database features and cron jobs will not be available");
}
// =================== Graceful Shutdown Handler ===================
const handleShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  // Stop cron jobs first
  if (cronJobsRunning) {
    console.log("⏰ Stopping cron jobs...");
    try {
      stopAllCronJobs();
      cronJobsRunning = false;
      console.log("✅ Cron jobs stopped");
    } catch (error) {
      console.error("❌ Error stopping cron jobs:", error.message);
    }
  }

  // ✅ ADD: Close email connections
  try {
    const { closeEmailConnections } = await import("./utils/emailService.js");
    closeEmailConnections();
  } catch (error) {
    console.error("❌ Error closing email connections:", error.message);
  }

  // Close Socket.IO connections
  console.log("🔌 Closing Socket.IO connections...");
  io.close(() => {
    console.log("✅ Socket.IO closed");
  });

  // Close MongoDB connection
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.close(false);
      console.log("✅ MongoDB connection closed");
    } catch (error) {
      console.error("❌ Error closing MongoDB:", error.message);
    }
  }

  console.log("✅ Graceful shutdown complete");
  process.exit(0);
};

// Listen for shutdown signals
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Promise Rejection at:", promise);
  console.error("   Reason:", reason);
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== "production") {
    console.error("   Consider fixing this promise rejection");
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  console.error("   Stack:", error.stack);
  // Only shutdown on critical errors in development
  if (process.env.NODE_ENV !== "production") {
    handleShutdown("UNCAUGHT_EXCEPTION");
  }
});

// Export for use in other modules
export {
  mongoConnected as isMongoConnected,
  io,
  userToSocket as userSocketMap,
};

// =================== END OF FILE ===================
console.log("\n✅ Server initialization complete");
console.log("📝 All features loaded:");
console.log("   ✓ Authentication & Users");
console.log("   ✓ Video Management");
console.log("   ✓ Shorts (Short-form videos)");
console.log("   ✓ Real-time Calls (WebRTC)");
console.log("   ✓ Comments & Translations");
console.log("   ✓ Subscriptions & History");
console.log("   ✓ Screen Sharing & Recording");
console.log("   ✓ Location Services");
console.log("   ✓ Admin Panel");
console.log("   ✓ Health Monitoring");
console.log("   ✓ Image Proxy");
console.log("   ✓ OTP Services");
console.log("   ✓ Report System");
console.log("   ✓ Cron Jobs");
console.log("\n🎉 YouTube Clone Backend Ready!\n");
