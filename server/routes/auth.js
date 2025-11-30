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
import { fileURLToPath } from 'url';
import { locationMiddleware } from '../middleware/detectLocation.js';
import { uploadChannelImage, deleteFromCloudinary } from '../config/cloudinary.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ JWT Secret Handler
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('❌ JWT_SECRET not loaded!');
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
};

console.log('🔐 Auth routes loaded');
console.log('🔐 JWT_SECRET will be read at runtime');

// ==================== MULTER & CLOUDINARY SETUP ====================
const uploadsDir = path.join(__dirname, '..', 'uploads', 'channel-images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
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
    
    `${channelName} brings you the best of entertainment and education. From thrilling adventures to tech reviews, we've got something for everyone. Subscribe and never miss an update!`
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

// 🌍 Determine Theme and OTP Method based on Geo-location
const determineThemeAndOtpMethod = (ip) => {
  try {
    const geo = geoip.lookup(ip) || { country: "IN", region: "TN" };
    const state = geo.region || "Unknown";
    const city = geo.city || "Unknown";
    let theme = "dark";
    let otpMethod = "sms";

    const southernStates = [
      "Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana",
      "TN", "KL", "KA", "AP", "TS"
    ];

    const isSouthIndia = southernStates.some((s) =>
      state.toLowerCase().includes(s.toLowerCase())
    );

    const currentTime = moment().tz("Asia/Kolkata");
    const hour = currentTime.hour();

    if (isSouthIndia) otpMethod = "email";
    if (isSouthIndia && hour >= 10 && hour < 12) theme = "light";

    console.log("🎨 Fallback Theme:", theme, "| OTP:", otpMethod, "| State:", state);
    return { 
      state, 
      city,
      theme, 
      otpMethod, 
      country: geo.country || "IN",
      timezone: geo.timezone || "Asia/Kolkata"
    };
  } catch (error) {
    console.error("⚠️ Theme determination error:", error);
    return { 
      state: "Unknown",
      city: "Unknown", 
      theme: "dark", 
      otpMethod: "email",
      country: "IN",
      timezone: "Asia/Kolkata"
    };
  }
};

// 🔑 Extract Cloudinary Public ID from URL
const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split('/upload/');
  if (parts.length > 1) {
    const afterUpload = parts[1].split('/').slice(1).join('/');
    return afterUpload.replace(/\.[^/.]+$/, '');
  }
  return null;
};
// ==================== MIDDLEWARE ====================

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: "No token provided" 
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    const JWT_SECRET = getJWTSecret();
    console.log("🔑 Verifying token...");
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ Token verified for user:", decoded.id);
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    return res.status(401).json({ 
      success: false, 
      message: "Invalid or expired token" 
    });
  }
};
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
        message: "Email is required" 
      });
    }

    console.log("📝 Login request for:", email);

    // ✅ USE LOCATION FROM MIDDLEWARE (with fallback)
    let locationData = req.userLocation;
    
    // Fallback if middleware didn't provide complete data
    if (!locationData || !locationData.state) {
      console.log("⚠️ Location middleware incomplete, using fallback");
      const ip = req.ip || 
                 req.connection?.remoteAddress || 
                 req.headers['x-forwarded-for']?.split(',')[0] || 
                 "127.0.0.1";
      locationData = determineThemeAndOtpMethod(ip);
    }

    const { state, city, theme, otpMethod, country, timezone } = locationData;

    console.log('🌍 Using detected location:', {
      state,
      city,
      theme,
      otpMethod,
      method: locationData.method || 'fallback'
    });

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      console.log("🆕 Creating new user");
      
      const channelName = name || email.split('@')[0];
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
        lastLoginTime: new Date()
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
      if (image && !user.image?.includes('cloudinary.com') && !user.image?.startsWith('/uploads/')) {
        if (user.image !== image) {
          console.log('📸 Updating profile image (not a custom upload)');
          user.image = image;
          updated = true;
        }
      } else {
        console.log('✅ Preserving custom uploaded image:', user.image);
      }
      
      // ✅ ADD DESCRIPTION IF MISSING
      if (!user.description || user.description.trim() === '') {
        user.description = generateChannelDescription(user.channelname || user.name);
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
      
      console.log('📸 User image after login:', user.image);
      console.log('🖼️ User banner after login:', user.bannerImage);
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
        timezone
      }
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    console.error("Stack:", error.stack);
    
    res.status(500).json({ 
      success: false,
      message: "Something went wrong during login",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
});
// ==================== UPDATE ROUTE ====================

router.patch("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid user ID format" 
      });
    }
    
    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      id, 
      { $set: updateData }, 
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    res.status(200).json({
      success: true,
      result: updatedUser
    });
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(500).json({ 
      success: false,
      message: "Update failed",
      error: error.message 
    });
  }
});

// ==================== USER/CHANNEL ROUTES ====================

router.get("/all", async (req, res) => {
  try {
    const users = await User.find()
      .select("_id email name channelname description image bannerImage currentPlan joinedon subscribers")
      .sort({ joinedon: -1 })
      .limit(100);

    res.json({
      success: true,
      users: users,
      count: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/channel/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format"
      });
    }

    const user = await User.findById(id)
      .select("_id email name channelname description image bannerImage joinedon currentPlan subscribers");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Channel not found"
      });
    }

    console.log('📦 Sending channel data:', {
      id: user._id,
      image: user.image,
      bannerImage: user.bannerImage
    });

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format"
      });
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    res.status(200).json({
      success: true,
      result: user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});
// ==================== IMAGE UPLOAD ROUTES ====================

// ✅ MAIN IMAGE UPLOAD ROUTE WITH CLOUDINARY
router.post("/channel/:channelId/upload-image", 
  verifyToken, 
  upload.single('image'), 
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
        cloudinaryUrl: req.file?.path
      });

      // Authorization check
      if (userId !== channelId) {
        console.error('❌ Unauthorized upload attempt');
        
        // Delete uploaded Cloudinary file
        if (req.file?.filename) {
          try {
            await deleteFromCloudinary(req.file.filename, 'image');
          } catch (err) {
            console.error('⚠️ Cloudinary cleanup failed:', err);
          }
        }
        
        return res.status(403).json({ 
          success: false, 
          message: "You can only upload images to your own channel" 
        });
      }

      if (!req.file) {
        console.error('❌ No file uploaded');
        return res.status(400).json({ 
          success: false, 
          message: "No image file provided" 
        });
      }

      const user = await User.findById(channelId);
      if (!user) {
        // Delete uploaded Cloudinary file if user not found
        if (req.file?.filename) {
          try {
            await deleteFromCloudinary(req.file.filename, 'image');
          } catch (err) {
            console.error('⚠️ Cloudinary cleanup failed:', err);
          }
        }
        
        console.error('❌ User not found');
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      const imageUrl = req.file.path; // Cloudinary URL
      const publicId = req.file.filename; // Cloudinary public ID

      console.log('📸 Cloudinary image uploaded:', imageUrl);
      console.log('🔑 Public ID:', publicId);

      // Delete old Cloudinary image if exists
      if (imageType === 'banner' && user.bannerImage) {
        if (user.bannerImage.includes('cloudinary.com')) {
          try {
            const oldPublicId = extractPublicId(user.bannerImage);
            if (oldPublicId) {
              await deleteFromCloudinary(oldPublicId, 'image');
              console.log('🗑️ Deleted old banner from Cloudinary');
            }
          } catch (err) {
            console.error('⚠️ Could not delete old banner:', err);
          }
        } else if (user.bannerImage.startsWith('/uploads/')) {
          // Delete local file if exists
          const oldPath = path.join(__dirname, '..', user.bannerImage);
          if (fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
              console.log('🗑️ Deleted old local banner');
            } catch (err) {
              console.error('⚠️ Could not delete local banner:', err);
            }
          }
        }
      } else if (imageType === 'profile' && user.image) {
        if (user.image.includes('cloudinary.com')) {
          try {
            const oldPublicId = extractPublicId(user.image);
            if (oldPublicId) {
              await deleteFromCloudinary(oldPublicId, 'image');
              console.log('🗑️ Deleted old profile image from Cloudinary');
            }
          } catch (err) {
            console.error('⚠️ Could not delete old profile:', err);
          }
        } else if (user.image.startsWith('/uploads/')) {
          // Delete local file if exists
          const oldPath = path.join(__dirname, '..', user.image);
          if (fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
              console.log('🗑️ Deleted old local profile image');
            } catch (err) {
              console.error('⚠️ Could not delete local profile:', err);
            }
          }
        }
      }

      // Update user with new Cloudinary image
      if (imageType === 'banner') {
        user.bannerImage = imageUrl;
      } else if (imageType === 'profile') {
        user.image = imageUrl;
      } else {
        // Clean up uploaded file
        if (req.file?.filename) {
          try {
            await deleteFromCloudinary(req.file.filename, 'image');
          } catch (err) {
            console.error('⚠️ Cleanup failed:', err);
          }
        }
        
        return res.status(400).json({ 
          success: false, 
          message: "Invalid imageType. Must be 'profile' or 'banner'" 
        });
      }

      await user.save();

      console.log(`✅ ${imageType} image uploaded successfully:`, imageUrl);
      console.log('✅ Updated user:', { 
        id: user._id, 
        image: user.image, 
        bannerImage: user.bannerImage 
      });

      res.json({
        success: true,
        message: `${imageType} image uploaded successfully`,
        imageUrl: imageUrl,
        publicId: publicId,
        user: {
          _id: user._id,
          image: user.image,
          bannerImage: user.bannerImage
        }
      });

    } catch (error) {
      console.error("❌ Upload error:", error);
      
      // Clean up Cloudinary file on error
      if (req.file?.filename) {
        try {
          await deleteFromCloudinary(req.file.filename, 'image');
          console.log('🗑️ Cleaned up Cloudinary file after error');
        } catch (cleanupErr) {
          console.error('⚠️ Cloudinary cleanup failed:', cleanupErr);
        }
      }

      res.status(500).json({
        success: false,
        message: "Image upload failed",
        error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
      });
    }
});

// ✅ UPDATE PROFILE WITH AVATAR (Alternative endpoint)
router.put("/update-profile", 
  verifyToken, 
  upload.single("avatar"), 
  async (req, res) => {
    try {
      const userId = req.user.id;
      const updateData = { ...req.body };

      console.log('📝 Profile update request for user:', userId);

      // If new avatar uploaded to Cloudinary
      if (req.file) {
        const oldUser = await User.findById(userId);
        
        // Delete old avatar from Cloudinary if it exists
        if (oldUser.image && oldUser.image.includes('cloudinary.com')) {
          try {
            const publicId = extractPublicId(oldUser.image);
            if (publicId) {
              await deleteFromCloudinary(publicId, 'image');
              console.log('🗑️ Old avatar deleted from Cloudinary');
            }
          } catch (error) {
            console.error('⚠️ Failed to delete old avatar:', error);
          }
        }

        updateData.image = req.file.path; // Cloudinary URL
        console.log('✅ New avatar uploaded:', req.file.path);
      }

      // Remove sensitive fields that shouldn't be updated directly
      delete updateData.password;
      delete updateData.email; // Email should be updated separately with verification

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select("-password");

      if (!updatedUser) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      console.log('✅ Profile updated for:', updatedUser.name);

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("❌ Profile update error:", error);
      
      // Clean up on error
      if (req.file?.filename) {
        try {
          await deleteFromCloudinary(req.file.filename, 'image');
        } catch (err) {
          console.error('⚠️ Cleanup failed:', err);
        }
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Profile update failed", 
        error: error.message 
      });
    }
});

// ✅ UPLOAD AVATAR (Alternative endpoint)
router.post("/upload-avatar", 
  verifyToken, 
  upload.single("avatar"), 
  async (req, res) => {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: "No avatar file provided" 
        });
      }

      const avatarUrl = req.file.path; // Cloudinary URL
      const publicId = req.file.filename; // Cloudinary public ID

      // Update user's avatar
      const user = await User.findById(userId);
      
      // Delete old avatar if exists
      if (user.image && user.image.includes('cloudinary.com')) {
        try {
          const oldPublicId = extractPublicId(user.image);
          if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId, 'image');
            console.log('🗑️ Old avatar deleted from Cloudinary');
          }
        } catch (error) {
          console.error('⚠️ Failed to delete old avatar:', error);
        }
      }

      user.image = avatarUrl;
      await user.save();

      console.log('✅ Avatar uploaded for:', user.name);

      res.status(200).json({
        success: true,
        message: "Avatar uploaded successfully",
        avatar: avatarUrl,
        publicId: publicId
      });
    } catch (error) {
      console.error("❌ Avatar upload error:", error);
      
      // Clean up on error
      if (req.file?.filename) {
        try {
          await deleteFromCloudinary(req.file.filename, 'image');
        } catch (err) {
          console.error('⚠️ Cleanup failed:', err);
        }
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Avatar upload failed", 
        error: error.message 
      });
    }
});

// ✅ GET USER PROFILE
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    res.status(200).json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch profile", 
      error: error.message 
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
        message: "User not found" 
      });
    }

    res.status(200).json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error("❌ Get user error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch user", 
      error: error.message 
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
        message: "Invalid channel ID" 
      });
    }

    if (userId === channelId) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot subscribe to own channel" 
      });
    }

    const [user, channel] = await Promise.all([
      User.findById(userId),
      User.findById(channelId)
    ]);

    if (!user || !channel) {
      return res.status(404).json({ 
        success: false, 
        message: "User or channel not found" 
      });
    }

    const isAlreadySubscribed = user.subscribedChannels.some(
      id => id.toString() === channelId
    );

    if (isAlreadySubscribed) {
      return res.status(400).json({ 
        success: false, 
        message: "Already subscribed" 
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
      subscriberCount: channel.subscribers
    });

  } catch (error) {
    console.error("❌ Subscribe error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
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
        message: "Invalid channel ID" 
      });
    }

    const [user, channel] = await Promise.all([
      User.findById(userId),
      User.findById(channelId)
    ]);

    if (!user || !channel) {
      return res.status(404).json({ 
        success: false, 
        message: "User or channel not found" 
      });
    }

    const subscriptionIndex = user.subscribedChannels.findIndex(
      id => id.toString() === channelId
    );

    if (subscriptionIndex === -1) {
      return res.status(400).json({ 
        success: false, 
        message: "Not subscribed" 
      });
    }

    user.subscribedChannels.splice(subscriptionIndex, 1);
    channel.subscribers = Math.max(0, (channel.subscribers || 1) - 1);

    await Promise.all([user.save(), channel.save()]);

    console.log("✅ Unsubscribed successfully! New count:", channel.subscribers);

    res.json({
      success: true,
      message: "Unsubscribed successfully",
      isSubscribed: false,
      subscriberCount: channel.subscribers
    });

  } catch (error) {
    console.error("❌ Unsubscribe error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
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
        message: "Invalid channel ID" 
      });
    }

    const [user, channel] = await Promise.all([
      User.findById(userId),
      User.findById(channelId)
    ]);

    if (!user || !channel) {
      return res.status(404).json({ 
        success: false, 
        message: "User or channel not found" 
      });
    }

    const isSubscribed = user.subscribedChannels.some(
      id => id.toString() === channelId
    );

    res.json({
      success: true,
      isSubscribed,
      subscriberCount: channel.subscribers || 0
    });

  } catch (error) {
    console.error("❌ Status check error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.get("/subscribed-channels", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate('subscribedChannels', 'name channelname image bannerImage subscribers');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    res.json({
      success: true,
      channels: user.subscribedChannels || []
    });

  } catch (error) {
    console.error("❌ Get subscribed channels error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
// ==================== DEBUG & UTILITY ROUTES ====================

// ✅ DEBUG ROUTE (remove in production)
router.get("/debug/uploads", async (req, res) => {
  try {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'channel-images');
    
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
      note: "Local uploads deprecated - using Cloudinary"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ✅ FIX AVATAR UTILITY ROUTE
router.post('/fix-my-avatar', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('🔧 Fixing avatar for user:', userId);
    
    // Get user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    let needsUpdate = false;
    let message = 'Avatar is valid';
    
    // Check if it's a local file path
    if (user.image && user.image.startsWith('/uploads/')) {
      const currentAvatarPath = path.join(__dirname, '..', user.image);
      const fileExists = fs.existsSync(currentAvatarPath);
      
      console.log('Current avatar:', user.image);
      console.log('File exists?', fileExists);
      
      if (!fileExists) {
        console.log('⚠️ Avatar file missing, resetting to default');
        user.image = 'https://github.com/shadcn.png';
        needsUpdate = true;
        message = 'Avatar file was missing. Reset to default. Please upload a new one.';
      }
    }
    
    // Check banner image too
    if (user.bannerImage && user.bannerImage.startsWith('/uploads/')) {
      const bannerPath = path.join(__dirname, '..', user.bannerImage);
      if (!fs.existsSync(bannerPath)) {
        console.log('⚠️ Banner file missing, removing reference');
        user.bannerImage = null;
        needsUpdate = true;
        message += ' Banner file was also missing and has been reset.';
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
        bannerImage: user.bannerImage
      }
    });
    
  } catch (error) {
    console.error('❌ Fix avatar error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ✅ HEALTH CHECK ROUTE
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working",
    timestamp: new Date().toISOString(),
    cloudinaryEnabled: true
  });
});

export default router;
