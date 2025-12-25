// server/controllers/otp.js - COMPLETE MERGED VERSION WITH RESEND
import twilio from "twilio";

// ═══════════════════════════════════════════════════════════════
// TWILIO INITIALIZATION (for SMS OTP - optional)
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// OTP STORAGE & UTILITIES
// ═══════════════════════════════════════════════════════════════

// In-memory OTP storage
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Format phone number to E.164 format (+91XXXXXXXXXX)
const formatPhoneNumber = (phoneNumber) => {
  let cleaned = phoneNumber.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;

  return `+91${cleaned}`;
};
// ═══════════════════════════════════════════════════════════════
// AUTOMATIC CLEANUP SERVICE
// ═══════════════════════════════════════════════════════════════

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
    console.log(`🗑️ Cleaned ${cleaned} expired OTP(s) from storage`);
  }
}, 60000); // Run every 60 seconds
// ═══════════════════════════════════════════════════════════════
// EMAIL OTP - PRIMARY METHOD (RESEND INTEGRATION)
// ═══════════════════════════════════════════════════════════════

const sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("═══════════════════════════════════════");
    console.log("📧 EMAIL OTP REQUEST RECEIVED");
    console.log("   Email:", email);
    console.log("   Timestamp:", new Date().toISOString());
    console.log("═══════════════════════════════════════");

    // ✅ VALIDATION 1: Check if email provided
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // ✅ VALIDATION 2: Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    // ✅ VALIDATION 3: Block test/example emails
    const blockList = ["test@example.com", "example.com", "test@test.com"];
    if (blockList.some((blocked) => email.toLowerCase().includes(blocked))) {
      return res.status(400).json({
        success: false,
        error: "Please use a valid email address (not test/example emails)",
      });
    }

    // ✅ STEP 1: Generate OTP and expiry time
    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000; // 5 minutes from now

    // ✅ STEP 2: Store OTP FIRST (CRITICAL - must happen before email sending)
    otpStore.set(email, { otp, expiry: otpExpiry });

    console.log("═══════════════════════════════════════");
    console.log("✅ OTP GENERATED & STORED SUCCESSFULLY");
    console.log("   Email:", email);
    console.log("   OTP:", otp);
    console.log("   Expires:", new Date(otpExpiry).toLocaleString());
    console.log("   Total Stored OTPs:", otpStore.size);
    console.log("═══════════════════════════════════════");
    // ✅ STEP 3: Send email via Resend (non-blocking, runs in background)
    // ✅ STEP 3: Send email via Resend (non-blocking, runs in background)
    const emailPromise = (async () => {
      try {
        console.log("📧 Attempting to send email via Resend...");

        // ✅ Import from resendEmailService instead of emailService
        const { sendOTPEmail } = await import("../utils/resendEmailService.js");

        // ✅ Send OTP email
        const result = await sendOTPEmail(email, otp, 5);

        if (result.success) {
          console.log("✅ OTP EMAIL DELIVERED SUCCESSFULLY via Resend!");
          console.log("   Email ID:", result.messageId || "N/A");
        } else {
          console.log(
            "⚠️ Email delivery issue:",
            result.error || result.reason || "Unknown error"
          );
          console.log("💡 OTP is still valid and stored in memory");
        }

        return result;
      } catch (error) {
        console.error(
          "⚠️ Email sending error (OTP still valid):",
          error.message
        );

        // Check if it's an import error
        if (error.code === "ERR_MODULE_NOT_FOUND") {
          console.log("💡 Resend not installed. Run: npm install resend");
        }

        return { success: false, error: error.message };
      }
    })();

    // ✅ Don't await email - let it send in background
    // This ensures fast API response regardless of email status
    emailPromise.catch((err) => {
      console.error("Background email error (non-critical):", err.message);
    });
    // ✅ STEP 4: Return immediate success response
    // OTP is already stored, so user can verify even if email fails
    return res.json({
      success: true,
      message: "OTP generated successfully. Check your email!",
      debug: {
        otp, // ⚠️ Only for development/testing - remove in production
        email,
        expiresIn: "5 minutes",
        provider: "Resend Email Service",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ CRITICAL EMAIL OTP ERROR:", error);
    console.error("   Stack:", error.stack);

    // Only send error response if headers not already sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Failed to generate OTP",
        details: error.message,
      });
    }
  }
};
// ═══════════════════════════════════════════════════════════════
// SMS OTP - SECONDARY METHOD (TWILIO INTEGRATION)
// ═══════════════════════════════════════════════════════════════

const sendSMSOTP = async (req, res) => {
  try {
    let { phoneNumber } = req.body;

    console.log("═══════════════════════════════════════");
    console.log("📱 SMS OTP REQUEST RECEIVED");
    console.log("   Phone:", phoneNumber);
    console.log("   Timestamp:", new Date().toISOString());
    console.log("═══════════════════════════════════════");

    // ✅ VALIDATION 1: Check if phone provided
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    // ✅ STEP 1: Format phone to E.164
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log("📞 Formatted to:", formattedPhone);

    // ✅ VALIDATION 2: Check phone format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formattedPhone)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format",
      });
    }

    // ✅ STEP 2: Generate OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000; // 5 minutes

    // ✅ STEP 3: Store OTP with both original and formatted numbers
    otpStore.set(phoneNumber, { otp, expiry: otpExpiry });
    otpStore.set(formattedPhone, { otp, expiry: otpExpiry });

    console.log("═══════════════════════════════════════");
    console.log("✅ SMS OTP GENERATED & STORED");
    console.log("   Original:", phoneNumber);
    console.log("   Formatted:", formattedPhone);
    console.log("   OTP:", otp);
    console.log("   Expires:", new Date(otpExpiry).toLocaleString());
    console.log("═══════════════════════════════════════");

    // ✅ STEP 4: Try sending SMS via Twilio
    const client = initTwilioClient();

    if (!client) {
      console.log("⚠️ Twilio not configured - OTP logged above for testing");
      return res.json({
        success: true,
        message: "OTP generated (check server console - Twilio not configured)",
        debug: {
          phoneNumber,
          formattedPhone,
          otp,
          provider: "Console (Twilio not configured)",
        },
      });
    }

    // ✅ Send SMS in background (non-blocking)
    setImmediate(async () => {
      try {
        await client.messages.create({
          body: `Your YouTube Clone OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
        });
        console.log("✅ SMS SENT SUCCESSFULLY to:", formattedPhone);
      } catch (smsError) {
        console.error(
          "⚠️ SMS sending error (OTP still valid):",
          smsError.message
        );
      }
    });

    return res.json({
      success: true,
      message: "OTP sent to your phone!",
      debug: {
        otp, // ⚠️ Only for development - remove in production
        phoneNumber,
        formattedPhone,
        provider: "Twilio SMS",
      },
    });
  } catch (error) {
    console.error("❌ CRITICAL SMS OTP ERROR:", error);
    console.error("   Stack:", error.stack);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Failed to generate SMS OTP",
        details: error.message,
      });
    }
  }
};
// ═══════════════════════════════════════════════════════════════
// VERIFY OTP - UNIVERSAL VERIFICATION (EMAIL & SMS)
// ═══════════════════════════════════════════════════════════════

const verifyOTP = async (req, res) => {
  try {
    const { otp, contact } = req.body;

    console.log("═══════════════════════════════════════");
    console.log("🔐 OTP VERIFICATION REQUEST");
    console.log("   Contact:", contact);
    console.log("   OTP Provided:", otp);
    console.log("   Timestamp:", new Date().toISOString());
    console.log("═══════════════════════════════════════");

    // ✅ VALIDATION: Check required fields
    if (!otp || !contact) {
      return res.status(400).json({
        success: false,
        error: "OTP and contact (email/phone) are required",
      });
    }

    // ✅ STEP 1: Try to find stored OTP data
    let storedData = otpStore.get(contact);

    // ✅ STEP 2: If not found, try phone number variations
    if (!storedData && /^\d{10}$/.test(contact)) {
      // Try with +91 prefix
      storedData = otpStore.get(`+91${contact}`);
      if (storedData) {
        console.log("   Found with +91 prefix");
      }
    }

    if (!storedData && contact.startsWith("+91")) {
      // Try without +91 prefix
      storedData = otpStore.get(contact.replace(/^\+91/, ""));
      if (storedData) {
        console.log("   Found without +91 prefix");
      }
    }

    // ✅ VALIDATION: OTP not found
    if (!storedData) {
      console.log("❌ OTP NOT FOUND");
      console.log("   Searched for:", contact);
      console.log("   Currently stored keys:", Array.from(otpStore.keys()));

      return res.status(400).json({
        success: false,
        error: "OTP not found or has expired. Please request a new OTP.",
      });
    }
    // ✅ STEP 3: Check if OTP expired
    if (Date.now() > storedData.expiry) {
      console.log("❌ OTP EXPIRED");
      console.log(
        "   Expired at:",
        new Date(storedData.expiry).toLocaleString()
      );
      console.log("   Current time:", new Date().toLocaleString());

      // Delete expired OTP
      otpStore.delete(contact);

      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new OTP.",
      });
    }

    // ✅ STEP 4: Verify OTP matches
    if (storedData.otp !== otp) {
      console.log("❌ INVALID OTP");
      console.log("   Expected:", storedData.otp);
      console.log("   Received:", otp);

      return res.status(400).json({
        success: false,
        error: "Invalid OTP. Please check and try again.",
      });
    }

    // ✅ STEP 5: OTP verified successfully - delete from storage
    otpStore.delete(contact);

    // Also delete phone number variations
    if (/^\d{10}$/.test(contact)) {
      otpStore.delete(`+91${contact}`);
    }
    if (contact.startsWith("+91")) {
      otpStore.delete(contact.replace(/^\+91/, ""));
    }

    console.log("═══════════════════════════════════════");
    console.log("✅ OTP VERIFIED SUCCESSFULLY");
    console.log("   Contact:", contact);
    console.log("   Remaining OTPs in store:", otpStore.size);
    console.log("═══════════════════════════════════════");

    // ✅ Return success response
    res.json({
      success: true,
      message: "OTP verified successfully",
      verified: true,
      contact: contact,
    });
  } catch (error) {
    console.error("❌ CRITICAL VERIFICATION ERROR:", error);
    console.error("   Stack:", error.stack);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "OTP verification failed",
        details: error.message,
      });
    }
  }
};
// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS & EXPORTS
// ═══════════════════════════════════════════════════════════════

// ✅ Get OTP Store (for debugging/testing)
const getOTPStore = () => otpStore;

// ✅ Get store size (for monitoring)
const getOTPStoreSize = () => otpStore.size;

// ✅ Clear all OTPs (for testing/maintenance)
const clearOTPStore = () => {
  const size = otpStore.size;
  otpStore.clear();
  console.log(`🗑️ Cleared ${size} OTP(s) from storage`);
  return size;
};

// ✅ Export all functions
export default {
  sendEmailOTP,
  sendSMSOTP,
  verifyOTP,
  getOTPStore,
  getOTPStoreSize,
  clearOTPStore,
};
