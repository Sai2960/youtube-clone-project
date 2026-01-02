// server/config/cloudinary.js - COMPLETE MERGED & FIXED VERSION WITH AUDIO PRESERVATION
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

// ==================== CLOUDINARY CONFIGURATION ====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 600000,
  // ✅ CRITICAL FIX: Force unsigned delivery
  sign_url: false,
  secure_distribution: null,
  private_cdn: false,
});

console.log("🎨 Cloudinary configured:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  has_api_key: !!process.env.CLOUDINARY_API_KEY,
  has_api_secret: !!process.env.CLOUDINARY_API_SECRET,
});

const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const MAX_SIZE_MB = 95;
    const fileSizeMB = file.size / (1024 * 1024);

    console.log(`📦 Upload attempt: ${fileSizeMB.toFixed(2)}MB`);

    if (fileSizeMB > MAX_SIZE_MB) {
      throw new Error(
        `File size ${fileSizeMB.toFixed(0)}MB exceeds ${MAX_SIZE_MB}MB limit`
      );
    }

    return {
      folder: "youtube-clone/videos",
      resource_type: "video",
      public_id: `file_${timestamp}_${randomStr}`,
      format: "mp4",
      allowed_formats: ["mp4", "mov", "avi", "mkv", "webm"],
      resource_type: "video",
      type: "upload",
      access_mode: "public",
      delivery_type: "upload", // ✅ ADD THIS
      chunk_size: 6000000,
      timeout: 900000,
      transformation: [
        {
          fetch_format: "mp4",
          quality: "auto:good",
          video_codec: "h264",
          audio_codec: "aac",
          audio_frequency: 44100,
          bit_rate: "1m",
          flags: "keep_iptc",
        },
      ],
      eager: [
        {
          width: 854,
          height: 480,
          crop: "limit",
          quality: "auto:good",
          video_codec: "h264",
          audio_codec: "aac",
          bit_rate: "1m",
          format: "mp4",
        },
      ],
      eager_async: true,
    };
  },
});

// Channel image storage
const channelImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "youtube-clone/channel-images",
    resource_type: "image",
    type: "upload",
    access_mode: "public",
    delivery_type: "upload", // ✅ ADD THIS
    allowed_formats: ["jpg", "png", "jpeg", "gif", "webp"],
    transformation: [
      { width: 800, height: 800, crop: "limit", quality: "auto" },
    ],
  },
});

// Thumbnail storage
const thumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "youtube-clone/thumbnails",
    resource_type: "image",
    type: "upload",
    access_mode: "public",
    delivery_type: "upload", // ✅ ADD THIS
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [
      { width: 1280, height: 720, crop: "limit", quality: "auto" },
    ],
  },
});

// ✅ CRITICAL FIX: Shorts video storage with audio preservation
const shortsVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    console.log("📤 Processing shorts video upload:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    return {
      folder: "youtube-clone/shorts/videos",
      resource_type: "auto",
      type: "upload", // ✅ CRITICAL FIX
      delivery_type: "upload",
      access_mode: "public", // ✅ CRITICAL FIX
      allowed_formats: ["mp4", "mov", "webm"],
      chunk_size: 6000000,
      timeout: 600000,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      transformation: [
        {
          video_codec: "auto",
          audio_codec: "aac",
          audio_frequency: 44100,
          bit_rate: "500k",
          quality: "auto",
        },
      ],
    };
  },
});

// Shorts thumbnail storage
const shortsThumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "youtube-clone/shorts/thumbnails",
    resource_type: "image",
    type: "upload", // ✅ CRITICAL FIX
    access_mode: "public", // ✅ CRITICAL FIX
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [
      { width: 720, height: 1280, crop: "limit", quality: "auto" },
    ],
  },
});

// ==================== MULTER UPLOAD INSTANCES ====================

// ✅ CRITICAL: Update multer limits
export const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 95 * 1024 * 1024,
    fieldSize: 10 * 1024 * 1024,
    fields: 10,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    console.log("🔍 File filter - Video:", {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    });

    if (file.size && file.size > 95 * 1024 * 1024) {
      console.log("❌ File too large in fileFilter");
      return cb(new Error(`File size exceeds 95MB limit`), false);
    }

    const allowedMimeTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/webm",
      "video/x-flv",
      "video/x-ms-wmv",
    ];

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      file.mimetype.startsWith("video/")
    ) {
      console.log("✅ Video file accepted");
      cb(null, true);
    } else {
      console.log("❌ Invalid video file type:", file.mimetype);
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Only video files allowed.`
        ),
        false
      );
    }
  },
});

// Channel image uploader
export const uploadChannelImage = multer({
  storage: channelImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    console.log("🔍 File filter - Channel Image:", {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });

    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      console.log("✅ Channel image file accepted");
      cb(null, true);
    } else {
      console.log("❌ Invalid image file type:", file.mimetype);
      cb(new Error("Only image files allowed for channel images"), false);
    }
  },
});

// Thumbnail uploader
export const uploadThumbnail = multer({
  storage: thumbnailStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    console.log("🔍 File filter - Thumbnail:", {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });

    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      console.log("✅ Thumbnail file accepted");
      cb(null, true);
    } else {
      console.log("❌ Invalid thumbnail file type:", file.mimetype);
      cb(new Error("Only image files allowed for thumbnails"), false);
    }
  },
});

// Shorts video uploader
export const uploadShortsVideo = multer({
  storage: shortsVideoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    fieldSize: 100 * 1024 * 1024,
    fields: 10,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    console.log("🔍 File filter - Shorts Video:", {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });

    const allowedMimeTypes = ["video/mp4", "video/quicktime", "video/webm"];

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      file.mimetype.startsWith("video/")
    ) {
      console.log("✅ Shorts video file accepted");
      cb(null, true);
    } else {
      console.log("❌ Invalid shorts video file type:", file.mimetype);
      cb(new Error("Only video files allowed for shorts"), false);
    }
  },
});

// Shorts thumbnail uploader
export const uploadShortsThumbnail = multer({
  storage: shortsThumbnailStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    console.log("🔍 File filter - Shorts Thumbnail:", {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });

    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      console.log("✅ Shorts thumbnail file accepted");
      cb(null, true);
    } else {
      console.log("❌ Invalid shorts thumbnail file type:", file.mimetype);
      cb(new Error("Only image files allowed for shorts thumbnails"), false);
    }
  },
});

// ==================== CLOUDINARY UTILITIES ====================

/**
 * Delete a resource from Cloudinary
 * @param {string} publicId - The public ID of the resource
 * @param {string} resourceType - 'image' or 'video' (default: 'video')
 * @returns {Promise} - Cloudinary deletion result
 */
export const deleteFromCloudinary = async (
  publicId,
  resourceType = "video"
) => {
  try {
    console.log(`🗑️ Deleting ${resourceType} from Cloudinary:`, publicId);
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
    console.log("✅ Cloudinary deletion result:", result);
    return result;
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error);
    throw error;
  }
};
/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 *
 *
 * @returns {string|null} - Public ID or null
 */
export const extractPublicId = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length > 1) {
      const afterUpload = parts[1].split("/").slice(1).join("/");
      return afterUpload.replace(/\.[^/.]+$/, "");
    }
  } catch (error) {
    console.error("Error extracting public ID:", error);
  }
  return null;
};

/**
 * Get video information from Cloudinary
 * @param {string} publicId - The public ID of the video
 * @returns {Promise} - Video resource details
 */
export const getVideoInfo = async (publicId) => {
  try {
    console.log("📊 Fetching video info from Cloudinary:", publicId);
    const result = await cloudinary.api.resource(publicId, {
      resource_type: "video",
    });
    console.log("✅ Video info retrieved:", {
      duration: result.duration,
      format: result.format,
      bytes: result.bytes,
      hasAudio: result.audio ? true : false,
    });
    return result;
  } catch (error) {
    console.error("❌ Error fetching video info:", error);
    throw error;
  }
};

/**
 * Generate video thumbnail URL
 * @param {string} publicId - The public ID of the video
 * @param {Object} options - Transformation options
 * @returns {string} - Thumbnail URL
 */
export const generateVideoThumbnail = (publicId, options = {}) => {
  const {
    width = 1280,
    height = 720,
    crop = "fill",
    gravity = "center",
    quality = "auto",
    format = "jpg",
  } = options;

  return cloudinary.url(publicId, {
    resource_type: "video",
    transformation: [
      { width, height, crop, gravity, quality },
      { fetch_format: format },
    ],
  });
};

/**
 * ✅ NEW: Generate optimized video URL with audio preservation
 * @param {string} publicId - The public ID of the video
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized video URL
 */
export const generateOptimizedVideoUrl = (publicId, options = {}) => {
  const {
    quality = "auto",
    format = "mp4",
    audioCodec = "aac",
    audioFrequency = 44100,
    bitRate = "500k",
  } = options;

  return cloudinary.url(publicId, {
    resource_type: "video",
    transformation: [
      {
        video_codec: "auto",
        audio_codec: audioCodec,
        audio_frequency: audioFrequency,
        bit_rate: bitRate,
        quality: quality,
        fetch_format: format,
      },
    ],
  });
};

/**
 * ✅ NEW: Verify video has audio track
 * @param {string} publicId - The public ID of the video
 * @returns {Promise<boolean>} - True if video has audio
 */
export const verifyVideoAudio = async (publicId) => {
  try {
    const videoInfo = await getVideoInfo(publicId);
    const hasAudio = videoInfo.audio && videoInfo.audio.codec;

    console.log("🔊 Audio verification:", {
      publicId,
      hasAudio,
      audioCodec: videoInfo.audio?.codec,
      audioChannels: videoInfo.audio?.channels,
    });

    return hasAudio;
  } catch (error) {
    console.error("❌ Error verifying video audio:", error);
    return false;
  }
};

/**
 * ✅ NEW: Upload video with audio preservation guarantee
 * @param {string} filePath - Path to video file
 * @param {Object} options - Upload options
 * @returns {Promise} - Cloudinary upload result
 */
export const uploadVideoWithAudio = async (filePath, options = {}) => {
  try {
    console.log("🎬 Uploading video with audio preservation:", filePath);

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
      folder: options.folder || "youtube-clone/videos",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      chunk_size: 6000000,
      timeout: 600000,
      // ✅ CRITICAL: Audio preservation settings
      transformation: [
        {
          video_codec: "auto",
          audio_codec: "aac",
          audio_frequency: 44100,
          bit_rate: "500k",
          quality: "auto",
        },
      ],
      ...options,
    });

    // ✅ Verify audio after upload
    const hasAudio = await verifyVideoAudio(result.public_id);

    console.log("✅ Video uploaded:", {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      duration: result.duration,
      hasAudio,
    });

    if (!hasAudio) {
      console.warn("⚠️ WARNING: Uploaded video may not have audio track!");
    }

    return {
      ...result,
      hasAudio,
    };
  } catch (error) {
    console.error("❌ Error uploading video with audio:", error);
    throw error;
  }
};

// ==================== DEFAULT EXPORT ====================
export { cloudinary };
export default cloudinary;
