import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../Modals/User.js";
import geoip from "geoip-lite";
import moment from "moment-timezone";

/**
 * Creates a JWT token for authenticated users
 * Using a 30-day expiration to balance security with user convenience
 */
const generateToken = (user) => {
  // Fallback secret for dev environments - should use env variable in production
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET must be set in environment variables");
  }
  const tokenPayload = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };

  console.log("🔐 Generating authentication token for:", tokenPayload.email);

  // 30 days should be enough for most users without requiring frequent re-auth
  return jwt.sign(tokenPayload, jwtSecret, { expiresIn: "30d" });
};

/**
 * Determines user preferences based on geographic location
 * South Indian users get email OTP (better infrastructure)
 * Light theme shows during morning hours (10 AM - 12 PM) for south Indian users
 */
const determineThemeAndOtpMethod = (ipAddress) => {
  const geoData = geoip.lookup(ipAddress);
  let userState = null;
  let preferredTheme = "dark"; // Dark theme as default - easier on the eyes
  let otpDeliveryMethod = "sms";

  console.log("🌍 Checking location for IP:", ipAddress);
  if (geoData) {
    console.log("📍 Location data:", geoData);
  }

  // Southern states have better email infrastructure, so we prefer email OTP there
  const southernStatesInIndia = [
    "Tamil Nadu",
    "Kerala",
    "Karnataka",
    "Andhra Pradesh",
    "Telangana",
    "TN",
    "KL",
    "KA",
    "AP",
    "TS", // Short codes too
  ];

  // Only apply regional preferences for Indian users
  if (geoData && geoData.country === "IN") {
    userState = geoData.region;

    // Check if user is from southern India
    const isFromSouthIndia = southernStatesInIndia.some((stateName) => {
      const stateMatch =
        userState.toLowerCase().includes(stateName.toLowerCase()) ||
        stateName.toLowerCase().includes(userState.toLowerCase());
      return stateMatch;
    });

    console.log("📍 User state:", userState);
    console.log("🗺️ South India region detected:", isFromSouthIndia);

    if (isFromSouthIndia) {
      otpDeliveryMethod = "email"; // Email works better in southern states
    }

    // Check time of day for theme preference
    const currentMoment = moment().tz("Asia/Kolkata");
    const currentHour = currentMoment.hour();

    console.log("🕐 Current time in IST:", currentHour + ":00");

    // Light theme during morning hours for south Indian users (10 AM to noon)
    // People are more active during these hours and prefer lighter screens
    if (isFromSouthIndia && currentHour >= 10 && currentHour < 12) {
      preferredTheme = "light";
      console.log("☀️ Morning time detected - switching to light theme");
    }
  }

  console.log(
    "✅ User preferences determined - Theme:",
    preferredTheme,
    "| OTP:",
    otpDeliveryMethod
  );

  return {
    state: userState,
    theme: preferredTheme,
    otpMethod: otpDeliveryMethod,
    geo: geoData,
  };
};

/**
 * User login handler
 * Handles both new user registration and existing user login
 * Also determines user preferences based on location
 */
export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    console.log("📝 Processing login request for:", email);

    // Check if this user already exists in our database
    let existingUser = await User.findOne({ email });

    if (!existingUser) {
      // New user - let's create their account
      console.log("✨ New user detected - creating account for:", email);

      existingUser = await User.create({
        email,
        name,
        image,
        currentPlan: "FREE", // Everyone starts with free plan
        watchTimeLimit: 5, // 5 hours for free tier
      });

      console.log("✅ Account created successfully");
    } else {
      // Existing user - update their info if anything changed
      console.log("👋 Welcome back:", email);

      let needsUpdate = false;

      if (name && existingUser.name !== name) {
        existingUser.name = name;
        needsUpdate = true;
      }

      if (image && existingUser.image !== image) {
        existingUser.image = image;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await existingUser.save();
        console.log("📝 User profile updated");
      }
    }

    // Generate authentication token
    const authToken = generateToken(existingUser);
    console.log("✅ Authentication token created");

    // Figure out user's location and preferences
    const userIpAddress =
      req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];

    const { state, theme, otpMethod, geo } =
      determineThemeAndOtpMethod(userIpAddress);

    // Save location-based preferences to user profile
    existingUser.theme = theme;
    existingUser.preferredOtpMethod = otpMethod;
    existingUser.location = {
      state,
      country: geo?.country,
      timezone: geo?.timezone,
    };
    existingUser.lastLoginTime = new Date();

    await existingUser.save();
    console.log("💾 User preferences saved");

    // Send back user data and token
    return res.status(200).json({
      success: true,
      result: {
        _id: existingUser._id,
        email: existingUser.email,
        name: existingUser.name,
        image: existingUser.image,
        channelname: existingUser.channelname,
        description: existingUser.description,
        currentPlan: existingUser.currentPlan,
        watchTimeLimit: existingUser.watchTimeLimit,
        subscriptionExpiry: existingUser.subscriptionExpiry,
      },
      token: authToken,
      theme,
      otpMethod,
      location: {
        state,
        country: geo?.country,
        timezone: geo?.timezone,
      },
    });
  } catch (error) {
    // Something went wrong - log it and send error response
    console.error("❌ Login failed:", error.message);
    console.error("Stack trace:", error.stack);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update user profile information
 * Allows users to set their channel name and description
 */
export const updateprofile = async (req, res) => {
  const { id: userId } = req.params;
  const { channelname, description } = req.body;

  // Validate the user ID format before querying database
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.log("⚠️ Invalid user ID format received:", userId);
    return res.status(400).json({
      success: false,
      message: "Invalid user ID format",
    });
  }

  try {
    console.log("📝 Updating profile for user:", userId);

    // Find user and update their profile info
    const updatedUserData = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true } // Return the updated document
    );

    // Check if user was actually found
    if (!updatedUserData) {
      console.log("❌ User not found with ID:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ Profile updated successfully for:", updatedUserData.email);

    return res.status(200).json({
      success: true,
      result: updatedUserData,
    });
  } catch (error) {
    // Handle any database errors
    console.error("❌ Profile update failed:", error.message);
    console.error("Stack trace:", error.stack);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};
