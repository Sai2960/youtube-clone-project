import DownloadModel from "../Modals/download.js";
import Subscription from "../Modals/subscription.js";
import videofiles from "../Modals/video.js";
import mongoose from "mongoose";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to check if plan is premium
const isPremiumPlan = (planType) => {
  if (!planType) return false;
  const plan = planType.toUpperCase();
  return ['GOLD', 'SILVER', 'BRONZE', 'PREMIUM', 'MONTHLY', 'YEARLY'].includes(plan);
};

// CRITICAL: Validate video file integrity
const validateVideoFile = (filePath) => {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    const hex = buffer.toString('hex');
    
    // Check for valid MP4 signatures
    if (hex.includes('667479706d703432') ||  // ftyp mp42
        hex.includes('6674797069736f6d') ||  // ftyp isom
        hex.includes('667479704d534e56') ||  // ftyp MSNV
        hex.includes('66747970') ||          // ftyp (generic)
        hex.includes('6d646174')) {          // mdat
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('File validation error:', error);
    return false;
  }
};

const sanitizeFilename = (filename) => {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\.+/g, '.')
    .trim()
    .substring(0, 100);
};

const encodeRFC5987ValueChars = (str) => {
  return encodeURIComponent(str)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A')
    .replace(/%(?:7C|60|5E)/g, unescape);
};

// Extract filename with better fallback logic
const extractFilename = (video) => {
  let filename = null;

  // Priority 1: videofilename field
  if (video.videofilename) {
    filename = video.videofilename;
  }
  // Priority 2: filename field
  else if (video.filename) {
    filename = video.filename;
  }
  // Priority 3: Extract from filepath
  else if (video.filepath) {
    const pathParts = video.filepath.split(/[\\\/]/);
    filename = pathParts[pathParts.length - 1];
  }

  // Remove any path separators that might remain
  if (filename) {
    filename = filename.replace(/^.*[\\\/]/, '');
  }

  return filename;
};

// Find file with comprehensive search
const findVideoFile = (filename) => {
  const possiblePaths = [
    path.join(process.cwd(), 'uploads', 'videos', filename),
    path.join(process.cwd(), 'uploads', filename),
    path.join(__dirname, '..', 'uploads', 'videos', filename),
    path.join(__dirname, '..', 'uploads', filename),
    path.join(process.cwd(), filename),
  ];

  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      console.log('✅ Found file at:', testPath);
      return testPath;
    }
  }

  console.error('❌ File not found. Checked paths:', possiblePaths);
  return null;
};

export const checkDownloadEligibility = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const subscription = await Subscription.getUserSubscription(userId);
    
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const isPremium = isPremiumPlan(subscription.planType);

    if (isPremium) {
      return res.status(200).json({
        canDownload: true,
        isPremium: true,
        downloadsToday: 0,
        maxDownloads: 'unlimited',
        subscription: {
          planType: subscription.planType,
          planName: subscription.planName,
          features: subscription.features
        }
      });
    }

    const downloadsToday = await DownloadModel.getTodayDownloadCount(userId);
    const maxFreeDownloads = 1;

    return res.status(200).json({
      canDownload: downloadsToday < maxFreeDownloads,
      isPremium: false,
      downloadsToday,
      maxDownloads: maxFreeDownloads,
      subscription: {
        planType: subscription.planType,
        planName: subscription.planName,
        features: subscription.features
      }
    });

  } catch (error) {
    console.error("Check download eligibility error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const downloadVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { userId, quality = '480p' } = req.body;

    console.log('=== DOWNLOAD REQUEST ===');
    console.log({ videoId, userId, quality });

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid video ID format"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid user ID format"
      });
    }

    const video = await videofiles.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ 
        success: false,
        message: "Video not found in database"
      });
    }

    console.log('📹 Video found:', {
      id: video._id,
      title: video.videotitle,
      videofilename: video.videofilename,
      filename: video.filename,
      filepath: video.filepath
    });

    // Extract filename using improved logic
    const filename = extractFilename(video);

    if (!filename) {
      return res.status(500).json({ 
        success: false,
        message: "Video filename not found in database. Please re-upload this video."
      });
    }

    console.log('📝 Extracted filename:', filename);

    const subscription = await Subscription.getUserSubscription(userId);
    if (!subscription) {
      return res.status(404).json({ 
        success: false,
        message: "User subscription not found"
      });
    }

    // UPDATED: Use the helper function to check premium status
    const isPremium = isPremiumPlan(subscription.planType);
    
    console.log('🔍 Download Permission Check:', {
      userId,
      planType: subscription.planType,
      isPremium,
      downloadsToday: isPremium ? 'N/A (Unlimited)' : await DownloadModel.getTodayDownloadCount(userId)
    });
    
    if (!isPremium) {
      const downloadsToday = await DownloadModel.getTodayDownloadCount(userId);
      
      if (downloadsToday >= 1) {
        return res.status(403).json({ 
          success: false,
          needsPremium: true,
          message: "Daily download limit reached. Upgrade to premium for unlimited downloads.",
          currentPlan: subscription.planType,
          downloadsToday
        });
      }
    }

    const availableQualities = isPremium ? ['720p', '480p', '360p'] : ['480p', '360p'];
    if (!availableQualities.includes(quality)) {
      return res.status(400).json({ 
        success: false,
        message: `Quality ${quality} not available${!isPremium ? ' for free users' : ''}`,
        availableQualities
      });
    }

    // Find file on disk
    const filePath = findVideoFile(filename);

    if (!filePath) {
      return res.status(404).json({ 
        success: false,
        message: "Video file not found on server. File may have been moved or deleted."
      });
    }

    // CRITICAL: Validate file is actually a video
    if (!validateVideoFile(filePath)) {
      return res.status(500).json({ 
        success: false,
        message: "Video file is corrupted or invalid. Please re-upload this video."
      });
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    const sanitizedTitle = sanitizeFilename(video.videotitle || 'video');
    const downloadFilename = `${sanitizedTitle}-${quality}.mp4`;

    // Create download record
    const downloadRecord = new DownloadModel({
      userId,
      videoId,
      videoTitle: video.videotitle || 'Untitled Video',
      videoUrl: filename,
      downloadUrl: `/download/stream/${videoId}`,
      fileSize,
      quality,
      status: 'completed'
    });

    await downloadRecord.save();

    console.log('✅ Download record created:', {
      downloadId: downloadRecord._id,
      isPremium,
      quality
    });

    return res.status(200).json({
      success: true,
      message: "Download initiated successfully",
      download: {
        id: downloadRecord._id,
        videoTitle: video.videotitle || 'Untitled Video',
        quality,
        fileSize,
        streamUrl: `/download/stream/${videoId}?quality=${quality}`,
        downloadFilename: downloadFilename,
        expiresAt: downloadRecord.expiresAt,
        isPremium
      }
    });

  } catch (error) {
    console.error("DOWNLOAD ERROR:", error);
    return res.status(500).json({ 
  message: "Download failed", 
  error: process.env.NODE_ENV === 'development' ? error.message : undefined 
});
  }
};

export const streamVideoDownload = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { quality = '480p' } = req.query;

    console.log('=== STREAM DOWNLOAD ===');
    console.log({ videoId, quality });

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }

    const video = await videofiles.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Extract filename
    const filename = extractFilename(video);

    if (!filename) {
      return res.status(404).json({ message: "Video filename not found" });
    }

    // Find file
    const filePath = findVideoFile(filename);

    if (!filePath) {
      return res.status(404).json({ message: "Video file not found on server" });
    }

    // Validate file
    if (!validateVideoFile(filePath)) {
      return res.status(500).json({ message: "Video file is corrupted" });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    const sanitizedTitle = sanitizeFilename(video.videotitle || 'video');
    const downloadFilename = `${sanitizedTitle}-${quality}.mp4`;
    const encodedFilename = encodeRFC5987ValueChars(downloadFilename);
    
    // Set headers for download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Handle range requests
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunksize);
      
      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.pipe(res);
    } else {
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error streaming video" });
        }
      });

      fileStream.pipe(res);
    }

  } catch (error) {
    console.error("Stream download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Download failed", error: error.message });
    }
  }
};

export const getUserDownloads = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const downloads = await DownloadModel.find({ userId })
      .sort({ downloadedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('videoId', 'videotitle videodescription videothumbnail')
      .lean();

    const total = await DownloadModel.countDocuments({ userId });
    const totalPages = Math.ceil(total / limit);

    const baseUrl = process.env.BASE_URL || process.env.BACKEND_URL || 'http://localhost:5000';
    const enhancedDownloads = downloads.map(download => ({
      ...download,
      downloadUrl: `${baseUrl}${download.downloadUrl}`,
      isExpired: new Date() > download.expiresAt
    }));

    return res.status(200).json({
      downloads: enhancedDownloads,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalDownloads: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error("Get user downloads error:", error);
    return res.status(500).json({ message: "Failed to fetch downloads" });
  }
};

export const deleteDownload = async (req, res) => {
  try {
    const { downloadId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(downloadId)) {
      return res.status(400).json({ message: "Invalid download ID" });
    }

    const download = await DownloadModel.findOne({ _id: downloadId, userId });
    if (!download) {
      return res.status(404).json({ message: "Download not found" });
    }

    await DownloadModel.findByIdAndDelete(downloadId);

    return res.status(200).json({
      success: true,
      message: "Download record deleted successfully"
    });

  } catch (error) {
    console.error("Delete download error:", error);
    return res.status(500).json({ message: "Failed to delete download" });
  }
};

export const getDownloadStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const [totalDownloads, todayDownloads, thisMonthDownloads] = await Promise.all([
      DownloadModel.countDocuments({ userId }),
      DownloadModel.getTodayDownloadCount(userId),
      DownloadModel.countDocuments({
        userId,
        downloadedAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    ]);

    const subscription = await Subscription.getUserSubscription(userId);
    const isPremium = isPremiumPlan(subscription?.planType);

    return res.status(200).json({
      totalDownloads,
      todayDownloads,
      thisMonthDownloads,
      subscription: {
        planType: subscription?.planType || 'free',
        isPremium,
        canDownloadToday: isPremium ? true : todayDownloads < 1,
        remainingDownloads: isPremium ? 'unlimited' : Math.max(0, 1 - todayDownloads)
      }
    });

  } catch (error) {
    console.error("Get download stats error:", error);
    return res.status(500).json({ message: "Failed to fetch download statistics" });
  }
};