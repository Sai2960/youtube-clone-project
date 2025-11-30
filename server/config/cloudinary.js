// server/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
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

// Create multer instances
export const uploadVideo = multer({ 
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

export const uploadChannelImage = multer({ 
  storage: channelImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export const uploadThumbnail = multer({ 
  storage: thumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export const uploadShortsVideo = multer({ 
  storage: shortsVideoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

export const uploadShortsThumbnail = multer({ 
  storage: shortsThumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export { cloudinary };

export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    console.log('🗑️ Deleted from Cloudinary:', publicId);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw error;
  }
};