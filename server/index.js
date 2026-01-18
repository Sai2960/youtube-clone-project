// =================== ENVIRONMENT SETUP (MUST BE FIRST) ===================
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load environment variables FIRST
dotenv.config();

// ✅ CRITICAL: Railway-specific environment setup
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log("🚂 Running on Railway");

  // Set BASE_URL from Railway's provided domain
  if (!process.env.BASE_URL) {
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      process.env.BASE_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    } else if (process.env.RAILWAY_STATIC_URL) {
      process.env.BASE_URL = process.env.RAILWAY_STATIC_URL;
    }
  }

  console.log("   BASE_URL:", process.env.BASE_URL);
}

// ✅ Verify critical environment variables
if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET not found");
  process.exit(1);
}

console.log("✅ Environment validated");

// =================== IMPORTS ===================
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

console.log("✅ All modules imported successfully");
// =================== CRITICAL: GLOBAL ERROR HANDLERS ===================
// Must be set up BEFORE any async operations

process.on("uncaughtException", (error) => {
  console.error("\n🚨 ===== UNCAUGHT EXCEPTION =====");
  console.error("Error:", error.message);
  console.error("Stack:", error.stack);
  console.error("=================================\n");

  // In production, log but don't crash
  if (process.env.NODE_ENV === "production") {
    console.error("⚠️  Server continuing despite error (production mode)");
  } else {
    console.error("🛑 Crashing in development mode");
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("\n🚨 ===== UNHANDLED PROMISE REJECTION =====");
  console.error("Promise:", promise);
  console.error("Reason:", reason);
  console.error("==========================================\n");

  // In production, log but don't crash
  if (process.env.NODE_ENV === "production") {
    console.error("⚠️  Server continuing despite rejection (production mode)");
  }
});

console.log("✅ Global error handlers configured");
// =================== CREATE EXPRESS APP & SERVER ===================
const app = express();
const server = http.createServer(app);

// ✅ CRITICAL FIX: Ultra-fast health check FIRST (before ANY middleware)
// This MUST be the first route to respond instantly to Railway health checks
app.get("/health", (req, res) => {
  // Set CORS headers FIRST
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Then respond immediately
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.end('{"status":"OK","timestamp":' + Date.now() + "}");
});

// ✅ Alternative health check for detailed status
app.get("/health/full", (req, res) => {
  res.json({
    status: "OK",
    server: "running",
    mongodb: mongoConnected ? "connected" : "connecting",
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

console.log("✅ Express app created");
console.log("✅ Critical health check route registered");
// =================== CORS CONFIGURATION ===================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://youtube-clone-project-eosin.vercel.app",
  /^https:\/\/youtube-clone-project.*\.vercel\.app$/,
  /^https:\/\/.*\.railway\.app$/, // ✅ Railway domains
  /^https:\/\/.*\.up\.railway\.app$/, // ✅ Railway custom domains
];

// Helper function for origin validation
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow no origin for mobile apps

  return allowedOrigins.some((allowed) =>
    typeof allowed === "string" ? allowed === origin : allowed.test(origin),
  );
};

console.log("✅ CORS configuration prepared");
// =================== SOCKET.IO INITIALIZATION ===================
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      console.log("🔍 Socket.IO CORS check:", origin || "no origin");

      // Allow no origin (mobile, Postman)
      if (!origin) {
        return callback(null, true);
      }

      // Check if allowed
      const isAllowed = allowedOrigins.some((allowed) =>
        typeof allowed === "string" ? allowed === origin : allowed.test(origin),
      );

      if (isAllowed || process.env.NODE_ENV === "production") {
        return callback(null, true);
      }

      callback(null, true); // Allow anyway to prevent blocking
    },
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  path: "/socket.io/",
});

console.log("✅ Socket.IO configured");

// Maps to track online users and their socket connections
const userToSocket = new Map(); // userId -> socketId
const socketToUser = new Map(); // socketId -> userId
const activeCallRooms = new Map(); // roomId -> Set of socketIds

// ✅ Export for use in other modules
export {
  mongoConnected as isMongoConnected,
  io,
  userToSocket as userSocketMap,
};

console.log("✅ Socket.IO maps initialized and exported");
// =================== MIDDLEWARE ===================

// ✅ Compression middleware for better performance
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Good balance between speed and compression
  }),
);

console.log("✅ Compression middleware enabled");

// ✅ CRITICAL: Railway-optimized timeout middleware
app.use((req, res, next) => {
  // Skip timeout for health checks - CRITICAL for Railway
  if (req.path === "/health" || req.path === "/api/keep-alive") {
    return next();
  }

  // OTP and upload routes: 2 minute timeout
  if (
    req.path.includes("/otp") ||
    req.path.includes("/upload") ||
    (req.method === "POST" &&
      req.headers["content-type"]?.includes("multipart/form-data"))
  ) {
    req.setTimeout(120000);
    res.setTimeout(120000);
    return next();
  }

  // Regular routes: 60 second timeout for Railway stability
  req.setTimeout(60000);
  res.setTimeout(60000);

  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error("⏱️ Request timeout:", req.method, req.path);
      res.status(504).json({
        success: false,
        message: "Request timeout",
      });
    }
  }, 60000);

  // Clean up timeout on response finish
  const cleanup = () => {
    clearTimeout(timeout);
    res.removeListener("finish", cleanup);
    res.removeListener("close", cleanup);
  };

  res.on("finish", cleanup);
  res.on("close", cleanup);

  next();
});

console.log("✅ Smart timeout middleware configured");

// =================== EXPRESS CORS MIDDLEWARE ===================
app.use(
  cors({
    origin: function (origin, callback) {
      console.log("🔍 Express CORS check:", origin || "no origin");

      // Allow requests with no origin
      if (!origin) {
        return callback(null, true);
      }

      // Check if allowed
      if (isOriginAllowed(origin)) {
        console.log("   ✅ Origin allowed");
        return callback(null, origin);
      }

      // Production fallback
      if (
        process.env.NODE_ENV === "production" ||
        origin.includes("vercel.app") ||
        origin.includes("railway.app")
      ) {
        console.log("   ✅ Production origin allowed");
        return callback(null, origin);
      }

      callback(null, origin); // Allow anyway to prevent blocking
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
  }),
);

console.log("✅ Express CORS configured");

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(bodyParser.json());

console.log("✅ Body parser middleware configured");
// =================== VIDEO STREAMING ROUTES WITH RANGE SUPPORT ===================

// ✅ CRITICAL: Video streaming with Range support for Shorts
app.get("/uploads/shorts/videos/:filename", (req, res) => {
  const filename = req.params.filename;
  const videoPath = path.join(
    __dirname,
    "uploads",
    "shorts",
    "videos",
    filename,
  );

  console.log("🎬 Shorts video request:", {
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
    "Content-Length, Content-Range, Accept-Ranges",
  );
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Cache-Control", "public, max-age=31536000");

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

// ✅ Regular videos streaming
app.get("/uploads/videos/:filename", (req, res) => {
  const filename = req.params.filename;
  const videoPath = path.join(__dirname, "uploads", "videos", filename);

  console.log("🎬 Regular video request:", {
    filename,
    path: videoPath,
    exists: fs.existsSync(videoPath),
  });

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
    "Content-Length, Content-Range, Accept-Ranges",
  );
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Cache-Control", "public, max-age=31536000");

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

// ✅ Debug endpoint to test video URL
app.get("/api/test-video/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;
    console.log("🔍 Testing video access for short:", shortId);

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
// ✅ Thumbnail serving with proper CORS
app.get("/uploads/thumbnails/:filename", (req, res) => {
  const filename = req.params.filename;
  const thumbnailPath = path.join(__dirname, "uploads", "thumbnails", filename);

  console.log("🖼️ Thumbnail request:", {
    filename,
    path: thumbnailPath,
    exists: fs.existsSync(thumbnailPath),
  });

  if (!fs.existsSync(thumbnailPath)) {
    console.error("❌ Thumbnail not found:", thumbnailPath);
    return res.status(404).json({
      success: false,
      message: "Thumbnail not found",
    });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, max-age=31536000");

  // Set proper content type
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
    res.setHeader("Content-Type", "image/jpeg");
  } else if (filename.endsWith(".png")) {
    res.setHeader("Content-Type", "image/png");
  } else if (filename.endsWith(".webp")) {
    res.setHeader("Content-Type", "image/webp");
  }

  fs.createReadStream(thumbnailPath).pipe(res);
});

console.log("✅ Video streaming routes configured");
// =================== ENHANCED CORS MIDDLEWARE ===================
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Set specific origin if present
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD",
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, Expires, Range, If-None-Match, If-Modified-Since",
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag",
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

console.log("✅ Enhanced CORS middleware configured");

// =================== STATIC FILE SERVING ===================
app.use(
  "/uploads",
  (req, res, next) => {
    const origin = req.headers.origin;

    // ✅ Set specific origin if present
    if (origin) {
      res.set("Access-Control-Allow-Origin", origin);
    } else {
      res.set("Access-Control-Allow-Origin", "*");
    }

    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.set(
      "Access-Control-Allow-Headers",
      "Range, Content-Type, Authorization",
    );
    res.set(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Range, Accept-Ranges",
    );

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    next();
  },
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

      // ✅ Enable range requests for video streaming
      res.set("Accept-Ranges", "bytes");
      res.set("Cache-Control", "public, max-age=3600");
      res.set("X-Content-Type-Options", "nosniff");
    },
  }),
);

app.use("/invoices", express.static(path.join(__dirname, "invoices")));

console.log("✅ Static file serving configured");
// =================== API ROUTES ===================
console.log("📋 Setting up API routes...");

// ✅ Alternative health endpoints
app.get("/api/health", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({ status: "OK", timestamp: Date.now() });
});
// ✅ CRITICAL: Bypass timeout for subscription routes
app.use("/subscription", (req, res, next) => {
  // Remove timeouts for subscription routes
  req.setTimeout(0);
  res.setTimeout(0);
  next();
});
// ✅ CRITICAL: Subscription routes with enhanced logging and no timeout
// ✅ CRITICAL: Subscription routes - NO timeout wrapper
console.log("📋 Registering subscription routes...");

app.use("/subscription", subscriptionroutes);

console.log("✅ Subscription routes registered at /subscription");

// Authentication and user management
app.use("/auth", userroutes);
app.use("/user", userroutes);

// Video content routes
app.use("/video", videoroutes);

// ✅ Fallback endpoint for video listing (until routes are fully fixed)
app.get("/video", async (req, res) => {
  try {
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

// Subscription and engagement routes
app.use("/api/download", downloadroutes);
app.use("/history", historyroutes);
app.use("/like", likeroutes);
app.use("/watch", watchroutes);

// Translation and comment routes
app.use("/translate", translationroutes);
app.use("/comment", commentroutes);

// Shorts (short-form video) routes - multiple paths for backward compatibility
app.use("/api/shorts/translate", shortTranslationRoutes);
app.use("/api/shorts", shortroutes);
app.use("/shorts", shortroutes);

// Other feature routes
app.use("/api/location", locationRoutes);
app.use("/call", callroutes);
app.use("/report", reportRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api", imageProxyRouter);
app.use("/api/admin", adminRoutes);

console.log("✅ All routes registered successfully");

// =================== ROOT ENDPOINT ===================
app.get("/", (req, res) => {
  res.json({
    message: "YouTube Clone Backend API",
    status: "OK",
    version: "2.0.3",
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

// =================== ENVIRONMENT TEST ENDPOINT ===================
app.get("/test-env", (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV || "development",
    hasJwtSecret: !!process.env.JWT_SECRET,
    secretLength: process.env.JWT_SECRET?.length || 0,
    secretPreview: process.env.JWT_SECRET
      ? process.env.JWT_SECRET.substring(0, 10) + "..."
      : "NOT LOADED",
    hasDbUrl: !!process.env.DB_URL,
    port: process.env.PORT || 8080,
    allowedOrigins: allowedOrigins.length,
    origins: allowedOrigins.map((o) =>
      typeof o === "string" ? o : o.toString(),
    ),
    timestamp: new Date().toISOString(),
    railway: {
      environment: process.env.RAILWAY_ENVIRONMENT || "N/A",
      publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN || "N/A",
      staticUrl: process.env.RAILWAY_STATIC_URL || "N/A",
    },
  });
});

console.log("✅ Root and test endpoints configured");
// =================== HEALTH CHECK ENDPOINTS ===================

// ✅ Keep-alive endpoint for external monitoring
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
    railway: !!process.env.RAILWAY_ENVIRONMENT,
  });
});

// Detailed health check for monitoring and debugging
app.get("/health/detailed", (req, res) => {
  try {
    res.status(200).json({
      message: "Server is running",
      status: "OK",
      version: "2.0.3",
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
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB",
      },
      platform: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      railway: {
        isRailway: !!process.env.RAILWAY_ENVIRONMENT,
        publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN || "N/A",
        staticUrl: process.env.RAILWAY_STATIC_URL || "N/A",
      },
    });
  } catch (error) {
    console.error("❌ Health check error:", error);
    res.status(500).json({
      status: "ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

console.log("✅ Health check endpoints configured");

// ✅ DEBUG: List all registered routes
app.get("/api/debug-routes", (req, res) => {
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });

  res.json({
    success: true,
    totalRoutes: routes.length,
    routes: routes,
    subscriptionRoutes: routes.filter((r) => r.path?.includes("subscription")),
  });
});
// =================== SOCKET.IO CONNECTION HANDLER ===================
io.on("connection", (socket) => {
  console.log("\n👤 New user connected");
  console.log("   Socket ID:", socket.id);
  console.log("   Total connections:", io.sockets.sockets.size);
  console.log("   Origin:", socket.handshake.headers.origin || "unknown");

  // ✅ CRITICAL: Setup call handlers from external file
  try {
    setupCallHandlers(io, socket);
    console.log("✅ Call handlers initialized for socket:", socket.id);
  } catch (error) {
    console.error("❌ Failed to setup call handlers:", error);
    socket.emit("setup-error", {
      message: "Failed to initialize call handlers",
      error: error.message,
    });
  }

  // =================== USER REGISTRATION ===================
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

      // Remove old socket mapping
      socketToUser.delete(existingSocketId);

      // Notify old socket if still connected
      const oldSocket = io.sockets.sockets.get(existingSocketId);
      if (oldSocket) {
        oldSocket.emit("session-replaced", {
          message: "New session started from another device",
          newSocketId: socket.id,
        });
      }
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

  // =================== CALL INITIATION ===================
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
        timestamp: Date.now(),
      });
    } else {
      console.log(`❌ Receiver not available: ${callData.userToCall}`);
      socket.emit("call-error", {
        success: false,
        message: "User not available or offline",
        userId: callData.userToCall,
      });
    }
  });
  // =================== CALL ROOM MANAGEMENT ===================
  socket.on("join-room", (roomId, userId) => {
    console.log("\n🚪 User joining room");
    console.log("   User:", userId);
    console.log("   Room:", roomId);
    console.log("   Socket:", socket.id);

    // Join the room
    socket.join(roomId);

    // Track this socket in the room
    if (!activeCallRooms.has(roomId)) {
      activeCallRooms.set(roomId, new Set());
    }
    activeCallRooms.get(roomId)?.add(socket.id);

    // Get all sockets in this room
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    const userCount = roomSockets ? roomSockets.size : 0;

    console.log(`   Room now has ${userCount} users`);

    // Notify the user they joined successfully
    socket.emit("room-joined", {
      roomId,
      userId,
      userCount,
      timestamp: Date.now(),
    });

    // ✅ CRITICAL: When both users are ready, trigger offer
    if (userCount === 2) {
      console.log(`✅✅✅ Both users ready in room: ${roomId}`);
      console.log("   Triggering offer creation...");

      // Tell BOTH users that they're ready
      io.to(roomId).emit("both-users-ready", {
        roomId,
        userCount: 2,
        timestamp: Date.now(),
      });

      console.log("📤 Sent both-users-ready to room");
    } else if (userCount > 2) {
      console.warn(`⚠️ Room ${roomId} has ${userCount} users (max 2 expected)`);
    }
  });

  // ✅ Handle request-offer from receiver if stuck
  socket.on("request-offer", (roomId) => {
    console.log("📢 Receiver requesting offer for room:", roomId);

    // Notify all users in room to send offer
    socket.to(roomId).emit("should-create-offer", {
      roomId,
      requestedBy: socket.id,
      timestamp: Date.now(),
    });

    console.log("✅ Forwarded offer request to room");
  });
  // =================== DISCONNECT HANDLER ===================
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
        socketId: socket.id,
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
          timestamp: Date.now(),
        });

        socket.to(roomId).emit("call-ended", {
          reason: "user-disconnected",
          socketId: socket.id,
          endedBy: disconnectedUserId,
          timestamp: Date.now(),
        });

        // Remove empty rooms
        if (sockets.size === 0) {
          activeCallRooms.delete(roomId);
          console.log(`   Removed empty room: ${roomId}`);
        }
      }
    }

    console.log(`   Remaining users: ${userToSocket.size}`);
    console.log(`   Active rooms: ${activeCallRooms.size}\n`);
  });

  // =================== ERROR HANDLING ===================
  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
    socket.emit("socket-error", {
      message: "An error occurred",
      error: error.message,
      timestamp: Date.now(),
    });
  });

  // =================== CONNECTION MONITORING ===================
  socket.on("ping", (data) => {
    socket.emit("pong", {
      roomId: data?.roomId,
      timestamp: Date.now(),
      serverTime: new Date().toISOString(),
    });
  });

  // ✅ Heartbeat for connection health
  socket.on("heartbeat", () => {
    socket.emit("heartbeat-ack", {
      timestamp: Date.now(),
      socketId: socket.id,
    });
  });
});

console.log("✅ Socket.IO connection handler configured");
// =================== ERROR HANDLING MIDDLEWARE ===================
app.use((err, req, res, next) => {
  // ✅ FIXED: Null check FIRST
  if (!err) {
    return next();
  }

  const errorMessage = err.message || "Unknown error occurred";
  const errorStack = err.stack || "No stack trace available";

  console.error("❌ Server error:", errorMessage);

  if (process.env.NODE_ENV !== "production") {
    console.error("Stack:", errorStack);
  }

  // Don't send if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle specific error types
  if (errorMessage === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      error: "CORS Error",
      message: "This origin is not allowed to access this resource",
      origin: req.headers.origin,
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      error: "File Too Large",
      message: "The uploaded file exceeds the maximum allowed size",
      maxSize: "30MB",
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      message: errorMessage,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: "Invalid ID",
      message: "The provided ID is not valid",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Authentication Error",
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Authentication Error",
      message: "Token has expired",
    });
  }

  // Generic error response
  res.status(err.status || 500).json({
    success: false,
    message: errorMessage,
    error: process.env.NODE_ENV === "development" ? errorStack : undefined,
    timestamp: new Date().toISOString(),
  });
});

// ✅ FIXED: 404 handler with proper error handling
app.use((req, res) => {
  console.log("❌ 404 - Route not found:", req.method, req.path);

  // Don't send if headers already sent
  if (res.headersSent) {
    return;
  }

  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
    method: req.method,
    availableEndpoints: {
      root: "/",
      health: "/health",
      subscription: "/subscription/current",
      subscriptionPlans: "/subscription/plans",
      videos: "/video",
      auth: "/auth",
    },
    timestamp: new Date().toISOString(),
  });
});

console.log("✅ Error handling middleware configured");
// =================== DATABASE CONNECTION & CONFIGURATION ===================

const DATABASE_URL = process.env.DB_URL;
const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = "0.0.0.0";

// ✅ CRITICAL: Validate port before starting
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`❌ Invalid PORT: ${process.env.PORT}`);
  process.exit(1);
}

console.log(`🔧 Server will bind to ${HOST}:${PORT}`);

// ✅ Database connection function with retry logic
const connectToDatabase = async () => {
  if (!DATABASE_URL) {
    console.warn("\n⚠️  ===== NO MONGODB CONNECTION =====");
    console.warn("⚠️  Set DB_URL in your .env file");
    console.warn("⚠️  Database features will not be available");
    console.warn("⚠️  Cron jobs will not run");
    console.warn("===== SERVER RUNNING WITHOUT DB =====\n");
    return;
  }

  mongoose.set("strictQuery", false);

  try {
    console.log("🔄 Connecting to MongoDB...");

    await mongoose.connect(DATABASE_URL, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
    });

    console.log("✅ MongoDB connected successfully");
    mongoConnected = true;

    // Start cron jobs after successful database connection
    if (!cronJobsRunning && DATABASE_URL) {
      console.log("\n⏰ ===== STARTING CRON JOBS =====");
      try {
        startAllCronJobs();
        cronJobsRunning = true;
        console.log("✅ Cron jobs started successfully");
        console.log("===== CRON JOBS ACTIVE =====\n");
      } catch (error) {
        console.error("❌ Failed to start cron jobs:", error.message);
        console.error("   Cron jobs will retry on next MongoDB reconnect");
      }
    }
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    mongoConnected = false;

    // Don't crash the server - just log and continue
    console.log("   Server will continue without database");
    console.log("   MongoDB will retry via reconnect events");
  }
};

// =================== MONGODB EVENT LISTENERS ===================

mongoose.connection.on("connected", () => {
  mongoConnected = true;
  console.log("✅ MongoDB connection established");

  // Start cron jobs if not already running
  if (!cronJobsRunning && DATABASE_URL) {
    try {
      startAllCronJobs();
      cronJobsRunning = true;
      console.log("✅ Cron jobs started after reconnection");
    } catch (error) {
      console.error("❌ Failed to start cron jobs:", error.message);
    }
  }
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
  mongoConnected = false;
});

mongoose.connection.on("disconnected", () => {
  mongoConnected = false;
  console.log("❌ MongoDB disconnected");

  if (cronJobsRunning) {
    console.log("⚠️  Cron jobs may not work properly without database");
  }

  console.log("🔄 Attempting to reconnect...");
  setTimeout(connectToDatabase, 5000);
});

mongoose.connection.on("reconnected", () => {
  mongoConnected = true;
  console.log("✅ MongoDB reconnected successfully");
});

console.log("✅ MongoDB event listeners configured");
// ✅ CRITICAL: Start server immediately, connect to DB in background
server.listen(PORT, HOST, () => {
  console.log("\n");
  console.log("🚀 ============================================");
  console.log("🚀 ===== SERVER STARTED SUCCESSFULLY =====");
  console.log("🚀 ============================================");
  console.log(`\n📍 Server Details:`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Host: ${HOST}`);
  console.log(`   Local: http://localhost:${PORT}`);

  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log("\n🚂 Railway Deployment:");
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      console.log(
        `   Public URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`,
      );
    }
    if (process.env.RAILWAY_STATIC_URL) {
      console.log(`   Static URL: ${process.env.RAILWAY_STATIC_URL}`);
    }
  }

  console.log(`\n⚙️  Configuration:`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   CORS Origins: ${allowedOrigins.length} configured`);
  console.log(`   Socket.IO: Enabled`);
  console.log(`   MongoDB: ${DATABASE_URL ? "Configured" : "Not configured"}`);

  console.log("\n============================================");
  console.log("✅ SERVER READY - Accepting Connections");
  console.log("============================================\n");

  serverReady = true;

  // ✅ CRITICAL: Connect to database with bulletproof error handling
  if (DATABASE_URL) {
    console.log("🔄 Connecting to database in background...\n");

    // Wrap in setImmediate to ensure it's truly non-blocking
    setImmediate(async () => {
      try {
        await connectToDatabase();
        console.log("🎉 Background initialization complete!");
      } catch (err) {
        console.error("❌ Background DB connection failed:", err.message);
        console.error("   Server will continue without database");
        // Don't crash - just log the error
      }
    });
  } else {
    console.log("⚠️  Skipping database connection (no DB_URL configured)\n");
  }
});

// ✅ CRITICAL: Handle server startup errors
server.on("error", (error) => {
  console.error("\n❌ ===== SERVER ERROR =====");
  console.error("Error:", error);

  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error(`   Railway assigned port: ${process.env.PORT}`);
  } else if (error.code === "EACCES") {
    console.error(`❌ Permission denied for port ${PORT}`);
  } else {
    console.error(`❌ Server failed to start: ${error.message}`);
  }

  console.error("========================\n");
  process.exit(1);
});

console.log("✅ Server startup configured");
// =================== GRACEFUL SHUTDOWN HANDLER ===================

const handleShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  console.log("============================================");

  let exitCode = 0;

  // 1. Stop accepting new connections
  console.log("🔒 Stopping new connections...");
  server.close(() => {
    console.log("✅ HTTP server closed");
  });

  // 2. Stop cron jobs first
  if (cronJobsRunning) {
    console.log("⏰ Stopping cron jobs...");
    try {
      stopAllCronJobs();
      cronJobsRunning = false;
      console.log("✅ Cron jobs stopped");
    } catch (error) {
      console.error("❌ Error stopping cron jobs:", error.message);
      exitCode = 1;
    }
  }

  // 3. Close email connections
  try {
    console.log("📧 Closing email connections...");
    const { closeEmailConnections } = await import("./utils/emailService.js");
    closeEmailConnections();
    console.log("✅ Email connections closed");
  } catch (error) {
    console.error("❌ Error closing email connections:", error.message);
    // Non-critical, don't change exit code
  }

  // 4. Close Socket.IO connections gracefully
  console.log("🔌 Closing Socket.IO connections...");
  try {
    // Notify all connected clients
    io.emit("server-shutdown", {
      message: "Server is shutting down",
      timestamp: Date.now(),
    });

    // Give clients time to disconnect
    await new Promise((resolve) => setTimeout(resolve, 1000));

    io.close(() => {
      console.log("✅ Socket.IO closed");
    });
  } catch (error) {
    console.error("❌ Error closing Socket.IO:", error.message);
    exitCode = 1;
  }

  // 5. Close MongoDB connection
  if (mongoose.connection.readyState === 1) {
    console.log("🗄️  Closing MongoDB connection...");
    try {
      await mongoose.connection.close(false);
      mongoConnected = false;
      console.log("✅ MongoDB connection closed");
    } catch (error) {
      console.error("❌ Error closing MongoDB:", error.message);
      exitCode = 1;
    }
  }

  console.log("\n============================================");
  console.log("✅ Graceful shutdown complete");
  console.log("============================================\n");

  process.exit(exitCode);
};

// =================== PROCESS EVENT HANDLERS ===================

// Listen for shutdown signals
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("\n❌ ===== UNHANDLED PROMISE REJECTION =====");
  console.error("Promise:", promise);
  console.error("Reason:", reason);
  console.error("==========================================\n");

  // Don't exit in production, just log
  if (process.env.NODE_ENV !== "production") {
    console.error(
      "💡 Tip: This promise rejection should be handled with .catch()",
    );
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("\n❌ ===== UNCAUGHT EXCEPTION =====");
  console.error("Error:", error.message);
  console.error("Stack:", error.stack);
  console.error("=================================\n");

  // Only shutdown on critical errors in development
  if (process.env.NODE_ENV !== "production") {
    console.error(
      "🛑 Shutting down due to uncaught exception in development mode",
    );
    handleShutdown("UNCAUGHT_EXCEPTION");
  } else {
    console.error(
      "⚠️  Continuing in production mode - please fix this exception",
    );
  }
});

// Handle warning events
process.on("warning", (warning) => {
  console.warn("\n⚠️  Node.js Warning:");
  console.warn("   Name:", warning.name);
  console.warn("   Message:", warning.message);
  if (warning.stack) {
    console.warn("   Stack:", warning.stack);
  }
  console.warn("");
});

console.log("✅ Process event handlers configured");

// =================== END OF FILE ===================
console.log("\n✅ ============================================");
console.log("✅ Server initialization complete");
console.log("✅ ============================================");
console.log("\n📝 All features loaded and configured:");
console.log("   ✓ Environment & Configuration");
console.log("   ✓ Express & HTTP Server");
console.log("   ✓ Socket.IO & WebRTC");
console.log("   ✓ CORS & Security");
console.log("   ✓ Video Streaming (Range Support)");
console.log("   ✓ Static File Serving");
console.log("   ✓ API Routes (16+ routes)");
console.log("   ✓ FIXED ROUTE ORDER (Subscription FIRST)");
console.log("   ✓ Health Monitoring");
console.log("   ✓ Error Handling");
console.log("   ✓ Database Connection");
console.log("   ✓ Graceful Shutdown");
console.log("   ✓ Process Handlers");
console.log("\n🎉 YouTube Clone Backend Ready for Deployment!");
console.log("============================================\n");

export default app;
