// server/config/cloudinary.js - FIXED VERSION WITH PROPER IMPORTS

import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary"; // ✅ ADD THIS IMPORT
import dotenv from "dotenv";
import { supabase, bucketName } from "./supabase.js";

dotenv.config();

// ============================================================================
// CLOUDINARY CONFIGURATION
// ============================================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

console.log("☁️ Cloudinary Configuration:");
console.log("   Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "✅" : "❌");
console.log("   API Key:", process.env.CLOUDINARY_API_KEY ? "✅" : "❌");
console.log("   API Secret:", process.env.CLOUDINARY_API_SECRET ? "✅" : "❌");

// ============================================================================
// SHORTS VIDEO UPLOAD (Cloudinary)
// ============================================================================

export const uploadShortsVideo = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "youtube-clone/shorts/videos",
      resource_type: "video",
      allowed_formats: ["mp4", "mov", "avi", "mkv", "webm"],
      access_mode: "public", // ✅ CRITICAL: Make videos PUBLIC
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// ============================================================================
// SHORTS THUMBNAIL UPLOAD (Cloudinary)
// ============================================================================

export const uploadShortsThumbnail = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "youtube-clone/shorts/thumbnails",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      access_mode: "public", // ✅ CRITICAL: Make thumbnails PUBLIC
      transformation: [
        { width: 1080, height: 1920, crop: "limit" },
        { quality: "auto", fetch_format: "auto" },
      ],
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// ============================================================================
// REGULAR VIDEO UPLOAD (Cloudinary)
// ============================================================================

export const uploadVideo = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "youtube-clone/videos",
      resource_type: "video",
      allowed_formats: ["mp4", "mov", "avi", "mkv", "webm"],
      access_mode: "public", // ✅ PUBLIC
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});

// ============================================================================
// VIDEO THUMBNAIL UPLOAD (Cloudinary)
// ============================================================================

export const uploadThumbnail = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "youtube-clone/thumbnails",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      access_mode: "public", // ✅ PUBLIC
      transformation: [
        { width: 1280, height: 720, crop: "limit" },
        { quality: "auto", fetch_format: "auto" },
      ],
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const uploadToSupabase = async (file, folder) => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid file object");
    }

    const filename = `${folder}/${Date.now()}-${file.originalname}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);

    return {
      url: urlData.publicUrl,
      publicId: filename,
      path: data.path,
    };
  } catch (error) {
    console.error("❌ Supabase upload error:", error);
    throw error;
  }
};
export const deleteFromSupabase = async (filePath) => {
  try {
    if (!filePath) {
      console.warn("⚠️ No file path provided for deletion");
      return false;
    }

    let path = filePath;
    if (filePath.includes("supabase.co")) {
      const urlParts = filePath.split("/storage/v1/object/public/");
      if (urlParts.length > 1) {
        path = urlParts[1].split("/").slice(1).join("/");
      }
    }

    console.log(`🗑️ Deleting from Supabase: ${path}`);

    const { error } = await supabase.storage.from(bucketName).remove([path]);

    if (error) {
      console.error("❌ Delete failed:", error);
      return false;
    }

    console.log("✅ Deleted successfully from Supabase");
    return true;
  } catch (error) {
    console.error("❌ Error deleting from Supabase:", error);
    return false;
  }
};

export const uploadChannelImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
        )
      );
    }
  },
});

// ============================================================================
// AVATAR UPLOAD (Cloudinary)
// ============================================================================

export const uploadAvatar = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "youtube-clone/avatars",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      access_mode: "public", // ✅ PUBLIC
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Extract public_id from Cloudinary URL
export const extractPublicId = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;

  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;

    const pathParts = parts[1].split("/");
    pathParts.shift(); // Remove version (v1234567890)

    let publicId = pathParts.join("/");
    publicId = publicId.replace(/\.[^/.]+$/, ""); // Remove extension

    return publicId;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
};

// Delete resource from Cloudinary
export const deleteFromCloudinary = async (url, resourceType = "image") => {
  try {
    const publicId = extractPublicId(url);
    if (!publicId) {
      console.error("❌ Could not extract public_id from URL:", url);
      return false;
    }

    console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result === "ok") {
      console.log("✅ Deleted successfully");
      return true;
    } else {
      console.error("❌ Delete failed:", result);
      return false;
    }
  } catch (error) {
    console.error("❌ Error deleting from Cloudinary:", error);
    return false;
  }
};

// Upload buffer to Cloudinary (for custom uploads)
export const uploadToCloudinary = async (
  buffer,
  folder,
  resourceType = "image"
) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `youtube-clone/${folder}`,
        resource_type: resourceType,
        access_mode: "public", // ✅ PUBLIC
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error);
          reject(error);
        } else {
          console.log("✅ Cloudinary upload success:", result.secure_url);
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
};

export default cloudinary;
