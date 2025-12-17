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

    // ✅ CRITICAL: Store OTP FIRST (before any async operations)
    otpStore.set(email, { otp, expiry: otpExpiry });
    console.log(`✅ OTP stored for ${email}: ${otp}`);
    console.log(`   Expiry: ${new Date(otpExpiry).toISOString()}`);

    // ✅ Log OTP for development
    console.log("═══════════════════════════════════════");
    console.log("📧 EMAIL OTP");
    console.log(`   Email: ${email}`);
    console.log(`   OTP: ${otp}`);
    console.log(`   Valid until: ${new Date(otpExpiry).toLocaleString()}`);
    console.log("═══════════════════════════════════════");

    // ✅ NEW: Try to send email using the new emailService
    setImmediate(async () => {
      try {
        // Dynamically import the email service
        const emailService = await import("../utils/emailService.js");

        console.log("📧 Attempting to send OTP email...");
        const result = await emailService.sendOTPEmail(email, otp, 5);

        if (result.success) {
          console.log("✅ OTP email sent successfully to:", email);
          console.log("   Message ID:", result.messageId);
        } else if (result.skipped) {
          console.log(
            "⚠️ Email service not configured - OTP logged to console only"
          );
        } else {
          console.error(
            "⚠️ Email send failed (OTP still valid):",
            result.error
          );
          if (result.hint) {
            console.log("💡", result.hint);
          }
        }
      } catch (emailError) {
        console.error(
          "⚠️ Email send error (OTP still valid):",
          emailError.message
        );
        console.log("📝 OTP is still valid and can be used for verification");
      }
    });

    // ✅ Return success immediately with OTP in debug
    return res.json({
      success: true,
      message: "OTP generated successfully",
      debug:
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "production"
          ? { otp, email }
          : undefined,
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

const sendSMSOTP = async (req, res) => {
  try {
    let { phoneNumber } = req.body;

    console.log("📱 Send SMS OTP request for:", phoneNumber);

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    // ✅ Format to E.164
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log("📞 Formatted:", formattedPhone);

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formattedPhone)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone format. Use: 9876543210 or +919876543210",
      });
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000;

    // ✅ CRITICAL: Store with BOTH formats FIRST
    otpStore.set(phoneNumber, { otp, expiry: otpExpiry });
    otpStore.set(formattedPhone, { otp, expiry: otpExpiry });
    console.log(`✅ OTP stored for ${formattedPhone}: ${otp}`);

    // ✅ Log OTP
    console.log("═══════════════════════════════════════");
    console.log("📱 SMS OTP");
    console.log(`   Phone: ${phoneNumber}`);
    console.log(`   Formatted: ${formattedPhone}`);
    console.log(`   OTP: ${otp}`);
    console.log(`   Valid until: ${new Date(otpExpiry).toLocaleString()}`);
    console.log("═══════════════════════════════════════");

    const client = initTwilioClient();

    // ✅ If no Twilio, return success immediately
    if (!client) {
      console.log("⚠️ Twilio not configured - OTP logged above");
      return res.json({
        success: true,
        message: "OTP generated successfully (check server console)",
        debug: { phoneNumber, formattedPhone, otp },
      });
    }

    // ✅ Try SMS in background (don't wait)
    // ✅ Try to send email in background (don't wait for it)
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
          if (result.hint) {
            console.log("💡", result.hint);
          }
        }
      } catch (emailError) {
        console.error(
          "⚠️ Email send error (OTP still valid):",
          emailError.message
        );
      }
    });

    // ✅ FIXED: Return success immediately with OTP in debug for both dev and production
    return res.json({
      success: true,
      message: "OTP generated successfully",
      debug:
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "production"
          ? { otp, phoneNumber, formattedPhone } // ✅ CRITICAL: Include OTP for testing
          : undefined,
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

const verifyOTP = async (req, res) => {
  try {
    const { otp, contact } = req.body;

    console.log("🔐 Verify OTP Request:");
    console.log("   OTP:", otp);
    console.log("   Contact:", contact);
    console.log("   Store size:", otpStore.size);
    console.log("   Available keys:", Array.from(otpStore.keys()));

    if (!otp || !contact) {
      return res.status(400).json({
        success: false,
        error: "OTP and contact required",
      });
    }

    // ✅ Try original contact first
    let storedData = otpStore.get(contact);
    console.log(
      `   Checking '${contact}':`,
      storedData ? "Found" : "Not found"
    );

    // ✅ If phone number, try formatted versions
    if (!storedData && /^\d{10}$/.test(contact)) {
      const withPrefix = `+91${contact}`;
      storedData = otpStore.get(withPrefix);
      console.log(
        `   Checking '${withPrefix}':`,
        storedData ? "Found" : "Not found"
      );
    }

    // ✅ Try without +91 prefix
    if (!storedData && contact.startsWith("+91")) {
      const without = contact.replace(/^\+91/, "");
      storedData = otpStore.get(without);
      console.log(
        `   Checking '${without}':`,
        storedData ? "Found" : "Not found"
      );
    }

    // ✅ Try with +91 if it's a 10-digit number
    if (!storedData && /^\d{10}$/.test(contact)) {
      const withPlus91 = `+91${contact}`;
      storedData = otpStore.get(withPlus91);
      console.log(
        `   Checking '${withPlus91}':`,
        storedData ? "Found" : "Not found"
      );
    }

    if (!storedData) {
      console.log(`❌ OTP not found for: ${contact}`);
      console.log("   All stored keys:", Array.from(otpStore.keys()));
      return res.status(400).json({
        success: false,
        error: "OTP not found. Please request new OTP.",
        debug:
          process.env.NODE_ENV === "development"
            ? {
                contact,
                availableKeys: Array.from(otpStore.keys()),
                storeSize: otpStore.size,
              }
            : undefined,
      });
    }

    // ✅ Check expiry
    if (Date.now() > storedData.expiry) {
      console.log(`❌ OTP expired for: ${contact}`);
      otpStore.delete(contact);
      return res.status(400).json({
        success: false,
        error: "OTP expired. Please request new OTP.",
      });
    }

    // ✅ Verify OTP
    if (storedData.otp !== otp) {
      console.log(`❌ Invalid OTP`);
      console.log(`   Provided: ${otp}`);
      console.log(`   Expected: ${storedData.otp}`);
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
        debug:
          process.env.NODE_ENV === "development"
            ? {
                provided: otp,
                expected: storedData.otp,
              }
            : undefined,
      });
    }

    // ✅ Delete all format variations
    otpStore.delete(contact);
    if (/^\d{10}$/.test(contact)) {
      otpStore.delete(`+91${contact}`);
    }
    if (contact.startsWith("+91")) {
      otpStore.delete(contact.replace(/^\+91/, ""));
    }

    console.log("═══════════════════════════════════════");
    console.log("✅ OTP VERIFIED");
    console.log(`   Contact: ${contact}`);
    console.log(`   Remaining OTPs: ${otpStore.size}`);
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

// ✅ FIXED: Export otpStore getter for debugging/testing
export default {
  sendEmailOTP,
  sendSMSOTP,
  verifyOTP,
  getOTPStore: () => otpStore, // ✅ ADDED: Export OTP store for debugging
};
