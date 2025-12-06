// server/utils/paymentGateway.js
import Razorpay from "razorpay";
import crypto from "crypto";

let razorpayInstance = null;
let isInitialized = false;

export const initializeRazorpay = () => {
  if (isInitialized) {
    return razorpayInstance;
  }

  try {
    // Strict validation - no fallback credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }

    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    console.log('✅ Razorpay initialized successfully');
    isInitialized = true;
    return razorpayInstance;
  } catch (error) {
    console.error('❌ Razorpay initialization failed:', error.message);
    isInitialized = true;
    return null;
  }
};

export const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    return initializeRazorpay();
  }
  return razorpayInstance;
};

export const verifyPaymentSignature = (orderId, paymentId, signature) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret key not configured');
  }
  
  const secret = process.env.RAZORPAY_KEY_SECRET;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(orderId + "|" + paymentId)
    .digest('hex');
    
  return expectedSignature === signature;
};