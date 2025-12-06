// server/controllers/authController.js - COMPLETE MERGED VERSION
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../Modals/User.js";
import geoip from "geoip-lite";
import moment from "moment-timezone";

// =================== JWT TOKEN GENERATION ===================
const generateToken = (user) => {
  const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

  const payload = {
    id: user._id.toString(),
    _id: user._id.toString(),
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
  };

  console.log("🔐 Creating token with payload:", payload);
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
};

// =================== THEME & OTP DETERMINATION ===================
const determineThemeAndOtpMethod = (ip) => {
  const geo = geoip.lookup(ip) || { country: "IN", region: "TN" };
  const state = geo.region || "Unknown";
  let theme = "dark";
  let otpMethod = "sms";

  const southernStates = [
    "Tamil Nadu",
    "Kerala",
    "Karnataka",
    "Andhra Pradesh",
    "Telangana",
    "TN",
    "KL",
    "KA",
    "AP",
    "TS",
  ];

  const isSouthIndia = southernStates.some((s) =>
    state.toLowerCase().includes(s.toLowerCase())
  );

  const currentTime = moment().tz("Asia/Kolkata");
  const hour = currentTime.hour();

  if (isSouthIndia) otpMethod = "email";
  if (isSouthIndia && hour >= 10 && hour < 12) theme = "light";

  console.log("🎨 Theme:", theme, "| OTP:", otpMethod, "| State:", state);
  return { state, theme, otpMethod, geo };
};

// =================== LOGIN/REGISTER ===================
export const login = async (req, res) => {
  try {
    const { email, name, image } = req.body;

    console.log("\n📝 ===== LOGIN REQUEST =====");
    console.log("   Email:", email);
    console.log("   Name:", name);

    // Validate input
    if (!email) {
      console.error("❌ Email is missing");
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.error("❌ MongoDB not connected. State:", mongoose.connection.readyState);
      return res.status(503).json({
        success: false,
        error: "Database connection unavailable",
      });
    }

    console.log("✅ MongoDB connected, finding user...");

    // Find or create user with error handling
    let user;
    try {
      user = await User.findOne({ email });
      console.log("🔍 User search result:", user ? "Found" : "Not found");
    } catch (dbError) {
      console.error("❌ Database query error:", dbError);
      return res.status(500).json({
        success: false,
        error: "Database query failed",
        message: dbError.message,
      });
    }

    if (!user) {
      console.log("🆕 Creating new user...");
      try {
        // ✅ FIX: Explicitly set arrays to empty
        user = await User.create({
          email,
          name: name || email.split("@")[0],
          channelname: name || email.split("@")[0],
          image: image || "https://github.com/shadcn.png",
          currentPlan: "FREE",
          watchTimeLimit: 5,
          theme: "dark",
          preferredOtpMethod: "email",
          subscribers: [], // ✅ Explicitly set empty array
          subscriptions: [], // ✅ Explicitly set empty array
          joinedon: new Date(),
        });
        console.log("✅ New user created:", user._id);
      } catch (createError) {
        console.error("❌ User creation error:", createError);
        return res.status(500).json({
          success: false,
          error: "Failed to create user",
          message: createError.message,
        });
      }
    } else {
      console.log("🔄 Updating existing user...");
      try {
        // ✅ FIX: Sanitize arrays before saving
        if (typeof user.subscribers === 'string') {
          console.warn("⚠️ Fixing corrupted subscribers");
          user.subscribers = [];
        }
        if (typeof user.subscriptions === 'string') {
          console.warn("⚠️ Fixing corrupted subscriptions");
          user.subscriptions = [];
        }

        if (name && user.name !== name) user.name = name;
        if (image && user.image !== image) user.image = image;
        
        await user.save();
        console.log("✅ User updated:", user.email);
      } catch (updateError) {
        console.error("⚠️ User update error:", updateError);
        // Continue even if update fails
      }
    }

    // Get IP and determine theme/OTP
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection?.remoteAddress ||
      "127.0.0.1";

    console.log("🌐 Client IP:", ip);

    const { state, theme, otpMethod, geo } = determineThemeAndOtpMethod(ip);

    // Update user preferences
    try {
      user.theme = theme;
      user.preferredOtpMethod = otpMethod;
      user.location = {
        state,
        country: geo.country,
        timezone: geo.timezone,
      };
      user.lastLoginTime = new Date();
      await user.save();
      console.log("✅ User preferences updated");
    } catch (saveError) {
      console.error("⚠️ Save error (non-critical):", saveError);
    }

    // Generate JWT
    const token = generateToken(user);
    console.log("✅ Token generated");

    // Prepare response
    const response = {
      success: true,
      result: {
        _id: user._id,
        email: user.email,
        name: user.name,
        channelname: user.channelname,
        description: user.description,
        image: user.image,
        currentPlan: user.currentPlan,
        watchTimeLimit: user.watchTimeLimit,
        theme: user.theme,
        preferredOtpMethod: user.preferredOtpMethod,
        joinedon: user.joinedon,
        subscribers: user.subscribers || 0,
      },
      token: token,
      theme: theme,
      otpMethod: otpMethod,
      location: {
        state: state,
        country: geo.country,
      },
    };

    console.log("✅ Login successful - Theme:", theme, "OTP:", otpMethod);
    console.log("===== LOGIN COMPLETE =====\n");

    return res.status(200).json(response);
  } catch (error) {
    console.error("\n❌❌❌ UNHANDLED LOGIN ERROR ❌❌❌");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n");

    return res.status(500).json({
      success: false,
      error: "Internal server error during login",
      message: error.message,
      type: error.name,
    });
  }
};

// =================== UPDATE PROFILE ===================
export const updateprofile = async (req, res) => {
  try {
    const { id: _id } = req.params;
    const { channelname, description, currentPlan, subscriptionExpiry, watchTimeLimit, theme, preferredOtpMethod } = req.body;

    console.log("🔄 Updating user:", _id);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid user ID" 
      });
    }

    const updateData = {};
    if (channelname !== undefined) updateData.channelname = channelname;
    if (description !== undefined) updateData.description = description;
    if (currentPlan !== undefined) updateData.currentPlan = currentPlan;
    if (subscriptionExpiry !== undefined) updateData.subscriptionExpiry = subscriptionExpiry;
    if (watchTimeLimit !== undefined) updateData.watchTimeLimit = watchTimeLimit;
    if (theme !== undefined) updateData.theme = theme;
    if (preferredOtpMethod !== undefined) updateData.preferredOtpMethod = preferredOtpMethod;

    const updatedUser = await User.findByIdAndUpdate(
      _id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    console.log("✅ User updated:", updatedUser._id);

    return res.status(200).json({
      success: true,
      result: updatedUser,
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// =================== GET USER BY ID ===================
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📡 Fetching user:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    console.log("✅ User found:", user.email);

    res.status(200).json({
      success: true,
      result: user,
    });
  } catch (error) {
    console.error("❌ Get user error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// =================== GET ALL USERS ===================
export const getAllUsers = async (req, res) => {
  try {
    console.log("📋 Fetching all users");

    const users = await User.find()
      .select("_id email name channelname description image currentPlan joinedon subscribers")
      .sort({ joinedon: -1 })
      .limit(100);

    console.log(`✅ Found ${users.length} users`);

    res.json({
      success: true,
      users: users,
      count: users.length,
    });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================== GET CHANNEL BY ID ===================
export const getChannelById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📺 Fetching channel:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel ID format",
      });
    }

    const user = await User.findById(id).select(
      "_id email name channelname description image joinedon currentPlan subscribers"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    console.log("✅ Channel found:", user.channelname || user.name);

    res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("❌ Error fetching channel:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};