// server/controllers/otp.js - FIXED WITH PHONE NUMBER FORMATTING
import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Initialize email transporter
let emailTransporter = null;

const initEmailTransporter = () => {
  if (emailTransporter) return emailTransporter;
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️ Email credentials not found in .env file');
    return null;
  }

  try {
    console.log('🔧 Initializing email transporter...');
    
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    emailTransporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email verification failed:', error.message);
      } else {
        console.log('✅ Email transporter ready');
      }
    });

    return emailTransporter;
  } catch (error) {
    console.error('❌ Email transporter error:', error.message);
    return null;
  }
};

// Initialize Twilio client
let twilioClient = null;

const initTwilioClient = () => {
  if (twilioClient) return twilioClient;
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('⚠️ Twilio credentials not found in .env file');
    return null;
  }

  try {
    console.log('🔧 Initializing Twilio client...');
    
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    console.log('✅ Twilio client initialized');
    return twilioClient;
  } catch (error) {
    console.error('❌ Twilio initialization error:', error.message);
    return null;
  }
};

// OTP storage
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ✅ FORMAT PHONE NUMBER FOR TWILIO (E.164 FORMAT)
const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If already has country code (+), return as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If starts with country code without +, add it
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  // If it's a 10-digit Indian number, add +91
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  
  // Default: assume it needs +91
  return `+91${cleaned}`;
};

// Clean expired OTPs
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expiry < now) {
      otpStore.delete(key);
      console.log('🗑️ Cleaned expired OTP for:', key);
    }
  }
}, 60000);

// Send Email OTP
const sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('📧 Send Email OTP request for:', email);
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Block test/fake emails
    const blockList = ['test@example.com', 'example.com', 'test.com'];
    if (blockList.some(blocked => email.toLowerCase().includes(blocked))) {
      return res.status(400).json({
        success: false,
        error: 'Please use a valid email address (not test/example emails)'
      });
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000; // 5 minutes
    
    // Store OTP
    otpStore.set(email, { otp, expiry: otpExpiry });

    const transporter = initEmailTransporter();
    
    if (!transporter) {
      // Mock mode - log OTP
      console.log('═══════════════════════════════════════');
      console.log('📧 EMAIL OTP (Mock Mode - No email sent)');
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log('⚠️ Configure EMAIL_USER and EMAIL_PASSWORD in .env');
      console.log('═══════════════════════════════════════');
      
      return res.json({ 
        success: true, 
        message: 'OTP generated (check server console)',
        debug: { email }
      });
    }
    
    console.log('📤 Sending email OTP to:', email);
    
    // Send email with error handling
    try {
      await transporter.sendMail({
        from: `"YouTube Clone" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your OTP for Login - YouTube Clone',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f5f5f5;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2563eb; margin-bottom: 20px;">🔐 OTP Verification</h2>
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Your one-time password (OTP) for login is:
              </p>
              <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">
                  ${otp}
                </span>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 20px;">
                ⏱️ This OTP will expire in <strong>5 minutes</strong>.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
              <p style="font-size: 12px; color: #999;">
                If you didn't request this OTP, please ignore this email.
              </p>
            </div>
          </div>
        `
      });
      
      console.log('═══════════════════════════════════════');
      console.log('✅ EMAIL OTP SENT SUCCESSFULLY');
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log('═══════════════════════════════════════');
      
      res.json({ 
        success: true, 
        message: 'OTP sent to your email. Check your inbox!',
        debug: { email }
      });
      
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      
      // Still return success but log OTP for testing
      console.log('═══════════════════════════════════════');
      console.log('⚠️ EMAIL FAILED - OTP for testing:');
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log('Error:', emailError.message);
      console.log('═══════════════════════════════════════');
      
      return res.json({
        success: true,
        message: 'OTP generated (check server console - email failed)',
        debug: { email, error: emailError.message }
      });
    }
    
  } catch (error) {
    console.error('❌ Email OTP error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send OTP',
      details: error.message 
    });
  }
};

// Send SMS OTP - ✅ FIXED
const sendSMSOTP = async (req, res) => {
  try {
    let { phoneNumber } = req.body;
    
    console.log('📱 Send SMS OTP request for:', phoneNumber);
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone number is required' 
      });
    }

    // ✅ FORMAT PHONE NUMBER TO E.164
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('📞 Formatted phone number:', formattedPhone);

    // Validate formatted number
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formattedPhone)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid phone number format. Use: 9876543210 or +919876543210' 
      });
    }
    
    const otp = generateOTP();
    const otpExpiry = Date.now() + 300000; // 5 minutes
    
    // ✅ Store OTP with BOTH formats for flexible verification
    otpStore.set(phoneNumber, { otp, expiry: otpExpiry });
    otpStore.set(formattedPhone, { otp, expiry: otpExpiry });
    
    const client = initTwilioClient();
    
    if (!client) {
      // Mock mode - log OTP
      console.log('═══════════════════════════════════════');
      console.log('📱 SMS OTP (Mock Mode)');
      console.log(`Phone (Original): ${phoneNumber}`);
      console.log(`Phone (Formatted): ${formattedPhone}`);
      console.log(`OTP: ${otp}`);
      console.log('⚠️ Configure Twilio credentials in .env:');
      console.log('   TWILIO_ACCOUNT_SID');
      console.log('   TWILIO_AUTH_TOKEN');
      console.log('   TWILIO_PHONE_NUMBER');
      console.log('═══════════════════════════════════════');
      
      return res.json({ 
        success: true, 
        message: 'OTP generated (Twilio not configured - check server console)',
        debug: { phoneNumber, formattedPhone }
      });
    }
    
    console.log('📤 Sending SMS via Twilio...');
    console.log('   From:', process.env.TWILIO_PHONE_NUMBER);
    console.log('   To:', formattedPhone);
    
    // Send SMS via Twilio with FORMATTED number
    await client.messages.create({
      body: `Your YouTube Clone OTP is: ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone // ✅ Use formatted number
    });
    
    console.log('═══════════════════════════════════════');
    console.log('✅ SMS OTP SENT SUCCESSFULLY');
    console.log(`Phone (Original): ${phoneNumber}`);
    console.log(`Phone (Formatted): ${formattedPhone}`);
    console.log(`OTP: ${otp}`);
    console.log('═══════════════════════════════════════');
    
    res.json({ 
      success: true, 
      message: 'OTP sent to your mobile number',
      debug: { phoneNumber, formattedPhone }
    }); 
  } catch (error) {
    console.error('❌ SMS OTP error:', error);
    
    // Provide more helpful error message
    let errorMessage = 'Failed to send OTP';
    if (error.code === 21211) {
      errorMessage = 'Invalid phone number format. Please use: +919876543210';
    } else if (error.code === 21608) {
      errorMessage = 'This phone number is not verified in Twilio trial account';
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: error.message,
      code: error.code
    });
  }
};

// Verify OTP - ✅ ENHANCED
const verifyOTP = async (req, res) => {
  try {
    const { otp, contact } = req.body;
    
    console.log('🔐 Verify OTP request:');
    console.log('   OTP:', otp);
    console.log('   Contact:', contact);
    
    if (!otp) {
      return res.status(400).json({ 
        success: false,
        error: 'OTP is required' 
      });
    }

    if (!contact) {
      return res.status(400).json({ 
        success: false,
        error: 'Contact (email or phone) is required' 
      });
    }
    
    // ✅ Try to find OTP with original contact
    let storedData = otpStore.get(contact);
    
    // ✅ If not found and looks like phone, try formatted version
    if (!storedData && /^\d{10}$/.test(contact)) {
      const formattedPhone = formatPhoneNumber(contact);
      storedData = otpStore.get(formattedPhone);
      console.log(`🔄 Trying formatted phone: ${formattedPhone}`);
    }
    
    if (!storedData) {
      console.log(`❌ OTP not found for: ${contact}`);
      console.log('Available contacts:', Array.from(otpStore.keys()));
      return res.status(400).json({ 
        success: false,
        error: 'OTP not found. Please request a new OTP.' 
      });
    }
    
    if (Date.now() > storedData.expiry) {
      otpStore.delete(contact);
      console.log(`❌ OTP expired for: ${contact}`);
      return res.status(400).json({ 
        success: false,
        error: 'OTP has expired. Please request a new OTP.' 
      });
    }
    
    if (storedData.otp !== otp) {
      console.log(`❌ Invalid OTP for: ${contact}`);
      console.log(`   Provided: ${otp}`);
      console.log(`   Expected: ${storedData.otp}`);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid OTP. Please try again.' 
      });
    }
    
    // OTP is valid - delete both formats
    otpStore.delete(contact);
    if (/^\d{10}$/.test(contact)) {
      otpStore.delete(formatPhoneNumber(contact));
    }
    
    console.log('═══════════════════════════════════════');
    console.log('✅ OTP VERIFIED SUCCESSFULLY');
    console.log(`Contact: ${contact}`);
    console.log('═══════════════════════════════════════');
    
    res.json({ 
      success: true, 
      message: 'OTP verified successfully' 
    });
  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Verification failed',
      details: error.message 
    });
  }
};

export default {
  sendEmailOTP,
  sendSMSOTP,
  verifyOTP
};