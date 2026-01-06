// server/config/cloudinary.js - SUPABASE MIGRATION VERSION
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";
import { supabase, bucketName, isSupabaseConfigured } from "./supabase.js";

dotenv.config();

// ==================== CLOUDINARY CONFIGURATION (FALLBACK ONLY) ====================
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
    timeout: 600000,
  });

  console.log("⚠️  Cloudinary configured as FALLBACK:", {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    has_api_key: !!process.env.CLOUDINARY_API_KEY,
  });
} else {
  console.log("ℹ️  Cloudinary not configured (Supabase-only mode)");
}

// ==================== SUPABASE UPLOAD HELPER ====================
export const uploadToSupabase = async (file, folder = "videos") => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const fileName = `${folder}/${Date.now()}-${file.originalname}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("❌ Supabase upload error:", error);
    throw error;
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucketName).getPublicUrl(fileName);

  return {
    url: publicUrl,
    path: fileName,
    publicId: fileName,
  };
};

// ==================== MULTER MEMORY STORAGE (FOR SUPABASE) ====================
const memoryStorage = multer.memoryStorage();

// ==================== CLOUDINARY UPLOAD WITH AUDIO ====================
export const uploadVideoWithAudio = async (fileBuffer, options = {}) => {
  // ✅ CRITICAL: Always fail if Cloudinary is disabled
  throw new Error("Cloudinary is disabled. Please use Supabase storage.");
};

return new Promise((resolve, reject) => {
  const uploadStream = cloudinary.uploader.upload_stream(
    {
      resource_type: "video",
      folder: options.folder || "youtube-clone/videos",
      chunk_size: 6000000, // 6MB chunks
      eager: [
        {
          format: "mp4",
          video_codec: "h264",
          audio_codec: "aac",
          audio_frequency: 44100,
          bit_rate: "1000k",
          quality: "auto:good",
        },
      ],
      eager_async: true,
      ...options,
    },
    (error, result) => {
      if (error) {
        console.error("❌ Cloudinary upload error:", error);
        reject(error);
      } else {
        console.log("✅ Cloudinary upload success:", result.public_id);
        resolve(result);
      }
    }
  );

  // Handle both Buffer and File objects
  if (Buffer.isBuffer(fileBuffer)) {
    uploadStream.end(fileBuffer);
  } else if (fileBuffer.buffer) {
    uploadStream.end(fileBuffer.buffer);
  } else {
    uploadStream.end(fileBuffer);
  }
});

// ==================== VIDEO UPLOADER ====================
export const uploadVideo = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    fieldSize: 10 * 1024 * 1024,
    fields: 10,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
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
      cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
  },
});

// ==================== THUMBNAIL UPLOADER ====================
export const uploadThumbnail = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed for thumbnails"), false);
    }
  },
});

// ==================== CHANNEL IMAGE UPLOADER ====================
export const uploadChannelImage = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed for channel images"), false);
    }
  },
});

// ==================== SHORTS UPLOADER ====================
export const uploadShortsVideo = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    fieldSize: 100 * 1024 * 1024,
    fields: 10,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["video/mp4", "video/quicktime", "video/webm"];

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only video files allowed for shorts"), false);
    }
  },
});

export const uploadShortsThumbnail = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed for shorts thumbnails"), false);
    }
  },
});

// ==================== DELETE FROM SUPABASE ====================
export const deleteFromSupabase = async (filePath) => {
  if (!isSupabaseConfigured()) {
    console.warn("⚠️  Supabase not configured - cannot delete");
    return;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error("❌ Supabase delete error:", error);
      throw error;
    }

    console.log("✅ Deleted from Supabase:", filePath);
    return data;
  } catch (error) {
    console.error("❌ Error deleting from Supabase:", error);
    throw error;
  }
};

// ==================== CLOUDINARY FALLBACK (LEGACY) ====================
export const deleteFromCloudinary = async (
  publicId,
  resourceType = "video"
) => {
  if (!isCloudinaryConfigured) {
    console.warn("⚠️  Cloudinary not configured");
    return;
  }

  try {
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

export const extractPublicId = (url) => {
  if (!url) return null;

  // Supabase URLs
  if (url.includes("supabase.co")) {
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return match ? match[1] : null;
  }

  // Cloudinary URLs
  if (url.includes("cloudinary.com")) {
    try {
      const parts = url.split("/upload/");
      if (parts.length > 1) {
        const afterUpload = parts[1].split("/").slice(1).join("/");
        return afterUpload.replace(/\.[^/.]+$/, "");
      }
    } catch (error) {
      console.error("Error extracting public ID:", error);
    }
  }

  return null;
};

// ==================== EXPORTS ====================
export { cloudinary };
export default cloudinary;
