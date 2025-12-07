// server/routes/video.js - COMPLETE MERGED & FIXED VERSION

import express from "express";
import cache from "../middleware/cache.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import videofiles from "../Modals/video.js";
import User from "../Modals/User.js";
import {
  uploadvideo,
  getVideoById,
  deleteVideo,
  trackWatchTime,
  trackShare,
  getShareStats,
  getRelatedVideos,
} from "../controllers/video.js";
import { verifyToken } from "../middleware/auth.js";
import {
  uploadVideo,
  uploadThumbnail,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import compression from "compression";
import { getallvideo } from "../controllers/video.js";

// ✅ CRITICAL FIX: Create router FIRST before using it
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Video routes are working!',
    timestamp: new Date().toISOString()
  });
});

// ✅ DEBUG: Test token verification
router.post('/test-auth', verifyToken, (req, res) => {
  console.log('\n✅ TEST AUTH SUCCESS:');
  console.log('   req.userId:', req.userId);
  console.log('   req.user:', req.user);
  
  res.json({
    success: true,
    message: 'Authentication working!',
    userId: req.userId,
    user: req.user
  });
});

// ✅ CRITICAL FIX: Add root GET route for /video
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // ✅ CRITICAL FIX: No caching, always fresh data
    const videos = await videofiles
      .find({ visibility: { $ne: "private" } })
      .populate({
        path: "uploadedBy",
        select: "name email channelname image",
        options: { strictPopulate: false, lean: true }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await videofiles.countDocuments({ visibility: { $ne: "private" } });

    console.log(`📹 Retrieved ${videos.length} videos from root route (NO CACHE)`);

    // ✅ Set headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).json({
      success: true,
      videos: videos,
      data: videos,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      count: videos.length
    });
  } catch (error) {
    console.error("❌ Get all videos error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
      error: error.message
    });
  }
});

// Add this route to diagnose the issue
router.get('/debug/check-last-video', async (req, res) => {
  try {
    const lastVideo = await videofiles
      .findOne()
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      video: {
        id: lastVideo?._id,
        title: lastVideo?.videotitle,
        allUrls: {
          filepath: lastVideo?.filepath,
          videofile: lastVideo?.videofile,
          videoLink: lastVideo?.videoLink,
        },
        isCloudinary: lastVideo?.filepath?.includes('cloudinary.com'),
        filename: lastVideo?.videofilename
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ DEBUG: Test what Cloudinary returns
router.post("/test-upload", 
  verifyToken,
  uploadVideo.single("file"),
  (req, res) => {
    console.log("\n🧪 TEST UPLOAD:");
    console.log("   req.file:", JSON.stringify(req.file, null, 2));
    
    res.json({
      success: true,
      file: req.file,
      cloudinaryUrl: req.file?.path,
      message: "Check server logs for details"
    });
  }
);

router.use((req, res, next) => {
  if (req.path.startsWith('/upload')) {
    console.log('\n📤 UPLOAD ROUTE DEBUG:');
    console.log('   Path:', req.path);
    console.log('   Method:', req.method);
    console.log('   Headers:', req.headers.authorization ? 'Token present' : 'No token');
    console.log('   req.userId:', req.userId);
    console.log('   req.user:', req.user ? 'User object exists' : 'No user object');
  }
  next();
});
// =================== HELPER FUNCTIONS ===================
// Transform video URLs to absolute URLs
function transformVideoURLs(video) {
  const baseURL = process.env.BASE_URL || "http://localhost:5000";

  return {
    ...video,
    videoLink: video.videoLink?.startsWith("http")
      ? video.videoLink
      : `${baseURL}/${video.videoLink}`,
    videofile: video.videofile?.startsWith("http")
      ? video.videofile
      : `${baseURL}/${video.videofile}`,
    thumbnail: video.thumbnail?.startsWith("http")
      ? video.thumbnail
      : `${baseURL}/${video.thumbnail}`,
    videothumb: video.videothumb?.startsWith("http")
      ? video.videothumb
      : `${baseURL}/${video.videothumb}`,
  };
}

// Get image URL with absolute path
function getImageURL(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const baseURL = process.env.BASE_URL || "http://localhost:5000";
  return `${baseURL}/${url}`;
}

// Extract Cloudinary Public ID from URL
function extractPublicId(url) {
  if (!url) return null;

  const parts = url.split("/upload/");
  if (parts.length > 1) {
    const afterUpload = parts[1].split("/").slice(1).join("/");
    return afterUpload.replace(/\.[^/.]+$/, "");
  }
  return null;
}

// =================== LEGACY LOCAL STORAGE SETUP ===================

const uploadDir = "uploads/videos/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Created video upload directory:", uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "video-" + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/webm",
  ];

  if (
    allowedMimeTypes.includes(file.mimetype) ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed!"), false);
  }
};

const localUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 500 * 1024 * 1024, // ✅ Increased to 500MB
    fieldSize: 500 * 1024 * 1024,
  },
});
// 🔥 CRITICAL FIX: Ensure verifyToken completes BEFORE Multer runs
router.post("/upload",
  // Step 1: Log incoming request
  (req, res, next) => {
    console.log('\n📤 ===== UPLOAD REQUEST RECEIVED =====');
    console.log('Headers:', {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      authorization: req.headers.authorization ? 'Present ✅' : 'MISSING ❌'
    });
    next();
  },
  
  // Step 2: Verify token and set req.userId
  verifyToken,
  
  // Step 3: CRITICAL - Validate auth completed
  (req, res, next) => {
    console.log('\n🔒 ===== AUTH VALIDATION =====');
    console.log('   req.userId:', req.userId);
    console.log('   req.user exists:', !!req.user);
    
    if (!req.userId) {
      console.error('❌ CRITICAL: Authentication failed - no userId set');
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login again.',
        code: 'AUTH_FAILED'
      });
    }
    
    console.log('✅ Authentication validated, proceeding to upload...');
    next();
  },
  
  // Step 4: Handle file upload with Multer
  uploadVideo.single("file"),
  
  // Step 5: Handle Multer errors
  (err, req, res, next) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message,
        code: 'MULTER_ERROR'
      });
    }
    
    console.log('✅ File received by Multer');
    if (req.file) {
      console.log('   Filename:', req.file.originalname);
      console.log('   Size:', (req.file.size / 1024 / 1024).toFixed(2) + ' MB');
    }
    
    next();
  },
  
  // Step 6: Process upload
  uploadvideo
);

// ✅ DEBUG: Log all upload route requests
router.use((req, res, next) => {
  if (req.path.includes('/upload')) {
    console.log('\n📤 UPLOAD ROUTE DEBUG:');
    console.log('   Path:', req.path);
    console.log('   Method:', req.method);
  }
  next();
});

router.post(
  "/uploadvideo",
  verifyToken,
  uploadVideo.single("video"),
  async (req, res) => {
    try {
      console.log("📤 Video upload started");

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No video file provided" });
      }

      const videoUrl = req.file.path;
      const publicId = req.file.filename;

      console.log("✅ Video uploaded to Cloudinary:", videoUrl);
      console.log("   Public ID:", publicId);

      res.status(200).json({
        success: true,
        message: "Video uploaded successfully",
        videoPath: videoUrl,
        videoLink: videoUrl,
        publicId: publicId,
        size: req.file.size,
        format:
          req.file.format || path.extname(req.file.originalname).substring(1),
      });
    } catch (error) {
      console.error("❌ Video upload error:", error);
      res.status(500).json({
        success: false,
        message: "Video upload failed",
        error: error.message,
      });
    }
  }
);

router.post(
  "/upload-thumbnail",
  verifyToken,
  uploadThumbnail.single("thumbnail"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No thumbnail file uploaded" });
      }

      console.log("✅ Thumbnail uploaded successfully:", req.file.path);

      res.json({
        success: true,
        url: req.file.path,
        thumbnailPath: req.file.path,
        publicId: req.file.filename,
        message: "Thumbnail uploaded successfully",
      });
    } catch (error) {
      console.error("❌ Thumbnail upload error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to upload thumbnail",
      });
    }
  }
);

router.post(
  "/uploadthumbnail",
  verifyToken,
  uploadThumbnail.single("thumbnail"),
  async (req, res) => {
    try {
      console.log("📤 Thumbnail upload started");

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No thumbnail file provided" });
      }

      const thumbnailUrl = req.file.path;
      const publicId = req.file.filename;

      console.log("✅ Thumbnail uploaded to Cloudinary:", thumbnailUrl);

      res.status(200).json({
        success: true,
        message: "Thumbnail uploaded successfully",
        thumbnailPath: thumbnailUrl,
        url: thumbnailUrl,
        publicId: publicId,
      });
    } catch (error) {
      console.error("❌ Thumbnail upload error:", error);
      res.status(500).json({
        success: false,
        message: "Thumbnail upload failed",
        error: error.message,
      });
    }
  }
);

router.post(
  "/upload-local",
  verifyToken,
  localUpload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No video file uploaded" });
      }

      console.log("⚠️ Using local storage fallback for video upload");

      res.json({
        success: true,
        filePath: req.file.path,
        filename: req.file.filename,
        message: "Video uploaded to local storage (fallback mode)",
      });
    } catch (error) {
      console.error("❌ Local upload error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to upload video locally",
      });
    }
  }
);
// =================== VIDEO CRUD OPERATIONS ===================

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
      videothumb,
    } = req.body;

    const userId = req.userId || req.user?.id;
    const finalTitle = title || videotitle;
    const finalDescription = description || videodescription;
    const finalVideoLink = videoLink || videofile;
    const finalThumbnail = thumbnail || videothumb;

    if (!finalTitle || !finalVideoLink) {
      return res
        .status(400)
        .json({ success: false, message: "Title and video link are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

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
      channelAvatar: user.image || user.avatar || "",
    };

    const newVideo = new videofiles(videoData);
    const savedVideo = await newVideo.save();

    console.log("✅ Video created:", savedVideo._id);

    res.status(201).json({
      success: true,
      message: "Video created successfully",
      video: savedVideo,
    });
  } catch (error) {
    console.error("❌ Create video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create video",
      error: error.message,
    });
  }
});

router.get("/getall", async (req, res) => {  try {
    const { page = 1, limit = 50, sort = "createdAt" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const videos = await videofiles
      .find({ visibility: { $ne: "private" } })
      .populate({
        path: "uploadedBy",
        select: "name channelName channelname avatar image email subscribers",
        options: { strictPopulate: false },
      })
      .populate({
        path: "user",
        select: "name channelName channelname avatar image email subscribers",
        options: { strictPopulate: false },
      })
      .sort({ [sort]: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await videofiles.countDocuments({
      visibility: { $ne: "private" },
    });

    console.log(`📹 Retrieved ${videos.length} videos`);

    res.status(200).json({
      success: true,
      count: videos.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      videos: videos,
      data: videos,
    });
  } catch (error) {
    console.error("❌ Get videos error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
      error: error.message,
    });
  }
});
// =================== VIDEO RETRIEVAL ROUTES ===================

router.get("/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;

    console.log("🔍 Searching videos:", query);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(query, "i");

    const [videos, totalCount] = await Promise.all([
      videofiles
        .find({
          $or: [
            { videotitle: searchRegex },
            { title: searchRegex },
            { videodescription: searchRegex },
            { description: searchRegex },
            { tags: searchRegex },
          ],
          visibility: { $ne: "private" },
        })
        .populate({
          path: "uploadedBy",
          select: "name channelname channelName image avatar",
          options: { strictPopulate: false },
        })
        .populate({
          path: "user",
          select: "name channelname channelName image avatar",
          options: { strictPopulate: false },
        })
        .sort({ views: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      videofiles.countDocuments({
        $or: [
          { videotitle: searchRegex },
          { title: searchRegex },
          { videodescription: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
        ],
      }),
    ]);

    res.json({
      success: true,
      data: videos,
      videos: videos,
      count: videos.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      query: query,
    });
  } catch (error) {
    console.error("❌ Error searching videos:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search videos",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required" });
    }

    const videos = await videofiles
      .find({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { videotitle: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { videodescription: { $regex: q, $options: "i" } },
          { tags: { $in: [new RegExp(q, "i")] } },
          { channelName: { $regex: q, $options: "i" } },
        ],
        visibility: { $ne: "private" },
      })
      .populate("user uploadedBy", "name channelName channelname avatar image")
      .sort({ createdAt: -1 })
      .limit(20);

    console.log(`🔍 Search "${q}" found ${videos.length} videos`);

    res.status(200).json({
      success: true,
      count: videos.length,
      videos: videos,
      data: videos,
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    res
      .status(500)
      .json({ success: false, message: "Search failed", error: error.message });
  }
});

router.get("/trending/videos", cache(180), async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    console.log("🔥 Fetching trending videos");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const videos = await videofiles
      .find({
        createdAt: { $gte: sevenDaysAgo },
        visibility: { $ne: "private" },
      })
      .populate({
        path: "uploadedBy",
        select: "name channelname channelName image avatar subscribers",
        options: { strictPopulate: false },
      })
      .populate({
        path: "user",
        select: "name channelname channelName image avatar subscribers",
        options: { strictPopulate: false },
      })
      .sort({ views: -1, likes: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: videos,
      videos: videos,
      count: videos.length,
    });
  } catch (error) {
    console.error("❌ Error fetching trending videos:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch trending videos" });
  }
});
// =================== CHANNEL ROUTES ===================

router.get("/channel/:channelId", async (req, res) => {
  try {
    const { channelId } = req.params;
    const { page = 1, limit = 50, sort = "createdAt" } = req.query;

    console.log("📹 Fetching videos for channel:", channelId);

    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel ID format",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sort] = -1;

    const [videos, totalCount] = await Promise.all([
      videofiles
        .find({
          $or: [{ uploadedBy: channelId }, { user: channelId }],
        })
        .populate({
          path: "uploadedBy user",
          select:
            "name email channelname channelName image avatar bannerImage subscribers",
          options: { strictPopulate: false },
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      videofiles.countDocuments({
        $or: [{ uploadedBy: channelId }, { user: channelId }],
      }),
    ]);

    console.log(`✅ Found ${videos.length} videos for channel`);

    res.json({
      success: true,
      data: videos,
      videos: videos,
      count: videos.length,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
    });
  } catch (error) {
    console.error("❌ Error fetching channel videos:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch channel videos",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

router.get("/stats/channel/:channelId", verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    console.log("📊 Fetching video stats for channel:", channelId);

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel ID format",
      });
    }

    const stats = await videofiles.aggregate([
      {
        $match: {
          $or: [
            { uploadedBy: new mongoose.Types.ObjectId(channelId) },
            { user: new mongoose.Types.ObjectId(channelId) },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: "$likes" },
          totalShares: { $sum: "$shareCount" },
          avgWatchTime: { $avg: "$averageWatchTime" },
        },
      },
    ]);

    const result = stats[0] || {
      totalVideos: 0,
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0,
      avgWatchTime: 0,
    };

    res.json({ success: true, stats: result });
  } catch (error) {
    console.error("❌ Error fetching channel stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch channel statistics",
    });
  }
});
// =================== INDIVIDUAL VIDEO ROUTES ===================

// =================== INDIVIDUAL VIDEO ROUTES ===================

// ✅ Debug route - Add BEFORE other routes to prevent conflicts
router.get('/debug/last-uploaded', async (req, res) => {
  try {
    const lastVideo = await videofiles
      .findOne()
      .sort({ createdAt: -1 })
      .select('_id videotitle videofile filepath createdAt')
      .lean();

    res.json({
      success: true,
      lastVideo: lastVideo,
      hasId: !!lastVideo?._id,
      idType: typeof lastVideo?._id,
      idString: lastVideo?._id?.toString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get("/share/stats/:id", getShareStats);
router.get("/:id/related", getRelatedVideos);

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    const video = await videofiles
      .findById(id)
      .select(
        "videotitle videodescription filepath videothumbnail views videochanel uploadedBy createdAt Like Dislike videofile videoLink thumbnail title description category tags videoType visibility channelName channelAvatar likes dislikes shareCount averageWatchTime"
      )
      .populate({
        path: "uploadedBy",
        select:
          "name email channelname channelName image avatar bannerImage subscribers",
        options: { lean: true },
      })
      .lean();

    if (!video) {
  console.log("❌ Video not found in database");
  return res.status(404).json({
    success: false,
    message: "Video not found",
  });
}

// ✅ ADD THIS: Validate video URLs before sending
const hasValidUrl = video.filepath || video.videofile || video.videoLink;
if (!hasValidUrl) {
  console.error('❌ Video has NO URLs:', {
    id: video._id,
    title: video.videotitle,
    fields: Object.keys(video)
  });
  
  return res.status(500).json({
    success: false,
    message: "Video data is corrupted - missing video URLs",
    debug: {
      id: video._id,
      title: video.videotitle
    }
  });
}

    // Increment views asynchronously
    videofiles.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec();
    video.views = (video.views || 0) + 1;

    // Transform URLs
    const videoWithAbsoluteURLs = transformVideoURLs(video);

    if (
      videoWithAbsoluteURLs.uploadedBy &&
      typeof videoWithAbsoluteURLs.uploadedBy === "object"
    ) {
      videoWithAbsoluteURLs.uploadedBy.image = getImageURL(
        videoWithAbsoluteURLs.uploadedBy.image
      );
      videoWithAbsoluteURLs.uploadedBy.bannerImage = getImageURL(
        videoWithAbsoluteURLs.uploadedBy.bannerImage
      );
    }

    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=1800");

    res.status(200).json({
      success: true,
      video: videoWithAbsoluteURLs,
      data: videoWithAbsoluteURLs,
    });
  } catch (error) {
    console.error("❌ Get video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch video",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

router.get("/getvideo/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    const video = await videofiles
      .findById(videoId)
      .populate({
        path: "uploadedBy",
        select: "name channelName channelname avatar image email subscribers",
        options: { strictPopulate: false },
      })
      .populate({
        path: "user",
        select: "name channelName channelname avatar image email subscribers",
        options: { strictPopulate: false },
      });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    console.log("✅ Video retrieved:", video.title || video.videotitle);

    res.status(200).json({
      success: true,
      video: video,
      data: video,
    });
  } catch (error) {
    console.error("❌ Get video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch video",
      error: error.message,
    });
  }
});
// =================== UPDATE & DELETE OPERATIONS ===================

router.put("/updatevideo/:videoId", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId || req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    const video = await videofiles.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const videoUserId = (video.user || video.uploadedBy)?.toString();
    if (videoUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this video",
      });
    }

    const updatedVideo = await videofiles.findByIdAndUpdate(
      videoId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    console.log(
      "✅ Video updated:",
      updatedVideo.title || updatedVideo.videotitle
    );

    res.status(200).json({
      success: true,
      message: "Video updated successfully",
      video: updatedVideo,
    });
  } catch (error) {
    console.error("❌ Update video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update video",
      error: error.message,
    });
  }
});

router.delete("/:id", verifyToken, deleteVideo);

router.delete("/deletevideo/:videoId", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId || req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    const video = await videofiles.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const videoUserId = (video.user || video.uploadedBy)?.toString();
    if (videoUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this video",
      });
    }

    // Delete video from Cloudinary
    const videoLink = video.videoLink || video.videofile;
    if (videoLink && videoLink.includes("cloudinary.com")) {
      try {
        const publicId = extractPublicId(videoLink);
        if (publicId) {
          await deleteFromCloudinary(publicId, "video");
          console.log("🗑️ Video deleted from Cloudinary");
        }
      } catch (error) {
        console.error("⚠️ Failed to delete video from Cloudinary:", error);
      }
    }

    // Delete thumbnail from Cloudinary
    const thumbnail = video.thumbnail || video.videothumb;
    if (thumbnail && thumbnail.includes("cloudinary.com")) {
      try {
        const publicId = extractPublicId(thumbnail);
        if (publicId) {
          await deleteFromCloudinary(publicId, "image");
          console.log("🗑️ Thumbnail deleted from Cloudinary");
        }
      } catch (error) {
        console.error("⚠️ Failed to delete thumbnail from Cloudinary:", error);
      }
    }

    await videofiles.findByIdAndDelete(videoId);

    console.log("✅ Video deleted:", video.title || video.videotitle);

    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete video",
      error: error.message,
    });
  }
});

router.delete("/cloudinary/:publicId", verifyToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = "video" } = req.query;

    console.log(`🗑️ Deleting ${resourceType} from Cloudinary:`, publicId);

    const result = await deleteFromCloudinary(publicId, resourceType);

    res.json({
      success: true,
      result,
      message: `${resourceType} deleted successfully from Cloudinary`,
    });
  } catch (error) {
    console.error("❌ Cloudinary deletion error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete from Cloudinary",
    });
  }
});
// =================== TRACKING & ANALYTICS ROUTES ===================

router.put("/view/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    const video = await videofiles.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    res.status(200).json({
      success: true,
      views: video.views,
    });
  } catch (error) {
    console.error("❌ Increment views error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to increment views",
      error: error.message,
    });
  }
});

router.post("/track-watch-time", verifyToken, trackWatchTime);
router.post("/share/track", trackShare);
// =================== HEALTH & DIAGNOSTICS ===================

router.get("/health/check", (req, res) => {
  res.json({
    success: true,
    message: "Video routes are working with Cloudinary",
    timestamp: new Date().toISOString(),
    cloudinary: {
      enabled: !!process.env.CLOUDINARY_CLOUD_NAME,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || "not configured",
    },
    localStorage: {
      uploadDir: uploadDir,
      exists: fs.existsSync(uploadDir),
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
      cloudinaryIntegration: true,
      compression: true,
      caching: true,
      performanceMonitoring: true,
    },
  });
});

router.get("/config/status", verifyToken, (req, res) => {
  res.json({
    success: true,
    cloudinary: {
      configured: !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || "missing",
      apiKeySet: !!process.env.CLOUDINARY_API_KEY,
      apiSecretSet: !!process.env.CLOUDINARY_API_SECRET,
    },
    localStorage: {
      enabled: true,
      directory: uploadDir,
      exists: fs.existsSync(uploadDir),
    },
    limits: {
      maxFileSize: "100MB",
      allowedFormats: ["mp4", "mpeg", "quicktime", "avi", "mkv", "webm"],
    },
    endpoints: {
      upload: "/upload",
      uploadVideo: "/uploadvideo",
      uploadThumbnail: "/upload-thumbnail",
      uploadThumbnailAlt: "/uploadthumbnail",
      uploadLocal: "/upload-local",
      createVideo: "/createvideo",
      getAll: "/getall",
      getAllVideos: "/getallvideos",
      getById: "/:id",
      getVideo: "/getvideo/:videoId",
      search: "/search",
      searchByQuery: "/search/:query",
      trending: "/trending/videos",
      channelVideos: "/channel/:channelId",
      channelStats: "/stats/channel/:channelId",
      delete: "/deletevideo/:videoId",
      deleteById: "/:id",
      deleteCloudinary: "/cloudinary/:publicId",
      update: "/updatevideo/:videoId",
      incrementView: "/view/:videoId",
      trackWatchTime: "/track-watch-time",
      trackShare: "/share/track",
      shareStats: "/share/stats/:id",
      relatedVideos: "/:id/related",
      healthCheck: "/health/check",
      configStatus: "/config/status",
      debugInfo: "/debug/info",
    },
  });
});

// ADD THIS after the root "/" route (around line 45):
router.get("/getallvideos", async (req, res) => {
  try {
    return getallvideo(req, res); // Use the controller function
  } catch (error) {
    console.error("❌ Get all videos error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
    });
  }
});

router.get("/debug/info", verifyToken, async (req, res) => {
  try {
    const videoCount = await videofiles.countDocuments();
    const recentVideos = await videofiles
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "title videotitle videoLink videofile thumbnail videothumb createdAt views"
      );

    res.json({
      success: true,
      debug: {
        totalVideos: videoCount,
        recentVideos: recentVideos,
        cloudinaryEnabled: !!process.env.CLOUDINARY_CLOUD_NAME,
        localStorageExists: fs.existsSync(uploadDir),
        uploadDir: uploadDir,
        environment: process.env.NODE_ENV || "development",
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
// ✅ DEBUG ROUTE - Remove after testing
router.get('/test-auth', verifyToken, (req, res) => {
  console.log('\n🧪 TEST AUTH ROUTE:');
  console.log('   req.userId:', req.userId);
  console.log('   req.user:', req.user);
  
  res.json({
    success: true,
    message: 'Authentication working!',
    userId: req.userId,
    user: req.user
  });
});


// Add these routes to routes/video.js (before export default router;)

// ✅ Debug: Check specific video

// ✅ Check specific video
router.get('/debug/video/:id', async (req, res) => {
  try {
    const video = await videofiles.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const isValidUrl = (url) => {
      return url && 
             url.includes('cloudinary.com') && 
             url.startsWith('https://');
    };

    res.json({
      id: video._id,
      title: video.videotitle,
      urls: {
        filepath: {
          value: video.filepath,
          valid: isValidUrl(video.filepath)
        },
        videofile: {
          value: video.videofile,
          valid: isValidUrl(video.videofile)
        },
        videoLink: {
          value: video.videoLink,
          valid: isValidUrl(video.videoLink)
        }
      },
      filename: video.videofilename,
      allValid: isValidUrl(video.filepath) && 
                isValidUrl(video.videofile) && 
                isValidUrl(video.videoLink),
      allMatch: video.filepath === video.videofile && 
                video.videofile === video.videoLink
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =================== ADMIN & DEBUG ROUTES - ADD TO END OF video.js ===================
// Place these BEFORE "export default router;" line

// ✅ 1. Check all videos status
router.get('/admin/check-all-videos', async (req, res) => {
  try {
    const videos = await videofiles
      .find({})
      .select('_id videotitle filepath videofile videoLink videofilename')
      .lean();

    const isValidUrl = (url) => {
      return url && 
             url.includes('cloudinary.com') && 
             url.startsWith('https://');
    };

    const analysis = videos.map(v => ({
      id: v._id,
      title: v.videotitle,
      allFieldsValid: isValidUrl(v.filepath) && 
                      isValidUrl(v.videofile) && 
                      isValidUrl(v.videoLink),
      allFieldsMatch: v.filepath === v.videofile && v.videofile === v.videoLink,
      urls: {
        filepath: v.filepath?.substring(0, 60),
        videofile: v.videofile?.substring(0, 60),
        videoLink: v.videoLink?.substring(0, 60),
      },
      status: {
        filepath: isValidUrl(v.filepath) ? '✅' : '❌',
        videofile: isValidUrl(v.videofile) ? '✅' : '❌',
        videoLink: isValidUrl(v.videoLink) ? '✅' : '❌'
      }
    }));

    const summary = {
      total: videos.length,
      valid: analysis.filter(v => v.allFieldsValid && v.allFieldsMatch).length,
      invalid: analysis.filter(v => !v.allFieldsValid || !v.allFieldsMatch).length
    };

    res.json({
      success: true,
      summary,
      videos: analysis
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ✅ 2. Fix ALL broken video URLs (NO AUTH REQUIRED)
router.post('/admin/fix-all-videos-now', async (req, res) => {
  try {
    const videos = await videofiles.find({});
    let fixed = 0;
    let alreadyGood = 0;
    let unfixable = 0;
    const unfixableList = [];
    const fixedList = [];

    const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dxuxxk0ss';
    const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/youtube-clone/videos`;

    console.log('\n🔧 ===== STARTING VIDEO URL FIX =====');
    console.log(`   Total videos to check: ${videos.length}`);

    for (const video of videos) {
      const isValid = (url) => url && url.includes('cloudinary.com') && url.startsWith('https://');
      
      // Find ANY valid Cloudinary URL
      let correctUrl = null;
      if (isValid(video.filepath)) correctUrl = video.filepath;
      else if (isValid(video.videofile)) correctUrl = video.videofile;
      else if (isValid(video.videoLink)) correctUrl = video.videoLink;

      // Try to reconstruct from filename
      if (!correctUrl && video.videofilename) {
        const fileMatch = video.videofilename.match(/file_[a-z0-9]+/i);
        if (fileMatch) {
          const fileId = fileMatch[0];
          correctUrl = `${CLOUDINARY_BASE}/${fileId}.mp4`;
          console.log(`   🔧 Reconstructed: ${video.videotitle}`);
        }
      }

      // Try to extract from any existing path
      if (!correctUrl) {
        const paths = [video.filepath, video.videofile, video.videoLink].filter(Boolean);
        for (const path of paths) {
          const fileMatch = path.match(/file_[a-z0-9]+/i);
          if (fileMatch) {
            const fileId = fileMatch[0];
            correctUrl = `${CLOUDINARY_BASE}/${fileId}.mp4`;
            console.log(`   🔧 Extracted from path: ${video.videotitle}`);
            break;
          }
        }
      }

      if (!correctUrl) {
        unfixable++;
        unfixableList.push({
          id: video._id,
          title: video.videotitle,
          filename: video.videofilename,
          paths: {
            filepath: video.filepath,
            videofile: video.videofile,
            videoLink: video.videoLink
          }
        });
        console.log(`   ❌ Cannot fix: ${video.videotitle}`);
        continue;
      }

      // Check if already correct
      if (video.filepath === correctUrl && 
          video.videofile === correctUrl && 
          video.videoLink === correctUrl) {
        alreadyGood++;
        continue;
      }

      // Fix the video
      video.filepath = correctUrl;
      video.videofile = correctUrl;
      video.videoLink = correctUrl;
      await video.save();
      
      fixed++;
      fixedList.push({
        id: video._id,
        title: video.videotitle,
        url: correctUrl.substring(0, 60) + '...'
      });
      console.log(`   ✅ Fixed: ${video.videotitle}`);
    }

    console.log('\n✅ ===== FIX COMPLETE =====');
    console.log(`   Total: ${videos.length}`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Already Good: ${alreadyGood}`);
    console.log(`   Unfixable: ${unfixable}`);

    res.json({
      success: true,
      summary: {
        total: videos.length,
        fixed,
        alreadyGood,
        unfixable
      },
      fixedVideos: fixedList.slice(0, 10), // First 10
      unfixableVideos: unfixableList
    });
  } catch (error) {
    console.error('❌ Fix error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ✅ 3. Check specific video by ID
router.get('/admin/check-video/:id', async (req, res) => {
  try {
    const video = await videofiles.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ 
        success: false,
        error: 'Video not found' 
      });
    }

    const isValidUrl = (url) => {
      return url && 
             url.includes('cloudinary.com') && 
             url.startsWith('https://');
    };

    res.json({
      success: true,
      video: {
        id: video._id,
        title: video.videotitle,
        urls: {
          filepath: {
            value: video.filepath,
            valid: isValidUrl(video.filepath)
          },
          videofile: {
            value: video.videofile,
            valid: isValidUrl(video.videofile)
          },
          videoLink: {
            value: video.videoLink,
            valid: isValidUrl(video.videoLink)
          }
        },
        filename: video.videofilename,
        allValid: isValidUrl(video.filepath) && 
                  isValidUrl(video.videofile) && 
                  isValidUrl(video.videoLink),
        allMatch: video.filepath === video.videofile && 
                  video.videofile === video.videoLink
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ✅ 4. Fix single video by ID
router.post('/admin/fix-video/:id', async (req, res) => {
  try {
    const video = await videofiles.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ 
        success: false,
        error: 'Video not found' 
      });
    }

    const isValidUrl = (url) => {
      return url && 
             url.includes('cloudinary.com') && 
             url.includes('/video/upload/') &&
             url.startsWith('https://');
    };

    // Find ANY valid URL
    let correctUrl = null;
    if (isValidUrl(video.filepath)) correctUrl = video.filepath;
    else if (isValidUrl(video.videofile)) correctUrl = video.videofile;
    else if (isValidUrl(video.videoLink)) correctUrl = video.videoLink;

    // Try to reconstruct from filename
    if (!correctUrl && video.videofilename) {
      const fileMatch = video.videofilename.match(/file_[a-z0-9]+/i);
      if (fileMatch) {
        const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dxuxxk0ss';
        const fileId = fileMatch[0];
        correctUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/youtube-clone/videos/${fileId}.mp4`;
      }
    }

    if (!correctUrl) {
      return res.status(400).json({ 
        success: false,
        error: 'No valid Cloudinary URL found. Video needs to be re-uploaded.',
        details: {
          filepath: video.filepath,
          videofile: video.videofile,
          videoLink: video.videoLink,
          filename: video.videofilename
        }
      });
    }

    // Sync all fields
    video.filepath = correctUrl;
    video.videofile = correctUrl;
    video.videoLink = correctUrl;
    await video.save();

    res.json({
      success: true,
      message: 'Video URLs fixed',
      video: {
        id: video._id,
        title: video.videotitle,
        url: correctUrl
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ✅ 5. Quick stats
router.get('/admin/video-stats', async (req, res) => {
  try {
    const total = await videofiles.countDocuments();
    
    const validVideos = await videofiles.countDocuments({
      $and: [
        { filepath: { $regex: 'cloudinary.com' } },
        { videofile: { $regex: 'cloudinary.com' } },
        { videoLink: { $regex: 'cloudinary.com' } }
      ]
    });

    const brokenVideos = total - validVideos;

    res.json({
      success: true,
      stats: {
        total,
        valid: validVideos,
        broken: brokenVideos,
        healthPercentage: ((validVideos / total) * 100).toFixed(1) + '%'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});
// ✅ FIX EXISTING VIDEOS - Add audio codec to URLs
router.post('/admin/fix-all-video-audio', async (req, res) => {
  try {
    const videos = await videofiles.find({
      filepath: { $regex: 'cloudinary.com' }
    });

    let fixed = 0;
    const results = [];

    for (const video of videos) {
      let url = video.filepath;
      
      if (!url || !url.includes('/upload/')) continue;

      // Check if already fixed
      if (url.includes('f_mp4,vc_h264,ac_aac')) {
        continue;
      }

      const urlParts = url.split('/upload/');
      if (urlParts.length === 2) {
        // Build new URL with audio
        const newUrl = `${urlParts[0]}/upload/f_mp4,vc_h264,ac_aac,af_44100,br_1000k/${urlParts[1]}`.replace(/\.[^.]+$/, '.mp4');
        
        video.filepath = newUrl;
        video.videofile = newUrl;
        video.videoLink = newUrl;
        
        await video.save();
        
        fixed++;
        results.push({
          id: video._id,
          title: video.videotitle,
          newUrl: newUrl.substring(0, 80)
        });
        
        console.log(`✅ Fixed: ${video.videotitle}`);
      }
    }

    res.json({
      success: true,
      fixed,
      total: videos.length,
      results: results.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ✅ FIX ALL EXISTING VIDEOS - Add audio transformations
router.post('/admin/fix-audio-all-videos', async (req, res) => {
  try {
    console.log('\n🔧 ===== FIXING ALL VIDEO AUDIO =====');
    
    const videos = await videofiles.find({
      filepath: { $regex: 'cloudinary.com' }
    });

    let fixed = 0;
    let alreadyFixed = 0;
    const results = [];

    for (const video of videos) {
      let url = video.filepath;
      
      if (!url || !url.includes('/upload/')) continue;

      // Check if already has audio transformations
      if (url.includes('ac_aac')) {
        alreadyFixed++;
        continue;
      }

      const urlParts = url.split('/upload/');
      if (urlParts.length === 2) {
        // ✅ Build URL with audio
        const transforms = 'f_mp4,vc_h264,ac_aac,af_44100,br_1000k,q_auto:good';
        const newUrl = `${urlParts[0]}/upload/${transforms}/${urlParts[1]}`.replace(/\.[^.]+$/, '.mp4');
        
        // Update ALL video URL fields
        video.filepath = newUrl;
        video.videofile = newUrl;
        video.videoLink = newUrl;
        
        await video.save();
        
        fixed++;
        results.push({
          id: video._id,
          title: video.videotitle,
          newUrl: newUrl.substring(0, 80)
        });
        
        console.log(`✅ Fixed: ${video.videotitle}`);
      }
    }

    console.log(`\n✅ Fixed: ${fixed}, Already Fixed: ${alreadyFixed}`);

    res.json({
      success: true,
      fixed,
      alreadyFixed,
      total: videos.length,
      results: results.slice(0, 10)
    });
  } catch (error) {
    console.error('❌ Fix error:', error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================================================
// CACHE MANAGEMENT ROUTES (ADMIN/DEBUG)
// ============================================================================

router.get('/cache/stats', async (req, res) => {
  try {
    const { getCacheStats } = await import('../middleware/cache.js');
    const stats = getCacheStats();
    
    res.json({
      success: true,
      cache: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/cache/clear', async (req, res) => {
  try {
    const { clearCache } = await import('../middleware/cache.js');
    const cleared = clearCache();
    
    res.json({
      success: true,
      message: `Cache cleared: ${cleared} entries removed`,
      cleared
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// Fix thumbnails for all videos - IMPROVED VERSION
router.post('/admin/fix-all-thumbnails-clean', async (req, res) => {
  try {
    console.log('\n🖼️ ===== FIXING ALL THUMBNAILS (CLEAN VERSION) =====');
    
    const videos = await videofiles.find({
      filepath: { $regex: 'cloudinary.com' }
    });

    let fixed = 0;
    const results = [];

    for (const video of videos) {
      const videoUrl = video.filepath || video.videofile || video.videoLink;
      
      if (!videoUrl || !videoUrl.includes('/video/upload/')) continue;

      try {
        // Extract cloud name and video path
        const cloudinaryMatch = videoUrl.match(/https:\/\/res\.cloudinary\.com\/([^/]+)\/video\/upload\/(.+)/);
        
        if (cloudinaryMatch) {
          const cloudName = cloudinaryMatch[1];
          let videoPath = cloudinaryMatch[2];
          
          // Remove ALL transformation parameters
          videoPath = videoPath
            .split('/')
            .filter(segment => {
              // Only keep actual path segments
              return !segment.match(/^(f_|vc_|ac_|af_|br_|q_|w_|h_|c_|so_)/);
            })
            .join('/');
          
          const thumbnailUrl = `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${videoPath}`
            .replace(/\.(mp4|mov|avi|mkv|webm)$/i, '.jpg');
          
          // Update all thumbnail fields
          video.thumbnail = thumbnailUrl;
          video.videothumbnail = thumbnailUrl;
          video.thumbnailUrl = thumbnailUrl;
          video.videothumb = thumbnailUrl;
          
          await video.save();
          
          fixed++;
          results.push({
            id: video._id,
            title: video.videotitle,
            thumbnail: thumbnailUrl.substring(0, 100)
          });
          
          console.log(`✅ Fixed: ${video.videotitle}`);
        }
      } catch (error) {
        console.error(`❌ Error fixing ${video._id}:`, error);
      }
    }

    console.log(`\n✅ Fixed ${fixed} thumbnails`);

    res.json({
      success: true,
      fixed,
      total: videos.length,
      results: results.slice(0, 10)
    });
  } catch (error) {
    console.error('❌ Fix error:', error);
    res.status(500).json({ error: error.message });
  }
});
// ✅ FIX ALL EXISTING VIDEOS - Regenerate proper URLs
router.post('/admin/fix-all-videos-final', async (req, res) => {
  try {
    console.log('\n🔧 ===== FINAL FIX FOR ALL VIDEOS =====');
    
    const videos = await videofiles.find({});
    let fixed = 0;
    let unfixable = 0;
    const results = [];

    for (const video of videos) {
      // Extract public_id from videofilename or any existing URL
      let publicId = video.videofilename;
      
      // If videofilename doesn't look like a public_id, try to extract from URL
      if (!publicId || !publicId.includes('youtube-clone/videos/')) {
        const urls = [video.filepath, video.videofile, video.videoLink].filter(Boolean);
        for (const url of urls) {
          const match = url.match(/youtube-clone\/videos\/([^.\/]+)/);
          if (match) {
            publicId = `youtube-clone/videos/${match[1]}`;
            break;
          }
        }
      }
      
      // Last resort: extract file_xxx from anywhere
      if (!publicId || !publicId.includes('youtube-clone/videos/')) {
        const urls = [video.filepath, video.videofile, video.videoLink, video.videofilename].filter(Boolean);
        for (const path of urls) {
          const fileMatch = path.match(/file_[a-z0-9]+/i);
          if (fileMatch) {
            publicId = `youtube-clone/videos/${fileMatch[0]}`;
            break;
          }
        }
      }

      if (!publicId || !publicId.includes('file_')) {
        unfixable++;
        console.log(`❌ Cannot fix: ${video.videotitle} - No valid public_id found`);
        continue;
      }

      // ✅ Build correct URLs
      const videoUrl = `https://res.cloudinary.com/dxuxxk0ss/video/upload/f_mp4,vc_h264,ac_aac,af_44100,br_1000k,q_auto:good/${publicId}.mp4`;
      const thumbnailUrl = `https://res.cloudinary.com/dxuxxk0ss/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;

      // Update all fields
      video.filepath = videoUrl;
      video.videofile = videoUrl;
      video.videoLink = videoUrl;
      video.videoUrl = videoUrl;
      video.videofilename = publicId;
      
      video.thumbnail = thumbnailUrl;
      video.videothumbnail = thumbnailUrl;
      video.thumbnailUrl = thumbnailUrl;
      video.videothumb = thumbnailUrl;
      
      await video.save();
      
      fixed++;
      results.push({
        id: video._id,
        title: video.videotitle,
        publicId,
        videoUrl: videoUrl.substring(0, 80),
        thumbnailUrl: thumbnailUrl.substring(0, 80)
      });
      
      console.log(`✅ Fixed: ${video.videotitle}`);
    }

    console.log(`\n✅ Fixed: ${fixed}, Unfixable: ${unfixable}`);

    res.json({
      success: true,
      summary: {
        total: videos.length,
        fixed,
        unfixable
      },
      results: results.slice(0, 10)
    });
  } catch (error) {
    console.error('❌ Fix error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ DEBUG: Test Cloudinary upload directly
router.post('/test-cloudinary-upload',
  verifyToken,
  uploadVideo.single('file'),
  async (req, res) => {
    console.log('\n🧪 ===== CLOUDINARY UPLOAD TEST =====');
    console.log('File received:', !!req.file);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    console.log('Cloudinary Response:', JSON.stringify(req.file, null, 2));
    
    // Try to verify on Cloudinary
    try {
      const cloudinary = await import('../config/cloudinary.js');
      const publicId = req.file.public_id || req.file.filename;
      
      console.log('Verifying public_id:', publicId);
      
      const videoInfo = await cloudinary.cloudinary.api.resource(publicId, {
        resource_type: 'video'
      });
      
      console.log('✅ Video found on Cloudinary:', videoInfo);
      
      res.json({
        success: true,
        message: 'Upload successful and verified!',
        cloudinaryResponse: req.file,
        verificationData: {
          public_id: videoInfo.public_id,
          url: videoInfo.secure_url,
          duration: videoInfo.duration,
          format: videoInfo.format,
          bytes: videoInfo.bytes
        }
      });
    } catch (error) {
      console.error('❌ Verification failed:', error);
      
      res.status(500).json({
        success: false,
        message: 'Upload completed but verification failed',
        error: error.message,
        cloudinaryResponse: req.file
      });
    }
  }
);


export default router;
