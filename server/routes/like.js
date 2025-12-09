import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { 
  handlelike, 
  getallLikedVideo,
  handleShortLike, 
  getAllLikedShorts,
  getAllLikedContent,
  checkVideoReaction  // ✅ ADD THIS
} from '../controllers/like.js';

const router = express.Router();

// ✅ Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Like routes are working!',
    timestamp: new Date().toISOString()
  });
});

// ✅ NEW: Check user's reaction for a specific video (MUST BE BEFORE /:userId)
router.get('/check/:videoId/:userId', verifyToken, checkVideoReaction);

// ✅ Get all liked content (videos + shorts combined)
router.get('/all/:userId', verifyToken, getAllLikedContent);

// ✅ Get all liked videos for a user
router.get('/videos/:userId', verifyToken, getallLikedVideo);

// ✅ Get all liked shorts for a user
router.get('/shorts/:userId', verifyToken, getAllLikedShorts);

// ✅ Like/unlike a short
router.post('/short/:shortId', verifyToken, handleShortLike);

// ✅ Like/unlike/dislike a video
router.post('/video/:videoId', verifyToken, handlelike);

// ✅ Get all liked content for user
router.get('/:userId', verifyToken, getAllLikedContent);

// ✅ Alternative endpoint (used by VideoInfo)
router.post('/:videoId', verifyToken, handlelike);

export default router;