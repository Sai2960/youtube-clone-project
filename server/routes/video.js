// server/routes/video.js - COMPLETE MERGED VERSION WITH CLOUDINARY

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import videofiles from '../Modals/video.js';
import User from '../Modals/User.js';
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
import { 
  uploadVideo, 
  uploadThumbnail, 
  deleteFromCloudinary 
} from '../config/cloudinary.js';

const router = express.Router();

console.log('🎬 Video routes loaded with Cloudinary integration');

// =================== HELPER FUNCTIONS ===================

// Extract Cloudinary Public ID from URL
function extractPublicId(url) {
  if (!url) return null;
  
  // Example URL: https://res.cloudinary.com/dxuxxk0ss/video/upload/v1234567/youtube-clone/videos/video-123.mp4
  // Extract: youtube-clone/videos/video-123
  const parts = url.split('/upload/');
  if (parts.length > 1) {
    const afterUpload = parts[1].split('/').slice(1).join('/');
    return afterUpload.replace(/\.[^/.]+$/, ''); // Remove file extension
  }
  return null;
}

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

// 📤 Upload video to Cloudinary (Primary endpoint)
router.post('/upload', verifyToken, uploadVideo.single('file'), uploadvideo);

// 📤 Alternative: Upload video directly with metadata
router.post("/uploadvideo", verifyToken, uploadVideo.single("video"), async (req, res) => {
  try {
    console.log('📤 Video upload started');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "No video file provided" 
      });
    }

    // Cloudinary returns secure_url and public_id
    const videoUrl = req.file.path; // This is the Cloudinary secure_url
    const publicId = req.file.filename; // Cloudinary public_id for deletion later

    console.log('✅ Video uploaded to Cloudinary:', videoUrl);
    console.log('   Public ID:', publicId);

    res.status(200).json({
      success: true,
      message: "Video uploaded successfully",
      videoPath: videoUrl,
      videoLink: videoUrl,
      publicId: publicId,
      size: req.file.size,
      format: req.file.format || path.extname(req.file.originalname).substring(1)
    });
  } catch (error) {
    console.error("❌ Video upload error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Video upload failed", 
      error: error.message 
    });
  }
});

// 🖼️ Upload thumbnail to Cloudinary
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
      thumbnailPath: req.file.path,
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

// 🖼️ Alternative thumbnail upload endpoint
router.post("/uploadthumbnail", verifyToken, uploadThumbnail.single("thumbnail"), async (req, res) => {
  try {
    console.log('📤 Thumbnail upload started');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "No thumbnail file provided" 
      });
    }

    const thumbnailUrl = req.file.path;
    const publicId = req.file.filename;

    console.log('✅ Thumbnail uploaded to Cloudinary:', thumbnailUrl);

    res.status(200).json({
      success: true,
      message: "Thumbnail uploaded successfully",
      thumbnailPath: thumbnailUrl,
      url: thumbnailUrl,
      publicId: publicId
    });
  } catch (error) {
    console.error("❌ Thumbnail upload error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Thumbnail upload failed", 
      error: error.message 
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
// =================== VIDEO CRUD OPERATIONS ===================

// 📝 Create new video with metadata
router.post("/createvideo", verifyToken, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      videoLink, 
      thumbnail, 
      category, 
      tags, 
      videoType,
      visibility,
      videotitle,
      videodescription,
      videofile,
      videothumb
    } = req.body;
    
    const userId = req.userId || req.user?.id;

    // Support both naming conventions
    const finalTitle = title || videotitle;
    const finalDescription = description || videodescription;
    const finalVideoLink = videoLink || videofile;
    const finalThumbnail = thumbnail || videothumb;

    // Validate required fields
    if (!finalTitle || !finalVideoLink) {
      return res.status(400).json({ 
        success: false, 
        message: "Title and video link are required" 
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Create video document with flexible field names
    const videoData = {
      title: finalTitle,
      videotitle: finalTitle,
      description: finalDescription || "",
      videodescription: finalDescription || "",
      videoLink: finalVideoLink,
      videofile: finalVideoLink,
      thumbnail: finalThumbnail || "",
      videothumb: finalThumbnail || "",
      user: userId,
      uploadedBy: userId,
      category: category || "General",
      tags: tags || [],
      videoType: videoType || "video",
      visibility: visibility || "public",
      channelName: user.channelname || user.channelName || user.name,
      channelAvatar: user.image || user.avatar || ""
    };

    const newVideo = new videofiles(videoData);
    const savedVideo = await newVideo.save();
    
    console.log('✅ Video created:', savedVideo._id);

    res.status(201).json({
      success: true,
      message: "Video created successfully",
      video: savedVideo
    });
  } catch (error) {
    console.error("❌ Create video error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create video", 
      error: error.message 
    });
  }
});

// 📋 Get all videos
router.get('/getall', getallvideo);

// 📋 Alternative: Get all videos with filters
router.get("/getallvideos", async (req, res) => {
  try {
    const { page = 1, limit = 50, sort = 'createdAt' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const videos = await videofiles
      .find({ visibility: { $ne: 'private' } })
      .populate("user uploadedBy", "name channelName channelname avatar image email")
      .sort({ [sort]: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await videofiles.countDocuments({ visibility: { $ne: 'private' } });

    console.log(`📹 Retrieved ${videos.length} videos`);

    res.status(200).json({
      success: true,
      count: videos.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      videos: videos,
      data: videos
    });
  } catch (error) {
    console.error("❌ Get videos error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch videos", 
      error: error.message 
    });
  }
});
// =================== VIDEO RETRIEVAL ROUTES - CORRECT ORDER ===================
// ⚠️ IMPORTANT: Specific routes MUST come BEFORE /:id route

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
            { title: searchRegex },
            { videodescription: searchRegex },
            { description: searchRegex },
            { tags: searchRegex }
          ],
          visibility: { $ne: 'private' }
        })
        .populate('uploadedBy user', 'name channelname channelName image avatar')
        .sort({ views: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      videofiles.countDocuments({
        $or: [
          { videotitle: searchRegex },
          { title: searchRegex },
          { videodescription: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ]
      })
    ]);

    res.json({
      success: true,
      data: videos,
      videos: videos,
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

// 🔍 Alternative search endpoint
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ 
        success: false, 
        message: "Search query is required" 
      });
    }

    const videos = await videofiles
      .find({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { videotitle: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { videodescription: { $regex: q, $options: "i" } },
          { tags: { $in: [new RegExp(q, "i")] } },
          { channelName: { $regex: q, $options: "i" } }
        ],
        visibility: { $ne: 'private' }
      })
      .populate("user uploadedBy", "name channelName channelname avatar image")
      .sort({ createdAt: -1 })
      .limit(20);

    console.log(`🔍 Search "${q}" found ${videos.length} videos`);

    res.status(200).json({
      success: true,
      count: videos.length,
      videos: videos,
      data: videos
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Search failed", 
      error: error.message 
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
      .find({ 
        createdAt: { $gte: sevenDaysAgo },
        visibility: { $ne: 'private' }
      })
      .populate('uploadedBy user', 'name channelname channelName image avatar subscribers')
      .sort({ views: -1, likes: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: videos,
      videos: videos,
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
        .find({ 
          $or: [
            { uploadedBy: channelId },
            { user: channelId }
          ]
        })
        .populate('uploadedBy user', 'name email channelname channelName image avatar bannerImage subscribers')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      videofiles.countDocuments({ 
        $or: [
          { uploadedBy: channelId },
          { user: channelId }
        ]
      })
    ]);

    res.json({
      success: true,
      data: videos,
      videos: videos,
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
      { 
        $match: { 
          $or: [
            { uploadedBy: mongoose.Types.ObjectId(channelId) },
            { user: mongoose.Types.ObjectId(channelId) }
          ]
        } 
      },
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

// 🎬 Get video by ID - Using controller (MUST be last among GET routes with :id)
router.get('/:id', getVideoById);

// 🎬 Alternative: Get single video by ID
router.get("/getvideo/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid video ID" 
      });
    }

    const video = await videofiles
      .findById(videoId)
      .populate("user uploadedBy", "name channelName channelname avatar image email subscribers");

    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      });
    }

    console.log('✅ Video retrieved:', video.title || video.videotitle);

    res.status(200).json({
      success: true,
      video: video,
      data: video
    });
  } catch (error) {
    console.error("❌ Get video error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch video", 
      error: error.message 
    });
  }
});
// =================== UPDATE & DELETE OPERATIONS ===================

// ✏️ Update video
router.put("/updatevideo/:videoId", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId || req.user?.id;

    const video = await videofiles.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      });
    }

    // Check if user owns the video
    const videoUserId = (video.user || video.uploadedBy)?.toString();
    if (videoUserId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to update this video" 
      });
    }

    const updatedVideo = await videofiles.findByIdAndUpdate(
      videoId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    console.log('✅ Video updated:', updatedVideo.title || updatedVideo.videotitle);

    res.status(200).json({
      success: true,
      message: "Video updated successfully",
      video: updatedVideo
    });
  } catch (error) {
    console.error("❌ Update video error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update video", 
      error: error.message 
    });
  }
});

// 🗑️ Delete video - Using controller
router.delete('/:id', verifyToken, deleteVideo);

// 🗑️ Alternative: Delete video with Cloudinary cleanup
router.delete("/deletevideo/:videoId", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId || req.user?.id;

    const video = await videofiles.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      });
    }

    // Check ownership
    const videoUserId = (video.user || video.uploadedBy)?.toString();
    if (videoUserId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to delete this video" 
      });
    }

    // Delete video from Cloudinary if it's a Cloudinary URL
    const videoLink = video.videoLink || video.videofile;
    if (videoLink && videoLink.includes('cloudinary.com')) {
      try {
        const publicId = extractPublicId(videoLink);
        if (publicId) {
          await deleteFromCloudinary(publicId, 'video');
          console.log('🗑️ Video deleted from Cloudinary');
        }
      } catch (error) {
        console.error('⚠️ Failed to delete video from Cloudinary:', error);
        // Continue with database deletion even if Cloudinary delete fails
      }
    }

    // Delete thumbnail from Cloudinary
    const thumbnail = video.thumbnail || video.videothumb;
    if (thumbnail && thumbnail.includes('cloudinary.com')) {
      try {
        const publicId = extractPublicId(thumbnail);
        if (publicId) {
          await deleteFromCloudinary(publicId, 'image');
          console.log('🗑️ Thumbnail deleted from Cloudinary');
        }
      } catch (error) {
        console.error('⚠️ Failed to delete thumbnail from Cloudinary:', error);
      }
    }

    await videofiles.findByIdAndDelete(videoId);

    console.log('✅ Video deleted:', video.title || video.videotitle);

    res.status(200).json({
      success: true,
      message: "Video deleted successfully"
    });
  } catch (error) {
    console.error("❌ Delete video error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete video", 
      error: error.message 
    });
  }
});

// 🗑️ Delete video/image from Cloudinary (utility endpoint)
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
// =================== TRACKING & ANALYTICS ROUTES ===================

// 👁️ Increment video views
router.put("/view/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    const video = await videofiles.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ 
        success: false, 
        message: "Video not found" 
      });
    }

    res.status(200).json({
      success: true,
      views: video.views
    });
  } catch (error) {
    console.error("❌ Increment views error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to increment views", 
      error: error.message 
    });
  }
});

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
      relatedVideos: true,
      cloudinaryIntegration: true
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
    },
    endpoints: {
      upload: '/upload',
      uploadVideo: '/uploadvideo',
      uploadThumbnail: '/upload-thumbnail',
      createVideo: '/createvideo',
      getAll: '/getall',
      getById: '/:id',
      search: '/search',
      trending: '/trending/videos',
      channelVideos: '/channel/:channelId',
      delete: '/deletevideo/:videoId',
      update: '/updatevideo/:videoId'
    }
  });
});

// 🐛 Debug endpoint (remove in production)
router.get('/debug/info', verifyToken, async (req, res) => {
  try {
    const videoCount = await videofiles.countDocuments();
    const recentVideos = await videofiles.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title videotitle videoLink videofile thumbnail videothumb createdAt');

    res.json({
      success: true,
      debug: {
        totalVideos: videoCount,
        recentVideos: recentVideos,
        cloudinaryEnabled: !!process.env.CLOUDINARY_CLOUD_NAME,
        localStorageExists: fs.existsSync(uploadDir),
        uploadDir: uploadDir
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
