// controllers/video.js
import videofiles from "../Modals/video.js";
import path from "path";
import User from "../Modals/User.js";
import { toAbsoluteURL } from "../utils/urlHelper.js";

const getVideoURL = (filepath) => {
  if (!filepath) return null;

  const CLOUDINARY_CLOUD_NAME =
    process.env.CLOUDINARY_CLOUD_NAME || "dxuxxk0ss";
  const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload`;

  const fileStr = String(filepath).trim();
  // ✅ CRITICAL FIX: Handle Cloudinary URLs with audio
  if (fileStr.includes("res.cloudinary.com") && fileStr.includes("/upload/")) {
    let url = fileStr.replace(/^http:\/\//, "https://").replace(/:\d+/, "");

    // ✅ Add audio transformations if missing
    if (!url.includes("ac_aac") && !url.includes("audio")) {
      const urlParts = url.split("/upload/");
      if (urlParts.length === 2) {
        const transforms = "f_mp4,vc_h264,ac_aac,af_44100,br_1000k,q_auto:good";
        url = `${urlParts[0]}/upload/${transforms}/${urlParts[1]}`;

        // Ensure .mp4 extension
        if (!url.endsWith(".mp4")) {
          url = url.replace(/\.[^.]+$/, ".mp4");
        }
      }
    }

    return url;
  }

  // ✅ Extract file ID and reconstruct
  const fileIdMatch = fileStr.match(/file_[a-z0-9]+/i);
  if (fileIdMatch) {
    const fileId = fileIdMatch[0];
    const transforms = "f_mp4,vc_h264,ac_aac,af_44100,br_1000k,q_auto:good";
    return `${CLOUDINARY_BASE}/${transforms}/youtube-clone/videos/${fileId}.mp4`;
  }

  // ✅ Reject invalid URLs
  if (
    fileStr.includes("localhost") ||
    fileStr.includes(":5000") ||
    fileStr.includes("192.168") ||
    fileStr.includes("127.0.0.1")
  ) {
    console.warn("⚠️ Invalid local URL detected:", fileStr);
    return null;
  }

  console.error("❌ Could not process video URL:", fileStr.substring(0, 100));
  return null;
};

const getImageURL = (imagePath) => {
  if (!imagePath) return null;

  const BASE_URL =
    process.env.BASE_URL || "https://youtube-clone-project-q3pd.onrender.com";

  // Already full URL
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    // Fix localhost URLs
    if (
      imagePath.includes("192.168.0.181") ||
      imagePath.includes("localhost")
    ) {
      return imagePath
        .replace(/https?:\/\/(192\.168\.0\.181|localhost):5000/, BASE_URL)
        .replace("http://", "https://");
    }
    // Fix wrong Vercel URLs with port
    if (imagePath.includes("vercel.app:5000")) {
      return imagePath.replace(/https:\/\/[^/]+:5000/, BASE_URL);
    }
    return imagePath.replace("http://", "https://");
  }

  // Cloudinary URL
  if (imagePath.includes("cloudinary.com")) {
    return imagePath.replace("http://", "https://");
  }

  // Relative path
  const cleanPath = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${BASE_URL}/${cleanPath}`;
};

// ✅ CRITICAL FIX: Enhanced transformVideoURLs with better handling
// ✅ CRITICAL FIX: Enhanced transformVideoURLs with better handling
const transformVideoURLs = (video) => {
  if (!video) {
    console.log("⚠️ transformVideoURLs: video is null/undefined");
    return null;
  }

  // Handle both Mongoose documents and plain objects
  const videoObj = video.toObject ? video.toObject() : { ...video };

  console.log("🔄 Transforming video URLs:", {
    id: videoObj._id,
    hasFilepath: !!videoObj.filepath,
    hasVideofile: !!videoObj.videofile,
    hasVideoLink: !!videoObj.videoLink,
    hasThumbnail: !!videoObj.videothumbnail || !!videoObj.thumbnail,
  });

  // ✅ Support multiple field name conventions
  const videoPath =
    videoObj.filepath || videoObj.videofile || videoObj.videoLink;
  const thumbnailPath =
    videoObj.videothumbnail || videoObj.thumbnail || videoObj.videothumb;

  // ✅ CRITICAL: Use the fixed getVideoURL function
  const transformedVideoUrl = getVideoURL(videoPath);
  const transformedThumbnailUrl = getImageURL(thumbnailPath);

  console.log("✅ Transformed URLs:", {
    video: transformedVideoUrl?.substring(0, 60),
    thumbnail: transformedThumbnailUrl?.substring(0, 60),
    isCloudinary: transformedVideoUrl?.includes("cloudinary.com"),
  });

  return {
    ...videoObj,
    // Set ALL possible video field names with the SAME URL
    filepath: transformedVideoUrl,
    videofile: transformedVideoUrl,
    videoLink: transformedVideoUrl,
    videoUrl: transformedVideoUrl, // ✅ ADD THIS FIELD

    // Set ALL possible thumbnail field names
    videothumbnail: transformedThumbnailUrl,
    thumbnail: transformedThumbnailUrl,
    videothumb: transformedThumbnailUrl,
    thumbnailUrl: transformedThumbnailUrl, // ✅ ADD THIS FIELD

    // Transform channel/user info
    uploadedBy:
      videoObj.uploadedBy && typeof videoObj.uploadedBy === "object"
        ? {
            ...videoObj.uploadedBy,
            image: getImageURL(videoObj.uploadedBy.image),
            bannerImage: getImageURL(videoObj.uploadedBy.bannerImage),
          }
        : videoObj.uploadedBy,
  };
};
// ==============================
// 📊 Track Video Shares
// ==============================
export const trackShare = async (req, res) => {
  try {
    const { videoId, platform } = req.body;
    const userId = req.user?.id || req.userId;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "Video ID is required",
      });
    }

    const video = await videofiles.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    if (!video.shares) {
      video.shares = { total: 0, platforms: {} };
    }

    video.shares.total = (video.shares.total || 0) + 1;

    if (platform) {
      if (!video.shares.platforms) {
        video.shares.platforms = {};
      }
      video.shares.platforms[platform] =
        (video.shares.platforms[platform] || 0) + 1;
    }

    await video.save();

    res.status(200).json({
      success: true,
      message: "Share tracked successfully",
      shares: video.shares,
    });
  } catch (error) {
    console.error("Track share error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track share",
      error: error.message,
    });
  }
};

// ==============================
// 📈 Get Share Statistics
// ==============================
export const getShareStats = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await videofiles.findById(id).select("shares videotitle");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    res.status(200).json({
      success: true,
      videoTitle: video.videotitle,
      shares: video.shares || { total: 0, platforms: {} },
    });
  } catch (error) {
    console.error("Get share stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch share statistics",
    });
  }
};

// ==============================
// 🧠 Helper Functions
// ==============================
const generateDescription = (title) => {
  const templates = [
    `Watch this amazing video about ${title}. Don't forget to like, share, and subscribe for more content!`,
    `${title} - A must-watch video! Join us as we explore this exciting topic. Hit the subscribe button to stay updated!`,
    `Presenting: ${title}. This video covers everything you need to know. Like and share if you enjoyed it!`,
    `${title} - New upload! Check out this incredible content and let us know your thoughts in the comments below.`,
    `${title}. Thanks for watching! Subscribe to our channel for more amazing videos like this one.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
};

const generateInitialEngagement = () => {
  const views = Math.floor(Math.random() * 91) + 10;
  const likePercentage = 0.05 + Math.random() * 0.1;
  const likes = Math.floor(views * likePercentage);
  const dislikePercentage = 0.005 + Math.random() * 0.015;
  const dislikes = Math.floor(views * dislikePercentage);
  return { views, likes, dislikes };
};

const generateSampleComments = (videoTitle) => {
  const templates = [
    `Great video! Really enjoyed learning about ${videoTitle}.`,
    `This is exactly what I was looking for. Thanks for sharing!`,
    `Awesome content! Keep it up!`,
    `Very informative and well-explained. Subscribed!`,
    `Love this! Can't wait to see more videos like this.`,
    `Excellent work! The quality is amazing.`,
    `This deserves more views. Underrated content!`,
    `Thanks for making this video. Very helpful!`,
    `Wow, this is incredible! Great job!`,
    `Finally someone explained this clearly. Thank you!`,
  ];
  const numComments = Math.floor(Math.random() * 3) + 3;
  return templates.sort(() => 0.5 - Math.random()).slice(0, numComments);
};

// ✅ CRITICAL FIX: Simplified uploadvideo controller
// ✅ CRITICAL FIX: Simplified uploadvideo controller
// REPLACE THE uploadvideo FUNCTION (around lines 183-290) with this:

// 🔥 CRITICAL FIX: Lines 183-290
export const uploadvideo = async (req, res) => {
  try {
    console.log("\n📤 ===== VIDEO UPLOAD STARTED =====");
    console.log("   req.file exists:", !!req.file);
    console.log("   req.userId:", req.userId);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // ✅ CRITICAL: Log EVERYTHING Cloudinary returns
    console.log("🔍 Full Cloudinary Response:", JSON.stringify(req.file, null, 2));

    // ✅ Extract data from req.file
    const cloudinaryData = {
      secure_url: req.file.secure_url || req.file.path,
      public_id: req.file.public_id || req.file.filename,
      url: req.file.url,
      format: req.file.format,
      resource_type: req.file.resource_type,
      bytes: req.file.size,
      duration: req.file.duration
    };

    console.log("📊 Extracted Cloudinary Data:", cloudinaryData);

    // ✅ CRITICAL: Validate we have public_id
    if (!cloudinaryData.public_id) {
      console.error("❌ NO PUBLIC_ID IN RESPONSE!");
      console.error("   Full req.file:", req.file);
      
      return res.status(500).json({
        success: false,
        message: "Upload failed - Cloudinary did not return public_id",
        debug: {
          hasPath: !!req.file.path,
          hasFilename: !!req.file.filename,
          hasSecureUrl: !!req.file.secure_url,
          keys: Object.keys(req.file)
        }
      });
    }

    const publicId = cloudinaryData.public_id; // e.g., "youtube-clone/videos/file_1234_abc"
    console.log("✅ Public ID:", publicId);

    // ✅ Build clean URLs
    const videoUrl = `https://res.cloudinary.com/dxuxxk0ss/video/upload/f_mp4,vc_h264,ac_aac,af_44100,br_1000k,q_auto:good/${publicId}.mp4`;
    const thumbnailUrl = `https://res.cloudinary.com/dxuxxk0ss/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;

    console.log("✅ Video URL:", videoUrl.substring(0, 80));
    console.log("✅ Thumbnail URL:", thumbnailUrl.substring(0, 80));

    // ✅ Get request data
    const { videotitle, videodescription, videochanel } = req.body;
    const uploadedBy = req.userId;

    if (!uploadedBy) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await User.findById(uploadedBy);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const channelName = user?.channelname || videochanel || user?.name || "Unknown Channel";
    const title = videotitle || req.file.originalname;
    const autoDescription = videodescription?.trim() || 
      `Watch this amazing video about ${title}. Don't forget to like and subscribe!`;

    const views = Math.floor(Math.random() * 91) + 10;
    const likes = Math.floor(views * 0.075);
    const dislikes = Math.floor(views * 0.01);

    // ✅ Create video document
    const newVideo = new videofiles({
      videotitle: title,
      videodescription: autoDescription,
      videofilename: publicId, // ✅ Store public_id
      
      // ✅ ALL video URL fields = same clean URL
      filepath: videoUrl,
      videofile: videoUrl,
      videoLink: videoUrl,
      videoUrl: videoUrl,
      
      // ✅ ALL thumbnail fields = generated thumbnail
      thumbnail: thumbnailUrl,
      videothumbnail: thumbnailUrl,
      thumbnailUrl: thumbnailUrl,
      videothumb: thumbnailUrl,

      filename: req.file.originalname,
      filetype: req.file.mimetype,
      filesize: `${(cloudinaryData.bytes / (1024 * 1024)).toFixed(2)} MB`,
      videotype: req.file.mimetype,
      uploadedBy,
      user: uploadedBy,
      videochanel: channelName,
      channelName: channelName,
      views: views,
      Like: likes,
      Dislike: dislikes,
      likes: likes,
      dislikes: dislikes,
    });

    const savedVideo = await newVideo.save();

    console.log("✅ Video saved:", {
      _id: savedVideo._id,
      title: savedVideo.videotitle,
      videoUrl: savedVideo.filepath?.substring(0, 60),
      thumbnailUrl: savedVideo.thumbnail?.substring(0, 60),
    });

    await savedVideo.populate({
      path: "uploadedBy",
      select: "name email channelname image",
      options: { strictPopulate: false },
    });

    // ✅ Clear cache
    try {
      const { clearCachePattern } = await import("../middleware/cache.js");
      clearCachePattern(/\/video/);
      console.log("✅ Video cache cleared");
    } catch (e) {
      console.log("⚠️ Cache clear skipped:", e.message);
    }

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      video: savedVideo,
      videoUrl: videoUrl,
      thumbnailUrl: thumbnailUrl,
      publicId: publicId
    });
  } catch (error) {
    console.error("\n❌ VIDEO UPLOAD ERROR:");
    console.error("   Message:", error.message);
    console.error("   Stack:", error.stack);
    
    res.status(500).json({
      success: false,
      message: "Failed to upload video",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};
// ==============================
// 📺 Get All Videos - OPTIMIZED
// ==============================
export const getallvideo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // ✅ CRITICAL FIX: Better projection + validation
    const videos = await videofiles
      .find()
      .select(
        "videotitle videodescription videofilename filepath videothumbnail views videochanel uploadedBy createdAt Like Dislike _id"
      )
      .populate({
        path: "uploadedBy",
        select: "name email channelname image",
        options: { lean: true, strictPopulate: false },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .maxTimeMS(5000);

    const total = await videofiles.countDocuments();

    console.log(`📹 Retrieved ${videos.length} videos`);

    // ✅ Validate each video has an _id
    const validVideos = videos.filter((video) => {
      if (!video._id) {
        console.warn("⚠️ Video missing _id:", video.videotitle);
        return false;
      }
      return true;
    });

    // ✅ Transform URLs
    const videosWithAbsoluteURLs = validVideos.map((video) => {
      const transformed = transformVideoURLs(video);

      if (
        transformed.uploadedBy &&
        typeof transformed.uploadedBy === "object"
      ) {
        transformed.uploadedBy.image = getImageURL(
          transformed.uploadedBy.image
        );
      }

      return transformed;
    });
    // ✅ CRITICAL FIX: No caching for fresh data
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.status(200).json({
      success: true,
      videos: videosWithAbsoluteURLs,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error("Get videos error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
    });
  }
};

// ==============================
// 🎬 Get Video By ID
// ==============================
// ==============================
// 🎬 Get Video By ID - FIXED VERSION
// ==============================
export const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("\n🎬 ===== GET VIDEO BY ID =====");

    console.log("   Video ID:", id);
    console.log("   ID length:", id?.length);
    console.log("   ID type:", typeof id);

    // ✅ CRITICAL FIX: Better ID validation
    if (!id || id === "undefined" || id === "null" || id.trim() === "") {
      console.log("❌ Invalid video ID format");
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    // ✅ CRITICAL: Check if it's a valid MongoDB ObjectId
    const mongoose = await import("mongoose");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("❌ Not a valid MongoDB ObjectId:", id);
      return res.status(400).json({
        success: false,
        message: "Invalid video ID format",
      });
    }

    // ✅ CRITICAL FIX: Use lean() + select only needed fields
    const video = await videofiles
      .findById(id)
      .select(
        "videotitle videodescription filepath videothumbnail views videochanel uploadedBy createdAt Like Dislike videofile videoLink thumbnail title description"
      )
      .populate({
        path: "uploadedBy",
        select: "name email channelname image bannerImage subscribers",
        options: { lean: true, strictPopulate: false },
      })
      .lean(); // ✅ Return plain object

    console.log("📊 Video Query Result:", {
      found: !!video,
      id: video?._id,
      title: video?.videotitle,
      hasFilepath: !!video?.filepath,
      hasUploadedBy: !!video?.uploadedBy,
    });

    if (!video) {
      console.log("❌ Video not found in database");
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // ✅ Increment views asynchronously (don't wait - faster response)
    videofiles.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec();
    video.views = (video.views || 0) + 1;

    // ✅ Transform URLs
    const videoWithAbsoluteURLs = transformVideoURLs(video);

    // ✅ CRITICAL FIX: Ensure user avatar is transformed
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

    if (!videoWithAbsoluteURLs) {
      console.log("❌ URL transformation failed");
      return res.status(500).json({
        success: false,
        message: "Failed to process video data",
      });
    }

    console.log("✅ Video data prepared");
    console.log("===== VIDEO RESPONSE SENT =====\n");

    // ✅ CRITICAL FIX: Add cache headers
    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=1800"); // 10 min client, 30 min CDN

    res.status(200).json({
      success: true,
      video: videoWithAbsoluteURLs,
      data: videoWithAbsoluteURLs,
    });
  } catch (error) {
    console.error("❌ Get video error:", error);
    console.error("   Error name:", error.name);
    console.error("   Error message:", error.message);

    // ✅ Handle CastError (invalid ObjectId format)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch video",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// ==============================
// 🗑 Delete Video
// ==============================
export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user?.id;

    const video = await videofiles.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    if (String(video.uploadedBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this video",
      });
    }

    const fs = await import("fs");
    const videoPath = path.join(process.cwd(), video.filepath);
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    await videofiles.findByIdAndDelete(id);

    // ✅ CRITICAL FIX: Clear cache after deletion
    try {
      const { clearCachePattern } = await import("../middleware/cache.js");
      clearCachePattern(/\/video/);
      console.log("✅ Video cache cleared after deletion");
    } catch (e) {
      console.log("⚠️ Cache clear failed (non-fatal):", e.message);
    }
    console.log("✅ Video deleted successfully");

    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete video",
      error: error.message,
    });
  }
};

// ==============================
// ⏱ Track Watch Time
// ==============================
export const trackWatchTime = async (req, res) => {
  try {
    const { videoId, watchTime } = req.body;
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.watchTimeLimit === -1) {
      return res.json({
        canContinue: true,
        remainingTime: -1,
      });
    }

    user.watchTimeLimit = Math.max(0, user.watchTimeLimit - watchTime);
    await user.save();

    res.json({
      canContinue: user.watchTimeLimit > 0,
      remainingTime: user.watchTimeLimit,
    });
  } catch (error) {
    console.error("Track watch time error:", error);
    res.status(500).json({ message: "Failed to track watch time" });
  }
};
// ==============================
// 🎯 Get Related Videos
// ==============================
// ==============================
// 🎯 Get Related Videos - FIXED VERSION
// ==============================
export const getRelatedVideos = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    console.log("🎯 Fetching related videos for:", id);

    // Get the current video to extract metadata
    const currentVideo = await videofiles.findById(id);

    if (!currentVideo) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Build query for related videos
    const relatedQuery = {
      _id: { $ne: id }, // Exclude current video
      $or: [
        // Same channel
        { uploadedBy: currentVideo.uploadedBy },
        // Similar title words (simple approach)
        {
          videotitle: {
            $regex: currentVideo.videotitle.split(" ")[0],
            $options: "i",
          },
        },
      ],
    };

    // Fetch related videos
    const relatedVideos = await videofiles
      .find(relatedQuery)
      .populate({
        path: "uploadedBy",
        select: "name email channelname image subscribers",
        options: { strictPopulate: false, lean: true },
      })
      .sort({ views: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean(); // ✅ Return plain objects

    // If not enough related videos, fill with popular videos
    if (relatedVideos.length < parseInt(limit)) {
      const remaining = parseInt(limit) - relatedVideos.length;
      const relatedIds = relatedVideos.map((v) => v._id);

      const popularVideos = await videofiles
        .find({
          _id: { $nin: [...relatedIds, id] },
        })
        .populate({
          path: "uploadedBy",
          select: "name email channelname image subscribers",
          options: { strictPopulate: false, lean: true },
        })
        .sort({ views: -1, createdAt: -1 })
        .limit(remaining)
        .lean();

      relatedVideos.push(...popularVideos);
    }

    // ✅ CRITICAL FIX: Transform ALL video URLs before sending
    const transformedVideos = relatedVideos.map((video) => {
      const transformed = transformVideoURLs(video);

      // ✅ CRITICAL: Transform user avatar too
      if (
        transformed.uploadedBy &&
        typeof transformed.uploadedBy === "object"
      ) {
        transformed.uploadedBy.image = getImageURL(
          transformed.uploadedBy.image
        );
      }

      return transformed;
    });

    console.log(`✅ Found ${transformedVideos.length} related videos`);
    console.log("📊 Sample video URLs:", {
      videoUrl: transformedVideos[0]?.filepath?.substring(0, 60),
      avatarUrl: transformedVideos[0]?.uploadedBy?.image?.substring(0, 60),
    });

    // ✅ Add cache headers
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600"); // 5 min

    res.status(200).json({
      success: true,
      data: transformedVideos,
      count: transformedVideos.length,
    });
  } catch (error) {
    console.error("❌ Error fetching related videos:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch related videos",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};
// Add this BEFORE other routes
