// server/utils/emailService.js
import nodemailer from "nodemailer";

let transporter = null;
let isInitialized = false;

// Initialize transporter lazily (only when first needed)
function initializeTransporter() {
  if (isInitialized) {
    return transporter;
  }

  // Safe debug logging - no actual credentials exposed
  console.log('=== EMAIL CONFIGURATION ===');
  console.log('EMAIL_USER configured:', !!process.env.EMAIL_USER);
  console.log('EMAIL_PASSWORD configured:', !!process.env.EMAIL_PASSWORD);
  console.log('===========================');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Email credentials missing in environment variables');
    console.log('Please set EMAIL_USER and EMAIL_PASSWORD in your .env file');
    isInitialized = true;
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
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
    
    transporter.verify(function(error, success) {
      if (error) {
        console.error('❌ Email transporter verification failed:', error.message);
      } else {
        console.log('✅ Email transporter ready to send emails');
      }
    });

    isInitialized = true;
    return transporter;
  } catch (error) {
    console.error('❌ Email transporter initialization failed:', error.message);
    isInitialized = true;
    return null;
  }
}

export const sendInvoiceEmail = async (email, name, invoicePath, invoiceData) => {
  try {
    // Initialize transporter when first email is sent
    const emailTransporter = initializeTransporter();

    if (!emailTransporter) {
      console.warn('⚠️ Email transporter not available, skipping email');
      return;
    }

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

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Invoice email sent successfully');
    console.log('Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    throw error;
  }
};