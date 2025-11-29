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
  getSubscriptionAnalytics
} from '../controllers/subscription.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/plans', getAvailablePlans);

// Protected routes (require authentication)
router.post('/create-order', verifyToken, createSubscriptionOrder);
router.post('/verify-payment', verifyToken, verifyPayment);
router.get('/current', verifyToken, getCurrentSubscription);
router.get('/check-watch-limit', verifyToken, checkWatchLimit);
router.get('/transactions', verifyToken, getTransactionHistory);
router.get('/user/:userId', verifyToken, getUserSubscription);
router.post('/cancel', verifyToken, cancelSubscription); // ✅ Removed /:userId
router.get('/analytics', verifyToken, getSubscriptionAnalytics);

export default router;