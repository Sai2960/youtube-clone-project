// history.routes.js - COMPLETE & CORRECT VERSION

import express from 'express';
import { 
  handlehistory, 
  handleShortHistory,
  handleview, 
  getallhistoryVideo,
  deleteHistoryItem,
  clearAllHistory
} from '../controllers/history.js';

const router = express.Router();

console.log('✅ History routes loading...');

// ============================================================================
// GET ROUTES (fetch data)
// ⚠️ CRITICAL: Must be BEFORE parameterized routes to avoid conflicts
// ============================================================================

// GET /api/history/:userId - Get all watch history for a user (videos + shorts)
router.get('/:userId', getallhistoryVideo);

// ============================================================================
// POST ROUTES (add data)
// ============================================================================

// POST /api/history/video/:videoId - Add video to watch history
// Body: { userId, watchDuration?, watchPercentage?, device? }
router.post('/video/:videoId', handlehistory);

// POST /api/history/short/:shortId - Add short to watch history
// Body: { userId, watchDuration?, watchPercentage?, device? }
router.post('/short/:shortId', handleShortHistory);

// POST /api/history/views/:videoId - Increment video views only (no history entry)
router.post('/views/:videoId', handleview);

// ============================================================================
// DELETE ROUTES (remove data)
// ============================================================================

// DELETE /api/history/item/:historyId - Delete specific history item
// Body: { userId }
router.delete('/item/:historyId', deleteHistoryItem);

// DELETE /api/history/clear/:userId - Clear all history for user
// Query: ?contentType=video|short (optional)
router.delete('/clear/:userId', clearAllHistory);

console.log('✅ History routes loaded successfully');

export default router;