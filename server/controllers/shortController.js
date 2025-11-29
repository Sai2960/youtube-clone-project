// server/controllers/shortController.js - COMPLETE FIXED VERSION WITH AVATAR PROXYING

import Short from '../Modals/short.js';
import User from '../Modals/User.js';
import Comment from '../Modals/comment.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import LikedShort from '../Modals/likedShort.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// AVATAR HANDLING UTILITIES
// ============================================================================

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';



// Check if URL needs proxying (for Google OAuth avatars, etc.)
const needsProxy = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  const proxyDomains = [
    'lh3.googleusercontent.com',
    'graph.facebook.com',
    'platform-lookaside.fbsbx.com'
  ];
  
  try {
    const urlObj = new URL(url);
    return proxyDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};

// Process avatar with proper proxying
const processAvatar = (avatar, req) => {
  // Check for invalid/placeholder avatars
  if (!avatar || 
      avatar.includes('placeholder.com') || 
      avatar.includes('via.placeholder') ||
      avatar.includes('placeholde')) {
    return null;
  }
  
  // Proxy Google/OAuth avatars through our server
  if (needsProxy(avatar)) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/api/proxy-image?url=${encodeURIComponent(avatar)}`;
  }
  
  // Return local avatars as-is
  return avatar;
};

// Get best available avatar with fallback chain
const getBestAvatar = (short, req) => {
  // Priority: channelAvatar -> userId.avatar -> userId.image -> null
  const avatarCandidates = [
    short.channelAvatar,
    short.userId?.avatar,
    short.userId?.image
  ];
  
  for (const candidate of avatarCandidates) {
    const processed = processAvatar(candidate, req);
    if (processed) {
      return processed;
    }
  }
  
  return null;
};

// Legacy function for backward compatibility
const getCleanAvatar = (avatar) => {
  if (!avatar || 
      avatar.includes('placeholder.com') || 
      avatar.includes('via.placeholder') ||
      avatar.includes('placeholde')) {
    return null;
  }
  return avatar;
};

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = file.fieldname === 'video' 
      ? path.join(__dirname, '../uploads/shorts/videos')
      : path.join(__dirname, '../uploads/shorts/thumbnails');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed for video field'), false);
    }
  } else if (file.fieldname === 'thumbnail') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnail field'), false);
    }
  } else {
    cb(null, false);
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: fileFilter
});

// ============================================================================
// CONTROLLER FUNCTIONS
// ============================================================================

// Get all shorts with proper avatar proxying
export const getAllShorts = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    const { page = 1, limit = 20, sort = 'recent' } = req.query;
    
    let sortOption = {};
    switch(sort) {
      case 'popular':
        sortOption = { views: -1 };
        break;
      case 'trending':
        sortOption = { likes: -1, views: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    console.log('📥 Fetching shorts - Page:', page, 'Limit:', limit, 'Sort:', sort);

    const shorts = await Short.find({ isPublic: true, status: 'active' })
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'name avatar image channelName channelname subscribers')
      .lean();

    console.log(`✅ Found ${shorts.length} shorts`);

    const shortsWithCounts = shorts.map(short => {
      // ✅ Get avatar from User model (most current)
      let finalAvatar = short.userId?.image || short.userId?.avatar || short.channelAvatar;
      
      // ✅ CRITICAL: Check if avatar file actually exists for local uploads
      if (finalAvatar && finalAvatar.startsWith('/uploads/')) {
        const avatarPath = path.join(__dirname, '..', finalAvatar);
        if (!fs.existsSync(avatarPath)) {
          console.warn(`⚠️ Avatar file missing: ${finalAvatar}, using default`);
          finalAvatar = null; // Will use fallback
        }
      }
      
      // ✅ Process avatar (proxy if needed, or use default)
      finalAvatar = processAvatar(finalAvatar, req) || 
                    `${req.protocol}://${req.get('host')}/api/proxy-image?url=${encodeURIComponent('https://github.com/shadcn.png')}`;
      
      return {
        ...short,
        videoUrl: `${req.protocol}://${req.get('host')}${short.videoUrl}`,
        thumbnailUrl: `${req.protocol}://${req.get('host')}${short.thumbnailUrl}`,
        channelAvatar: finalAvatar,
        channelName: short.channelName || short.userId?.channelName || short.userId?.channelname || short.userId?.name || 'Unknown',
        likesCount: short.likes ? short.likes.length : 0,
        dislikesCount: short.dislikes ? short.dislikes.length : 0,
        commentsCount: short.comments ? short.comments.length : 0,
        userId: {
          ...short.userId,
          avatar: finalAvatar,
          image: finalAvatar
        }
      };
    });

    const total = await Short.countDocuments({ isPublic: true, status: 'active' });

    res.status(200).json({
      success: true,
      data: shortsWithCounts,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('❌ Error fetching shorts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shorts',
      error: error.message
    });
  }
};

// Get single short by ID with proper avatar
export const getShortById = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const { id } = req.params;
    const userId = req.user ? req.user._id : null;

    console.log('📥 Fetching short:', id);

    const short = await Short.findById(id)
      .populate('userId', 'name avatar image channelName channelname subscribers')
      .lean();

    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'Short not found'
      });
    }

    // Increment view count
    await Short.findByIdAndUpdate(id, { $inc: { views: 1 } });

    const hasLiked = userId ? short.likes.some(like => like.toString() === userId.toString()) : false;
    const hasDisliked = userId ? short.dislikes.some(dislike => dislike.toString() === userId.toString()) : false;

    const finalAvatar = getBestAvatar(short, req);

    res.status(200).json({
      success: true,
      data: {
        ...short,
        videoUrl: `${req.protocol}://${req.get('host')}${short.videoUrl}`,
        thumbnailUrl: `${req.protocol}://${req.get('host')}${short.thumbnailUrl}`,
        channelAvatar: finalAvatar,
        channelName: short.channelName || short.userId?.channelName || short.userId?.channelname || short.userId?.name || 'Unknown',
        likesCount: short.likes.length,
        dislikesCount: short.dislikes.length,
        commentsCount: short.comments.length,
        hasLiked,
        hasDisliked,
        views: short.views + 1,
        userId: {
          ...short.userId,
          avatar: finalAvatar,
          image: finalAvatar
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching short:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching short',
      error: error.message
    });
  }
};

// Upload new short
export const uploadShort = async (req, res) => {
  try {
    console.log('📤 Processing short upload...');
    
    const { title, description, duration, tags, category } = req.body;
    const userId = req.user._id;

    if (!title || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Title and duration are required'
      });
    }

    if (!req.files || !req.files.video || !req.files.thumbnail) {
      return res.status(400).json({
        success: false,
        message: 'Both video and thumbnail files are required'
      });
    }

    if (parseInt(duration) > 60) {
      return res.status(400).json({
        success: false,
        message: 'Shorts must be 60 seconds or less'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail[0];

    const videoUrl = `/uploads/shorts/videos/${videoFile.filename}`;
    const thumbnailUrl = `/uploads/shorts/thumbnails/${thumbnailFile.filename}`;

    let tagsArray = [];
    try {
      if (typeof tags === 'string') {
        tagsArray = JSON.parse(tags);
      } else if (Array.isArray(tags)) {
        tagsArray = tags;
      }
    } catch (e) {
      tagsArray = [];
    }

    const cleanAvatar = getCleanAvatar(user.avatar || user.image);

    const newShort = new Short({
      title,
      description: description || '',
      videoUrl,
      thumbnailUrl,
      duration: parseInt(duration),
      userId,
      channelName: user.channelName || user.channelname || user.name,
      channelAvatar: cleanAvatar || null,
      tags: tagsArray,
      category: category || 'Other',
      isPublic: true,
      status: 'active',
      views: 0,
      likes: [],
      dislikes: [],
      comments: [],
      shares: 0
    });

    await newShort.save();

    console.log('✅ Short uploaded successfully:', newShort._id);

    res.status(201).json({
      success: true,
      message: 'Short uploaded successfully',
      data: {
        ...newShort.toObject(),
        videoUrl: `${req.protocol}://${req.get('host')}${videoUrl}`,
        thumbnailUrl: `${req.protocol}://${req.get('host')}${thumbnailUrl}`
      }
    });

  } catch (error) {
    console.error('❌ Error uploading short:', error);
    
    if (req.files) {
      if (req.files.video) {
        fs.unlinkSync(req.files.video[0].path);
      }
      if (req.files.thumbnail) {
        fs.unlinkSync(req.files.thumbnail[0].path);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading short',
      error: error.message
    });
  }
};

// Like a short
export const likeShort = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    console.log('👍 Like short request:', { shortId: id, userId: userId.toString() });

    const short = await Short.findById(id);
    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'Short not found'
      });
    }

    const hasLiked = short.likes.includes(userId);
    const hasDisliked = short.dislikes.includes(userId);

    if (hasLiked) {
      // ✅ UNLIKE - Remove from both Short model AND LikedShort collection
      short.likes = short.likes.filter(id => id.toString() !== userId.toString());
      
      // Remove from LikedShort collection
      await LikedShort.findOneAndDelete({
        viewer: userId,
        shortid: id
      });
      console.log('✅ Removed from liked shorts collection');
      
    } else {
      // ✅ LIKE - Add to both Short model AND LikedShort collection
      short.likes.push(userId);
      if (hasDisliked) {
        short.dislikes = short.dislikes.filter(id => id.toString() !== userId.toString());
      }
      
      // Add to LikedShort collection
      try {
        await LikedShort.create({
          viewer: userId,
          shortid: id
        });
        console.log('✅ Added to liked shorts collection');
      } catch (likeError) {
        // If duplicate (code 11000), it already exists - that's fine
        if (likeError.code !== 11000) {
          console.error('❌ Error creating liked short entry:', likeError);
        } else {
          console.log('ℹ️ Like entry already exists in collection');
        }
      }
    }

    // Save the short
    await short.save();

    res.status(200).json({
      success: true,
      message: hasLiked ? 'Like removed' : 'Short liked',
      data: {
        likesCount: short.likes.length,
        dislikesCount: short.dislikes.length,
        hasLiked: !hasLiked,
        hasDisliked: false
      }
    });
  } catch (error) {
    console.error('❌ Error liking short:', error);
    res.status(500).json({
      success: false,
      message: 'Error liking short',
      error: error.message
    });
  }
};

// Dislike a short
export const dislikeShort = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const short = await Short.findById(id);
    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'Short not found'
      });
    }

    const hasLiked = short.likes.includes(userId);
    const hasDisliked = short.dislikes.includes(userId);

    if (hasDisliked) {
      short.dislikes = short.dislikes.filter(id => id.toString() !== userId.toString());
    } else {
      short.dislikes.push(userId);
      if (hasLiked) {
        short.likes = short.likes.filter(id => id.toString() !== userId.toString());
      }
    }

    await short.save();

    res.status(200).json({
      success: true,
      message: hasDisliked ? 'Dislike removed' : 'Short disliked',
      data: {
        likesCount: short.likes.length,
        dislikesCount: short.dislikes.length,
        hasLiked: false,
        hasDisliked: !hasDisliked
      }
    });
  } catch (error) {
    console.error('❌ Error disliking short:', error);
    res.status(500).json({
      success: false,
      message: 'Error disliking short',
      error: error.message
    });
  }
};

// Add comment to short
export const addComment = async (req, res) => {
  console.log('\n💬 ===== ADD COMMENT REQUEST =====');
  console.log('Short ID:', req.params.id);
  console.log('req.user:', req.user);
  console.log('Comment text:', req.body.text);

  try {
    const { id } = req.params;
    const { text } = req.body;
    
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    if (!userId) {
      console.log('❌ No userId found in req.user');
      return res.status(401).json({
        success: false,
        message: 'User authentication failed. Please login again.'
      });
    }

    console.log('✅ User ID extracted:', userId.toString());

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.log('❌ Empty comment text');
      return res.status(400).json({
        success: false,
        message: 'Comment text is required and cannot be empty'
      });
    }

    if (text.trim().length > 1000) {
      console.log('❌ Comment too long');
      return res.status(400).json({
        success: false,
        message: 'Comment is too long (max 1000 characters)'
      });
    }

    const short = await Short.findById(id);
    if (!short) {
      console.log('❌ Short not found');
      return res.status(404).json({
        success: false,
        message: 'Short not found'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Validation passed');
    console.log('User:', user.name);

    const cleanAvatar = user.avatar && 
                        !user.avatar.includes('placeholder.com') && 
                        !user.avatar.includes('via.placeholder') &&
                        !user.avatar.includes('placeholde') 
                        ? user.avatar 
                        : (user.image && 
                           !user.image.includes('placeholder.com') && 
                           !user.image.includes('via.placeholder') &&
                           !user.image.includes('placeholde') 
                           ? user.image 
                           : null);

    const comment = new Comment({
      text: text.trim(),
      userId: userId,
      commentbody: text.trim(),
      userid: userId,
      videoid: id,
      shortId: id,
      videoType: 'short',
      userName: user.name,
      usercommented: user.name,
      userAvatar: cleanAvatar,
      likes: [],
      likedBy: [],
      votes: [],
      replies: [],
      likesCount: 0,
      dislikesCount: 0,
      dislikes: 0,
      repliesCount: 0,
      originalText: text.trim(),
      originalLanguage: 'en',
      isHidden: false,
      isReported: false,
      reportCount: 0,
      isPinned: false,
      isEdited: false,
      location: {
        city: 'Unknown',
        country: 'Unknown',
        countryCode: 'XX'
      },
      commentedon: new Date()
    });

    console.log('📝 Saving comment...');
    
    try {
      await comment.save();
      console.log('✅ Comment saved:', comment._id);
    } catch (saveError) {
      console.error('❌ Save error:', saveError);
      console.error('Validation errors:', saveError.errors);
      
      return res.status(400).json({
        success: false,
        message: 'Comment validation failed',
        details: saveError.errors ? Object.keys(saveError.errors).map(key => ({
          field: key,
          message: saveError.errors[key].message,
          value: saveError.errors[key].value
        })) : saveError.message
      });
    }

    if (!Array.isArray(short.comments)) {
      short.comments = [];
    }
    short.comments.push(comment._id);
    short.commentsCount = short.comments.length;
    await short.save();

    console.log('✅ Comment added to short');

    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'name avatar image channelName channelname')
      .lean();

    const userAvatarClean = populatedComment.userId?.avatar && 
                            !populatedComment.userId.avatar.includes('placeholder') 
                            ? populatedComment.userId.avatar 
                            : (populatedComment.userId?.image && 
                               !populatedComment.userId.image.includes('placeholder') 
                               ? populatedComment.userId.image 
                               : null);

    const responseComment = {
      _id: populatedComment._id,
      text: populatedComment.text || populatedComment.commentbody,
      userId: {
        _id: populatedComment.userId._id,
        name: populatedComment.userId.name || populatedComment.usercommented,
        avatar: userAvatarClean,
        image: userAvatarClean,
        channelName: populatedComment.userId.channelName || populatedComment.userId.channelname || populatedComment.usercommented,
        channelname: populatedComment.userId.channelname || populatedComment.userId.channelName || populatedComment.usercommented
      },
      likesCount: 0,
      likes: [],
      hasLiked: false,
      createdAt: populatedComment.createdAt || new Date()
    };

    console.log('✅ Comment posted successfully\n');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: responseComment
    });

  } catch (error) {
    console.error('❌ Error adding comment:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to post comment. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get comments for a short
export const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user ? req.user._id : null;

    console.log('📥 Fetching comments for short:', id);

    const comments = await Comment.find({ 
      $or: [
        { videoid: id },
        { shortId: id },
        { videoId: id }
      ],
      parentId: null
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'name avatar image channelName channelname')
      .lean();

    console.log('✅ Found comments:', comments.length);

    const cleanedComments = comments.map(comment => {
      const userInfo = comment.userId;
      const userAvatarClean = userInfo?.avatar && 
                              !userInfo.avatar.includes('placeholder') 
                              ? userInfo.avatar 
                              : (userInfo?.image && 
                                 !userInfo.image.includes('placeholder') 
                                 ? userInfo.image 
                                 : null);

      const hasLiked = userId && comment.votes ? 
        comment.votes.some(vote => 
          vote.userId?.toString() === userId.toString() && 
          (vote.type === 'like' || vote.voteType === 'like')
        ) : false;

      return {
        _id: comment._id,
        text: comment.text || comment.commentbody,
        userId: {
          _id: userInfo?._id,
          name: userInfo?.name || comment.usercommented || comment.userName || 'Unknown User',
          avatar: userAvatarClean,
          image: userAvatarClean,
          channelName: userInfo?.channelName || userInfo?.channelname || comment.userName,
          channelname: userInfo?.channelname || userInfo?.channelName || comment.userName
        },
        likesCount: comment.likesCount || comment.likes?.length || 0,
        likes: comment.likes || [],
        hasLiked,
        createdAt: comment.createdAt || comment.commentedon || new Date()
      };
    });

    const total = await Comment.countDocuments({ 
      $or: [
        { videoid: id },
        { shortId: id },
        { videoId: id }
      ],
      parentId: null
    });

    console.log('✅ Returning', cleanedComments.length, 'comments');

    res.status(200).json({
      success: true,
      data: cleanedComments,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
};

// Share short (increment counter)
export const shareShort = async (req, res) => {
  try {
    const { id } = req.params;

    const short = await Short.findByIdAndUpdate(
      id,
      { $inc: { shares: 1 } },
      { new: true }
    );

    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'Short not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Share count updated',
      data: {
        shares: short.shares
      }
    });
  } catch (error) {
    console.error('❌ Error sharing short:', error);
    res.status(500).json({
      success: false,
      message: 'Error sharing short',
      error: error.message
    });
  }
};

export const getShortsByChannel = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    const { userId } = req.params;
    const { page = 1, limit = 100 } = req.query;

    console.log('📡 ===== GET SHORTS BY CHANNEL =====');
    console.log('Channel User ID:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // ✅ Fetch CURRENT user data
    const currentUser = await User.findById(userId).select('name avatar image channelName channelname');
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const shorts = await Short.find({ 
      userId: userId,
      isPublic: true, 
      status: 'active' 
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    console.log(`✅ Database returned ${shorts.length} shorts`);

    const processedShorts = shorts.map(short => {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      // ✅ Use CURRENT user avatar
      let freshAvatar = currentUser.avatar || currentUser.image;
      
      // ✅ CRITICAL: Check if file exists
      if (freshAvatar && freshAvatar.startsWith('/uploads/')) {
        const avatarPath = path.join(__dirname, '..', freshAvatar);
        if (!fs.existsSync(avatarPath)) {
          console.warn(`⚠️ Channel avatar file missing: ${freshAvatar}`);
          freshAvatar = 'https://github.com/shadcn.png'; // Reset to default
        }
      }
      
      const finalAvatar = processAvatar(freshAvatar, req);

      return {
        _id: short._id,
        title: short.title,
        description: short.description,
        thumbnail: `${baseUrl}${short.thumbnailUrl}`,
        thumbnailUrl: `${baseUrl}${short.thumbnailUrl}`,
        videoUrl: `${baseUrl}${short.videoUrl}`,
        video: `${baseUrl}${short.videoUrl}`,
        views: short.views || 0,
        likes: short.likes?.length || 0,
        dislikes: short.dislikes?.length || 0,
        comments: short.comments?.length || 0,
        shares: short.shares || 0,
        createdAt: short.createdAt,
        duration: short.duration,
        tags: short.tags || [],
        category: short.category || 'Entertainment',
        
        // ✅ Use fresh, validated avatar
        channelAvatar: finalAvatar,
        channelName: currentUser.channelName || currentUser.channelname || currentUser.name,
        
        likesCount: short.likes?.length || 0,
        dislikesCount: short.dislikes?.length || 0,
        commentsCount: short.comments?.length || 0,
        
        userId: {
          _id: currentUser._id,
          name: currentUser.name,
          avatar: finalAvatar,
          image: finalAvatar,
          channelName: currentUser.channelName || currentUser.channelname,
          channelname: currentUser.channelname || currentUser.channelName
        }
      };
    });

    const total = await Short.countDocuments({ 
      userId: userId, 
      isPublic: true, 
      status: 'active' 
    });

    console.log('✅ Sending', processedShorts.length, 'shorts with validated avatars');
    
    res.status(200).json({
      success: true,
      shorts: processedShorts,
      data: processedShorts,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      count: processedShorts.length,
      total: total
    });

  } catch (error) {
    console.error('❌ Error in getShortsByChannel:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching channel shorts',
      error: error.message
    });
  }
};

// Delete short
export const deleteShort = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    console.log('🗑️ Delete request:', { shortId: id, userId: userId.toString() });

    const short = await Short.findById(id);
    
    if (!short) {
      console.log('❌ Short not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Short not found'
      });
    }

    if (short.userId.toString() !== userId.toString()) {
      console.log('❌ Unauthorized delete attempt');
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this short'
      });
    }

    console.log('✅ Authorization passed, proceeding with deletion...');

    try {
      const videoPath = path.join(__dirname, '..', short.videoUrl);
      const thumbnailPath = path.join(__dirname, '..', short.thumbnailUrl);
      
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
        console.log('✅ Deleted video file');
      }
      
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        console.log('✅ Deleted thumbnail file');
      }
    } catch (fileError) {
      console.error('⚠️ Error deleting files (continuing anyway):', fileError);
    }

    const deletedComments = await Comment.deleteMany({ videoid: id });
    console.log('✅ Deleted comments:', deletedComments.deletedCount);

    await Short.findByIdAndDelete(id);
    console.log('✅ Short deleted from database');

    res.status(200).json({
      success: true,
      message: 'Short deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting short:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting short',
      error: error.message
    });
  }
};

// Subscribe to channel
export const subscribeToChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    if (channelId === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot subscribe to your own channel'
      });
    }

    const channel = await User.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!Array.isArray(user.subscribedChannels)) {
      user.subscribedChannels = [];
    }
    if (typeof channel.subscribers !== 'number') {
      channel.subscribers = 0;
    }

    const isSubscribed = user.subscribedChannels.some(
      id => id.toString() === channelId
    );

    if (isSubscribed) {
      user.subscribedChannels = user.subscribedChannels.filter(
        id => id.toString() !== channelId
      );
      channel.subscribers = Math.max(0, channel.subscribers - 1);
    } else {
      user.subscribedChannels.push(channelId);
      channel.subscribers += 1;
    }

    await user.save();
    await channel.save();

    res.status(200).json({
      success: true,
      message: isSubscribed ? 'Unsubscribed' : 'Subscribed',
      data: {
        isSubscribed: !isSubscribed,
        subscribersCount: channel.subscribers
      }
    });
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription',
      error: error.message
    });
  }
};

// Increment view count
export const incrementView = async (req, res) => {
  try {
    const { id } = req.params;

    const short = await Short.findById(id);

    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'Short not found'
      });
    }

    short.views = (short.views || 0) + 1;
    await short.save();

    return res.status(200).json({
      success: true,
      message: 'View counted',
      data: {
        _id: short._id,
        views: short.views
      }
    });

  } catch (error) {
    console.error('❌ Error incrementing view:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to increment view',
      error: error.message
    });
  }
};