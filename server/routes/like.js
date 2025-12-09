// routes/like.js - COMPLETE FIXED VERSION
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { 
  handlelike, 
  getallLikedVideo,
  handleShortLike, 
  getAllLikedShorts,
  getAllLikedContent
} from '../controllers/like.js';

const router = express.Router();

// ==================== TEST ROUTE ====================
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Like routes are working!',
    timestamp: new Date().toISOString()
  });
});

// ==================== MOST SPECIFIC ROUTES FIRST ====================

// ✅ Get all liked content (videos + shorts combined)
router.get('/all/:userId', verifyToken, getAllLikedContent);

// ✅ Get all liked videos for a user
router.get('/videos/:userId', verifyToken, getallLikedVideo);

// ✅ Get all liked shorts for a user
router.get('/shorts/:userId', verifyToken, getAllLikedShorts);

// ✅ Like/unlike a short
router.post('/short/:shortId', verifyToken, handleShortLike);

// ✅ Like/unlike/dislike a video (MOST IMPORTANT)
router.post('/video/:videoId', verifyToken, handlelike);

// ✅ CRITICAL FIX: This should call getAllLikedContent (not getallLikedVideo)
// This is the endpoint that the LikedVideosContent component uses
router.get('/:userId', verifyToken, getAllLikedContent);

// ✅ Alternative endpoint for just video ID (used by VideoInfo)
router.post('/:videoId', verifyToken, handlelike);

export default router;