// server/controllers/otp.js - FIXED VERSION

import twilio from "twilio";
import { sendOTPEmail } from '../utils/emailService.js';  // ✅ CRITICAL IMPORT

// ═══════════════════════════════════════════════════════════════
// RESEND INITIALIZATION (Not used with Gmail SMTP)
// ═══════════════════════════════════════════════════════════════

let resendClient = null;

const initResend = async () => {
  if (resendClient) return resendClient;

  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY not configured!");
    return null;
  }

  try {
    const { Resend } = await import("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY);
    console.log("✅ Resend client initialized");
    console.log("   API Key:", process.env.RESEND_API_KEY.substring(0, 10) + "...");
    return resendClient;
  } catch (error) {
    console.error("❌ Resend import failed:", error.message);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// OTP STORAGE
// ═══════════════════════════════════════════════════════════════

const otpStore = new Map();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Cleanup expired OTPs
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of otpStore.entries()) {
    if (value.expiry < now) {
      otpStore.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🗑️ Cleaned ${cleaned} expired OTP(s)`);
  }
}, 60000);

// ═══════════════════════════════════════════════════════════════
// EMAIL OTP - USING GMAIL SMTP
// ═══════════════════════════════════════════════════════════════

const sendEmailOTP = async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const { email } = req.body;

    console.log("\n═══════════════════════════════════════");
    console.log(`📧 EMAIL OTP REQUEST [${requestId}]`);
    console.log("   Email:", email);
    console.log("   Time:", new Date().toISOString());
    console.log("═══════════════════════════════════════");

    // Validate email presence
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000; // 5 minutes

    // Store OTP
    otpStore.set(email, { otp, expiry: otpExpiry });

    console.log(`✅ OTP GENERATED AND STORED [${requestId}]`);
    console.log("   OTP:", otp);
    console.log("   Expires:", new Date(otpExpiry).toLocaleString());

    // Send OTP email using Gmail SMTP
    console.log(`📤 SENDING EMAIL VIA GMAIL SMTP [${requestId}]`);

    // ✅ FIXED: Now calling the imported function
    const emailResult = await sendOTPEmail(email, otp, 5);

    if (emailResult.success) {
      console.log(`✅ EMAIL SENT SUCCESSFULLY [${requestId}]`);
      console.log("   Message ID:", emailResult.messageId);

      return res.json({
        success: true,
        message: "OTP sent to your email! Check your inbox and spam folder.",
        debug: process.env.NODE_ENV === "development"
          ? {
              otp,
              email,
              requestId,
              messageId: emailResult.messageId,
            }
          : undefined,
      });
    } else if (emailResult.skipped) {
      console.log(`⚠️ Email service not configured [${requestId}]`);

      return res.json({
        success: true,
        message: "OTP generated (email service not configured)",
        debug: { otp, email, requestId },
        warning: "Configure EMAIL_USER and EMAIL_PASSWORD in environment variables",
      });
    } else {
      console.error(`❌ Email send failed [${requestId}]:`, emailResult.error);

      return res.json({
        success: true,
        message: "OTP generated successfully",
        debug: process.env.NODE_ENV === "development"
          ? {
              otp,
              email,
              requestId,
            }
          : undefined,
        warning: `Email delivery issue: ${emailResult.hint || emailResult.error}`,
      });
    }
  } catch (error) {
    console.error(`❌ CRITICAL ERROR [${requestId}]`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to process OTP request",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// SMS OTP (unchanged)
// ═══════════════════════════════════════════════════════════════

let twilioClient = null;

const initTwilioClient = () => {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return twilioClient;
  } catch (error) {
    return null;
  }
};

const formatPhoneNumber = (phoneNumber) => {
  let cleaned = phoneNumber.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return `+91${cleaned}`;
};

const sendSMSOTP = async (req, res) => {
  try {
    let { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: "Phone number required" });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000;

    otpStore.set(phoneNumber, { otp, expiry: otpExpiry });
    otpStore.set(formattedPhone, { otp, expiry: otpExpiry });

    const client = initTwilioClient();
    if (!client) {
      return res.json({
        success: true,
        message: "OTP generated (Twilio not configured)",
        debug: { otp, phoneNumber, formattedPhone },
      });
    }

    setImmediate(async () => {
      try {
        await client.messages.create({
          body: `Your YouTube Clone OTP: ${otp}. Valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
        });
      } catch (err) {
        console.error("SMS error:", err.message);
      }
    });

    return res.json({
      success: true,
      message: "OTP sent!",
      debug: { otp, phoneNumber, formattedPhone },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "SMS OTP failed",
      details: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// VERIFY OTP
// ═══════════════════════════════════════════════════════════════

const verifyOTP = async (req, res) => {
  try {
    const { otp, contact } = req.body;

    if (!otp || !contact) {
      return res.status(400).json({
        success: false,
        error: "OTP and contact required",
      });
    }

    let storedData = otpStore.get(contact);

    if (!storedData && /^\d{10}$/.test(contact)) {
      storedData = otpStore.get(`+91${contact}`);
    }
    if (!storedData && contact.startsWith("+91")) {
      storedData = otpStore.get(contact.replace(/^\+91/, ""));
    }

    if (!storedData) {
      return res.status(400).json({
        success: false,
        error: "OTP not found or expired",
      });
    }

    if (Date.now() > storedData.expiry) {
      otpStore.delete(contact);
      return res.status(400).json({
        success: false,
        error: "OTP expired",
      });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
      });
    }

    otpStore.delete(contact);
    if (/^\d{10}$/.test(contact)) otpStore.delete(`+91${contact}`);
    if (contact.startsWith("+91")) otpStore.delete(contact.replace(/^\+91/, ""));

    console.log("✅ OTP VERIFIED:", contact);

    return res.json({
      success: true,
      message: "OTP verified",
      verified: true,
      contact,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Verification failed",
      details: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

const getOTPStore = () => otpStore;
const getOTPStoreSize = () => otpStore.size;
const clearOTPStore = () => {
  const size = otpStore.size;
  otpStore.clear();
  return size;
};

export default {
  sendEmailOTP,
  sendSMSOTP,
  verifyOTP,
  getOTPStore,
  getOTPStoreSize,
  clearOTPStore,
};