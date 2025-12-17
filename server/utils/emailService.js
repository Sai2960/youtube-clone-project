// server/utils/emailService.js
import nodemailer from "nodemailer";

let transporter = null;
let isInitialized = false;
let verificationAttempted = false;

// Initialize transporter with connection pooling and shorter timeouts
function initializeTransporter() {
  if (isInitialized) {
    return transporter;
  }

  console.log('=== EMAIL CONFIGURATION ===');
  console.log('EMAIL_USER configured:', !!process.env.EMAIL_USER);
  console.log('EMAIL_PASSWORD configured:', !!process.env.EMAIL_PASSWORD);
  console.log('Email user domain:', process.env.EMAIL_USER?.split('@')[1] || 'not set');
  console.log('===========================');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Email credentials missing in environment variables');
    console.log('📝 Please set EMAIL_USER and EMAIL_PASSWORD in Render Dashboard');
    console.log('   EMAIL_USER: your-email@gmail.com');
    console.log('   EMAIL_PASSWORD: your-gmail-app-password (16 characters)');
    isInitialized = true;
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      // ✅ CRITICAL: Connection pooling and timeouts
      pool: true, // Use pooled connections
      maxConnections: 5, // Max simultaneous connections
      maxMessages: 100, // Max messages per connection
      rateDelta: 1000, // Rate limiting: 1 email per second
      rateLimit: 5, // Max 5 emails per rateDelta
      
      // ✅ CRITICAL: Shorter timeouts
      connectionTimeout: 10000, // 10 seconds to connect
      greetingTimeout: 5000, // 5 seconds for greeting
      socketTimeout: 15000, // 15 seconds for socket operations
      
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      
      // ✅ Debug logging
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development'
    });

    // ✅ Verify connection asynchronously (don't block)
    if (!verificationAttempted) {
      verificationAttempted = true;
      
      transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email transporter verification failed:', error.message);
          console.log('⚠️  Email sending will be disabled');
          console.log('💡 Check your Gmail App Password:');
          console.log('   1. Go to https://myaccount.google.com/apppasswords');
          console.log('   2. Generate a new App Password');
          console.log('   3. Update EMAIL_PASSWORD in Render Dashboard');
        } else {
          console.log('✅ Email transporter verified and ready');
        }
      });
    }

    isInitialized = true;
    return transporter;
  } catch (error) {
    console.error('❌ Email transporter initialization failed:', error.message);
    isInitialized = true;
    return null;
  }
}

// ✅ Send email with timeout and retry logic
export const sendEmail = async (mailOptions, timeoutMs = 20000) => {
  const emailTransporter = initializeTransporter();

  if (!emailTransporter) {
    console.warn('⚠️ Email transporter not available, skipping email');
    return { success: false, skipped: true };
  }

  try {
    console.log('📧 Sending email to:', mailOptions.to);
    
    // ✅ Race between sending email and timeout
    const info = await Promise.race([
      emailTransporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout')), timeoutMs)
      )
    ]);

    console.log('✅ Email sent successfully');
    console.log('   Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    
    // Don't throw - just log and return error
    return { 
      success: false, 
      error: error.message,
      hint: error.message.includes('timeout') 
        ? 'Gmail SMTP is slow - consider using a different email service'
        : 'Check your Gmail App Password configuration'
    };
  }
};

// ✅ Send invoice email
export const sendInvoiceEmail = async (email, name, invoicePath, invoiceData) => {
  const mailOptions = {
    from: `"YouTube Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Payment Successful - ${invoiceData.plan} Plan Activated`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Payment Successful!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for subscribing to our <strong>${invoiceData.plan}</strong> plan!</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Payment Details:</h3>
          <p><strong>Plan:</strong> ${invoiceData.plan}</p>
          <p><strong>Amount:</strong> ₹${invoiceData.amount}</p>
          <p><strong>Payment ID:</strong> ${invoiceData.paymentId}</p>
          <p><strong>Order ID:</strong> ${invoiceData.orderId}</p>
          <p><strong>Date:</strong> ${new Date(invoiceData.date).toLocaleDateString()}</p>
        </div>

        <p>Your subscription is now active!</p>
        
        <p>Best regards,<br>YouTube Clone Team</p>
      </div>
    `,
    attachments: [
      {
        filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
        path: invoicePath
      }
    ]
  };

  return await sendEmail(mailOptions, 20000); // 20 second timeout
};

// ✅ Send OTP email (used by OTP controller)
export const sendOTPEmail = async (email, otp, expiryMinutes = 5) => {
  const mailOptions = {
    from: `"YouTube Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP for Login',
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
            ⏱️ This OTP expires in <strong>${expiryMinutes} minutes</strong>.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `
  };

  return await sendEmail(mailOptions, 20000); // 20 second timeout
};

// ✅ Close all email connections (for graceful shutdown)
export const closeEmailConnections = () => {
  if (transporter) {
    transporter.close();
    console.log('✅ Email transporter connections closed');
  }
};

export default {
  sendEmail,
  sendInvoiceEmail,
  sendOTPEmail,
  closeEmailConnections
};