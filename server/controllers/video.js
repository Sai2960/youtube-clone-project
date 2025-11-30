// controllers/video.js
import videofiles from "../Modals/video.js";
import path from "path";
import User from "../Modals/User.js";
import { toAbsoluteURL } from '../utils/urlHelper.js';

const transformVideoURLs = (video) => {
  if (!video) return null;
  
  const videoObj = video.toObject ? video.toObject() : video;
  
  return {
    ...videoObj,
    filepath: toAbsoluteURL(videoObj.filepath),
    videothumbnail: toAbsoluteURL(videoObj.videothumbnail),
    uploadedBy: videoObj.uploadedBy ? {
      ...videoObj.uploadedBy,
      image: toAbsoluteURL(videoObj.uploadedBy.image),
      bannerImage: toAbsoluteURL(videoObj.uploadedBy.bannerImage)
    } : videoObj.uploadedBy
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
      video.shares.platforms[platform] = (video.shares.platforms[platform] || 0) + 1;
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

// ==============================
// 📤 Upload Video
// ==============================
export const uploadvideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { videotitle, videodescription, videochanel } = req.body;
    const uploadedBy = req.user?.id;

    if (!uploadedBy) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await User.findById(uploadedBy);
    const channelName = user?.channelname || videochanel || "Unknown Channel";

    const videofilename = req.file.filename;
const filepath = req.file.path; // Cloudinary URL
    const title = videotitle || req.file.originalname;

    const autoDescription =
      videodescription && videodescription.trim() !== ""
        ? videodescription
        : generateDescription(title);

    const engagement = generateInitialEngagement();
    const sampleComments = generateSampleComments(title);

    const newVideo = new videofiles({
      videotitle: title,
      videodescription: autoDescription,
      videofilename,
      filepath,
      filename: req.file.originalname,
      filetype: req.file.mimetype,
      filesize: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      videotype: req.file.mimetype,
      uploadedBy,
      videochanel: channelName,
      views: engagement.views,
      Like: engagement.likes,
      Dislike: engagement.dislikes,
      likes: [],
      dislikes: [],
    });

    await newVideo.save();
    await newVideo.populate("uploadedBy", "name email channelname image");

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully with auto-generated metadata",
      video: newVideo,
      autoGenerated: {
        description: !videodescription || videodescription.trim() === "",
        channel: !videochanel,
        engagement: true,
        initialViews: engagement.views,
        initialLikes: engagement.likes,
        initialDislikes: engagement.dislikes,
        sampleComments,
      },
    });
  } catch (error) {
    console.error("Upload video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload video",
      error: error.message,
    });
  }
};

// ==============================
// 📺 Get All Videos
// ==============================
export const getallvideo = async (req, res) => {
  try {
    const videos = await videofiles
      .find()
      .populate("uploadedBy", "name email channelname image")
      .sort({ createdAt: -1 })
      .lean(); // ✅ Use lean for better performance

    // ✅ Transform all URLs to absolute
    const videosWithAbsoluteURLs = videos.map(transformVideoURLs);

    res.status(200).json({ 
      success: true, 
      videos: videosWithAbsoluteURLs 
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

    const video = await videofiles
      .findById(id)
      .populate("uploadedBy", "name email channelname image subscribers")
      .lean();

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    await videofiles.findByIdAndUpdate(id, { $inc: { views: 1 } });
    video.views = (video.views || 0) + 1;

    // ✅ Transform URLs
    const videoWithAbsoluteURLs = transformVideoURLs(video);

    res.status(200).json({ 
      success: true, 
      video: videoWithAbsoluteURLs 
    });
  } catch (error) {
    console.error("Get video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch video",
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
export const getRelatedVideos = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    console.log('🎯 Fetching related videos for:', id);

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
        { videotitle: { $regex: currentVideo.videotitle.split(' ')[0], $options: 'i' } },
        // Same category if you have it
        // { category: currentVideo.category }
      ]
    };

    // Fetch related videos
    const relatedVideos = await videofiles
      .find(relatedQuery)
      .populate('uploadedBy', 'name email channelname image subscribers')
      .sort({ views: -1, createdAt: -1 }) // Sort by popularity then recency
      .limit(parseInt(limit));

    // If not enough related videos, fill with popular videos
    if (relatedVideos.length < parseInt(limit)) {
      const remaining = parseInt(limit) - relatedVideos.length;
      const relatedIds = relatedVideos.map(v => v._id);
      
      const popularVideos = await videofiles
        .find({ 
          _id: { $nin: [...relatedIds, id] } 
        })
        .populate('uploadedBy', 'name email channelname image subscribers')
        .sort({ views: -1, createdAt: -1 })
        .limit(remaining);

      relatedVideos.push(...popularVideos);
    }

    console.log(`✅ Found ${relatedVideos.length} related videos`);

    res.status(200).json({
      success: true,
      data: relatedVideos,
      count: relatedVideos.length,
    });

  } catch (error) {
    console.error('❌ Error fetching related videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch related videos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};