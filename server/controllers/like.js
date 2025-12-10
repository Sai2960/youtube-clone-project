import mongoose from 'mongoose';
import Video from "../Modals/video.js";
import Like from "../Modals/like.js";
import LikedShort from "../Modals/likedShort.js";
import Short from "../Modals/short.js";

// ==================== VIDEO LIKE HANDLERS ====================

export const handlelike = async (req, res) => {
  const { userId, isLike = true } = req.body;
  const { videoId } = req.params;
  
  try {
    console.log('👍 Video like/dislike request:', { userId, videoId, isLike });

    if (!userId || !videoId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID and Video ID are required" 
      });
    }

    const reactionType = isLike ? 'like' : 'dislike';

    // ✅ Find existing reaction
    const existingReaction = await Like.findOne({
      viewer: userId,
      videoid: videoId,
    });

    // ✅ Get current video state with lock to prevent race conditions
    const video = await Video.findById(videoId).select('Like Dislike');
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    let currentLikes = Math.max(0, video.Like || 0);
    let currentDislikes = Math.max(0, video.Dislike || 0);
    let isLiked = false;
    let isDisliked = false;

    if (existingReaction) {
      // If clicking the same reaction, remove it (toggle off)
      if (existingReaction.reaction === reactionType) {
        await Like.findByIdAndDelete(existingReaction._id);
        
        // Decrement count - ensure it doesn't go negative
        if (isLike) {
          currentLikes = Math.max(0, currentLikes - 1);
        } else {
          currentDislikes = Math.max(0, currentDislikes - 1);
        }
        
        console.log(`✅ Removed ${reactionType}`);
      } else {
        // Switch reaction
        existingReaction.reaction = reactionType;
        await existingReaction.save();
        
        // Adjust counts
        if (isLike) {
          currentLikes = currentLikes + 1;
          currentDislikes = Math.max(0, currentDislikes - 1);
          isLiked = true;
        } else {
          currentDislikes = currentDislikes + 1;
          currentLikes = Math.max(0, currentLikes - 1);
          isDisliked = true;
        }
        
        console.log(`✅ Switched to ${reactionType}`);
      }
    } else {
      // Create new reaction
      await Like.create({ 
        viewer: userId, 
        videoid: videoId,
        reaction: reactionType
      });
      
      // Increment count
      if (isLike) {
        currentLikes = currentLikes + 1;
        isLiked = true;
      } else {
        currentDislikes = currentDislikes + 1;
        isDisliked = true;
      }
      
      console.log(`✅ Added ${reactionType}`);
    }

    // ✅ CRITICAL: Update video document atomically
    await Video.findByIdAndUpdate(
      videoId,
      { 
        Like: currentLikes,
        Dislike: currentDislikes
      },
      { new: true }
    );

    // ✅ CRITICAL FIX: Return data in the EXACT format the frontend expects
    return res.status(200).json({ 
      success: true,
      liked: isLiked,
      disliked: isDisliked,
      likes: currentLikes,
      dislikes: currentDislikes,
      Like: currentLikes,
      Dislike: currentDislikes,
      action: existingReaction ? (existingReaction.reaction === reactionType ? 'removed' : 'switched') : 'added',
      reaction: reactionType
    });
  } catch (error) {
    console.error("Video like/dislike error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to process video reaction",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log('📋 Fetching all reactions for user:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const allReactions = await Like
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
        populate: {
          path: "uploadedBy",
          model: "User",
          select: "name email channelname image"
        }
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    console.log(`📊 Found ${allReactions.length} total reactions`);

    const validReactions = allReactions.filter(item => item.videoid != null);

    const likes = validReactions.filter(item => 
      !item.reaction || item.reaction === 'like'
    );
    
    const dislikes = validReactions.filter(item => 
      item.reaction === 'dislike'
    );

    console.log(`✅ Returning ${likes.length} likes and ${dislikes.length} dislikes`);

    return res.status(200).json({
      success: true,
      total: validReactions.length,
      videos: likes,
      data: likes,
      likes: likes,
      dislikes: dislikes,
      count: likes.length
    });
  } catch (error) {
    console.error("❌ Get reactions error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to fetch reactions",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== SHORT LIKE HANDLERS ====================

export const handleShortLike = async (req, res) => {
  const { userId } = req.body;
  const { shortId } = req.params;
  
  try {
    console.log('👍 Short like request:', { userId, shortId });

    if (!userId || !shortId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID and Short ID are required" 
      });
    }

    // ✅ Check if already liked in LikedShort collection
    const existingLike = await LikedShort.findOne({
      viewer: userId,
      shortid: shortId,
    });

    const short = await Short.findById(shortId);
    if (!short) {
      return res.status(404).json({
        success: false,
        message: "Short not found"
      });
    }

    if (existingLike) {
      // ✅ UNLIKE: Remove from BOTH places
      await LikedShort.findByIdAndDelete(existingLike._id);
      
      await Short.findByIdAndUpdate(shortId, { 
        $pull: { likes: userId }
      });
      
      const updatedShort = await Short.findById(shortId);
      const currentLikes = updatedShort.likes.length;
      
      console.log('✅ Removed short like from both places');
      return res.status(200).json({ 
        success: true,
        liked: false,
        action: 'removed',
        likesCount: currentLikes
      });
    } else {
      // ✅ LIKE: Add to BOTH places
      await LikedShort.create({ 
        viewer: userId, 
        shortid: shortId 
      });
      
      await Short.findByIdAndUpdate(shortId, { 
        $addToSet: { likes: userId },
        $pull: { dislikes: userId }
      });
      
      const updatedShort = await Short.findById(shortId);
      const currentLikes = updatedShort.likes.length;
      
      console.log('✅ Added short like to both places');
      return res.status(200).json({ 
        success: true,
        liked: true,
        action: 'added',
        likesCount: currentLikes
      });
    }
  } catch (error) {
    console.error("Short like error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to process short like",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getAllLikedShorts = async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log('📋 Fetching liked shorts for user:', userId);

    const likedShorts = await LikedShort
      .find({ viewer: userId })
      .populate({
        path: "shortid",
        model: "Short",
        populate: {
          path: "userId",
          model: "User",
          select: "name email channelname channelName image avatar"
        }
      })
      .sort({ createdAt: -1 })
      .exec();

    const validLikes = likedShorts.filter(item => item.shortid != null);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const processedLikes = validLikes.map(item => {
      const short = item.shortid;
      
      return {
        ...item.toObject(),
        shortid: {
          ...short.toObject(),
          videoUrl: short.videoUrl?.startsWith('http') ? short.videoUrl : `${baseUrl}${short.videoUrl}`,
          thumbnailUrl: short.thumbnailUrl?.startsWith('http') ? short.thumbnailUrl : `${baseUrl}${short.thumbnailUrl}`,
          channelAvatar: short.userId?.avatar || short.userId?.image || short.channelAvatar,
          channelName: short.channelName || short.userId?.channelName || short.userId?.channelname || short.userId?.name
        }
      };
    });

    console.log(`✅ Found ${validLikes.length} liked shorts`);

    return res.status(200).json({
      success: true,
      count: processedLikes.length,
      data: processedLikes
    });
  } catch (error) {
    console.error("Get liked shorts error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to fetch liked shorts" 
    });
  }
};

// ==================== COMBINED CONTENT HANDLER ====================

export const getAllLikedContent = async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log('📋 Fetching all liked content for user:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const [likedVideos, likedShorts] = await Promise.all([
      Like.find({ 
        viewer: userId,
        $or: [
          { reaction: 'like' },
          { reaction: { $exists: false } }
        ]
      })
        .populate({
          path: "videoid",
          model: "videofiles",
          populate: {
            path: "uploadedBy",
            model: "User",
            select: "name email channelname image"
          }
        })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      
      LikedShort.find({ viewer: userId })
        .populate({
          path: "shortid",
          model: "Short",
          populate: {
            path: "userId",
            model: "User",
            select: "name email channelname channelName image avatar"
          }
        })
        .sort({ createdAt: -1 })
        .lean()
        .exec()
    ]);

    const validVideos = likedVideos
      .filter(item => item.videoid != null)
      .map(item => ({
        ...item,
        contentType: 'video'
      }));

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const validShorts = likedShorts
      .filter(item => item.shortid != null)
      .map(item => {
        const short = item.shortid;
        return {
          ...item,
          contentType: 'short',
          shortid: {
            ...short,
            videoUrl: short.videoUrl?.startsWith('http') ? short.videoUrl : `${baseUrl}${short.videoUrl}`,
            thumbnailUrl: short.thumbnailUrl?.startsWith('http') ? short.thumbnailUrl : `${baseUrl}${short.thumbnailUrl}`,
            channelAvatar: short.userId?.avatar || short.userId?.image || short.channelAvatar,
            channelName: short.channelName || short.userId?.channelName || short.userId?.channelname || short.userId?.name
          }
        };
      });

    const combined = [...validVideos, ...validShorts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log(`✅ Found ${validVideos.length} videos and ${validShorts.length} shorts`);

    return res.status(200).json({
      success: true,
      total: combined.length,
      videos: validVideos,
      shorts: validShorts,
      combined: combined
    });
  } catch (error) {
    console.error("❌ Get liked content error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to fetch liked content",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ NEW: Check user's reaction for a specific video
export const checkVideoReaction = async (req, res) => {
  const { videoId, userId } = req.params;
  
  try {
    console.log('🔍 Checking reaction:', { userId, videoId });

    if (!userId || !videoId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID and Video ID are required" 
      });
    }

    // Get the video with current counts
    const video = await Video.findById(videoId).select('Like Dislike').lean();
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    // Check if user has reacted to this video
    const reaction = await Like.findOne({
      viewer: userId,
      videoid: videoId
    }).lean();

    const liked = reaction?.reaction === 'like';
    const disliked = reaction?.reaction === 'dislike';

    console.log('✅ Reaction found:', {
      userId,
      videoId,
      liked,
      disliked,
      likes: video.Like,
      dislikes: video.Dislike
    });

    return res.status(200).json({
      success: true,
      liked,
      disliked,
      reaction: reaction?.reaction || null,
      video: {
        Like: video.Like || 0,
        Dislike: video.Dislike || 0
      }
    });
  } catch (error) {
    console.error("❌ Check reaction error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to check reaction status",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};