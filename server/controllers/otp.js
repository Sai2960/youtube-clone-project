// server/controllers/otp.js - ENHANCED VERSION
import nodemailer from "nodemailer";
import twilio from "twilio";

// Initialize email transporter
let emailTransporter = null;

const initEmailTransporter = () => {
  if (emailTransporter) return emailTransporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("⚠️ Email credentials not found in .env file");
    return null;
  }

  try {
    console.log("🔧 Initializing email transporter...");

    emailTransporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    emailTransporter.verify((error, success) => {
      if (error) {
        console.error("❌ Email verification failed:", error.message);
      } else {
        console.log("✅ Email transporter ready");
      }
    });

    return emailTransporter;
  } catch (error) {
    console.error("❌ Email transporter error:", error.message);
    return null;
  }
};

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

// Clean expired OTPs
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
}, 60000); // Check every 60 seconds (not too often)

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

    const transporter = initEmailTransporter();

    // ✅ If no email service, return success immediately
    if (!transporter) {
      console.log("⚠️ No email service configured - OTP logged above");
      return res.json({
        success: true,
        message: "OTP generated successfully (check server console)",
        debug: { email, otp },
      });
    }

    // ✅ Try to send email in background (don't wait for it)
    setImmediate(async () => {
      try {
        await Promise.race([
          transporter.sendMail({
            from: `"YouTube Clone" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your OTP for Login",
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f5f5f5;">
                <div style="background-color: white; padding: 30px; border-radius: 10px;">
                  <h2 style="color: #2563eb;">🔐 OTP Verification</h2>
                  <p style="font-size: 16px; color: #333;">
                    Your one-time password (OTP) is:
                  </p>
                  <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">
                      ${otp}
                    </span>
                  </div>
                  <p style="font-size: 14px; color: #666;">
                    ⏱️ This OTP expires in <strong>5 minutes</strong>.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
                  <p style="font-size: 12px; color: #999;">
                    If you didn't request this, please ignore this email.
                  </p>
                </div>
              </div>
            `,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Email timeout")), 30000)
          ),
        ]);

        console.log("✅ Email sent successfully to:", email);
      } catch (emailError) {
        console.error(
          "⚠️ Email send failed (OTP still valid):",
          emailError.message
        );
      }
    });

    // ✅ Return success immediately (don't wait for email)
    return res.json({
      success: true,
      message: "OTP generated successfully",
      debug: process.env.NODE_ENV === "development" ? { otp } : undefined,
    });
  } catch (error) {
    console.error("❌ Email OTP error:", error);

    // ✅ Only send response if headers not sent
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
    setImmediate(async () => {
      try {
        await client.messages.create({
          body: `Your YouTube Clone OTP is: ${otp}. Valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
        });

        console.log("✅ SMS sent successfully to:", formattedPhone);
      } catch (smsError) {
        console.error(
          "⚠️ SMS send failed (OTP still valid):",
          smsError.message
        );
      }
    });

    // ✅ Return success immediately
    return res.json({
      success: true,
      message: "OTP generated successfully",
      debug: process.env.NODE_ENV === "development" ? { otp } : undefined,
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

export default {
  sendEmailOTP,
  sendSMSOTP,
  verifyOTP,
};
