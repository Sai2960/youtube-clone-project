// server/routes/subscription.js - COMPLETE FILE
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

// ✅ CRITICAL: Add logging middleware FIRST
router.use((req, res, next) => {
  console.log("📍 Subscription Router Hit:", {
    method: req.method,
    path: req.path,
    fullUrl: req.originalUrl,
    hasAuth: !!req.headers.authorization
  });
  next();
});

// ✅ Public routes - NO authentication required
router.get('/plans', (req, res, next) => {
  console.log("📋 Plans route hit");
  getAvailablePlans(req, res, next);
});

// ✅ Protected routes - Authentication required
router.post('/create-order', verifyToken, (req, res, next) => {
  console.log("💳 Create order route hit");
  createSubscriptionOrder(req, res, next);
});

router.post('/verify-payment', verifyToken, (req, res, next) => {
  console.log("✅ Verify payment route hit");
  verifyPayment(req, res, next);
});

router.get('/current', verifyToken, (req, res, next) => {
  console.log("📊 Current subscription route hit");
  getCurrentSubscription(req, res, next);
});

router.get('/check-watch-limit', verifyToken, (req, res, next) => {
  console.log("⏱️ Check watch limit route hit");
  checkWatchLimit(req, res, next);
});

router.get('/transactions', verifyToken, (req, res, next) => {
  console.log("📜 Transactions route hit");
  getTransactionHistory(req, res, next);
});

router.get('/user/:userId', verifyToken, (req, res, next) => {
  console.log("👤 User subscription route hit");
  getUserSubscription(req, res, next);
});

router.post('/cancel', verifyToken, (req, res, next) => {
  console.log("❌ Cancel subscription route hit");
  cancelSubscription(req, res, next);
});

router.get('/analytics', verifyToken, (req, res, next) => {
  console.log("📈 Analytics route hit");
  getSubscriptionAnalytics(req, res, next);
});

router.post('/enforce-watch-limit', verifyToken, (req, res, next) => {
  console.log("🚫 Enforce watch limit route hit");
  enforceWatchTimeLimit(req, res, next);
});

// ✅ CRITICAL: Add catch-all route for debugging
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
      'POST /cancel',
      'GET /check-watch-limit',
      'GET /transactions'
    ]
  });
});

export default router;