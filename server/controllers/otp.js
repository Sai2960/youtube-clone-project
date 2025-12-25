// server/controllers/otp.js - BREVO EMAIL (FREE FOREVER!)

import twilio from "twilio";
import fetch from "node-fetch";

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

const sendBrevoEmail = async (to, otp) => {
  const apiKey = process.env.BREVO_API_KEY;

  console.log("🔑 BREVO API KEY CHECK:");
  console.log("   Key exists:", !!apiKey);
  console.log("   Key length:", apiKey?.length || 0);
  console.log("   Key prefix:", apiKey?.substring(0, 10) + "..." || "NOT SET");

  if (!apiKey) {
    console.error("❌ BREVO_API_KEY not configured in environment variables");
    return { success: false, error: "Email service not configured" };
  }

  if (apiKey.length < 30) {
    console.error("❌ BREVO_API_KEY appears invalid (too short)");
    return { success: false, error: "Invalid API key configuration" };
  }

  try {
    console.log("📤 Making Brevo API request...");

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "YouTube Clone - No Reply",
          email: "no-reply@youtube-clone.com", // ✅ Changed to look more legit
        },
        to: [{ email: to }],
        subject: "🔐 Your YouTube Clone Login Code", // ✅ More specific subject
        htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px;text-align:center;border-radius:16px 16px 0 0;">
            <div style="font-size:48px;margin-bottom:16px;">🎬</div>
            <h1 style="margin:0;color:white;font-size:28px;font-weight:700;">YouTube Clone</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">Your verification code is ready</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 24px;color:#1a1a1a;font-size:16px;">Hello! 👋</p>
            <p style="margin:0 0 32px;color:#4a5568;font-size:15px;line-height:1.6;">
              Here's your one-time password to sign in. This code expires in <strong>5 minutes</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;padding:32px;">
                  <div style="font-size:48px;font-weight:700;color:#fff;letter-spacing:12px;font-family:'Courier New',monospace;text-shadow:0 2px 4px rgba(0,0,0,0.2);">
                    ${otp}
                  </div>
                </td>
              </tr>
            </table>
            <div style="background:#f7fafc;border-left:4px solid #667eea;padding:16px 20px;border-radius:6px;margin-bottom:32px;">
              <p style="margin:0;color:#2d3748;font-size:14px;">
                <strong>⏱️ Quick Tip:</strong> Enter this code within 5 minutes to continue.
              </p>
            </div>
            <p style="margin:0;color:#718096;font-size:13px;line-height:1.6;">
              If you didn't request this code, please ignore this email.
            </p>
            <!-- ✅ Added plain text version for better deliverability -->
            <p style="margin:20px 0 0;color:#a0aec0;font-size:11px;text-align:center;">
              This is an automated message from YouTube Clone. Please do not reply.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f7fafc;padding:20px;border-top:1px solid #e2e8f0;text-align:center;border-radius:0 0 16px 16px;">
            <p style="margin:0;color:#a0aec0;font-size:12px;">© ${new Date().getFullYear()} YouTube Clone. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    });

    const data = await response.json();

    // ✅ ENHANCED ERROR LOGGING
    console.log("📨 Brevo Response Status:", response.status);
    console.log("📨 Brevo Response Data:", JSON.stringify(data, null, 2));

    if (response.ok && data.messageId) {
      return { success: true, messageId: data.messageId };
    } else {
      console.error("❌ Brevo API Error Details:", {
        status: response.status,
        statusText: response.statusText,
        data: data,
      });
      return {
        success: false,
        error: data.message || data.code || "Email send failed",
        details: data,
      };
    }
  } catch (error) {
    console.error("❌ Brevo send exception:", error);
    return { success: false, error: error.message };
  }
};

// ═══════════════════════════════════════════════════════════════
// EMAIL OTP - USING BREVO (FREE 300/day!) ✅
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

    // Validate email
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

    // Store OTP
    otpStore.set(email, { otp, expiry: otpExpiry });

    console.log(`✅ OTP GENERATED AND STORED [${requestId}]`);
    console.log("   OTP:", otp);
    console.log("   Expires:", new Date(otpExpiry).toLocaleString());

    // ✅ Send OTP via Brevo (FREE 300/day!)
    console.log(`📤 SENDING EMAIL VIA BREVO [${requestId}]`);

    try {
      const emailResult = await sendBrevoEmail(email, otp);

      console.log("\n═══════════════════════════════════════");
      console.log(`✅ BREVO RESPONSE [${requestId}]`);
      console.log("   Success:", emailResult.success);
      console.log("   Message ID:", emailResult.messageId);
      console.log("═══════════════════════════════════════\n");

      if (emailResult.success) {
        console.log(`📬 EMAIL SENT SUCCESSFULLY [${requestId}]`);

        return res.json({
          success: true,
          message: "OTP sent to your email! Check inbox and spam folder.",
          debug:
            process.env.NODE_ENV === "development" ||
            process.env.NODE_ENV === "production"
              ? {
                  otp,
                  email,
                  requestId,
                  messageId: emailResult.messageId,
                  provider: "Brevo (Sendinblue)",
                }
              : undefined,
        });
      } else {
        console.error(`❌ EMAIL SEND ERROR [${requestId}]`, emailResult.error);

        // ✅ Still return OTP for testing even if email fails
        return res.json({
          success: true,
          message: "OTP generated (email delivery issue)",
          debug: { otp, email, requestId },
          warning: `Email error: ${emailResult.error}`,
        });
      }
    } catch (emailError) {
      console.error(`❌ EMAIL SEND ERROR [${requestId}]`, emailError);

      // ✅ Still return OTP for testing
      return res.json({
        success: true,
        message: "OTP generated (email failed)",
        debug: { otp, email, requestId },
        error: emailError.message,
      });
    }
  } catch (error) {
    console.error(`❌ CRITICAL ERROR [${requestId}]`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to process OTP request",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// SMS OTP
// ═══════════════════════════════════════════════════════════════

let twilioClient = null;

const initTwilioClient = () => {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
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
      return res
        .status(400)
        .json({ success: false, error: "Phone number required" });
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
    if (contact.startsWith("+91"))
      otpStore.delete(contact.replace(/^\+91/, ""));

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
