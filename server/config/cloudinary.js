import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Test connection
console.log('☁️  Cloudinary Configuration:');
console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('   API Key exists:', !!process.env.CLOUDINARY_API_KEY);
console.log('   Secret exists:', !!process.env.CLOUDINARY_API_SECRET);

// Video Storage Configuration
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'youtube-clone/videos',
      resource_type: 'video',
      allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
      transformation: [{ quality: 'auto' }],
      public_id: `video-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    };
  },
});

// Thumbnail Storage Configuration
const thumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'youtube-clone/thumbnails',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1280, height: 720, crop: 'fill' }],
      public_id: `thumb-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    };
  },
});

// Channel Image Storage Configuration
const channelImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'youtube-clone/channel-images',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 800, height: 800, crop: 'fill', gravity: 'face' }],
      public_id: `channel-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    };
  },
});

// Shorts Video Storage
const shortsVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'youtube-clone/shorts/videos',
      resource_type: 'video',
      allowed_formats: ['mp4', 'mov', 'webm'],
      transformation: [{ quality: 'auto', width: 1080, crop: 'limit' }],
      public_id: `short-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    };
  },
});

// Shorts Thumbnail Storage
const shortsThumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'youtube-clone/shorts/thumbnails',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1080, height: 1920, crop: 'fill' }],
      public_id: `short-thumb-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    };
  },
});

// Create multer instances
export const uploadVideo = multer({ 
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

export const uploadThumbnail = multer({ 
  storage: thumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const uploadChannelImage = multer({ 
  storage: channelImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const uploadShortsVideo = multer({ 
  storage: shortsVideoStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export const uploadShortsThumbnail = multer({ 
  storage: shortsThumbnailStorage,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
});

export { cloudinary };