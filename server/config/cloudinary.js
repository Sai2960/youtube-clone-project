// server/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// ==================== CLOUDINARY CONFIGURATION ====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('🎨 Cloudinary configured:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  has_api_key: !!process.env.CLOUDINARY_API_KEY,
  has_api_secret: !!process.env.CLOUDINARY_API_SECRET
});

// ==================== STORAGE CONFIGURATIONS ====================

// Video storage
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'youtube-clone/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
  }
});

// Channel image storage
const channelImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'youtube-clone/channel-images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
  }
});

// Thumbnail storage
const thumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'youtube-clone/thumbnails',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  }
});

// Shorts video storage
const shortsVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'youtube-clone/shorts/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'webm'],
  }
});

// Shorts thumbnail storage
const shortsThumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'youtube-clone/shorts/thumbnails',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  }
});

// ==================== MULTER UPLOAD INSTANCES ====================

export const uploadVideo = multer({ 
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

export const uploadChannelImage = multer({ 
  storage: channelImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

export const uploadThumbnail = multer({ 
  storage: thumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

export const uploadShortsVideo = multer({ 
  storage: shortsVideoStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

export const uploadShortsThumbnail = multer({ 
  storage: shortsThumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ==================== CLOUDINARY UTILITIES ====================

/**
 * Delete a resource from Cloudinary
 * @param {string} publicId - The public ID of the resource
 * @param {string} resourceType - 'image' or 'video'
 * @returns {Promise} - Cloudinary deletion result
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    console.log(`🗑️ Deleting ${resourceType} from Cloudinary:`, publicId);
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });
    
    console.log('✅ Cloudinary deletion result:', result);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID or null
 */
export const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  try {
    const parts = url.split('/upload/');
    if (parts.length > 1) {
      const afterUpload = parts[1].split('/').slice(1).join('/');
      return afterUpload.replace(/\.[^/.]+$/, ''); // Remove extension
    }
  } catch (error) {
    console.error('Error extracting public ID:', error);
  }
  
  return null;
};

// ==================== DEFAULT EXPORT ====================
export { cloudinary };
export default cloudinary;