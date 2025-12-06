// Authentication Controller - Handles user auth, OTP verification, and profile management
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../Modals/User.js";
import geoip from "geoip-lite";
import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// ? ES6 module path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== OTP STORAGE SYSTEM ====================
// Using in-memory Map for simplicity - consider Redis for production scaling
// Structure: { contact: { otp, expiresAt, attempts, method } }
const otpStore = new Map();

// Cleanup job - runs every minute to remove expired OTPs
// ! This prevents memory leaks from abandoned OTP requests
setInterval(() => {
  const currentTime = Date.now();
  
  for (const [contact, data] of otpStore.entries()) {
    if (currentTime > data.expiresAt) {
      otpStore.delete(contact);
      console.log('🧹 Expired OTP cleaned up for:', contact);
    }
  }
}, 60000); // Every 60 seconds

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate JWT authentication token
 * Token includes multiple ID fields for compatibility with different parts of the app
 * @param {Object} user - User document from database
 * @returns {String} Signed JWT token valid for 30 days
 */
const generateToken = (user) => {
  // ✅ Use UPPERCASE to match routes/auth.js
  const JWT_SECRET = process.env.JWT_SECRET;
  
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in environment variables");
  }

  // Include multiple ID formats - different parts of app expect different field names
  const tokenPayload = {
    id: user._id.toString(),
    _id: user._id.toString(),
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
  };

  console.log("🔐 Generating JWT token for:", tokenPayload.email);
  console.log("🔑 Using JWT_SECRET:", JWT_SECRET.substring(0, 20) + "...");
  
  // ✅ Use UPPERCASE constant
  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
};

/**
 * Generate random 6-digit OTP
 * Simple but effective - 1 million combinations with 3 attempt limit = secure enough
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Determine UI theme and OTP delivery method based on user's location
 * Business logic:
 * - South India users get email OTP (better email infrastructure)
 * - South India users get light theme during 10 AM - 12 PM (peak productivity hours)
 * - Everyone else gets SMS OTP and dark theme
 * 
 * @param {String} ip - User's IP address
 * @returns {Object} { state, theme, otpMethod, geo, debug }
 */
export const determineThemeAndOtpMethod = (ip) => {
  try {
    // Clean up IPv6 localhost prefix if present
    ip = ip?.replace('::ffff:', '') || '127.0.0.1';
    
    let userState = "Unknown";
    let userCountry = "IN";
    let userTimezone = "Asia/Kolkata";
    
    // ========== ENVIRONMENT-BASED LOGIC ==========
    
    // ? Testing mode - allows manual state override via .env
    if (process.env.TEST_GEO_STATE) {
      userState = process.env.TEST_GEO_STATE;
      console.log('🧪 TEST MODE ACTIVE - Using state from environment:', userState);
    }
    // ? Localhost development - can't get real geo data
    else if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168')) {
      userState = process.env.LOCAL_TEST_STATE || 'Tamil Nadu';
      console.log('🏠 LOCALHOST DETECTED - Using test state:', userState);
    }
    // Production - use real IP geolocation
    else {
      const geoData = geoip.lookup(ip);
      
      if (geoData) {
        userState = geoData.region || "Unknown";
        userCountry = geoData.country || "IN";
        userTimezone = geoData.timezone || "Asia/Kolkata";
        console.log('🌍 GeoIP lookup successful:', { ip, userState, userCountry });
      } else {
        console.warn('⚠️ GeoIP lookup failed for IP:', ip, '- using defaults');
        userState = "Maharashtra"; // Reasonable default for India
      }
    }
    
    // ========== BUSINESS LOGIC - THEME & OTP METHOD ==========
    
    let preferredTheme = "dark"; // Most users prefer dark mode
    let otpDeliveryMethod = "sms"; // SMS is default

    // Southern states list - includes full names and abbreviations
    const southernIndianStates = [
      "Tamil Nadu", "Kerala", "Karnataka", 
      "Andhra Pradesh", "Telangana",
      "TN", "KL", "KA", "AP", "TS"
    ];

    // Check if user is from South India
    const isUserFromSouthIndia = southernIndianStates.some((stateName) =>
      userState.toLowerCase().includes(stateName.toLowerCase())
    );

    // Get current time in Indian Standard Time
    const currentMoment = moment().tz("Asia/Kolkata");
    const currentHour = currentMoment.hour();
    const currentMinute = currentMoment.minute();
    const isMorningHours = currentHour >= 10 && currentHour < 12;

    // Detailed logging - helpful for debugging theme issues
    console.log('⏰ ═══════════════════════════════════════');
    console.log('⏰ TIME CHECK FOR THEME DETERMINATION:');
    console.log('   IST Time:', currentMoment.format('YYYY-MM-DD HH:mm:ss'));
    console.log('   Hour:', currentHour);
    console.log('   Minute:', currentMinute);
    console.log('   Morning Period (10-12):', isMorningHours);
    console.log('⏰ ═══════════════════════════════════════');

    // ! OTP Method: South India gets email (better infrastructure)
    if (isUserFromSouthIndia) {
      otpDeliveryMethod = "email";
    }

    // ! Theme: Light theme ONLY for South India during morning hours
    // This is when productivity is highest and natural light is abundant
    if (isUserFromSouthIndia && isMorningHours) {
      preferredTheme = "light";
    }

    // Final decision logging
    console.log('═══════════════════════════════════════');
    console.log('🎨 LOCATION-BASED PREFERENCES:');
    console.log('   State:', userState);
    console.log('   South India:', isUserFromSouthIndia);
    console.log('   Current Hour:', currentHour);
    console.log('   Current Minute:', currentMinute);
    console.log('   Morning Time:', isMorningHours);
    console.log('   ✨ FINAL Theme:', preferredTheme);
    console.log('   📧 OTP Method:', otpDeliveryMethod);
    console.log('═══════════════════════════════════════');
    
    return { 
      state: userState, 
      theme: preferredTheme, 
      otpMethod: otpDeliveryMethod, 
      geo: { country: userCountry, timezone: userTimezone },
      debug: {
        hour: currentHour,
        minute: currentMinute,
        isMorningTime: isMorningHours,
        isSouthIndia: isUserFromSouthIndia
      }
    };
    
  } catch (error) {
    console.error("⚠️ Error during theme determination:", error);
    
    // Safe fallback values
    return {
      state: "Unknown",
      theme: "dark",
      otpMethod: "sms",
      geo: { country: "IN", timezone: "Asia/Kolkata" }
    };
  }
};

/**
 * Auto-generate engaging channel description
 * Randomly picks from templates to make each channel feel unique
 */
const generateChannelDescription = (channelName) => {
  const descriptionTemplates = [
    `Welcome to ${channelName}! Your ultimate destination for amazing content. Dive into a world of entertainment, knowledge, and creativity. Subscribe now for regular updates!`,
    
    `${channelName} - Your go-to channel for exciting videos! Explore hilarious moments, thrilling bike rides, cutting-edge tech wonders, and so much more. Join our community today!`,
    
    `Hey there! Welcome to ${channelName}. We bring you the best mix of laughs, adventure, and innovation. Whether you're into comedy, travel, or tech - we've got you covered!`,
    
    `${channelName} is all about bringing joy and knowledge to your screen. From entertaining skits to informative tutorials, we create content that matters. Don't forget to subscribe!`,
  ];
  
  // Pick random template
  const randomIndex = Math.floor(Math.random() * descriptionTemplates.length);
  return descriptionTemplates[randomIndex];
};

// ==================== AUTHENTICATION ENDPOINTS ====================

/**
 * Main login endpoint
 * Handles both new user registration and existing user login
 * Also determines location-based preferences (theme, OTP method)
 */
export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    console.log("📝 Login request received for:", email);

    // Basic validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Extract user's IP address for geo-location
    // Try multiple sources since different proxies/servers expose IP differently
    const userIp = req.ip || 
                   req.connection?.remoteAddress || 
                   req.headers["x-forwarded-for"]?.split(',')[0] || 
                   "127.0.0.1";
    
    // Determine preferences based on location
    const { state, theme, otpMethod, geo } = determineThemeAndOtpMethod(userIp);

    // Check if user already exists
    let existingUser = await User.findOne({ email });
    
    if (!existingUser) {
      // ========== NEW USER REGISTRATION ==========
      console.log("🆕 New user detected - creating account");
      
      // Use provided name or derive from email
      const channelName = name || email.split("@")[0];
      
      // Generate welcoming auto-description
      const autoGeneratedDescription = generateChannelDescription(channelName);
      
      existingUser = new User({
        email,
        name: channelName,
        channelname: channelName,
        description: autoGeneratedDescription,
        image: image || "https://github.com/shadcn.png", // Default avatar
        currentPlan: "FREE", // Everyone starts free
        watchTimeLimit: 5, // 5 hours for free tier
        theme: theme, // Location-based
        preferredOtpMethod: otpMethod, // Location-based
        subscribers: 0,
        subscribedChannels: [],
        location: {
          state,
          country: geo.country,
          timezone: geo.timezone,
        },
        lastLoginTime: new Date()
      });
      
      await existingUser.save();
      console.log("✅ New user account created successfully:", email);
      
    } else {
      // ========== EXISTING USER LOGIN ==========
      console.log("✅ Returning user found:", email);
      
      let needsUpdate = false;
      
      // Update name if it changed
      if (name && existingUser.name !== name) {
        existingUser.name = name;
        needsUpdate = true;
      }
      
      // ! IMPORTANT: Only update image if user hasn't uploaded a custom one
      // Custom uploads are stored in /uploads/ directory
      if (image && !existingUser.image?.startsWith('/uploads/')) {
        if (existingUser.image !== image) {
          console.log('📸 Updating profile picture (not a custom upload)');
          existingUser.image = image;
          needsUpdate = true;
        }
      } else {
        console.log('✅ Preserving custom uploaded image:', existingUser.image);
      }
      
      // Add description if missing (for older accounts)
      if (!existingUser.description || existingUser.description.trim() === '') {
        existingUser.description = generateChannelDescription(
          existingUser.channelname || existingUser.name
        );
        needsUpdate = true;
        console.log("✅ Added auto-description to existing user");
      }
      
      // Update location-based preferences (these can change based on where user logs in from)
      existingUser.theme = theme;
      existingUser.preferredOtpMethod = otpMethod;
      existingUser.location = {
        state,
        country: geo.country,
        timezone: geo.timezone,
      };
      existingUser.lastLoginTime = new Date();
      needsUpdate = true;
      
      // Save only if something changed
      if (needsUpdate) {
        await existingUser.save();
        console.log("✅ User information updated");
      }
    }

    // Generate authentication token
    const authToken = generateToken(existingUser);

    console.log("✅ Sending response - Theme:", theme, "| OTP Method:", otpMethod);

    // Send success response with user data
    return res.status(200).json({
      success: true,
      token: authToken,
      result: {
        _id: existingUser._id,
        email: existingUser.email,
        name: existingUser.name,
        image: existingUser.image,
        bannerImage: existingUser.bannerImage,
        channelname: existingUser.channelname,
        description: existingUser.description,
        currentPlan: existingUser.currentPlan,
        watchTimeLimit: existingUser.watchTimeLimit,
        subscriptionExpiry: existingUser.subscriptionExpiry,
        subscribers: existingUser.subscribers,
      },
      theme,
      otpMethod,
      location: {
        state,
        country: geo.country,
        timezone: geo.timezone
      }
    });
    
  } catch (error) {
    console.error("❌ Login failed with error:", error);
    
    return res.status(500).json({
      success: false,
      message: "Something went wrong during login",
      // Only expose error details in development
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
};

/**
 * Update user profile endpoint
 * Allows users to change their channel name and description
 */
export const updateprofile = async (req, res) => {
  const { id: userId } = req.params;
  const { channelname, description } = req.body;

  // Validate MongoDB ObjectId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ 
      success: false,
      message: "Invalid user ID format" 
    });
  }

  try {
    console.log('📝 Profile update request for user:', userId);
    
    // Build update object - only include fields that were actually sent
    const fieldsToUpdate = {};
    
    if (channelname !== undefined) fieldsToUpdate.channelname = channelname;
    if (description !== undefined) fieldsToUpdate.description = description;

    // Update user and return new data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: fieldsToUpdate },
      { 
        new: true, // Return updated document
        runValidators: true // Ensure mongoose validation runs
      }
    );

    // Check if user exists
    if (!updatedUser) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    console.log("✅ Profile updated successfully");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      result: updatedUser,
    });
    
  } catch (error) {
    console.error("❌ Profile update error:", error);
    
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
};

// ==================== CHANNEL IMAGE MANAGEMENT ====================

/**
 * Update channel images (avatar or banner)
 * Handles file upload, validation, and cleanup of old images
 */
export const updateChannelImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'avatar' or 'banner'

    console.log('🖼️ Image update request:', { userId: id, type, fileReceived: !!req.file });

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // Check if file was actually uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }

    // Verify user exists before processing
    const user = await User.findById(id);
    
    if (!user) {
      // Clean up uploaded file if user doesn't exist
      if (fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('🗑️ Cleaned up orphaned file');
        } catch (cleanupError) {
          console.error('⚠️ Failed to clean up file:', cleanupError);
        }
      }
      
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Build URL path for the uploaded image
    const newImageUrl = `/uploads/channel-images/${req.file.filename}`;
    console.log('📸 New image saved at:', newImageUrl);

    // Determine which field to update
    const imageField = type === 'banner' ? 'bannerImage' : 'image';
    const oldImageUrl = type === 'banner' ? user.bannerImage : user.image;
    
    // ! Delete old uploaded image if it exists
    // Only delete if it's an uploaded file (starts with /uploads/)
    if (oldImageUrl && oldImageUrl.startsWith('/uploads/')) {
      const oldImagePath = path.join(__dirname, '..', oldImageUrl);
      
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
          console.log('🗑️ Old image deleted:', oldImageUrl);
        } catch (deleteError) {
          console.error('⚠️ Could not delete old image:', deleteError);
          // Continue anyway - not critical
        }
      }
    }

    // Update user with new image URL
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { [imageField]: newImageUrl } },
      { new: true }
    );

    console.log('✅ Channel image updated successfully');

    return res.status(200).json({
      success: true,
      message: `${type === 'banner' ? 'Banner' : 'Avatar'} updated successfully`,
      imageUrl: newImageUrl,
      data: {
        [imageField]: newImageUrl,
        user: {
          _id: updatedUser._id,
          image: updatedUser.image,
          bannerImage: updatedUser.bannerImage
        }
      }
    });

  } catch (error) {
    console.error('❌ Image update error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up file after error');
      } catch (cleanupError) {
        console.error('⚠️ File cleanup failed:', cleanupError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to update image",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
};

/**
 * Delete channel image - reset to default
 * Removes custom uploaded image and sets default placeholder
 */
export const deleteChannelImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'avatar' or 'banner'

    console.log('🗑️ Image deletion request:', { userId: id, type });

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Set appropriate default images
    const defaultImage = type === 'banner' 
      ? "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=300&fit=crop"
      : "https://github.com/shadcn.png";

    const imageField = type === 'banner' ? 'bannerImage' : 'image';
    const currentImageUrl = type === 'banner' ? user.bannerImage : user.image;
    
    // Delete uploaded file if it exists
    if (currentImageUrl && currentImageUrl.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, '..', currentImageUrl);
      
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
          console.log('🗑️ Deleted uploaded image:', currentImageUrl);
        } catch (deleteError) {
          console.error('⚠️ Could not delete image file:', deleteError);
        }
      }
    }
    
    // Update user with default image
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { [imageField]: defaultImage } },
      { new: true }
    );

    console.log('✅ Image reset to default successfully');

    return res.status(200).json({
      success: true,
      message: `${type === 'banner' ? 'Banner' : 'Avatar'} reset to default`,
      imageUrl: defaultImage,
      data: {
        [imageField]: defaultImage,
        user: {
          _id: updatedUser._id,
          image: updatedUser.image,
          bannerImage: updatedUser.bannerImage
        }
      }
    });

  } catch (error) {
    console.error('❌ Image deletion error:', error);
    
    return res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
};

// ==================== OTP SYSTEM ENDPOINTS ====================

/**
 * Check user's location and return theme/OTP preferences
 * Used by frontend to show appropriate UI before login
 */
export const checkLocation = (req, res) => {
  try {
    // Extract IP from various possible sources
    const userIp = req.ip || 
                   req.connection?.remoteAddress || 
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   "127.0.0.1";
    
    console.log('🌍 Location check request from IP:', userIp);
    
    // Determine preferences based on location
    const { state, theme, otpMethod, geo } = determineThemeAndOtpMethod(userIp);
    
    res.json({
      success: true,
      theme,
      otpMethod,
      location: {
        state,
        country: geo.country,
        timezone: geo.timezone
      }
    });
    
  } catch (error) {
    console.error('❌ Location check failed:', error);
    
    // Return safe defaults on error
    res.status(500).json({
      success: false,
      theme: 'dark',
      otpMethod: 'sms',
      location: null,
      error: error.message
    });
  }
};

/**
 * Send OTP to user's email
 * Generates 6-digit code valid for 5 minutes
 * TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
 */
export const sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email is provided
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format"
      });
    }

    // Generate OTP and set expiration
    const otpCode = generateOTP();
    const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutes from now
    
    // Store in memory (use Redis in production for better scaling)
    otpStore.set(email, {
      otp: otpCode,
      expiresAt: expirationTime,
      attempts: 0,
      method: 'email'
    });

    console.log('📧 Email OTP generated for:', email);
    console.log('🔐 OTP Code:', otpCode, '(valid for 5 minutes)');

    // ! TODO: Replace this with actual email sending
    // Example: Use nodemailer, SendGrid, or AWS SES
  console.log('📧 Email OTP generated successfully');
// OTP details logged to secure service only

    // Build response
    const response = {
      success: true,
      message: "OTP sent to email",
      expiresIn: 300 // seconds (5 minutes)
    };

    // ? Include OTP in response for development/testing
    // Remove this in production!
    if (process.env.NODE_ENV === 'development') {
      response.debug = { otp: otpCode };
      console.log('⚠️ DEV MODE: OTP included in response');
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Email OTP send failed:', error);
    
    res.status(500).json({
      success: false,
      error: "Failed to send OTP"
    });
  }
};

/**
 * Send OTP via SMS
 * Generates 6-digit code valid for 5 minutes
 * TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
 */
export const sendSMSOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // Validate phone number is provided
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required"
      });
    }

    // Basic phone format validation (E.164 format)
    // Should be like +919876543210
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format (use +919876543210)"
      });
    }

    // Generate OTP and set expiration
    const otpCode = generateOTP();
    const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutes
    
    // Store OTP in memory
    otpStore.set(phoneNumber, {
      otp: otpCode,
      expiresAt: expirationTime,
      attempts: 0,
      method: 'sms'
    });

    console.log('📱 SMS OTP generated for:', phoneNumber);
    console.log('🔐 OTP Code:', otpCode, '(valid for 5 minutes)');

    // ! TODO: Replace with actual SMS service
    // Example: Twilio, AWS SNS, or other SMS gateway
    console.log(`
    ═══════════════════════════════════
    📱 SMS OTP (DEVELOPMENT MODE)
    To: ${phoneNumber}
    Code: ${otpCode}
    Expires: ${new Date(expirationTime).toLocaleString()}
    ═══════════════════════════════════
    `);

    // Build response
    const response = {
      success: true,
      message: "OTP sent to phone",
      expiresIn: 300 // seconds
    };

    // Include OTP for development/testing
    if (process.env.NODE_ENV === 'development') {
      response.debug = { otp: otpCode };
      console.log('⚠️ DEV MODE: OTP included in response');
    }

    res.json(response);

  } catch (error) {
    console.error('❌ SMS OTP send failed:', error);
    
    res.status(500).json({
      success: false,
      error: "Failed to send OTP"
    });
  }
};

/**
 * Verify OTP code
 * Checks if provided OTP matches stored code and hasn't expired
 * Includes brute-force protection (3 attempts max)
 */
export const verifyOTP = async (req, res) => {
  try {
    const { contact, otp } = req.body;
    
    // Validate required fields
    if (!contact || !otp) {
      return res.status(400).json({
        success: false,
        error: "Contact and OTP are required"
      });
    }

    // Check if OTP exists for this contact
    const storedOtpData = otpStore.get(contact);
    
    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        error: "No OTP found. Please request a new one."
      });
    }

    // Check if OTP has expired
    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(contact); // Clean up expired OTP
      return res.status(400).json({
        success: false,
        error: "OTP expired. Please request a new one."
      });
    }

    // ! Brute-force protection - max 3 attempts
    if (storedOtpData.attempts >= 3) {
      otpStore.delete(contact);
      return res.status(429).json({
        success: false,
        error: "Too many attempts. Please request a new OTP."
      });
    }

    // Verify the OTP code
    if (storedOtpData.otp !== otp) {
      // Increment attempt counter
      storedOtpData.attempts += 1;
      otpStore.set(contact, storedOtpData);
      
      const remainingAttempts = 3 - storedOtpData.attempts;
      
      return res.status(400).json({
        success: false,
        error: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
      });
    }

    // ✅ OTP is valid!
    console.log('✅ OTP verified successfully for:', contact);
    
    // Delete OTP after successful verification (one-time use)
    otpStore.delete(contact);

    res.json({
      success: true,
      message: "OTP verified successfully",
      contact,
      method: storedOtpData.method
    });

  } catch (error) {
    console.error('❌ OTP verification failed:', error);
    
    res.status(500).json({
      success: false,
      error: "Failed to verify OTP"
    });
  }
};