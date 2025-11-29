// server/routes/video.js - CORRECTED ROUTE ORDER

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import videofiles from '../Modals/video.js';
import { 
  uploadvideo, 
  getallvideo, 
  getVideoById, 
  deleteVideo, 
  trackWatchTime, 
  trackShare, 
  getShareStats,
  getRelatedVideos 
} from '../controllers/video.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// =================== MULTER SETUP (keep as is) ===================
const uploadDir = 'uploads/videos/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created video upload directory:', uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'video-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB
  },
});

// =================== VIDEO ROUTES - CORRECT ORDER ===================

// 📤 Upload video
router.post('/upload', verifyToken, upload.single('file'), uploadvideo);

// 📋 Get all videos
router.get('/getall', getallvideo);

// 🔍 Search videos (BEFORE /:id)
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    console.log('🔍 Searching videos:', query);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(query, 'i');

    const [videos, totalCount] = await Promise.all([
      videofiles
        .find({
          $or: [
            { videotitle: searchRegex },
            { videodescription: searchRegex },
            { tags: searchRegex }
          ]
        })
        .populate('uploadedBy', 'name channelname image')
        .sort({ views: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      videofiles.countDocuments({
        $or: [
          { videotitle: searchRegex },
          { videodescription: searchRegex },
          { tags: searchRegex }
        ]
      })
    ]);

    res.json({
      success: true,
      data: videos,
      count: videos.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      query: query
    });
  } catch (error) {
    console.error('❌ Error searching videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search videos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🔥 Get trending videos (BEFORE /:id)
router.get('/trending/videos', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    console.log('🔥 Fetching trending videos');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const videos = await videofiles
      .find({ createdAt: { $gte: sevenDaysAgo } })
      .populate('uploadedBy', 'name channelname image subscribers')
      .sort({ views: -1, likes: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: videos,
      count: videos.length
    });
  } catch (error) {
    console.error('❌ Error fetching trending videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending videos'
    });
  }
});

// 📹 GET VIDEOS BY CHANNEL ID (BEFORE /:id)
router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { page = 1, limit = 50, sort = 'createdAt' } = req.query;
    
    console.log('📹 Fetching videos for channel:', channelId);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sort] = -1;

    const [videos, totalCount] = await Promise.all([
      videofiles
        .find({ uploadedBy: channelId })
        .populate('uploadedBy', 'name email channelname image bannerImage subscribers')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      videofiles.countDocuments({ uploadedBy: channelId })
    ]);

    res.json({
      success: true,
      data: videos,
      count: videos.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Error fetching channel videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch channel videos'
    });
  }
});

// 📊 Get video statistics (BEFORE /:id)
router.get('/stats/channel/:channelId', verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    console.log('📊 Fetching video stats for channel:', channelId);

    const stats = await videofiles.aggregate([
      { $match: { uploadedBy: channelId } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          totalShares: { $sum: '$shareCount' },
          avgWatchTime: { $avg: '$averageWatchTime' }
        }
      }
    ]);

    const result = stats[0] || {
      totalVideos: 0,
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0,
      avgWatchTime: 0
    };

    res.json({ success: true, stats: result });
  } catch (error) {
    console.error('❌ Error fetching channel stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch channel statistics'
    });
  }
});

// 📈 Get share stats (BEFORE /:id)
router.get('/share/stats/:id', getShareStats);

// ⚠️ CRITICAL: Related videos route MUST come BEFORE /:id route
router.get('/:id/related', getRelatedVideos);

// 🎬 Get video by ID (MUST be last among GET routes with :id)
router.get('/:id', getVideoById);

// =================== POST/DELETE ROUTES ===================

// 🗑️ Delete video
router.delete('/:id', verifyToken, deleteVideo);

// ⏱️ Track watch time
router.post('/track-watch-time', verifyToken, trackWatchTime);

// 📊 Track share
router.post('/share/track', trackShare);

// ✅ Health check
router.get('/health/check', (req, res) => {
  res.json({
    success: true,
    message: 'Video routes are working',
    timestamp: new Date().toISOString(),
    uploadDir: uploadDir,
    uploadDirExists: fs.existsSync(uploadDir)
  });
});

export default router;