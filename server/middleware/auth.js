// server/middleware/auth.js - COMPLETE FIXED VERSION
import jwt from "jsonwebtoken";
import User from "../Modals/User.js";

export const verifyToken = async (req, res, next) => {
  console.log("\n🔐 ===== TOKEN VERIFICATION =====");

  console.log("🔑 JWT_SECRET from env:", process.env.JWT_SECRET?.substring(0, 20) + "...");
  console.log("🔑 JWT_SECRET length:", process.env.JWT_SECRET?.length);

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

    // ✅ CRITICAL: Use the SAME secret that was used to CREATE the token
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      throw new Error("❌ JWT_SECRET environment variable is required");
    }
    console.log("🔑 Verifying with JWT_SECRET");

    const decoded = jwt.verify(token, JWT_SECRET);

    console.log("✅ Token verified successfully");
    console.log("📋 Decoded payload:", {
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

    // ✅ CRITICAL: Set req.user with FULL user object
    req.user = {
      _id: user._id,
      id: user._id,
      userId: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      image: user.image,
      channelName: user.channelName || user.channelname,
      currentPlan: user.currentPlan,
      ...decoded,
    };

    console.log("✅ req.user set successfully:", {
      _id: req.user._id.toString(),
      name: req.user.name,
    });
    console.log("===== VERIFICATION COMPLETE =====\n");

    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    console.error("❌ Error name:", error.name);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
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

export const checkSubscription = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid user in token",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.currentPlan === "FREE" && user.watchTimeLimit <= 0) {
      return res.status(403).json({
        success: false,
        message: "Watch limit exceeded. Please upgrade your subscription.",
      });
    }

    next();
  } catch (error) {
    console.error("❌ Subscription check error:", error);
    res.status(500).json({
      success: false,
      message: "Subscription check failed",
      error: error.message,
    });
  }
};

export default verifyToken;
