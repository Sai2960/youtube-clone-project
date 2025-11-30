// server/routes/video.js - COMPLETE WITH CLOUDINARY INTEGRATION

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
import { uploadVideo, uploadThumbnail, deleteFromCloudinary } from '../config/cloudinary.js';

const router = express.Router();

// =================== LEGACY LOCAL STORAGE SETUP (Backup) ===================
// Keep for fallback if Cloudinary fails
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

// Local storage upload (fallback)
const localUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB
  },
});

// =================== VIDEO UPLOAD ROUTES - CLOUDINARY PRIMARY ===================

// 📤 Upload video (Cloudinary)
router.post('/upload', verifyToken, uploadVideo.single('file'), uploadvideo);

// 🖼️ Upload thumbnail (Cloudinary)
router.post('/upload-thumbnail', verifyToken, uploadThumbnail.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No thumbnail file uploaded' 
      });
    }

    console.log('✅ Thumbnail uploaded successfully:', req.file.path);

    res.json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
      message: 'Thumbnail uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Thumbnail upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to upload thumbnail'
    });
  }
});

// 🗑️ Delete video/image from Cloudinary
router.delete('/cloudinary/:publicId', verifyToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'video' } = req.query; // 'video' or 'image'

    console.log(`🗑️ Deleting ${resourceType} from Cloudinary:`, publicId);

    const result = await deleteFromCloudinary(publicId, resourceType);
    
    res.json({ 
      success: true, 
      result,
      message: `${resourceType} deleted successfully from Cloudinary`
    });
  } catch (error) {
    console.error('❌ Cloudinary deletion error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete from Cloudinary'
    });
  }
});

// 📤 Fallback: Upload video (Local Storage)
router.post('/upload-local', verifyToken, localUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No video file uploaded' 
      });
    }

    console.log('⚠️ Using local storage fallback for video upload');

    res.json({
      success: true,
      filePath: req.file.path,
      filename: req.file.filename,
      message: 'Video uploaded to local storage (fallback mode)'
    });
  } catch (error) {
    console.error('❌ Local upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to upload video locally'
    });
  }
});

// =================== VIDEO RETRIEVAL ROUTES - CORRECT ORDER ===================

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

// =================== HEALTH & DIAGNOSTICS ===================

// ✅ Health check
router.get('/health/check', (req, res) => {
  res.json({
    success: true,
    message: 'Video routes are working with Cloudinary',
    timestamp: new Date().toISOString(),
    cloudinary: {
      enabled: !!process.env.CLOUDINARY_CLOUD_NAME,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'not configured'
    },
    localStorage: {
      uploadDir: uploadDir,
      exists: fs.existsSync(uploadDir)
    },
    features: {
      videoUpload: true,
      thumbnailUpload: true,
      search: true,
      trending: true,
      channelVideos: true,
      analytics: true,
      watchTimeTracking: true,
      shareTracking: true,
      relatedVideos: true
    }
  });
});

// 🔧 Configuration status
router.get('/config/status', verifyToken, (req, res) => {
  res.json({
    success: true,
    cloudinary: {
      configured: !!(process.env.CLOUDINARY_CLOUD_NAME && 
                      process.env.CLOUDINARY_API_KEY && 
                      process.env.CLOUDINARY_API_SECRET),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'missing',
      apiKeySet: !!process.env.CLOUDINARY_API_KEY,
      apiSecretSet: !!process.env.CLOUDINARY_API_SECRET
    },
    localStorage: {
      enabled: true,
      directory: uploadDir,
      exists: fs.existsSync(uploadDir)
    },
    limits: {
      maxFileSize: '100MB',
      allowedFormats: ['mp4', 'mpeg', 'quicktime', 'avi', 'mkv', 'webm']
    }
  });
});

export default router;