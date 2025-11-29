// server/controllers/comment.js - COMPLETE FIXED VERSION

import Comment from '../Modals/comment.js';

// ============================================================================
// POST NEW COMMENT
// ============================================================================
export const postcomment = async (req, res) => {
  console.log('\n💬 ===== POST COMMENT REQUEST =====');
  console.log('📥 Received comment request:', req.body);

  try {
    const { 
      text,
      commentbody, 
      videoid, 
      userid, 
      usercommented,
      originalText,
      originalLanguage,
      location
    } = req.body;

    // ✅ Validation
    if (!videoid || !userid) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        comment: false,
        message: 'Video ID and User ID are required'
      });
    }

    const commentText = text || commentbody;
    if (!commentText || commentText.trim().length === 0) {
      console.log('❌ Empty comment text');
      return res.status(400).json({
        success: false,
        comment: false,
        message: 'Comment text cannot be empty'
      });
    }

    console.log('🌍 Detected language:', originalLanguage || 'en');

    // ✅ CRITICAL FIX: Create comment with CORRECT field types
    const commentData = {
      // BOTH text and commentbody for compatibility
      text: commentText.trim(),
      commentbody: commentText.trim(),
      
      // Video and user references
      videoid: videoid,
      userid: userid,
      userId: userid,  // Also set userId for compatibility
      
      // User info
      usercommented: usercommented || 'Anonymous',
      userName: usercommented || 'Anonymous',
      
      // Timestamps
      commentedon: new Date(),
      
      // Translation data
      originalText: originalText || commentText,
      originalLanguage: originalLanguage || 'en',
      
      // Location
      location: location || {
        city: 'Unknown',
        country: 'Unknown',
        countryCode: 'XX'
      },
      
      // ✅ CRITICAL FIX: Initialize as EMPTY ARRAYS, not numbers
      likes: [],           // ✅ Empty array of ObjectIds
      likedBy: [],         // ✅ Empty array
      votes: [],           // ✅ Empty array
      replies: [],         // ✅ Empty array
      translations: [],    // ✅ Empty array
      reports: [],         // ✅ Empty array
      
      // Initialize counts as numbers
      likesCount: 0,
      dislikes: 0,
      repliesCount: 0,
      reportCount: 0,
      
      // Flags
      isHidden: false,
      isReported: false,
      isPinned: false,
      isEdited: false,
      
      // Set parent as null for top-level comments
      parentId: null
    };

    console.log('💾 Saving comment with data:', JSON.stringify(commentData, null, 2));

    const comment = new Comment(commentData);
    await comment.save();

    console.log('✅ Comment saved successfully:', comment._id);

    // Populate user data for response
    await comment.populate('userid', 'name avatar image channelName channelname');
    await comment.populate('userId', 'name avatar image channelName channelname');

    console.log('✅ Comment populated');

    return res.status(200).json({
      success: true,
      comment: true,
      message: 'Comment posted successfully',
      data: {
        _id: comment._id,
        videoid: comment.videoid,
        userid: comment.userid,
        commentbody: comment.commentbody,
        text: comment.text,
        usercommented: comment.usercommented,
        commentedon: comment.commentedon,
        createdAt: comment.createdAt,
        originalText: comment.originalText,
        originalLanguage: comment.originalLanguage,
        location: comment.location,
        likes: 0,
        dislikes: 0,
        likesCount: 0,
        userVote: null,
        isHidden: false,
        translations: []
      }
    });

  } catch (error) {
    console.error('❌ Post comment error:', error.message);
    console.error('   Stack:', error.stack);
    return res.status(500).json({
  success: false,
  comment: false,
  message: 'Something went wrong',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined
});
  }
};

// ============================================================================
// GET ALL COMMENTS FOR A VIDEO
// ============================================================================
export const getallcomment = async (req, res) => {
  try {
    const { videoid } = req.params;
    const { userId } = req.query;

    console.log('📥 GET comments request:', { videoid, userId });

    if (!videoid) {
      return res.status(400).json({
        success: false,
        message: 'Video ID is required'
      });
    }

    console.log('🔍 Fetching comments for video:', videoid);

    const comments = await Comment.find({ 
      videoid: videoid,
      parentId: null  // Only top-level comments
    })
      .populate('userid', 'name avatar image channelName channelname')
      .populate('userId', 'name avatar image channelName channelname')
      .sort({ createdAt: -1, commentedon: -1 })
      .lean();

    console.log('✅ Found', comments.length, 'comments');

    // Map comments to include user vote status
    const enhancedComments = comments.map(comment => {
      const userVote = userId && comment.votes 
        ? comment.votes.find(v => v.userId?.toString() === userId)?.type || null
        : null;

      return {
        ...comment,
        likes: comment.likesCount || comment.likes?.length || 0,
        dislikes: comment.dislikes || 0,
        userVote: userVote
      };
    });

    return res.status(200).json(enhancedComments);

  } catch (error) {
    console.error('❌ Get comments error:', error);
    return res.status(500).json({
  success: false,
  message: 'Error fetching comments',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined
});
  }
};

// ============================================================================
// DELETE COMMENT
// ============================================================================
export const deletecomment = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting comment:', id);

    const comment = await Comment.findByIdAndDelete(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    console.log('✅ Comment deleted');

    return res.status(200).json({
      success: true,
      comment: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete comment error:', error);
   return res.status(500).json({
  success: false,
  message: 'Error deleting comment',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined
});
  }
};

// ============================================================================
// EDIT COMMENT
// ============================================================================
export const editcomment = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentbody, text } = req.body;

    const commentText = text || commentbody;

    if (!commentText || commentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment text cannot be empty'
      });
    }

    console.log('📝 Updating comment:', id);

    const comment = await Comment.findByIdAndUpdate(
      id,
      { 
        commentbody: commentText.trim(),
        text: commentText.trim(),
        isEdited: true
      },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    console.log('✅ Comment updated');

    return res.status(200).json({
      success: true,
      comment: true,
      data: comment
    });

  } catch (error) {
    console.error('❌ Edit comment error:', error);
   return res.status(500).json({
  success: false,
  message: 'Error updating comment',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined
});
  }
};

// ============================================================================
// VOTE ON COMMENT (LIKE/DISLIKE)
// ============================================================================
export const voteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { voteType, userId } = req.body;

    console.log('🗳️ Vote request:', { commentId: id, voteType, userId });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    if (!['like', 'dislike'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type'
      });
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Initialize votes array if needed
    if (!Array.isArray(comment.votes)) {
      comment.votes = [];
    }

    // Find existing vote
    const existingVoteIndex = comment.votes.findIndex(
      vote => vote.userId.toString() === userId.toString()
    );

    let action = '';

    if (existingVoteIndex !== -1) {
      const existingVote = comment.votes[existingVoteIndex];
      
      if (existingVote.type === voteType) {
        // Remove vote (toggle off)
        comment.votes.splice(existingVoteIndex, 1);
        action = `${voteType} removed`;
      } else {
        // Change vote
        comment.votes[existingVoteIndex] = {
          userId,
          type: voteType,
          voteType: voteType,
          createdAt: new Date()
        };
        action = `changed to ${voteType}`;
      }
    } else {
      // New vote
      comment.votes.push({
        userId,
        type: voteType,
        voteType: voteType,
        createdAt: new Date()
      });
      action = `${voteType} added`;
    }

    // Update counts
    comment.likesCount = comment.votes.filter(v => v.type === 'like').length;
    comment.dislikes = comment.votes.filter(v => v.type === 'dislike').length;

    // Auto-hide if too many dislikes
    const autoHidden = comment.dislikes >= 10;
    if (autoHidden && !comment.isHidden) {
      comment.isHidden = true;
    }

    await comment.save();

    console.log('✅ Vote registered:', action);

    return res.status(200).json({
      success: true,
      message: action,
      data: {
        likes: comment.likesCount,
        dislikes: comment.dislikes,
        userVote: comment.votes.find(v => v.userId.toString() === userId.toString())?.type || null,
        autoHidden
      }
    });

  } catch (error) {
    console.error('❌ Vote error:', error);
   return res.status(500).json({
  success: false,
  message: 'Error processing vote',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined
});
  }
};

// ============================================================================
// REPORT COMMENT
// ============================================================================
export const reportComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, reason, details } = req.body;

    console.log('🚩 Report request:', { commentId: id, userId, reason });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Initialize reports array if needed
    if (!Array.isArray(comment.reports)) {
      comment.reports = [];
    }

    // Check if user already reported
    const alreadyReported = comment.reports.some(
      report => report.userId.toString() === userId.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this comment'
      });
    }

    // Add report
    comment.reports.push({
      userId,
      reason: reason || 'User reported',
      details: details || '',
      reportedAt: new Date()
    });

    comment.isReported = true;
    comment.reportCount = comment.reports.length;

    // Auto-hide if too many reports
    if (comment.reportCount >= 5) {
      comment.isHidden = true;
    }

    await comment.save();

    console.log('✅ Comment reported:', comment.reportCount, 'reports');

    return res.status(200).json({
      success: true,
      message: 'Comment reported successfully',
      data: {
        reportCount: comment.reportCount,
        isHidden: comment.isHidden
      }
    });

  } catch (error) {
    console.error('❌ Report error:', error);
   return res.status(500).json({
  success: false,
  message: 'Error reporting comment',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined
});
  }
};

// ============================================================================
// GET COMMENT STATS
// ============================================================================
export const getCommentStats = async (req, res) => {
  try {
    const { videoid } = req.params;

    const totalComments = await Comment.countDocuments({ videoid });
    const hiddenComments = await Comment.countDocuments({ videoid, isHidden: true });

    return res.status(200).json({
      success: true,
      data: {
        total: totalComments,
        visible: totalComments - hiddenComments,
        hidden: hiddenComments
      }
    });

  } catch (error) {
    console.error('❌ Stats error:', error);
    return res.status(500).json({
  success: false,
  message: 'Error fetching stats',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined
});
  }
};