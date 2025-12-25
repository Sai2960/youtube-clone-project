// server/controllers/otp.js - UPDATED WITH RESEND
import twilio from "twilio";

// Initialize Twilio client (for SMS if needed)
let twilioClient = null;

const initTwilioClient = () => {
  if (twilioClient) return twilioClient;

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("⚠️ Twilio not configured (SMS OTP disabled)");
    return null;
  }

  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log("✅ Twilio SMS service initialized");
    return twilioClient;
  } catch (error) {
    console.error("❌ Twilio initialization error:", error.message);
    return null;
  }
};

// OTP storage
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Format phone number to E.164
const formatPhoneNumber = (phoneNumber) => {
  let cleaned = phoneNumber.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  
  return `+91${cleaned}`;
};

// Clean expired OTPs every minute
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

// ✅ UPDATED: Send Email OTP using Resend
const sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("📧 Email OTP request for:", email);

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

    const blockList = ["test@example.com", "example.com"];
    if (blockList.some((blocked) => email.toLowerCase().includes(blocked))) {
      return res.status(400).json({
        success: false,
        error: "Please use a valid email address",
      });
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000; // 5 minutes

    // ✅ Store OTP FIRST (critical)
    otpStore.set(email, { otp, expiry: otpExpiry });

    console.log("═══════════════════════════════════════");
    console.log("📧 EMAIL OTP GENERATED");
    console.log(`   Email: ${email}`);
    console.log(`   OTP: ${otp}`);
    console.log(`   Expires: ${new Date(otpExpiry).toLocaleString()}`);
    console.log("═══════════════════════════════════════");

    // ✅ Send email using Resend (non-blocking)
    const emailPromise = (async () => {
      try {
        // ✅ CHANGED: Import from resendEmailService instead of emailService
        const { sendOTPEmail } = await import("../utils/resendEmailService.js");
        const result = await sendOTPEmail(email, otp, 5);

        if (result.success) {
          console.log("✅ OTP email delivered via Resend");
        } else {
          console.log("⚠️ Email delivery issue:", result.error || "Not configured");
        }
        
        return result;
      } catch (error) {
        console.error("⚠️ Email error (OTP still valid):", error.message);
        return { success: false, error: error.message };
      }
    })();

    // Don't await - let email send in background
    emailPromise.catch((err) => {
      console.error("Background email error:", err);
    });

    // ✅ Return success immediately with OTP
    return res.json({
      success: true,
      message: "OTP generated successfully. Check your email!",
      debug: {
        otp, // For development/testing
        email,
        expiresIn: "5 minutes",
        provider: "Resend",
      },
    });
  } catch (error) {
    console.error("❌ Email OTP error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Failed to generate OTP",
        details: error.message,
      });
    }
  }
};

// ✅ Send SMS OTP (unchanged)
const sendSMSOTP = async (req, res) => {
  try {
    let { phoneNumber } = req.body;

    console.log("📱 SMS OTP request for:", phoneNumber);

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log("📞 Formatted:", formattedPhone);

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formattedPhone)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone format",
      });
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000;

    // Store with both formats
    otpStore.set(phoneNumber, { otp, expiry: otpExpiry });
    otpStore.set(formattedPhone, { otp, expiry: otpExpiry });

    console.log("═══════════════════════════════════════");
    console.log("📱 SMS OTP GENERATED");
    console.log(`   Phone: ${formattedPhone}`);
    console.log(`   OTP: ${otp}`);
    console.log("═══════════════════════════════════════");

    const client = initTwilioClient();

    if (!client) {
      console.log("⚠️ Twilio not configured - OTP logged above");
      return res.json({
        success: true,
        message: "OTP generated (check server console)",
        debug: { phoneNumber, formattedPhone, otp },
      });
    }

    // Try SMS in background
    setImmediate(async () => {
      try {
        await client.messages.create({
          body: `Your YouTube Clone OTP: ${otp}. Valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
        });
        console.log("✅ SMS sent to:", formattedPhone);
      } catch (smsError) {
        console.error("⚠️ SMS error (OTP still valid):", smsError.message);
      }
    });

    return res.json({
      success: true,
      message: "OTP generated",
      debug: { otp, phoneNumber, formattedPhone },
    });
  } catch (error) {
    console.error("❌ SMS OTP error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Failed to generate OTP",
        details: error.message,
      });
    }
  }
};

// ✅ Verify OTP (unchanged)
const verifyOTP = async (req, res) => {
  try {
    const { otp, contact } = req.body;

    console.log("🔐 Verify OTP:", contact);

    if (!otp || !contact) {
      return res.status(400).json({
        success: false,
        error: "OTP and contact required",
      });
    }

    // Try original contact
    let storedData = otpStore.get(contact);

    // Try phone variations
    if (!storedData && /^\d{10}$/.test(contact)) {
      storedData = otpStore.get(`+91${contact}`);
    }
    if (!storedData && contact.startsWith("+91")) {
      storedData = otpStore.get(contact.replace(/^\+91/, ""));
    }

    if (!storedData) {
      console.log(`❌ OTP not found for: ${contact}`);
      return res.status(400).json({
        success: false,
        error: "OTP not found or expired",
      });
    }

    // Check expiry
    if (Date.now() > storedData.expiry) {
      console.log(`❌ OTP expired for: ${contact}`);
      otpStore.delete(contact);
      return res.status(400).json({
        success: false,
        error: "OTP expired",
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      console.log(`❌ Invalid OTP`);
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
      });
    }

    // Delete OTP after verification
    otpStore.delete(contact);
    if (/^\d{10}$/.test(contact)) {
      otpStore.delete(`+91${contact}`);
    }
    if (contact.startsWith("+91")) {
      otpStore.delete(contact.replace(/^\+91/, ""));
    }

    console.log("✅ OTP VERIFIED:", contact);

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("❌ Verification error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Verification failed",
        details: error.message,
      });
    }
  }
};

// ✅ Export getOTPStore function
const getOTPStore = () => otpStore;

export default {
  sendEmailOTP,
  sendSMSOTP,
  verifyOTP,
  getOTPStore,
};