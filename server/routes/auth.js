// server/routes/auth.js - COMPLETE MERGED VERSION
import express from "express";
import jwt from "jsonwebtoken";
import User from "../Modals/User.js";
import mongoose from "mongoose";
import geoip from "geoip-lite";
import moment from "moment-timezone";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { locationMiddleware } from "../middleware/detectLocation.js";
import {
  uploadChannelImage,
  deleteFromSupabase,
  extractPublicId,
  uploadToSupabase, // Add this too since it's used later
} from "../config/cloudinary.js";
import { verifyToken } from "../middleware/auth.js";
import { login } from "../controllers/auth.js"; // Your existing login function

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ JWT Secret Handler
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("❌ JWT_SECRET not loaded!");
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
};

console.log("🔐 Auth routes loaded");
console.log("🔐 JWT_SECRET will be read at runtime");

// ==================== MULTER & CLOUDINARY SETUP ====================
const uploadsDir = path.join(__dirname, "..", "uploads", "channel-images");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 Created uploads directory:", uploadsDir);
}

// Using Cloudinary upload from config
const upload = uploadChannelImage;
// ==================== HELPER FUNCTIONS ====================

// 🎨 AUTO-GENERATE CHANNEL DESCRIPTION
const generateChannelDescription = (channelName) => {
  const templates = [
    `Welcome to ${channelName}! Your ultimate destination for amazing content. Dive into a world of entertainment, knowledge, and creativity. Subscribe now for regular updates!`,

    `${channelName} - Your go-to channel for exciting videos! Explore hilarious moments, thrilling bike rides, cutting-edge tech wonders, and so much more. Join our community today!`,

    `Hey there! Welcome to ${channelName}. We bring you the best mix of laughs, adventure, and innovation. Whether you're into comedy, travel, or tech - we've got you covered!`,

    `${channelName} is all about bringing joy and knowledge to your screen. From entertaining skits to informative tutorials, we create content that matters. Don't forget to subscribe!`,

    `Step into the world of ${channelName}! Your source for breathtaking nature scenes, adrenaline-pumping bike rides, and the latest tech innovations all in one place.`,

    `Welcome to your ultimate mix of laughs, adventure, and innovation! At ${channelName}, we create content that entertains, inspires, and educates. Join our growing family!`,

    `${channelName} brings you the best of entertainment and education. From thrilling adventures to tech reviews, we've got something for everyone. Subscribe and never miss an update!`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
};

// 🔐 Generate JWT Token
const generateToken = (user) => {
  const payload = {
    id: user._id.toString(),
    _id: user._id.toString(),
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
  };

  const JWT_SECRET = getJWTSecret();
  console.log("🔐 Creating token with payload:", payload);
  console.log("🔑 Using JWT_SECRET:", JWT_SECRET.substring(0, 20) + "...");

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
};

const determineThemeAndOtpMethod = (ip) => {
  try {
    // ✅ Handle localhost
    if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168")) {
      console.log("🏠 Localhost detected, using test location");

      const currentHour = moment().tz("Asia/Kolkata").hour();
      const isLightTime = currentHour >= 10 && currentHour < 12;

      return {
        state: "Tamil Nadu",
        city: "Chennai",
        country: "IN",
        timezone: "Asia/Kolkata",
        theme: isLightTime ? "light" : "dark",
        otpMethod: "email",
        debug: { method: "localhost", hour: currentHour },
      };
    }

    // ✅ Use geoip-lite
    const geo = geoip.lookup(ip) || { country: "IN", region: "TN" };
    const state = geo.region || "Unknown";
    const city = geo.city || "Unknown";
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
      state.toLowerCase().includes(s.toLowerCase()),
    );

    const currentTime = moment().tz("Asia/Kolkata");
    const hour = currentTime.hour();

    if (isSouthIndia) otpMethod = "email";
    if (isSouthIndia && hour >= 10 && hour < 12) theme = "light";

    console.log(
      "🎨 Theme determined:",
      theme,
      "| Hour:",
      hour,
      "| State:",
      state,
    );

    return {
      state,
      city,
      theme,
      otpMethod,
      country: geo.country || "IN",
      timezone: geo.timezone || "Asia/Kolkata",
      debug: { method: "geoip", hour, isSouthIndia },
    };
  } catch (error) {
    console.error("⚠️ Theme determination error:", error);
    return {
      state: "Unknown",
      city: "Unknown",
      theme: "dark",
      otpMethod: "email",
      country: "IN",
      timezone: "Asia/Kolkata",
      debug: { method: "error" },
    };
  }
};

// 🔑 Extract Cloudinary Public ID from URL
// ==================== AUTH ROUTES ====================

// ✅ LOGIN WITH LOCATION MIDDLEWARE
router.post("/login", locationMiddleware, async (req, res) => {
  try {
    const { email, name, image } = req.body;

    // Validation
    if (!email) {
      console.error("❌ No email provided");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    console.log("📝 Login request for:", email);

    // ✅ USE LOCATION FROM MIDDLEWARE (with fallback)
    let locationData = req.userLocation;

    // Fallback if middleware didn't provide complete data
    if (!locationData || !locationData.state) {
      console.log("⚠️ Location middleware incomplete, using fallback");
      const ip =
        req.ip ||
        req.connection?.remoteAddress ||
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        "127.0.0.1";
      locationData = determineThemeAndOtpMethod(ip);
    }

    const { state, city, theme, otpMethod, country, timezone } = locationData;

    console.log("🌍 Using detected location:", {
      state,
      city,
      theme,
      otpMethod,
      method: locationData.method || "fallback",
    });

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      console.log("🆕 Creating new user");

      const channelName = name || email.split("@")[0];
      const autoDescription = generateChannelDescription(channelName);

      user = new User({
        email,
        name: channelName,
        image: image || "https://github.com/shadcn.png",
        channelname: channelName,
        description: autoDescription,
        currentPlan: "FREE",
        watchTimeLimit: 5,
        theme: theme,
        preferredOtpMethod: otpMethod,
        subscribers: 0,
        subscribedChannels: [],
        location: {
          state,
          city,
          country,
          timezone,
        },
        lastLoginTime: new Date(),
      });

      await user.save();
      console.log("✅ User created with auto-detected location:", user._id);
    } else {
      console.log("✅ Existing user found:", user._id);

      let updated = false;

      // Update name if changed
      if (name && user.name !== name) {
        user.name = name;
        updated = true;
      }

      // ✅ CRITICAL: Only update image if user doesn't have a custom uploaded one
      // Custom uploaded images are Cloudinary URLs or start with /uploads/
      if (
        image &&
        !user.image?.includes("cloudinary.com") &&
        !user.image?.startsWith("/uploads/")
      ) {
        if (user.image !== image) {
          console.log("📸 Updating profile image (not a custom upload)");
          user.image = image;
          updated = true;
        }
      } else {
        console.log("✅ Preserving custom uploaded image:", user.image);
      }

      // ✅ ADD DESCRIPTION IF MISSING
      if (!user.description || user.description.trim() === "") {
        user.description = generateChannelDescription(
          user.channelname || user.name,
        );
        updated = true;
        console.log("✅ Added auto-description to existing user");
      }

      // ✅ Update theme and OTP method based on current geo-location
      user.theme = theme;
      user.preferredOtpMethod = otpMethod;
      user.location = {
        state,
        city,
        country,
        timezone,
      };
      user.lastLoginTime = new Date();
      updated = true;

      if (updated) {
        await user.save();
        console.log("✅ User info updated");
      }

      console.log("📸 User image after login:", user.image);
      console.log("🖼️ User banner after login:", user.bannerImage);
    }

    // Generate token
    const token = generateToken(user);

    console.log("✅ Login successful - Sending response");

    // Send response with ALL user data
    res.status(200).json({
      success: true,
      token,
      result: {
        _id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
        bannerImage: user.bannerImage,
        channelname: user.channelname,
        description: user.description,
        currentPlan: user.currentPlan,
        watchTimeLimit: user.watchTimeLimit,
        subscriptionExpiry: user.subscriptionExpiry,
        subscribers: user.subscribers,
      },
      theme,
      otpMethod,
      location: {
        state,
        city,
        country,
        timezone,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    console.error("Stack:", error.stack);

    res.status(500).json({
      success: false,
      message: "Something went wrong during login",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});
// ==================== UPDATE ROUTE ====================

// ✅ UPDATE: Channel info (name + description)
// ✅ UPDATE: Channel info (name + description)
router.patch("/update/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { channelname, description } = req.body;

    // ✅ FIX: Verify user is updating their own channel (use req.user.id from token)
    if (req.user.id !== userId) {
      console.error("❌ Unauthorized update attempt:", {
        tokenUserId: req.user.id,
        requestedUserId: userId,
      });
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this channel",
      });
    }

    // Validate channel name
    if (channelname) {
      const trimmed = channelname.trim();

      if (trimmed.length < 3) {
        return res.status(400).json({
          success: false,
          message: "Channel name must be at least 3 characters",
        });
      }

      if (trimmed.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Channel name must be less than 50 characters",
        });
      }

      // Check if channel name is already taken (optional)
      const existing = await User.findOne({
        channelname: trimmed,
        _id: { $ne: userId },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Channel name is already taken",
        });
      }
    }

    // Update user
    const updateData = {};
    if (channelname) updateData.channelname = channelname.trim();
    if (description !== undefined) updateData.description = description.trim();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, select: "-password" },
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ Channel updated:", updatedUser.channelname);

    res.status(200).json({
      success: true,
      message: "Channel updated successfully",
      user: updatedUser,
      result: updatedUser,
    });
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update channel",
      error: error.message,
    });
  }
});

// ==================== USER/CHANNEL ROUTES ====================

router.get("/all", async (req, res) => {
  try {
    const users = await User.find()
      .select(
        "_id email name channelname description image bannerImage currentPlan joinedon subscribers",
      )
      .sort({ joinedon: -1 })
      .limit(100);

    res.json({
      success: true,
      users: users,
      count: users.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/channel/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📺 Fetching channel for:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const user = await User.findById(id).select(
      "_id email name channelname description image bannerImage joinedon currentPlan subscribers",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    // ✅ CRITICAL FIX: Construct absolute URLs
    const BASE_URL =
      process.env.BASE_URL ||
      "https://youtube-clone-project-production.up.railway.app";

    const formatImageURL = (imagePath) => {
      if (!imagePath) return null;

      // Already absolute URL
      if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        // Fix localhost URLs
        if (
          imagePath.includes("192.168.0.181") ||
          imagePath.includes("localhost")
        ) {
          return imagePath.replace(
            /https?:\/\/(192\.168\.0\.181|localhost):5000/,
            BASE_URL,
          );
        }
        // Fix wrong Vercel URLs with port
        if (imagePath.includes("vercel.app:5000")) {
          return imagePath.replace(/https:\/\/[^/]+:5000/, BASE_URL);
        }
        return imagePath;
      }

      // Relative path starting with /uploads
      if (imagePath.startsWith("/uploads")) {
        return `${BASE_URL}${imagePath}`;
      }

      // Path without leading slash
      return `${BASE_URL}/uploads/${imagePath}`;
    };

    const userResponse = {
      _id: user._id,
      email: user.email,
      name: user.name,
      channelname: user.channelname,
      description: user.description,
      image: formatImageURL(user.image),
      bannerImage: formatImageURL(user.bannerImage),
      joinedon: user.joinedon,
      currentPlan: user.currentPlan,
      subscribers: user.subscribers,
    };

    console.log("✅ Channel response:", {
      id: userResponse._id,
      image: userResponse.image?.substring(0, 50),
      bannerImage: userResponse.bannerImage?.substring(0, 50),
    });

    res.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Channel fetch error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== IMAGE UPLOAD ROUTES ====================

// ✅ MAIN IMAGE UPLOAD ROUTE WITH CLOUDINARY
router.post(
  "/channel/:channelId/upload-image",
  verifyToken,
  uploadChannelImage.single("image"),
  async (req, res) => {
    try {
      const { channelId } = req.params;
      const { imageType } = req.body; // 'profile' or 'banner'
      const userId = req.user.id;

      console.log(`📸 Upload request:`, {
        channelId,
        imageType,
        userId,
        hasFile: !!req.file,
        fileBuffer: !!req.file?.buffer,
      });

      // Authorization check
      if (userId !== channelId) {
        console.error("❌ Unauthorized upload attempt");
        return res.status(403).json({
          success: false,
          message: "You can only upload images to your own channel",
        });
      }

      if (!req.file) {
        console.error("❌ No file uploaded");
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      const user = await User.findById(channelId);
      if (!user) {
        console.error("❌ User not found");
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // ✅ DELETE OLD IMAGE FROM SUPABASE
      const oldImageUrl =
        imageType === "profile" ? user.image : user.bannerImage;

      if (oldImageUrl && oldImageUrl.includes("supabase.co")) {
        try {
          const oldPublicId = extractPublicId(oldImageUrl);
          if (oldPublicId) {
            await deleteFromSupabase(oldPublicId);
            console.log("🗑️ Deleted old image from Supabase:", oldPublicId);
          }
        } catch (deleteError) {
          console.warn("⚠️ Failed to delete old image:", deleteError.message);
        }
      }

      // ✅ UPLOAD TO SUPABASE
      const { uploadToSupabase } = await import("../config/cloudinary.js");
      const folder =
        imageType === "profile"
          ? "channel-images/profiles"
          : "channel-images/banners";

      const uploadResult = await uploadToSupabase(req.file, folder);

      console.log("✅ Upload result:", uploadResult);

      // ✅ UPDATE DATABASE
      const updateData =
        imageType === "profile"
          ? { image: uploadResult.url, hasImage: true }
          : { bannerImage: uploadResult.url, hasBanner: true };

      const updatedUser = await User.findByIdAndUpdate(
        channelId,
        { $set: updateData },
        { new: true, runValidators: true },
      ).select("name email channelname image bannerImage subscribers");

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "Failed to update user",
        });
      }

      console.log(
        `✅ ${imageType} image uploaded successfully:`,
        uploadResult.url,
      );

      res.json({
        success: true,
        message: `${imageType} image uploaded successfully`,
        imageUrl: uploadResult.url,
        publicId: uploadResult.publicId,
        user: {
          _id: updatedUser._id,
          image: updatedUser.image,
          bannerImage: updatedUser.bannerImage,
        },
      });
    } catch (error) {
      console.error("❌ Upload error:", error);

      res.status(500).json({
        success: false,
        message: "Image upload failed",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  },
);

// ✅ UPDATE PROFILE WITH AVATAR (Alternative endpoint)
router.put(
  "/update-profile",
  verifyToken,
  uploadChannelImage.single("avatar"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const updateData = { ...req.body };

      console.log("📝 Profile update request for user:", userId);

      // If new avatar uploaded to Supabase
      if (req.file) {
        const oldUser = await User.findById(userId);

        // Delete old avatar from Supabase if it exists
        if (oldUser.image && oldUser.image.includes("supabase.co")) {
          try {
            const publicId = extractPublicId(oldUser.image);
            if (publicId) {
              await deleteFromSupabase(publicId);
              console.log("🗑️ Old avatar deleted from Supabase");
            }
          } catch (error) {
            console.error("⚠️ Failed to delete old avatar:", error);
          }
        }

        // Upload new avatar to Supabase
        const { uploadToSupabase } = await import("../config/cloudinary.js");
        const uploadResult = await uploadToSupabase(
          req.file,
          "channel-images/profiles",
        );

        updateData.image = uploadResult.url;
        console.log("✅ New avatar uploaded:", uploadResult.url);
      }

      // Remove sensitive fields
      delete updateData.password;
      delete updateData.email;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true },
      ).select("-password");

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      console.log("✅ Profile updated for:", updatedUser.name);

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("❌ Profile update error:", error);

      res.status(500).json({
        success: false,
        message: "Profile update failed",
        error: error.message,
      });
    }
  },
);

// ✅ UPLOAD AVATAR (Alternative endpoint)
router.post(
  "/upload-avatar",
  verifyToken,
  uploadChannelImage.single("avatar"),
  async (req, res) => {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No avatar file provided",
        });
      }

      // Upload to Supabase
      const { uploadToSupabase } = await import("../config/cloudinary.js");
      const uploadResult = await uploadToSupabase(
        req.file,
        "channel-images/profiles",
      );

      // Update user's avatar
      const user = await User.findById(userId);

      // Delete old avatar if exists
      if (user.image && user.image.includes("supabase.co")) {
        try {
          const oldPublicId = extractPublicId(user.image);
          if (oldPublicId) {
            await deleteFromSupabase(oldPublicId);
            console.log("🗑️ Old avatar deleted from Supabase");
          }
        } catch (error) {
          console.error("⚠️ Failed to delete old avatar:", error);
        }
      }

      user.image = uploadResult.url;
      await user.save();

      console.log("✅ Avatar uploaded for:", user.name);

      res.status(200).json({
        success: true,
        message: "Avatar uploaded successfully",
        avatar: uploadResult.url,
        publicId: uploadResult.publicId,
      });
    } catch (error) {
      console.error("❌ Avatar upload error:", error);

      res.status(500).json({
        success: false,
        message: "Avatar upload failed",
        error: error.message,
      });
    }
  },
);
// ✅ CRITICAL: Profile route MUST come BEFORE /:id route
router.get("/profile", verifyToken, async (req, res) => {
  try {
    console.log("\n🔍 ===== PROFILE ENDPOINT =====");
    console.log("📦 req.userId:", req.userId);
    console.log("📦 req.userId TYPE:", typeof req.userId);
    console.log("📦 req.user:", req.user);

    const userId = req.userId;

    if (!userId) {
      console.error("❌ req.userId is undefined!");
      return res.status(401).json({
        success: false,
        message: "Authentication failed - no user ID",
      });
    }

    console.log("🔍 Validating userId:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("❌ Invalid ObjectId format:", userId);
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        debug: {
          userId: userId,
          type: typeof userId,
          length: userId?.length,
        },
      });
    }

    console.log("✅ ObjectId validation passed");

    const user = await User.findById(userId).select("-password");

    if (!user) {
      console.error("❌ User not found in database:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ User found:", user.email);
    console.log("===== PROFILE SUCCESS =====\n");

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        channelname: user.channelname,
        description: user.description,
        image: user.image,
        bannerImage: user.bannerImage,
        role: user.role,
        isApproved: user.isApproved,
        approvalStatus: user.approvalStatus,
        currentPlan: user.currentPlan,
        watchTimeLimit: user.watchTimeLimit,
        subscribers: user.subscribers,
        theme: user.theme,
        preferredOtpMethod: user.preferredOtpMethod,
        location: user.location,
      },
    });
  } catch (error) {
    console.error("\n❌ ===== PROFILE ERROR =====");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("===========================\n");

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
});

// ✅ Generic user fetch by ID - MUST come AFTER /profile
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      result: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ GET PUBLIC USER PROFILE BY ID
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password -email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("❌ Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
});
// ==================== SUBSCRIPTION ROUTES ====================

router.post("/subscribe/:channelId", verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    console.log("📌 Subscribe request:", userId, "->", channelId);

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel ID",
      });
    }

    if (userId === channelId) {
      return res.status(400).json({
        success: false,
        message: "Cannot subscribe to own channel",
      });
    }

    const [user, channel] = await Promise.all([
      User.findById(userId),
      User.findById(channelId),
    ]);

    if (!user || !channel) {
      return res.status(404).json({
        success: false,
        message: "User or channel not found",
      });
    }

    const isAlreadySubscribed = user.subscribedChannels.some(
      (id) => id.toString() === channelId,
    );

    if (isAlreadySubscribed) {
      return res.status(400).json({
        success: false,
        message: "Already subscribed",
      });
    }

    user.subscribedChannels.push(channelId);
    channel.subscribers = (channel.subscribers || 0) + 1;

    await Promise.all([user.save(), channel.save()]);

    console.log("✅ Subscribed successfully! New count:", channel.subscribers);

    res.json({
      success: true,
      message: "Subscribed successfully",
      isSubscribed: true,
      subscriberCount: channel.subscribers,
    });
  } catch (error) {
    console.error("❌ Subscribe error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/unsubscribe/:channelId", verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    console.log("📌 Unsubscribe request:", userId, "->", channelId);

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel ID",
      });
    }

    const [user, channel] = await Promise.all([
      User.findById(userId),
      User.findById(channelId),
    ]);

    if (!user || !channel) {
      return res.status(404).json({
        success: false,
        message: "User or channel not found",
      });
    }

    const subscriptionIndex = user.subscribedChannels.findIndex(
      (id) => id.toString() === channelId,
    );

    if (subscriptionIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Not subscribed",
      });
    }

    user.subscribedChannels.splice(subscriptionIndex, 1);
    channel.subscribers = Math.max(0, (channel.subscribers || 1) - 1);

    await Promise.all([user.save(), channel.save()]);

    console.log(
      "✅ Unsubscribed successfully! New count:",
      channel.subscribers,
    );

    res.json({
      success: true,
      message: "Unsubscribed successfully",
      isSubscribed: false,
      subscriberCount: channel.subscribers,
    });
  } catch (error) {
    console.error("❌ Unsubscribe error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/subscription-status/:channelId", verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel ID",
      });
    }

    const [user, channel] = await Promise.all([
      User.findById(userId),
      User.findById(channelId),
    ]);

    if (!user || !channel) {
      return res.status(404).json({
        success: false,
        message: "User or channel not found",
      });
    }

    const isSubscribed = user.subscribedChannels.some(
      (id) => id.toString() === channelId,
    );

    // Get notification preference for this channel
    let notificationPreference = "all"; // Default
    if (
      user.notificationPreferences &&
      user.notificationPreferences.has(channelId)
    ) {
      notificationPreference = user.notificationPreferences.get(channelId);
    }

    res.json({
      success: true,
      isSubscribed,
      subscriberCount: channel.subscribers || 0,
      notificationPreference, // ✅ Add this
    });
  } catch (error) {
    console.error("❌ Status check error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// ==================== NOTIFICATION PREFERENCE ROUTE ====================

router.post(
  "/notification-preference/:channelId",
  verifyToken,
  async (req, res) => {
    try {
      const { channelId } = req.params;
      const { preference } = req.body;
      const userId = req.user.id;

      console.log("🔔 Update notification preference:", {
        userId,
        channelId,
        preference,
      });

      if (!mongoose.Types.ObjectId.isValid(channelId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid channel ID",
        });
      }

      if (!["all", "personalized", "none"].includes(preference)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid preference. Must be 'all', 'personalized', or 'none'",
        });
      }

      // Find the user who is updating their preference
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if user is subscribed to this channel
      const isSubscribed = user.subscribedChannels.some(
        (id) => id.toString() === channelId,
      );

      if (!isSubscribed) {
        return res.status(400).json({
          success: false,
          message: "You must be subscribed to change notification preferences",
        });
      }

      // Store notification preference in user's document
      // We'll store it as a map of channelId -> preference
      if (!user.notificationPreferences) {
        user.notificationPreferences = new Map();
      }

      user.notificationPreferences.set(channelId, preference);
      user.markModified("notificationPreferences"); // Tell Mongoose the Map changed
      await user.save();

      console.log("✅ Notification preference updated:", preference);

      res.json({
        success: true,
        notificationPreference: preference,
        message: "Notification preference updated successfully",
      });
    } catch (error) {
      console.error("❌ Update notification preference error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update notification preference",
        error: error.message,
      });
    }
  },
);

router.get("/subscribed-channels", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate(
      "subscribedChannels",
      "name channelname image bannerImage subscribers",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      channels: user.subscribedChannels || [],
    });
  } catch (error) {
    console.error("❌ Get subscribed channels error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// ==================== DEBUG & UTILITY ROUTES ====================

// ✅ DEBUG ROUTE (remove in production)
router.get("/debug/uploads", async (req, res) => {
  try {
    const uploadPath = path.join(__dirname, "..", "uploads", "channel-images");

    let files = [];
    let fileCount = 0;

    if (fs.existsSync(uploadPath)) {
      files = fs.readdirSync(uploadPath);
      fileCount = files.length;
    }

    res.json({
      success: true,
      uploadPath: uploadPath,
      pathExists: fs.existsSync(uploadPath),
      files: files,
      count: fileCount,
      note: "Local uploads deprecated - using Cloudinary",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ FIX AVATAR UTILITY ROUTE
router.post("/fix-my-avatar", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("🔧 Fixing avatar for user:", userId);

    // Get user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let needsUpdate = false;
    let message = "Avatar is valid";

    // Check if it's a local file path
    if (user.image && user.image.startsWith("/uploads/")) {
      const currentAvatarPath = path.join(__dirname, "..", user.image);
      const fileExists = fs.existsSync(currentAvatarPath);

      console.log("Current avatar:", user.image);
      console.log("File exists?", fileExists);

      if (!fileExists) {
        console.log("⚠️ Avatar file missing, resetting to default");
        user.image = "https://github.com/shadcn.png";
        needsUpdate = true;
        message =
          "Avatar file was missing. Reset to default. Please upload a new one.";
      }
    }

    // Check banner image too
    if (user.bannerImage && user.bannerImage.startsWith("/uploads/")) {
      const bannerPath = path.join(__dirname, "..", user.bannerImage);
      if (!fs.existsSync(bannerPath)) {
        console.log("⚠️ Banner file missing, removing reference");
        user.bannerImage = null;
        needsUpdate = true;
        message += " Banner file was also missing and has been reset.";
      }
    }

    if (needsUpdate) {
      await user.save();
    }

    res.json({
      success: true,
      message: message,
      user: {
        _id: user._id,
        image: user.image,
        bannerImage: user.bannerImage,
      },
    });
  } catch (error) {
    console.error("❌ Fix avatar error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ✅ HEALTH CHECK ROUTE
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working",
    timestamp: new Date().toISOString(),
    cloudinaryEnabled: true,
  });
});
// ✅ CHECK LOCATION ENDPOINT - MATCHES FRONTEND CALL
router.get("/check-location", async (req, res) => {
  try {
    console.log("\n🌍 ===== LOCATION CHECK REQUEST =====");
    console.log("   Headers:", {
      forwarded: req.headers["x-forwarded-for"],
      realIp: req.headers["x-real-ip"],
      cfIp: req.headers["cf-connecting-ip"],
    });
    
    // ✅ CRITICAL: Try multiple IP sources
    const forwardedFor = req.headers["x-forwarded-for"];
    const realIp = req.headers["x-real-ip"];
    const cfIp = req.headers["cf-connecting-ip"];
    
    let ip = "127.0.0.1";
    
    if (cfIp) {
      ip = cfIp;
    } else if (realIp) {
      ip = realIp;
    } else if (forwardedFor) {
      ip = forwardedFor.split(",")[0].trim();
    } else {
      ip = req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           "127.0.0.1";
    }
    
    // Clean IPv6 prefix
    const cleanIp = ip.replace(/^::ffff:/, "");
    
    console.log("   Raw IP:", ip);
    console.log("   Clean IP:", cleanIp);

    // Use the existing determineThemeAndOtpMethod function
    const result = determineThemeAndOtpMethod(cleanIp);
    
    const currentHour = moment().tz("Asia/Kolkata").hour();
    
    console.log("   Result:", {
      state: result.state,
      city: result.city,
      theme: result.theme,
      hour: currentHour,
      isMorningTime: currentHour >= 10 && currentHour < 12,
    });
    console.log("=====================================\n");

    // ✅ ALWAYS return 200 (never throw error to frontend)
    res.status(200).json({
      success: true,
      theme: result.theme,
      otpMethod: result.otpMethod,
      location: {
        state: result.state,
        city: result.city || "Unknown",
        country: result.country || "IN",
        timezone: result.timezone || "Asia/Kolkata",
      },
      debug: process.env.NODE_ENV === "development" ? {
        ip: cleanIp,
        hour: currentHour,
        method: result.debug?.method
      } : undefined
    });
  } catch (error) {
    console.error("❌ Location check error:", error);
    console.error("   Stack:", error.stack);
    
    // ✅ CRITICAL: Return 200 with fallback (not 500)
    res.status(200).json({
      success: true,
      theme: "dark",
      otpMethod: "sms",
      location: {
        state: "Unknown",
        city: "Unknown",
        country: "IN",
        timezone: "Asia/Kolkata",
      },
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});
// ✅ OTP ROUTES
router.post("/send-email-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expirationTime = Date.now() + 5 * 60 * 1000;

    // Store OTP (use Redis in production)
    global.otpStore = global.otpStore || new Map();
    global.otpStore.set(email, {
      otp: otpCode,
      expiresAt: expirationTime,
      attempts: 0,
      method: "email",
    });

    console.log("📧 Email OTP generated:", otpCode);

    const response = {
      success: true,
      message: "OTP sent to email",
      expiresIn: 300,
    };

    if (process.env.NODE_ENV === "development") {
      response.debug = { otp: otpCode };
    }

    res.json(response);
  } catch (error) {
    console.error("❌ Email OTP send failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send OTP",
    });
  }
});

router.post("/send-sms-otp", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format",
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expirationTime = Date.now() + 5 * 60 * 1000;

    global.otpStore = global.otpStore || new Map();
    global.otpStore.set(phoneNumber, {
      otp: otpCode,
      expiresAt: expirationTime,
      attempts: 0,
      method: "sms",
    });

    console.log("📱 SMS OTP generated:", otpCode);

    const response = {
      success: true,
      message: "OTP sent to phone",
      expiresIn: 300,
    };

    if (process.env.NODE_ENV === "development") {
      response.debug = { otp: otpCode };
    }

    res.json(response);
  } catch (error) {
    console.error("❌ SMS OTP send failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send OTP",
    });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { contact, otp } = req.body;

    if (!contact || !otp) {
      return res.status(400).json({
        success: false,
        error: "Contact and OTP are required",
      });
    }

    global.otpStore = global.otpStore || new Map();
    const storedOtpData = global.otpStore.get(contact);

    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        error: "No OTP found. Please request a new one.",
      });
    }

    if (Date.now() > storedOtpData.expiresAt) {
      global.otpStore.delete(contact);
      return res.status(400).json({
        success: false,
        error: "OTP expired. Please request a new one.",
      });
    }

    if (storedOtpData.attempts >= 3) {
      global.otpStore.delete(contact);
      return res.status(429).json({
        success: false,
        error: "Too many attempts. Please request a new OTP.",
      });
    }

    if (storedOtpData.otp !== otp) {
      storedOtpData.attempts += 1;
      global.otpStore.set(contact, storedOtpData);

      const remainingAttempts = 3 - storedOtpData.attempts;

      return res.status(400).json({
        success: false,
        error: `Invalid OTP. ${remainingAttempts} attempt${
          remainingAttempts !== 1 ? "s" : ""
        } remaining.`,
      });
    }

    console.log("✅ OTP verified successfully for:", contact);
    global.otpStore.delete(contact);

    res.json({
      success: true,
      message: "OTP verified successfully",
      contact,
      method: storedOtpData.method,
    });
  } catch (error) {
    console.error("❌ OTP verification failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify OTP",
    });
  }
});
// ADD THIS NEW ROUTE (after your existing routes)
router.post("/otp-login", async (req, res) => {
  try {
    const { contact, contactType } = req.body;

    console.log("🔐 OTP Login request:", { contact, contactType });

    if (!contact || !contactType) {
      return res.status(400).json({
        success: false,
        error: "Contact and contact type required",
      });
    }

    // Import User model (use your existing import)
    const User = (await import("../Modals/User.js")).default;

    // Find or create user
    let user;

    if (contactType === "email") {
      // Email login - find or create by email
      user = await User.findOne({ email: contact });

      if (!user) {
        console.log("📝 Creating new user with email:", contact);
        const username = contact.split("@")[0];

        user = await User.create({
          email: contact,
          name: username,
          channelname: `${username}_${Date.now()}`,
          image: "https://github.com/shadcn.png",
          joinedon: new Date(),
          currentPlan: "FREE",
          watchTimeLimit: 5,
          isApproved: false, // ⚠️ Requires admin approval
          approvalStatus: "pending",
        });

        console.log("✅ New user created:", user._id);
      } else {
        console.log("✅ Existing user found:", user._id);
      }
    } else {
      // SMS login - find by phone or email with phone pattern
      const phonePattern = `${contact}@phone.user`;
      user = await User.findOne({
        $or: [{ email: phonePattern }, { email: contact }],
      });

      if (!user) {
        console.log("📝 Creating new user with phone:", contact);
        user = await User.create({
          email: `${contact}@phone.user`,
          name: `User_${contact.substring(0, 4)}`,
          channelname: `User_${Date.now()}`,
          image: "https://github.com/shadcn.png",
          joinedon: new Date(),
          currentPlan: "FREE",
          watchTimeLimit: 5,
          isApproved: false, // ⚠️ Requires admin approval
          approvalStatus: "pending",
        });

        console.log("✅ New user created:", user._id);
      } else {
        console.log("✅ Existing user found:", user._id);
      }
    }

    // Generate JWT token using your existing function
    const jwt = (await import("jsonwebtoken")).default;
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    console.log("✅ OTP Login successful");

    // Update last login time
    user.lastLoginTime = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        channelname: user.channelname,
        image: user.image,
        currentPlan: user.currentPlan,
        watchTimeLimit: user.watchTimeLimit,
        isApproved: user.isApproved,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    console.error("❌ OTP Login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
      details: error.message,
    });
  }
});
// ✅ DEBUG: Check current theme logic
router.get("/debug-theme", async (req, res) => {
  try {
    const ip =
      req.ip ||
      req.connection?.remoteAddress ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      "127.0.0.1";

    const moment = (await import("moment-timezone")).default;
    const currentMoment = moment().tz("Asia/Kolkata");

    const { state, theme, otpMethod } = determineThemeAndOtpMethod(ip);

    res.json({
      success: true,
      debug: {
        serverTime: currentMoment.format("YYYY-MM-DD HH:mm:ss Z"),
        hour: currentMoment.hour(),
        minute: currentMoment.minute(),
        isMorningTime: currentMoment.hour() >= 10 && currentMoment.hour() < 12,
        detectedState: state,
        determinedTheme: theme,
        otpMethod: otpMethod,
        ip: ip,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
