// server/routes/subscription.js - FIXED VERSION
import express from 'express';
import {
  createSubscriptionOrder,
  verifyPayment,
  getCurrentSubscription,
  checkWatchLimit,
  getTransactionHistory,
  getAvailablePlans,
  getUserSubscription,
  cancelSubscription,
  getSubscriptionAnalytics,
  enforceWatchTimeLimit
} from '../controllers/subscription.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// ✅ CRITICAL: Logging middleware
router.use((req, res, next) => {
  console.log("\n🔍 ===== SUBSCRIPTION ROUTE =====");
  console.log("   Method:", req.method);
  console.log("   Path:", req.path);
  console.log("   Full URL:", req.originalUrl);
  console.log("   Auth:", !!req.headers.authorization);
  console.log("================================\n");
  next();
});

// ✅ Public routes (no auth needed)
router.get('/plans', getAvailablePlans);

// ✅ Protected routes
router.post('/create-order', verifyToken, createSubscriptionOrder);
router.post('/verify-payment', verifyToken, verifyPayment);
router.get('/current', verifyToken, getCurrentSubscription);
router.get('/check-watch-limit', verifyToken, checkWatchLimit);
router.get('/transactions', verifyToken, getTransactionHistory);
router.get('/user/:userId', verifyToken, getUserSubscription);
router.post('/cancel', verifyToken, cancelSubscription);
router.get('/analytics', verifyToken, getSubscriptionAnalytics);
router.post('/enforce-watch-limit', verifyToken, enforceWatchTimeLimit);

// ✅ Debug: Catch-all for 404
router.use((req, res) => {
  console.log("❌ Subscription route not found:", req.method, req.path);
  res.status(404).json({
    success: false,
    message: 'Subscription endpoint not found',
    attemptedPath: req.path,
    method: req.method,
    availableRoutes: [
      'GET /plans',
      'GET /current',
      'POST /create-order',
      'POST /verify-payment',
      'POST /cancel'
    ]
  });
});

export default router;