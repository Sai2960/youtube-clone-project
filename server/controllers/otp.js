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
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expiry < now) {
      otpStore.delete(key);
      console.log("🗑️ Cleaned expired OTP for:", key);
    }
  }
}, 60000);

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

    const blockList = ["test@example.com", "example.com", "test.com"];
    if (blockList.some((blocked) => email.toLowerCase().includes(blocked))) {
      return res.status(400).json({
        success: false,
        error: "Please use a valid email address",
      });
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000; // 5 minutes

    otpStore.set(email, { otp, expiry: otpExpiry });

    const transporter = initEmailTransporter();

    if (!transporter) {
      console.log("═══════════════════════════════════════");
      console.log("📧 EMAIL OTP (Mock Mode)");
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log("⚠️ Configure EMAIL_USER and EMAIL_PASSWORD in .env");
      console.log("═══════════════════════════════════════");

      return res.json({
        success: true,
        message: "OTP generated (check server console)",
        debug: { email, otp }, // ✅ Include OTP for testing
      });
    }

    console.log("📤 Sending email OTP to:", email);

    try {
      await transporter.sendMail({
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
      });

      console.log("═══════════════════════════════════════");
      console.log("✅ EMAIL OTP SENT");
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log("═══════════════════════════════════════");

      res.json({
        success: true,
        message: "OTP sent to your email",
        debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
      });
    } catch (emailError) {
      console.error("❌ Email failed:", emailError);

      console.log("═══════════════════════════════════════");
      console.log("⚠️ EMAIL FAILED - OTP for testing:");
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log("═══════════════════════════════════════");

      return res.json({
        success: true,
        message: "OTP generated (email failed - check console)",
        debug: { email, otp },
      });
    }
  } catch (error) {
    console.error("❌ Email OTP error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send OTP",
      details: error.message,
    });
  }
};

// Send SMS OTP - ENHANCED
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

    // ✅ Store with BOTH formats
    otpStore.set(phoneNumber, { otp, expiry: otpExpiry });
    otpStore.set(formattedPhone, { otp, expiry: otpExpiry });

    const client = initTwilioClient();

    if (!client) {
      console.log("═══════════════════════════════════════");
      console.log("📱 SMS OTP (Mock Mode)");
      console.log(`Phone: ${phoneNumber}`);
      console.log(`Formatted: ${formattedPhone}`);
      console.log(`OTP: ${otp}`);
      console.log("⚠️ Configure Twilio credentials in .env");
      console.log("═══════════════════════════════════════");

      return res.json({
        success: true,
        message: "OTP generated (check server console)",
        debug: { phoneNumber, formattedPhone, otp },
      });
    }

    console.log("📤 Sending SMS...");

    await client.messages.create({
      body: `Your YouTube Clone OTP is: ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log("═══════════════════════════════════════");
    console.log("✅ SMS OTP SENT");
    console.log(`Phone: ${formattedPhone}`);
    console.log(`OTP: ${otp}`);
    console.log("═══════════════════════════════════════");

    res.json({
      success: true,
      message: "OTP sent to your mobile",
      debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
    });
  } catch (error) {
    console.error("❌ SMS OTP error:", error);

    let errorMessage = "Failed to send OTP";
    if (error.code === 21211) {
      errorMessage = "Invalid phone number";
    } else if (error.code === 21608) {
      errorMessage = "Phone not verified in Twilio trial";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
    });
  }
};

// ✅ ENHANCED: Verify OTP with flexible phone matching
const verifyOTP = async (req, res) => {
  try {
    const { otp, contact } = req.body;

    console.log("🔐 Verify OTP:");
    console.log("   OTP:", otp);
    console.log("   Contact:", contact);

    if (!otp || !contact) {
      return res.status(400).json({
        success: false,
        error: "OTP and contact required",
      });
    }

    // ✅ Try original contact first
    let storedData = otpStore.get(contact);

    // ✅ If phone number, try formatted versions
    if (!storedData && /^\d{10}$/.test(contact)) {
      const withPrefix = `+91${contact}`;
      storedData = otpStore.get(withPrefix);
      console.log(`🔄 Tried: ${withPrefix}`);
    }

    // ✅ Try without +91 prefix
    if (!storedData && contact.startsWith('+91')) {
      const without = contact.replace(/^\+91/, '');
      storedData = otpStore.get(without);
      console.log(`🔄 Tried: ${without}`);
    }

    if (!storedData) {
      console.log(`❌ OTP not found for: ${contact}`);
      console.log("📋 Available keys:", Array.from(otpStore.keys()));
      return res.status(400).json({
        success: false,
        error: "OTP not found. Please request new OTP.",
      });
    }

    if (Date.now() > storedData.expiry) {
      otpStore.delete(contact);
      return res.status(400).json({
        success: false,
        error: "OTP expired. Please request new OTP.",
      });
    }

    if (storedData.otp !== otp) {
      console.log(`❌ Invalid OTP`);
      console.log(`   Provided: ${otp}`);
      console.log(`   Expected: ${storedData.otp}`);
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
      });
    }

    // ✅ Delete all format variations
    otpStore.delete(contact);
    if (/^\d{10}$/.test(contact)) {
      otpStore.delete(`+91${contact}`);
    }
    if (contact.startsWith('+91')) {
      otpStore.delete(contact.replace(/^\+91/, ''));
    }

    console.log("═══════════════════════════════════════");
    console.log("✅ OTP VERIFIED");
    console.log(`Contact: ${contact}`);
    console.log("═══════════════════════════════════════");

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("❌ Verification error:", error);
    res.status(500).json({
      success: false,
      error: "Verification failed",
    });
  }
};

export default {
  sendEmailOTP,
  sendSMSOTP,
  verifyOTP,
};