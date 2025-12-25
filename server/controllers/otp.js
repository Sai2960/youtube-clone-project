// server/controllers/otp.js - COMPLETE EMAIL FIX
import twilio from "twilio";

// ═══════════════════════════════════════════════════════════════
// RESEND INITIALIZATION - CRITICAL FIX
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
    return resendClient;
  } catch (error) {
    console.error("❌ Resend import failed:", error.message);
    return null;
  }
};

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

const otpStore = new Map();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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
// EMAIL OTP - FIXED VERSION WITH PROPER HTML
// ═══════════════════════════════════════════════════════════════

const sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("═══════════════════════════════════════");
    console.log("📧 EMAIL OTP REQUEST");
    console.log("   Email:", email);
    console.log("   Time:", new Date().toISOString());
    console.log("═══════════════════════════════════════");

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

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000; // 5 minutes

    // Store OTP FIRST
    otpStore.set(email, { otp, expiry: otpExpiry });

    console.log("✅ OTP STORED");
    console.log("   OTP:", otp);
    console.log("   Expires:", new Date(otpExpiry).toLocaleString());

    // Initialize Resend
    const resend = await initResend();

    if (!resend) {
      console.log("⚠️ Resend not configured - OTP available in console");
      return res.json({
        success: true,
        message: "OTP generated (email service not configured)",
        debug: { otp, email },
        warning: "Configure RESEND_API_KEY to send emails",
      });
    }

    // ✅ CRITICAL FIX: Simplified, working HTML template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your OTP Code</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px;text-align:center;border-radius:12px 12px 0 0;">
              <div style="font-size:48px;margin-bottom:16px;">🎬</div>
              <h1 style="margin:0;color:white;font-size:28px;">YouTube Clone</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);">Your verification code</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 24px;color:#4a5568;font-size:16px;">
                Your one-time password is:
              </p>
              
              <table width="100%" style="margin-bottom:32px;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;padding:32px;">
                    <div style="font-size:48px;font-weight:bold;color:white;letter-spacing:12px;font-family:monospace;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin:0;color:#718096;font-size:14px;">
                ⏱️ This code expires in <strong>5 minutes</strong>.
              </p>
              <p style="margin:16px 0 0;color:#a0aec0;font-size:13px;">
                If you didn't request this, please ignore this email.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="background:#f7fafc;padding:24px;text-align:center;border-radius:0 0 12px 12px;">
              <p style="margin:0;color:#a0aec0;font-size:12px;">
                © ${new Date().getFullYear()} YouTube Clone
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    console.log("📤 Sending email via Resend...");

    try {
      const emailResult = await resend.emails.send({
        from: "YouTube Clone <onboarding@resend.dev>",
        to: [email],
        subject: "🔐 Your Login OTP Code",
        html: htmlContent,
      });

      console.log("═══════════════════════════════════════");
      console.log("✅ EMAIL SENT SUCCESSFULLY");
      console.log("   Email ID:", emailResult.data?.id);
      console.log("   To:", email);
      console.log("═══════════════════════════════════════");

      return res.json({
        success: true,
        message: "OTP sent to your email!",
        debug: { otp, email }, // For testing
        emailId: emailResult.data?.id,
      });
    } catch (emailError) {
      console.error("❌ EMAIL SENDING ERROR:", emailError);
      console.error("   Details:", emailError.message);

      // OTP still stored, return with warning
      return res.json({
        success: true,
        message: "OTP generated (email delivery issue)",
        debug: { otp, email },
        warning: emailError.message,
      });
    }
  } catch (error) {
    console.error("❌ CRITICAL ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate OTP",
      details: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// SMS OTP - SECONDARY METHOD
// ═══════════════════════════════════════════════════════════════

const sendSMSOTP = async (req, res) => {
  try {
    let { phoneNumber } = req.body;

    console.log("═══════════════════════════════════════");
    console.log("📱 SMS OTP REQUEST");
    console.log("   Phone:", phoneNumber);
    console.log("═══════════════════════════════════════");

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
        error: "Invalid phone number format",
      });
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000;

    otpStore.set(phoneNumber, { otp, expiry: otpExpiry });
    otpStore.set(formattedPhone, { otp, expiry: otpExpiry });

    console.log("✅ SMS OTP GENERATED");
    console.log("   OTP:", otp);

    const client = initTwilioClient();

    if (!client) {
      console.log("⚠️ Twilio not configured");
      return res.json({
        success: true,
        message: "OTP generated (check console - Twilio not configured)",
        debug: { phoneNumber, formattedPhone, otp },
      });
    }

    setImmediate(async () => {
      try {
        await client.messages.create({
          body: `Your YouTube Clone OTP is: ${otp}. Valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
        });
        console.log("✅ SMS sent to:", formattedPhone);
      } catch (smsError) {
        console.error("⚠️ SMS error:", smsError.message);
      }
    });

    return res.json({
      success: true,
      message: "OTP sent to your phone!",
      debug: { otp, phoneNumber, formattedPhone },
    });
  } catch (error) {
    console.error("❌ SMS OTP ERROR:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate SMS OTP",
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

    console.log("═══════════════════════════════════════");
    console.log("🔐 OTP VERIFICATION");
    console.log("   Contact:", contact);
    console.log("   OTP:", otp);
    console.log("═══════════════════════════════════════");

    if (!otp || !contact) {
      return res.status(400).json({
        success: false,
        error: "OTP and contact are required",
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
      console.log("❌ OTP NOT FOUND");
      console.log("   Available keys:", Array.from(otpStore.keys()));
      return res.status(400).json({
        success: false,
        error: "OTP not found or expired. Request a new OTP.",
      });
    }

    if (Date.now() > storedData.expiry) {
      console.log("❌ OTP EXPIRED");
      otpStore.delete(contact);
      return res.status(400).json({
        success: false,
        error: "OTP expired. Request a new OTP.",
      });
    }

    if (storedData.otp !== otp) {
      console.log("❌ INVALID OTP");
      return res.status(400).json({
        success: false,
        error: "Invalid OTP. Please try again.",
      });
    }

    otpStore.delete(contact);
    if (/^\d{10}$/.test(contact)) {
      otpStore.delete(`+91${contact}`);
    }
    if (contact.startsWith("+91")) {
      otpStore.delete(contact.replace(/^\+91/, ""));
    }

    console.log("═══════════════════════════════════════");
    console.log("✅ OTP VERIFIED SUCCESSFULLY");
    console.log("═══════════════════════════════════════");

    res.json({
      success: true,
      message: "OTP verified successfully",
      verified: true,
      contact: contact,
    });
  } catch (error) {
    console.error("❌ VERIFICATION ERROR:", error);
    res.status(500).json({
      success: false,
      error: "OTP verification failed",
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
  console.log(`🗑️ Cleared ${size} OTP(s)`);
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
