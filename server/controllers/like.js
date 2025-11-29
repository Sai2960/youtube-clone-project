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

    // Check if ANY reaction exists (like or dislike)
    const existingReaction = await Like.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existingReaction) {
      // If clicking the same reaction, remove it (unlike/undislike)
      if (existingReaction.reaction === reactionType) {
        await Like.findByIdAndDelete(existingReaction._id);
        
        // Decrement the appropriate count
        if (isLike) {
          await Video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
        } else {
          await Video.findByIdAndUpdate(videoId, { $inc: { Dislike: -1 } });
        }
        
        console.log(`✅ Removed ${reactionType}`);
        return res.status(200).json({ 
          success: true,
          liked: false,
          disliked: false,
          action: 'removed',
          reaction: reactionType
        });
      } else {
        // Switching from like to dislike or vice versa
        const oldReaction = existingReaction.reaction;
        
        // Update the reaction
        existingReaction.reaction = reactionType;
        await existingReaction.save();
        
        // Adjust counts: decrement old, increment new
        if (isLike) {
          await Video.findByIdAndUpdate(videoId, { 
            $inc: { Like: 1, Dislike: -1 } 
          });
        } else {
          await Video.findByIdAndUpdate(videoId, { 
            $inc: { Like: -1, Dislike: 1 } 
          });
        }
        
        console.log(`✅ Switched from ${oldReaction} to ${reactionType}`);
        return res.status(200).json({ 
          success: true,
          liked: isLike,
          disliked: !isLike,
          action: 'switched',
          reaction: reactionType
        });
      }
    } else {
      // No existing reaction, create new one
      await Like.create({ 
        viewer: userId, 
        videoid: videoId,
        reaction: reactionType
      });
      
      // Increment the appropriate count
      if (isLike) {
        await Video.findByIdAndUpdate(videoId, { $inc: { Like: 1 } });
      } else {
        await Video.findByIdAndUpdate(videoId, { $inc: { Dislike: 1 } });
      }
      
      console.log(`✅ Added ${reactionType}`);
      return res.status(200).json({ 
        success: true,
        liked: isLike,
        disliked: !isLike,
        action: 'added',
        reaction: reactionType
      });
    }
  } catch (error) {
    console.error("Video like/dislike error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to process video reaction" 
    });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log('📋 Fetching all reactions for user:', userId);

    // ✅ Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // ✅ Fetch ALL reactions (both likes and dislikes)
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

    // Filter out deleted videos
    const validReactions = allReactions.filter(item => item.videoid != null);

    // ✅ Handle documents without reaction field
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

    const existingLike = await LikedShort.findOne({
      viewer: userId,
      shortid: shortId,
    });

    if (existingLike) {
      await LikedShort.findByIdAndDelete(existingLike._id);
      await Short.findByIdAndUpdate(shortId, { 
        $pull: { likes: userId },
        $inc: { likesCount: -1 }
      });
      
      console.log('✅ Removed short like');
      return res.status(200).json({ 
        success: true,
        liked: false,
        action: 'removed'
      });
    } else {
      await LikedShort.create({ 
        viewer: userId, 
        shortid: shortId 
      });
      
      await Short.findByIdAndUpdate(shortId, { 
        $addToSet: { likes: userId },
        $pull: { dislikes: userId },
        $inc: { likesCount: 1 }
      });
      
      console.log('✅ Added short like');
      return res.status(200).json({ 
        success: true,
        liked: true,
        action: 'added'
      });
    }
  } catch (error) {
    console.error("Short like error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to process short like" 
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

    // ✅ Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // Fetch both videos and shorts in parallel
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

    // Filter and format videos
    const validVideos = likedVideos
      .filter(item => item.videoid != null)
      .map(item => ({
        ...item,
        contentType: 'video'
      }));

    // Filter and format shorts
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

    // Combine and sort by date
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