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

// ✅ Protected routes - Authentication required
router.use(verifyToken); // Apply auth to all routes below

router.post('/create-order', createSubscriptionOrder);
router.post('/verify-payment', verifyPayment);
router.get('/current', getCurrentSubscription);
router.get('/check-watch-limit', checkWatchLimit);
router.get('/transactions', getTransactionHistory);
router.get('/user/:userId', getUserSubscription);
router.post('/cancel', cancelSubscription);
router.get('/analytics', getSubscriptionAnalytics);
router.post('/enforce-watch-limit', enforceWatchTimeLimit);

export default router;