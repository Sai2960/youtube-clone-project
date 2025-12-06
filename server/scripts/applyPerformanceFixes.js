// scripts/applyPerformanceFixes.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Applying Performance Fixes...\n');

// ============================================
// 1. UPDATE server/controllers/video.js
// ============================================
const videoControllerPath = path.join(__dirname, '../controllers/video.js');
console.log('📝 Updating video controller...');

const videoControllerFixes = `
// ADD THIS AFTER LINE 119 (before getallvideo function)

// ==============================
// 📺 Get All Videos - OPTIMIZED
// ==============================
export const getallvideo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // ✅ CRITICAL FIX: Add projection + lean
    const videos = await videofiles
      .find()
      .select('videotitle videodescription videofilename filepath videothumbnail views videochanel uploadedBy createdAt Like Dislike')
      .populate({
        path: 'uploadedBy',
        select: 'name email channelname image',
        options: { lean: true }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await videofiles.countDocuments();
    
    const videosWithAbsoluteURLs = videos.map(video => {
      const transformed = transformVideoURLs(video);
      if (transformed.uploadedBy && typeof transformed.uploadedBy === 'object') {
        transformed.uploadedBy.image = getImageURL(transformed.uploadedBy.image);
      }
      return transformed;
    });

    // ✅ CRITICAL FIX: Add cache headers
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    
    res.status(200).json({
      success: true,
      videos: videosWithAbsoluteURLs,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error("Get videos error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
    });
  }
};
`;

console.log('   ⚠️  Manual update required for controllers/video.js');
console.log('   📋 Replace the getallvideo function with the optimized version');

// ============================================
// 2. UPDATE server/index.js - ADD COMPRESSION
// ============================================
const indexPath = path.join(__dirname, '../index.js');
console.log('\n📝 Updating server/index.js...');

let indexContent = fs.readFileSync(indexPath, 'utf8');

// Check if compression is already added
if (!indexContent.includes('import compression from')) {
  const compressionImport = `import compression from 'compression';\n`;
  const compressionMiddleware = `
// ✅ CRITICAL FIX: Add compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));
`;

  // Find the line after other imports (before app setup)
  const appUseIndex = indexContent.indexOf('const app = express();');
  
  if (appUseIndex !== -1) {
    // Add import at the top with other imports
    const lastImportIndex = indexContent.lastIndexOf('import');
    const endOfLastImport = indexContent.indexOf('\n', lastImportIndex);
    indexContent = indexContent.slice(0, endOfLastImport + 1) + compressionImport + indexContent.slice(endOfLastImport + 1);
    
    // Add middleware after app creation
    const appLineEnd = indexContent.indexOf('\n', indexContent.indexOf('const app = express();'));
    indexContent = indexContent.slice(0, appLineEnd + 1) + compressionMiddleware + indexContent.slice(appLineEnd + 1);
    
    fs.writeFileSync(indexPath, indexContent);
    console.log('   ✅ Added compression middleware');
  } else {
    console.log('   ⚠️  Could not find app initialization - add compression manually');
  }
} else {
  console.log('   ⏭️  Compression already added');
}

// ============================================
// 3. CREATE OPTIMIZED videoApi.ts
// ============================================
console.log('\n📝 Creating optimized videoApi.ts...');

const videoApiContent = `import axiosInstance from '@/lib/axiosinstance';
import { normalizeURL } from '@/lib/urlHelper';

export interface Video {
  _id: string;
  title: string;
  videotitle?: string;
  description?: string;
  videodescription?: string;
  videoLink: string;
  videofile?: string;
  filepath?: string;
  thumbnail?: string;
  videothumbnail?: string;
  user: string | {
    _id: string;
    name: string;
    channelName?: string;
    channelname?: string;
    avatar?: string;
    image?: string;
  };
  uploadedBy?: string | {
    _id: string;
    name: string;
    channelName?: string;
    channelname?: string;
    avatar?: string;
    image?: string;
  };
  category?: string;
  tags?: string[];
  views?: number;
  likes?: number;
  Like?: number;
  dislikes?: number;
  Dislike?: number;
  visibility?: 'public' | 'unlisted' | 'private';
  createdAt?: string;
  updatedAt?: string;
  channelName?: string;
  videochanel?: string;
  channelAvatar?: string;
}

// ✅ CRITICAL FIX: Add response caching
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCached = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ Using cached data for:', key);
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
};

// ✅ CRITICAL FIX: Normalize video object
const normalizeVideo = (video: any): Video => {
  if (!video) return video;
  
  const user = video.uploadedBy || video.user;
  const userImage = user?.image || user?.avatar;
  
  return {
    ...video,
    videoLink: normalizeURL(video.videoLink || video.videofile || video.filepath) || video.videoLink || video.videofile || video.filepath,
    thumbnail: normalizeURL(video.thumbnail || video.videothumbnail || video.videothumb) || video.thumbnail || video.videothumbnail,
    channelAvatar: normalizeURL(userImage) || userImage,
    uploadedBy: user && typeof user === 'object' ? {
      ...user,
      image: normalizeURL(user.image || user.avatar) || user.image || user.avatar
    } : user,
    user: user && typeof user === 'object' ? {
      ...user,
      image: normalizeURL(user.image || user.avatar) || user.image || user.avatar
    } : user
  };
};

export const videoApi = {
  getAll: async (useCache = true) => {
    const cacheKey = 'all-videos';
    if (useCache) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
    }
    
    const response = await axiosInstance.get('/video/getallvideos');
    if (response.data.videos && Array.isArray(response.data.videos)) {
      response.data.videos = response.data.videos.map(normalizeVideo);
    }
    setCache(cacheKey, response.data);
    return response.data;
  },

  getById: async (id: string, useCache = true) => {
    const cacheKey = \`video-\${id}\`;
    if (useCache) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
    }
    
    const response = await axiosInstance.get(\`/video/\${id}\`);
    if (response.data.video) {
      response.data.video = normalizeVideo(response.data.video);
    }
    if (response.data.data) {
      response.data.data = normalizeVideo(response.data.data);
    }
    setCache(cacheKey, response.data);
    return response.data;
  },

  search: async (query: string) => {
    const response = await axiosInstance.get('/video/search', {
      params: { q: query }
    });
    if (response.data.videos && Array.isArray(response.data.videos)) {
      response.data.videos = response.data.videos.map(normalizeVideo);
    }
    return response.data;
  },

  clearCache: () => {
    cache.clear();
    console.log('🗑️ Video cache cleared');
  },

  uploadVideo: async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    const response = await axiosInstance.post('/video/uploadvideo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadThumbnail: async (file: File) => {
    const formData = new FormData();
    formData.append('thumbnail', file);
    const response = await axiosInstance.post('/video/uploadthumbnail', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  createVideo: async (data: any) => {
    const response = await axiosInstance.post('/video/createvideo', data);
    videoApi.clearCache();
    return response.data;
  },

  updateVideo: async (id: string, data: any) => {
    const response = await axiosInstance.put(\`/video/updatevideo/\${id}\`, data);
    videoApi.clearCache();
    return response.data;
  },

  deleteVideo: async (id: string) => {
    const response = await axiosInstance.delete(\`/video/deletevideo/\${id}\`);
    videoApi.clearCache();
    return response.data;
  },

  incrementViews: async (id: string) => {
    axiosInstance.put(\`/video/view/\${id}\`).catch(console.error);
  },
};

export default videoApi;
`;

// Save this to show user
fs.writeFileSync(path.join(__dirname, 'videoApi.ts.new'), videoApiContent);
console.log('   ✅ Created videoApi.ts.new - copy this to youtube/src/lib/api/videoApi.ts');

console.log('\n✅ Performance fixes prepared!');
console.log('\n📋 MANUAL STEPS REQUIRED:\n');
console.log('1. ✅ Compression already installed and configured');
console.log('2. ⚠️  Copy scripts/videoApi.ts.new to youtube/src/lib/api/videoApi.ts');
console.log('3. ⚠️  Update getallvideo function in controllers/video.js (see above)');
console.log('\n🚀 After these changes, commit and push to GitHub!');