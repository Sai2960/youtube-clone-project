import video from "../Modals/video.js";
import watchlater from "../Modals/watchlater.js";

export const handlewatchlater = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  
  try {
    console.log('⏰ Watch later request:', { userId, videoId });

    if (!userId || !videoId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID and Video ID are required" 
      });
    }

    const existingWatchLater = await watchlater.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existingWatchLater) {
      await watchlater.findByIdAndDelete(existingWatchLater._id);
      console.log('✅ Removed from watch later');
      return res.status(200).json({ 
        success: true,
        watchlater: false 
      });
    } else {
      await watchlater.create({ viewer: userId, videoid: videoId });
      console.log('✅ Added to watch later');
      return res.status(200).json({ 
        success: true,
        watchlater: true 
      });
    }
  } catch (error) {
    console.error("Watch later error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Something went wrong" 
    });
  }
};

export const getallwatchlater = async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log('📋 Fetching watch later for user:', userId);

    const watchLaterVideos = await watchlater
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
      .exec();

    // Filter out deleted videos
    const validVideos = watchLaterVideos.filter(item => item.videoid != null);

    console.log(`✅ Found ${validVideos.length} watch later videos`);

    return res.status(200).json(validVideos);
  } catch (error) {
    console.error("Get watch later error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Something went wrong" 
    });
  }
};