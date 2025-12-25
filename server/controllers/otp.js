// server/controllers/otp.js
import twilio from "twilio";

// Initialize Twilio client
let twilioClient = null;

const initTwilioClient = () => {
  if (twilioClient) return twilioClient;

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("⚠️ Twilio credentials not found in .env file");
    return null;
  }

  try {
    console.log("🔧 Initializing Twilio client...");

    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    console.log("✅ Twilio client initialized");
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

// ✅ ENHANCED: Format phone number to E.164
const formatPhoneNumber = (phoneNumber) => {
  let cleaned = phoneNumber.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  return `+91${cleaned}`;
};

// Clean expired OTPs (but not too aggressively)
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
    console.log(
      `🗑️ Cleaned ${cleaned} expired OTP(s), ${otpStore.size} remaining`
    );
  }
}, 60000); // Check every 60 seconds

// Send Email OTP
// ✅ FIXED: Send Email OTP
const sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("📧 Send Email OTP request for:", email);

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

    // ✅ Store OTP FIRST
    otpStore.set(email, { otp, expiry: otpExpiry });
    console.log(`✅ OTP stored for ${email}: ${otp}`);
    console.log(`   Expiry: ${new Date(otpExpiry).toISOString()}`);

    // ✅ Log OTP prominently
    console.log("═══════════════════════════════════════");
    console.log("📧 EMAIL OTP GENERATED");
    console.log(`   Email: ${email}`);
    console.log(`   OTP: ${otp}`);
    console.log(`   Valid until: ${new Date(otpExpiry).toLocaleString()}`);
    console.log("═══════════════════════════════════════");

    // ✅ Try to send email in background (don't wait)
    setImmediate(async () => {
      try {
        const { sendOTPEmail } = await import("../utils/emailService.js");
        const result = await sendOTPEmail(email, otp, 5);

        if (result.success) {
          console.log("✅ OTP email sent successfully to:", email);
        } else if (result.skipped) {
          console.log(
            "⚠️ Email service not configured - OTP logged to console"
          );
        } else {
          console.error(
            "⚠️ Email send failed (OTP still valid):",
            result.error
          );
        }
      } catch (emailError) {
        console.error(
          "⚠️ Email send error (OTP still valid):",
          emailError.message
        );
      }
    });

    // ✅ Return success immediately with OTP in debug
    return res.json({
      success: true,
      message: "OTP generated successfully",
      debug: {
        otp,
        email,
        expiresIn: "5 minutes",
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

// ✅ FIXED: Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { otp, contact } = req.body;

    console.log("🔐 Verify OTP Request:");
    console.log("   OTP:", otp);
    console.log("   Contact:", contact);
    console.log("   Store size:", otpStore.size);

    if (!otp || !contact) {
      return res.status(400).json({
        success: false,
        error: "OTP and contact required",
      });
    }

    // Try original contact first
    let storedData = otpStore.get(contact);

    // If phone number, try formatted versions
    if (!storedData && /^\d{10}$/.test(contact)) {
      storedData = otpStore.get(`+91${contact}`);
    }

    // Try without +91 prefix
    if (!storedData && contact.startsWith("+91")) {
      storedData = otpStore.get(contact.replace(/^\+91/, ""));
    }

    if (!storedData) {
      console.log(`❌ OTP not found for: ${contact}`);
      return res.status(400).json({
        success: false,
        error: "OTP not found or expired. Please request a new OTP.",
      });
    }

    // Check expiry
    if (Date.now() > storedData.expiry) {
      console.log(`❌ OTP expired for: ${contact}`);
      otpStore.delete(contact);
      return res.status(400).json({
        success: false,
        error: "OTP expired. Please request new OTP.",
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      console.log(`❌ Invalid OTP - Expected: ${storedData.otp}, Got: ${otp}`);
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
      });
    }

    // Delete all format variations
    otpStore.delete(contact);
    if (/^\d{10}$/.test(contact)) {
      otpStore.delete(`+91${contact}`);
    }
    if (contact.startsWith("+91")) {
      otpStore.delete(contact.replace(/^\+91/, ""));
    }

    console.log("═══════════════════════════════════════");
    console.log("✅ OTP VERIFIED SUCCESSFULLY");
    console.log(`   Contact: ${contact}`);
    console.log("═══════════════════════════════════════");

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

// ✅ CRITICAL: Export getOTPStore function
const getOTPStore = () => otpStore;

export default {
  sendEmailOTP,
  verifyOTP,
  getOTPStore,
};
