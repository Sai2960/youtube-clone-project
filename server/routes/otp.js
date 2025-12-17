// server/routes/otp.js - COMPLETE FIXED VERSION
import express from "express";
import otpController from "../controllers/otp.js";

const router = express.Router();

console.log("🔐 OTP routes loaded");

// Send OTP routes
router.post("/send-email-otp", otpController.sendEmailOTP);
router.post("/send-sms-otp", otpController.sendSMSOTP);

// Verify OTP (single endpoint for both email and SMS)
router.post("/verify-otp", otpController.verifyOTP);

// ✅ FIXED: Status endpoint - uses getOTPStore() from controller
router.get("/status", (req, res) => {
  try {
    const { contact } = req.query;
    const otpStore = otpController.getOTPStore(); // ✅ Get store from controller
    
    // If no contact specified, return all stored OTPs
    if (!contact) {
      return res.json({
        success: true,
        totalStored: otpStore.size,
        allKeys: Array.from(otpStore.keys()),
        message: "Use ?contact=EMAIL_OR_PHONE to check specific OTP",
      });
    }
    
    // Check for specific contact
    const stored = otpStore.get(contact);
    
    res.json({
      success: true,
      contact,
      found: !!stored,
      otp: process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production" 
        ? stored?.otp  // ✅ Include OTP for testing
        : undefined,
      expired: stored ? Date.now() > stored.expiry : null,
      expiresIn: stored 
        ? Math.floor((stored.expiry - Date.now()) / 1000) + "s" 
        : null,
      expiryDate: stored 
        ? new Date(stored.expiry).toLocaleString()
        : null,
      totalStored: otpStore.size,
      allKeys: Array.from(otpStore.keys()),
    });
  } catch (error) {
    console.error("❌ Status endpoint error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get OTP status",
      details: error.message,
    });
  }
});

// Debug route - shows all endpoints
router.get("/debug", (req, res) => {
  res.json({
    success: true,
    message: "OTP routes are working",
    serverTime: new Date().toISOString(),
    endpoints: {
      sendEmail: "POST /api/otp/send-email-otp",
      sendSMS: "POST /api/otp/send-sms-otp",
      verify: "POST /api/otp/verify-otp",
      status: "GET /api/otp/status?contact=EMAIL_OR_PHONE",
      debug: "GET /api/otp/debug",
    },
    usage: {
      sendEmail: {
        method: "POST",
        body: { email: "user@example.com" },
        response: { success: true, debug: { otp: "123456" } },
      },
      sendSMS: {
        method: "POST",
        body: { phoneNumber: "9876543210" },
        response: { success: true, debug: { otp: "123456" } },
      },
      verify: {
        method: "POST",
        body: { contact: "user@example.com", otp: "123456" },
        response: { success: true, message: "OTP verified successfully" },
      },
      status: {
        method: "GET",
        query: "?contact=user@example.com",
        response: { found: true, otp: "123456", expiresIn: "298s" },
      },
    },
  });
});

export default router;