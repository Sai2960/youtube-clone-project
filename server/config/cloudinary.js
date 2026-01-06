// server/config/cloudinary.js - SUPABASE ONLY VERSION (NO CLOUDINARY)
import multer from "multer";
import dotenv from "dotenv";
import { supabase, bucketName, isSupabaseConfigured } from "./supabase.js";

dotenv.config();

console.log("📦 Storage Configuration:");
console.log("   Supabase configured:", isSupabaseConfigured());

// ==================== SUPABASE UPLOAD HELPER ====================
export const uploadToSupabase = async (file, folder = "videos") => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const fileName = `${folder}/${Date.now()}-${file.originalname}`;

  console.log("📤 Uploading to Supabase:", fileName);

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

  console.log("✅ Upload success:", publicUrl);

  return {
    url: publicUrl,
    path: fileName,
    publicId: fileName,
  };
};

// ==================== MULTER MEMORY STORAGE ====================
const memoryStorage = multer.memoryStorage();

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

// ==================== CHANNEL IMAGE UPLOADER (PROFILE + BANNER) ====================
export const uploadChannelImage = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
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
// Make sure your Cloudinary uploads are PUBLIC, not authenticated
export const uploadShortsVideo = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'youtube-clone/shorts/videos',
      resource_type: 'video',
      allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
      // ✅ CRITICAL: Make sure this is set
      access_mode: 'public', // NOT 'authenticated'
    },
  }),
});

export const uploadShortsThumbnail = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'youtube-clone/shorts/thumbnails',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      // ✅ CRITICAL: Make sure this is set
      access_mode: 'public', // NOT 'authenticated'
    },
  }),
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

// ==================== EXTRACT PUBLIC ID (SUPABASE COMPATIBLE) ====================
export const extractPublicId = (url) => {
  if (!url) return null;

  // Supabase URLs
  if (url.includes("supabase.co")) {
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return match ? match[1] : null;
  }

  // Legacy Cloudinary URLs (for old data)
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

// ==================== GET IMAGE URL (SUPABASE FIRST) ====================
export const getImageURL = (imagePath) => {
  if (!imagePath) return null;

  const BASE_URL =
    process.env.BASE_URL ||
    "https://youtube-clone-project-production.up.railway.app";

  // ✅ PRIORITY 1: Supabase URLs
  if (imagePath.includes("supabase.co/storage")) {
    return imagePath;
  }

  // ✅ PRIORITY 2: Already full URL
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
    // Fix wrong URLs with port
    if (imagePath.includes(":5000")) {
      return imagePath.replace(/https:\/\/[^/]+:5000/, BASE_URL);
    }
    return imagePath.replace("http://", "https://");
  }

  // ✅ PRIORITY 3: Legacy Cloudinary (fallback for old images)
  if (imagePath.includes("cloudinary.com")) {
    return imagePath.replace("http://", "https://");
  }

  // ✅ PRIORITY 4: Relative path
  const cleanPath = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${BASE_URL}/${cleanPath}`;
};

// ==================== EXPORTS ====================
export default {
  uploadToSupabase,
  uploadVideo,
  uploadThumbnail,
  uploadChannelImage,
  uploadShortsVideo,
  uploadShortsThumbnail,
  deleteFromSupabase,
  extractPublicId,
  getImageURL,
};
