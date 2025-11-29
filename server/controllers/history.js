import video from "../Modals/video.js";
import history from "../Modals/history.js";
import Short from "../Modals/short.js";

// ============================================================================
// Add video to history and increment views
// ============================================================================
export const handlehistory = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  
  try {
    console.log('📝 Adding video to history:', { userId, videoId });

    // Verify video exists
    const videoExists = await video.findById(videoId);
    if (!videoExists) {
      return res.status(404).json({ 
        success: false,
        message: "Video not found"
      });
    }

    // If no userId, just increment views
    if (!userId) {
      await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
      return res.status(200).json({ 
        success: true,
        message: "View recorded"
      });
    }

    // ✅ CRITICAL FIX: Use findOneAndUpdate with upsert to prevent duplicates
    const updatedHistory = await history.findOneAndUpdate(
      { 
        viewer: userId, 
        videoid: videoId,
        contentType: 'video',
        shortid: null // ✅ Ensure shortid is null for videos
      },
      {
        $set: {
          createdAt: new Date(),
          watchDuration: req.body.watchDuration || 0,
          watchPercentage: req.body.watchPercentage || 0,
          contentType: 'video',
          device: req.body.device || 'desktop',
          shortid: null // ✅ Explicitly set to null
        },
        $setOnInsert: {
          viewer: userId,
          videoid: videoId
        }
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );

    console.log('✅ Video history entry saved:', updatedHistory._id);
    
    // Increment views only on new entry
    if (updatedHistory.watchPercentage === 0 || !req.body.watchPercentage) {
      await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    }
    
    return res.status(200).json({ 
      success: true,
      history: true 
    });
  } catch (error) {
    console.error("❌ Video history error:", error.message);
    return res.status(500).json({ 
      success: false,
      message: "Failed to add to history",
      error: error.message
    });
  }
};

// ============================================================================
// Add short to history and increment views
// ============================================================================
export const handleShortHistory = async (req, res) => {
  const { userId } = req.body;
  const { shortId } = req.params;
  
  try {
    console.log('📝 Adding short to history:', { userId, shortId });

    // Verify short exists
    const shortExists = await Short.findById(shortId);
    if (!shortExists) {
      return res.status(404).json({ 
        success: false,
        message: "Short not found"
      });
    }

    // If no userId, just increment views
    if (!userId) {
      await Short.findByIdAndUpdate(shortId, { $inc: { views: 1 } });
      return res.status(200).json({ 
        success: true,
        message: "View recorded"
      });
    }

    // ✅ CRITICAL FIX: Use findOneAndUpdate with upsert to prevent duplicates
    const updatedHistory = await history.findOneAndUpdate(
      { 
        viewer: userId, 
        shortid: shortId,
        contentType: 'short',
        videoid: null // ✅ Ensure videoid is null for shorts
      },
      {
        $set: {
          createdAt: new Date(),
          watchDuration: req.body.watchDuration || 0,
          watchPercentage: req.body.watchPercentage || 0,
          contentType: 'short',
          device: req.body.device || 'mobile',
          videoid: null // ✅ Explicitly set to null
        },
        $setOnInsert: {
          viewer: userId,
          shortid: shortId
        }
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );

    console.log('✅ Short history entry saved:', updatedHistory._id);
    
    // Increment views only on new entry
    if (updatedHistory.watchPercentage === 0 || !req.body.watchPercentage) {
      await Short.findByIdAndUpdate(shortId, { $inc: { views: 1 } });
    }
    
    return res.status(200).json({ 
      success: true,
      history: true 
    });
  } catch (error) {
    console.error("❌ Short history error:", error.message);
    return res.status(500).json({ 
      success: false,
      message: "Failed to add to history",
      error: error.message
    });
  }
};

// ============================================================================
// Increment views only (no history entry)
// ============================================================================
export const handleview = async (req, res) => {
  const { videoId } = req.params;
  
  try {
    console.log('👁️ Incrementing views for:', videoId);
    const updated = await video.findByIdAndUpdate(
      videoId, 
      { $inc: { views: 1 } },
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }
    
    return res.status(200).json({ 
      success: true,
      message: "View recorded",
      views: updated.views
    });
  } catch (error) {
    console.error("❌ View error:", error.message);
    return res.status(500).json({ 
      success: false,
      message: "Failed to record view",
      error: error.message
    });
  }
};

// ============================================================================
// Get all history for a user (videos + shorts combined)
// ============================================================================
export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log('📚 Fetching history for user:', userId);

    // ✅ Fetch all history with proper population
    const allHistory = await history
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
        select: '_id videotitle videochanel channelid views videofilename filepath createdAt',
        populate: {
          path: 'uploadedBy',
          model: 'User',
          select: 'name channelname image'
        }
      })
      .populate({
        path: "shortid",
        model: "Short",
        select: '_id title description videoUrl thumbnailUrl views likes dislikes comments shares createdAt channelName channelAvatar',
        populate: {
          path: 'userId',
          model: 'User',
          select: '_id name avatar channelname'
        }
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    console.log(`✅ Found ${allHistory.length} total history items`);

    // ✅ CRITICAL: Remove duplicates by unique identifier
    const uniqueHistory = [];
    const seenIds = new Set();

    for (const item of allHistory) {
      // Create unique key based on content
      const uniqueKey = item.videoid 
        ? `video-${item.videoid._id}` 
        : `short-${item.shortid?._id}`;
      
      if (!seenIds.has(uniqueKey)) {
        seenIds.add(uniqueKey);
        
        // Only include if video/short still exists
        if ((item.videoid && item.videoid._id) || (item.shortid && item.shortid._id)) {
          uniqueHistory.push(item);
        }
      }
    }

    // ✅ FIXED: More lenient filtering logic
    // A video is considered valid if:
    // 1. videoid exists and is populated (has _id)
    // 2. shortid is null or doesn't exist
    // 3. contentType is 'video' OR not set (for backward compatibility)
    const videos = uniqueHistory.filter(item => {
      const hasVideo = item.videoid && item.videoid._id;
      const noShort = !item.shortid || item.shortid === null;
      const isVideoType = !item.contentType || item.contentType === 'video';
      
      const isValid = hasVideo && noShort && isVideoType;
      
      // Debug log for first few items
      if (uniqueHistory.indexOf(item) < 3) {
        console.log(`🔍 Video filter check:`, {
          hasVideo,
          noShort,
          isVideoType,
          contentType: item.contentType,
          videoid: item.videoid?._id,
          shortid: item.shortid?._id,
          result: isValid
        });
      }
      
      return isValid;
    });
    
    // ✅ FIXED: More lenient filtering for shorts
    const shorts = uniqueHistory.filter(item => {
      const hasShort = item.shortid && item.shortid._id;
      const noVideo = !item.videoid || item.videoid === null;
      const isShortType = !item.contentType || item.contentType === 'short';
      
      const isValid = hasShort && noVideo && isShortType;
      
      // Debug log for first few items
      if (uniqueHistory.indexOf(item) < 3) {
        console.log(`🔍 Short filter check:`, {
          hasShort,
          noVideo,
          isShortType,
          contentType: item.contentType,
          videoid: item.videoid?._id,
          shortid: item.shortid?._id,
          result: isValid
        });
      }
      
      return isValid;
    });

    console.log(`📹 Videos: ${videos.length}, 🎬 Shorts: ${shorts.length}`);

    // ✅ Enhanced debug logs
    if (videos.length > 0) {
      console.log('📹 Sample video:', {
        title: videos[0].videoid?.videotitle,
        id: videos[0].videoid?._id,
        contentType: videos[0].contentType,
        hasShortid: !!videos[0].shortid
      });
    }
    
    if (shorts.length > 0) {
      console.log('🎬 Sample short:', {
        title: shorts[0].shortid?.title,
        id: shorts[0].shortid?._id,
        contentType: shorts[0].contentType,
        hasVideoid: !!shorts[0].videoid
      });
    }

    // ✅ Check for orphaned entries (have neither video nor short)
    const orphaned = uniqueHistory.filter(item => 
      (!item.videoid || !item.videoid._id) && 
      (!item.shortid || !item.shortid._id)
    );
    
    if (orphaned.length > 0) {
      console.warn(`⚠️ Found ${orphaned.length} orphaned history entries (deleted content)`);
    }

    return res.status(200).json({
      success: true,
      videos: videos,
      shorts: shorts,
      combined: uniqueHistory,
      total: uniqueHistory.length,
      counts: {
        videos: videos.length,
        shorts: shorts.length,
        orphaned: orphaned.length
      }
    });
  } catch (error) {
    console.error("❌ Get history error:", error.message);
    console.error("❌ Stack trace:", error.stack);
    return res.status(500).json({ 
      success: false,
      message: "Failed to fetch history",
      error: error.message
    });
  }
};

// ============================================================================
// Delete specific history item
// ============================================================================
export const deleteHistoryItem = async (req, res) => {
  const { historyId } = req.params;
  const { userId } = req.body;
  
  try {
    console.log('🗑️ Deleting history item:', { historyId, userId });
    
    const deleted = await history.findOneAndDelete({
      _id: historyId,
      viewer: userId
    });
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "History item not found"
      });
    }
    
    console.log('✅ History item deleted:', deleted._id);
    return res.status(200).json({
      success: true,
      message: "Removed from history"
    });
  } catch (error) {
    console.error("❌ Delete history error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete history item",
      error: error.message
    });
  }
};

// ============================================================================
// Clear all history for user (optionally by content type)
// ============================================================================
export const clearAllHistory = async (req, res) => {
  const { userId } = req.params;
  const { contentType } = req.query; // 'video', 'short', or undefined for all
  
  try {
    console.log('🗑️ Clearing history for user:', { userId, contentType });
    
    const query = { viewer: userId };
    if (contentType) {
      query.contentType = contentType;
    }
    
    const result = await history.deleteMany(query);
    
    console.log(`✅ Cleared ${result.deletedCount} history items`);
    return res.status(200).json({
      success: true,
      message: "History cleared",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("❌ Clear history error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to clear history",
      error: error.message
    });
  }
};