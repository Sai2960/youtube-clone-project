// server/middleware/auth.js - COMPLETE MERGED VERSION
import jwt from "jsonwebtoken";
import User from "../Modals/User.js";

export const verifyToken = async (req, res, next) => {
  console.log("\n🔐 ===== TOKEN VERIFICATION =====");
  console.log("   Path:", req.path);
  console.log("   Method:", req.method);
  console.log(
    "🔑 JWT_SECRET from env:",
    process.env.JWT_SECRET?.substring(0, 20) + "..."
  );
  console.log("🔑 JWT_SECRET length:", process.env.JWT_SECRET?.length);

  try {
    const authHeader = req.headers.authorization;
    console.log("📋 Auth header present:", !!authHeader);
    console.log("   Auth Header:", authHeader ? "Present" : "Missing");

    if (!authHeader) {
      console.log("❌ No authorization header");
      return res.status(401).json({
        success: false,
        message: "No token provided. Please login.",
      });
    }

    // Extract token - support both "Bearer " prefix and direct token
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token || token === "null" || token === "undefined") {
      console.log("❌ Invalid token in header");
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }

    console.log(
      "🔍 Token received (first 20 chars):",
      token.substring(0, 20) + "..."
    );
    console.log("   Token extracted:", token.substring(0, 20) + "...");

    // ✅ CRITICAL: Use the SAME secret that was used to CREATE the token
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      console.error("❌ JWT_SECRET not configured");
      throw new Error("❌ JWT_SECRET environment variable is required");
    }
    console.log("🔑 Verifying with JWT_SECRET");

    // Verify token with JWT secret
    const decoded = jwt.verify(token, JWT_SECRET);

    console.log("✅ Token verified successfully");
    console.log("✅ Token decoded:", {
      id: decoded.id,
      _id: decoded._id,
      userId: decoded.userId,
      email: decoded.email,
    });

    // ✅ CRITICAL FIX: Fetch the actual user from database
    const userId = decoded.id || decoded._id || decoded.userId;

    if (!userId) {
      console.log("❌ No user ID in token");
      return res.status(401).json({
        success: false,
        message: "Invalid token structure",
      });
    }

    console.log("🔍 Looking up user:", userId);

    // Fetch user from database
    const user = await User.findById(userId).select("-password");

    if (!user) {
      console.log("❌ User not found in database");
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    console.log("✅ User found:", {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    });

    // ✅ CRITICAL FIX: Set BOTH req.user AND req.userId SYNCHRONOUSLY
    req.userId = user._id.toString();
    req.user = {
      _id: user._id,
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      channelName: user.channelname || user.channelName,
    };

    console.log("✅ Authentication complete:", {
      userId: req.userId,
      userName: req.user.name,
      userEmail: req.user.email,
    });

    // ✅ CRITICAL: Verify it's set before calling next()
    if (!req.userId) {
      console.error(
        "❌ CRITICAL: req.userId is STILL undefined after setting!"
      );
      return res.status(500).json({
        success: false,
        message: "Internal authentication error",
      });
    }

    console.log("===== VERIFICATION COMPLETE =====\n");
    next();
  } catch (error) {
    console.error("\n❌ ===== TOKEN VERIFICATION FAILED =====");
    console.error("❌ Token verification error:", error.message);
    console.error("❌ Error name:", error.name);
    console.error("   Error:", error.message);
    console.error("========================================\n");

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
        code: "INVALID_TOKEN",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code: "TOKEN_EXPIRED",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please login again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============ ADMIN CHECK MIDDLEWARE ============
export const isAdmin = async (req, res, next) => {
  try {
    console.log("🔐 Admin check for user:", req.user?.id || req.userId);

    const userId = req.user?.id || req.user?._id || req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "admin") {
      console.log("❌ Access denied - Not an admin:", user.email);
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    console.log("✅ Admin verified:", user.email);
    next();
  } catch (error) {
    console.error("❌ Admin check error:", error);
    res.status(500).json({
      success: false,
      message: "Authorization check failed",
      error: error.message,
    });
  }
};

export const checkSubscription = async (req, res, next) => {
  console.log("\n💳 ===== SUBSCRIPTION CHECK =====");

  try {
    // Get user ID from multiple possible sources
    const userId =
      req.userId || req.user?._id || req.user?.id || req.user?.userId;

    if (!userId) {
      console.log("❌ Invalid user in token");
      return res.status(401).json({
        success: false,
        message: "Invalid user in token",
      });
    }

    console.log("🔍 Checking subscription for user:", userId);

    // Fetch user from database
    const user = await User.findById(userId);

    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("📋 User subscription:", {
      plan: user.currentPlan,
      watchTimeLimit: user.watchTimeLimit,
    });

    // Check if user has exceeded watch limit
    if (user.currentPlan === "FREE" && user.watchTimeLimit <= 0) {
      console.log("❌ Watch limit exceeded");
      return res.status(403).json({
        success: false,
        message: "Watch limit exceeded. Please upgrade your subscription.",
        code: "WATCH_LIMIT_EXCEEDED",
      });
    }

    console.log("✅ Subscription check passed");
    console.log("===== SUBSCRIPTION CHECK COMPLETE =====\n");

    next();
  } catch (error) {
    console.error("\n❌ ===== SUBSCRIPTION CHECK FAILED =====");
    console.error("❌ Subscription check error:", error);
    console.error("========================================\n");

    res.status(500).json({
      success: false,
      message: "Subscription check failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export default verifyToken;
