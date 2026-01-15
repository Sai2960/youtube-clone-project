// server/middleware/auth.js - COMPLETE MERGED VERSION
import jwt from "jsonwebtoken";
import User from "../Modals/User.js";

export const verifyToken = async (req, res, next) => {
  console.log("\n🔐 ===== TOKEN VERIFICATION =====");
  console.log("   Path:", req.path);
  console.log("   Method:", req.method);

  try {
    const authHeader = req.headers.authorization;
    console.log("📋 Auth header present:", !!authHeader);

    if (!authHeader) {
      console.log("❌ No authorization header");
      return res.status(401).json({
        success: false,
        message: "No token provided. Please login.",
      });
    }

    // Extract token
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

    // Verify token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("❌ JWT_SECRET not configured");
      throw new Error("JWT_SECRET environment variable is required");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ Token verified successfully");
    console.log("✅ Decoded token:", decoded);

    // Extract user ID from token
    const tokenUserId = decoded.id || decoded._id || decoded.userId;
    if (!tokenUserId) {
      console.log("❌ No user ID in token");
      return res.status(401).json({
        success: false,
        message: "Invalid token structure",
      });
    }

    console.log("🔍 Looking up user:", tokenUserId);

    // Fetch user from database
    const user = await User.findById(tokenUserId).select("-password");
    if (!user) {
      console.log("❌ User not found in database");
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    console.log("✅ User found:", user.email);

    // ✅ CRITICAL: Set req.userId as a plain string
    const finalUserId = user._id.toString();

    req.userId = finalUserId;
    req.user = {
      _id: finalUserId,
      id: finalUserId,
      userId: finalUserId,
      email: user.email,
      name: user.name,
      channelName: user.channelname || user.channelName,
      role: user.role,
      isApproved: user.isApproved,
    };

    console.log("✅ FINAL req.userId:", req.userId);
    console.log("✅ FINAL req.userId TYPE:", typeof req.userId);
    console.log("✅ FINAL req.user:", req.user);
    console.log("===== VERIFICATION COMPLETE =====\n");

    next();
  } catch (error) {
    console.error("\n❌ ===== TOKEN VERIFICATION FAILED =====");
    console.error("Error:", error.message);
    console.error("========================================\n");

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please login again.",
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

    // ✅ CRITICAL: Only block if FREE plan AND limit exceeded
    if (user.currentPlan === "FREE" && user.watchTimeLimit <= 0) {
      console.log("❌ Watch limit exceeded");
      return res.status(403).json({
        success: false,
        message: "Watch limit exceeded. Please upgrade your subscription.",
        code: "WATCH_LIMIT_EXCEEDED",
        upgradeUrl: "/subscription", // ✅ Add upgrade URL
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
