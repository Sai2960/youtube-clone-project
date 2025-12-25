// server/utils/resendEmailService.js - PROFESSIONAL EMAIL SERVICE
import { Resend } from 'resend';

let resendClient = null;
let isInitialized = false;

// Initialize Resend client
function initializeResend() {
  if (isInitialized && resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;

  console.log('=== RESEND EMAIL CONFIGURATION ===');
  console.log('RESEND_API_KEY configured:', !!apiKey);
  console.log('==================================');

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY missing in environment');
    console.log('📝 Setup instructions:');
    console.log('   1. Go to https://resend.com/signup');
    console.log('   2. Get your API key from dashboard');
    console.log('   3. Add to .env: RESEND_API_KEY=re_xxxxx');
    return null;
  }

  try {
    resendClient = new Resend(apiKey);
    console.log('✅ Resend email service initialized');
    isInitialized = true;
    return resendClient;
  } catch (error) {
    console.error('❌ Resend initialization failed:', error.message);
    return null;
  }
}

// ✅ Send OTP Email using Resend
export const sendOTPEmail = async (email, otp, expiryMinutes = 5) => {
  const client = initializeResend();

  if (!client) {
    console.warn('⚠️ Resend not configured');
    return { 
      success: false, 
      skipped: true, 
      reason: 'Email service not configured' 
    };
  }

  try {
    console.log('📧 Sending OTP via Resend to:', email);

    const { data, error } = await client.emails.send({
      from: 'YouTube Clone <onboarding@resend.dev>', // ✅ Resend test domain
      to: [email],
      subject: '🔐 Your Login OTP Code',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OTP Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          
          <!-- Header with Brand -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 50px; margin-bottom: 20px;">
                <span style="font-size: 32px;">🎬</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                YouTube Clone
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">
                Your verification code is ready
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px; color: #1a1a1a; font-size: 16px; line-height: 1.6;">
                Hello! 👋
              </p>
              <p style="margin: 0 0 32px; color: #4a5568; font-size: 15px; line-height: 1.6;">
                Here's your one-time password to sign in to your account. This code will expire in <strong>${expiryMinutes} minutes</strong>.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px;">
                    <div style="font-size: 42px; font-weight: 700; color: #ffffff; letter-spacing: 12px; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 16px 20px; border-radius: 6px; margin-bottom: 32px;">
                <p style="margin: 0; color: #2d3748; font-size: 14px; line-height: 1.5;">
                  <strong>⏱️ Quick Tip:</strong> Enter this code on the login page within ${expiryMinutes} minutes to continue.
                </p>
              </div>

              <!-- Security Notice -->
              <p style="margin: 0 0 16px; color: #718096; font-size: 13px; line-height: 1.6;">
                If you didn't request this code, please ignore this email or contact our support team if you have concerns about your account security.
              </p>

              <!-- Button (Optional) -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                      Go to Login Page →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px; color: #718096; font-size: 13px; text-align: center; line-height: 1.5;">
                This is an automated email. Please do not reply to this message.
              </p>
              <p style="margin: 0; color: #a0aec0; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} YouTube Clone. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error('❌ Resend send error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ OTP EMAIL SENT SUCCESSFULLY');
    console.log('   Email ID:', data.id);
    console.log('   Recipient:', email);

    return { 
      success: true, 
      messageId: data.id,
      provider: 'resend'
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// ✅ Send Welcome Email (when new user signs up)
export const sendWelcomeEmail = async (email, name) => {
  const client = initializeResend();

  if (!client) {
    return { success: false, skipped: true };
  }

  try {
    const { data, error } = await client.emails.send({
      from: 'YouTube Clone <onboarding@resend.dev>',
      to: [email],
      subject: '🎉 Welcome to YouTube Clone!',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 32px;">🎉 Welcome!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a;">Hi ${name}!</h2>
              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Welcome to <strong>YouTube Clone</strong>! We're excited to have you on board.
              </p>
              <p style="margin: 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Start exploring videos, subscribe to channels, and enjoy your experience!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ✅ Get service status
export const getEmailStatus = () => {
  return {
    configured: !!process.env.RESEND_API_KEY,
    ready: isInitialized && !!resendClient,
    provider: 'Resend',
    freeLimit: '3,000 emails/month, 100/day'
  };
};

export default {
  sendOTPEmail,
  sendWelcomeEmail,
  getEmailStatus
};