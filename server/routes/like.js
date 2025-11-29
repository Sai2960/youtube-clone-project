import express from 'express';
import { 
  handlelike, 
  getallLikedVideo,       // ✅ This returns likes/dislikes
  handleShortLike, 
  getAllLikedShorts,
  getAllLikedContent      // ✅ This returns videos/shorts/combined
} from '../controllers/like.js';

const router = express.Router();

// ==================== MOST SPECIFIC ROUTES FIRST ====================

// Get all liked content (videos + shorts combined)
router.get('/all/:userId', getAllLikedContent);

// Get all liked videos for a user
router.get('/videos/:userId', getallLikedVideo);

// Get all liked shorts for a user
router.get('/shorts/:userId', getAllLikedShorts);

// Like/unlike a short
router.post('/short/:shortId', handleShortLike);

// Like/unlike a video
router.post('/:videoId', handlelike);

// ✅ CHANGE THIS LINE - Use getallLikedVideo instead of getAllLikedContent
router.get('/:userId', getallLikedVideo);

export default router;