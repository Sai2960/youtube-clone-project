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

  if (!apiKey) {
    console.error("❌ BREVO_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    console.log("📤 Sending email to:", to);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "YouTube Clone",
          email: "noreply@trial-account.mailsend.com", // ✅ FIXED: Use Brevo's default sender
        },
        to: [{ email: to }],
        subject: "Your YouTube Clone Login Code",
        htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;">
        <tr>
          <td style="background:#FF0000;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;color:white;font-size:24px;">🔐 Login Verification</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px;color:#333;font-size:16px;">Your one-time password:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
              <tr>
                <td align="center" style="background:#FF0000;border-radius:8px;padding:20px;">
                  <div style="font-size:36px;font-weight:bold;color:#fff;letter-spacing:8px;">
                    ${otp}
                  </div>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#666;font-size:14px;">
              This code expires in 5 minutes. If you didn't request this, please ignore.
            </p>
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

    console.log("📨 Brevo Response:", {
      status: response.status,
      ok: response.ok,
      data: data,
    });

    if (response.ok && data.messageId) {
      console.log("✅ Email sent successfully! Message ID:", data.messageId);
      return { success: true, messageId: data.messageId };
    } else {
      console.error("❌ Brevo API Error:", data);
      return {
        success: false,
        error: data.message || data.code || "Email send failed",
        details: data,
      };
    }
  } catch (error) {
    console.error("❌ Brevo exception:", error);
    return { success: false, error: error.message };
  }
};
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

    // Store OTP BEFORE sending email
    otpStore.set(email, { otp, expiry: otpExpiry });

    console.log(`✅ OTP GENERATED: ${otp} (Expires in 5 min)`);

    // Send email via Brevo
    const emailResult = await sendBrevoEmail(email, otp);

    console.log(`📬 Email Result:`, emailResult);

    // ✅ PREMIUM: Show OTP in response for testing (with extended visibility)
    return res.json({
      success: true,
      message: emailResult.success
        ? "OTP sent to your email!"
        : "OTP generated (email may be delayed)",
      otp: otp, // ✅ Send OTP directly for premium display
      email,
      emailSent: emailResult.success,
      expiresIn: 300, // 5 minutes in seconds
      debug: {
        requestId,
        messageId: emailResult.messageId,
        emailError: emailResult.error,
      },
    });
  } catch (error) {
    console.error(`❌ ERROR [${requestId}]`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to process OTP request",
      details: error.message,
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
