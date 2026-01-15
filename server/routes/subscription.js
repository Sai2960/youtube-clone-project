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
router.get('/plans', getAvailablePlans);

// ✅ Protected routes - Authentication required
router.post('/create-order', verifyToken, createSubscriptionOrder);
router.post('/verify-payment', verifyToken, verifyPayment);
router.get('/current', verifyToken, getCurrentSubscription);
router.get('/check-watch-limit', verifyToken, checkWatchLimit);
router.get('/transactions', verifyToken, getTransactionHistory);
router.get('/user/:userId', verifyToken, getUserSubscription);
router.post('/cancel', verifyToken, cancelSubscription);
router.get('/analytics', verifyToken, getSubscriptionAnalytics);
router.post('/enforce-watch-limit', verifyToken, enforceWatchTimeLimit);

// ✅ CRITICAL: Add catch-all route for debugging
router.use((req, res) => {
  console.log("❌ Subscription route not found:", req.method, req.path);
  res.status(404).json({
    success: false,
    message: 'Subscription endpoint not found',
    attemptedPath: req.path,
    availableRoutes: ['/plans', '/current', '/create-order', '/verify-payment', '/cancel']
  });
});

export default router;