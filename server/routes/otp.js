// server/routes/otp.js
import express from 'express';
import otpController from '../controllers/otp.js';

const router = express.Router();

console.log('🔐 OTP routes loaded');

// Send OTP routes
router.post('/send-email-otp', otpController.sendEmailOTP);
router.post('/send-sms-otp', otpController.sendSMSOTP);

// Verify OTP (single endpoint for both email and SMS)
router.post('/verify-otp', otpController.verifyOTP);

// Debug route (remove in production)
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    message: 'OTP routes are working',
    endpoints: {
      sendEmail: 'POST /api/otp/send-email-otp',
      sendSMS: 'POST /api/otp/send-sms-otp',
      verify: 'POST /api/otp/verify-otp'
    }
  });
});

export default router;