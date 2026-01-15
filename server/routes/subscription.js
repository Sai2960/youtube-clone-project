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

// ✅ Public routes - NO authentication required
router.get('/plans', getAvailablePlans);
// ✅ Debug middleware
router.use((req, res, next) => {
  console.log("📍 Subscription Router:", req.method, req.path);
  next();
});
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

export default router;