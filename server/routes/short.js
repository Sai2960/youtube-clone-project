// server/routes/short.js - FIXED UPLOAD ROUTE

import express from 'express';
import * as shortController from '../controllers/shortController.js';
import { verifyToken } from '../middleware/auth.js';
import Comment from '../Modals/comment.js';
import Short from '../Modals/short.js';
import { translateComment } from '../controllers/translation.js';
import { uploadShortsVideo, uploadShortsThumbnail } from '../config/cloudinary.js';

const router = express.Router();

console.log('✅ Shorts routes loading...');

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// Get all shorts (feed/homepage)
router.get('/', shortController.getAllShorts);

// Get shorts by channel
router.get('/channel/:userId', shortController.getShortsByChannel);

// Get single short by ID
router.get('/:id', shortController.getShortById);

// Get comments for a short
router.get('/:id/comments', shortController.getComments);

// Share short (increment counter) - Public
router.post('/:id/share', shortController.shareShort);

// Increment view count - Public
router.post('/:id/view', shortController.incrementView);

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

// ✅ CRITICAL FIX: Upload route with proper Cloudinary multer handling
router.post('/upload', 
  verifyToken,
  (req, res, next) => {
    console.log('\n📤 ===== SHORTS UPLOAD REQUEST =====');
    console.log('User:', req.user?.name);
    console.log('User ID:', req.user?._id);
    
    // Create combined upload middleware
    const upload = (req, res, next) => {
      // First handle video upload
      uploadShortsVideo.single('video')(req, res, (videoErr) => {
        if (videoErr) {
          console.error('❌ Video upload error:', videoErr);
          return res.status(400).json({
            success: false,
            message: `Video upload failed: ${videoErr.message}`
          });
        }

        console.log('✅ Video uploaded:', req.file?.path?.substring(0, 80));

        // Store video file info temporarily
        const videoFile = req.file;

        // Now handle thumbnail upload
        uploadShortsThumbnail.single('thumbnail')(req, res, (thumbErr) => {
          if (thumbErr) {
            console.error('❌ Thumbnail upload error:', thumbErr);
            return res.status(400).json({
              success: false,
              message: `Thumbnail upload failed: ${thumbErr.message}`
            });
          }

          console.log('✅ Thumbnail uploaded:', req.file?.path?.substring(0, 80));

          // Store thumbnail file info
          const thumbnailFile = req.file;

          // Create files object with both uploads
          req.files = {
            video: [videoFile],
            thumbnail: [thumbnailFile]
          };

          console.log('✅ Both files uploaded successfully');
          next();
        });
      });
    };

    upload(req, res, next);
  },
  shortController.uploadShort
);

// Like/unlike short
router.post('/:id/like', verifyToken, shortController.likeShort);

// Dislike/undislike short
router.post('/:id/dislike', verifyToken, shortController.dislikeShort);

// Add comment to short
router.post('/:id/comment', verifyToken, shortController.addComment);

// Subscribe to channel
router.post('/channel/:channelId/subscribe', verifyToken, shortController.subscribeToChannel);

// Delete short
router.delete('/:id', verifyToken, shortController.deleteShort);

// ============================================================================
// COMMENT ROUTES
// ============================================================================

// Like comment
router.post('/:shortId/comments/:commentId/like', verifyToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (!Array.isArray(comment.votes)) {
      comment.votes = [];
    }

    const voteIndex = comment.votes.findIndex(
      v => v.userId?.toString() === userId.toString()
    );

    let hasLiked = false;

    if (voteIndex !== -1) {
      const vote = comment.votes[voteIndex];
      
      if (vote.type === 'like' || vote.voteType === 'like') {
        comment.votes.splice(voteIndex, 1);
        hasLiked = false;
      } else {
        comment.votes[voteIndex] = {
          userId,
          type: 'like',
          voteType: 'like',
          createdAt: new Date()
        };
        hasLiked = true;
      }
    } else {
      comment.votes.push({
        userId,
        type: 'like',
        voteType: 'like',
        createdAt: new Date()
      });
      hasLiked = true;
    }

    const likes = comment.votes.filter(v => 
      v.type === 'like' || v.voteType === 'like'
    ).length;
    const dislikes = comment.votes.filter(v => 
      v.type === 'dislike' || v.voteType === 'dislike'
    ).length;

    comment.likesCount = likes;
    comment.dislikes = dislikes;
    comment.dislikesCount = dislikes;

    comment.markModified('votes');
    comment.markModified('likesCount');
    comment.markModified('dislikesCount');

    await comment.save();

    return res.status(200).json({
      success: true,
      message: hasLiked ? 'Liked' : 'Like removed',
      data: {
        likesCount: likes,
        dislikesCount: dislikes,
        hasLiked,
        hasDisliked: false
      }
    });

  } catch (error) {
    console.error('❌ Like error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to like comment',
      error: error.message
    });
  }
});

// Dislike comment
router.post('/:shortId/comments/:commentId/dislike', verifyToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (!Array.isArray(comment.votes)) {
      comment.votes = [];
    }

    const voteIndex = comment.votes.findIndex(
      v => v.userId?.toString() === userId.toString()
    );

    let hasDisliked = false;

    if (voteIndex !== -1) {
      const vote = comment.votes[voteIndex];
      
      if (vote.type === 'dislike' || vote.voteType === 'dislike') {
        comment.votes.splice(voteIndex, 1);
        hasDisliked = false;
      } else {
        comment.votes[voteIndex] = {
          userId,
          type: 'dislike',
          voteType: 'dislike',
          createdAt: new Date()
        };
        hasDisliked = true;
      }
    } else {
      comment.votes.push({
        userId,
        type: 'dislike',
        voteType: 'dislike',
        createdAt: new Date()
      });
      hasDisliked = true;
    }

    const likes = comment.votes.filter(v => 
      v.type === 'like' || v.voteType === 'like'
    ).length;
    const dislikes = comment.votes.filter(v => 
      v.type === 'dislike' || v.voteType === 'dislike'
    ).length;

    comment.likesCount = likes;
    comment.dislikes = dislikes;
    comment.dislikesCount = dislikes;

    comment.markModified('votes');
    comment.markModified('likesCount');
    comment.markModified('dislikesCount');

    await comment.save();

    return res.status(200).json({
      success: true,
      message: hasDisliked ? 'Disliked' : 'Dislike removed',
      data: {
        likesCount: likes,
        dislikesCount: dislikes,
        hasLiked: false,
        hasDisliked
      }
    });

  } catch (error) {
    console.error('❌ Dislike error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to dislike comment',
      error: error.message
    });
  }
});

// Delete comment
router.delete('/:shortId/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const { shortId, commentId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const short = await Short.findById(shortId);
    if (!short) {
      return res.status(404).json({
        success: false,
        message: 'Short not found'
      });
    }

    const commentUserId = comment.userId || comment.userid;
    const isOwner = commentUserId?.toString() === userId.toString();
    const isShortOwner = short.userId?.toString() === userId.toString();

    if (!isOwner && !isShortOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (Array.isArray(short.comments)) {
      short.comments = short.comments.filter(id => id.toString() !== commentId);
      short.commentsCount = short.comments.length;
      await short.save();
    }

    await Comment.findByIdAndDelete(commentId);

    return res.status(200).json({
      success: true,
      message: 'Comment deleted'
    });

  } catch (error) {
    console.error('❌ Delete error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
});

// Report comment
router.post('/:shortId/comments/:commentId/report', verifyToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason, details } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (Array.isArray(comment.reports)) {
      const alreadyReported = comment.reports.some(
        r => r.userId?.toString() === userId.toString()
      );
      
      if (alreadyReported) {
        return res.status(400).json({
          success: false,
          message: 'Already reported'
        });
      }
    }

    comment.isReported = true;
    comment.reportCount = (comment.reportCount || 0) + 1;
    
    if (!Array.isArray(comment.reports)) {
      comment.reports = [];
    }
    
    comment.reports.push({
      userId,
      reason,
      details: details || '',
      reportedAt: new Date()
    });

    if (comment.reportCount >= 5) {
      comment.isHidden = true;
    }

    await comment.save();

    return res.status(200).json({
      success: true,
      message: 'Report submitted'
    });

  } catch (error) {
    console.error('❌ Report error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to report comment',
      error: error.message
    });
  }
});

// Translate comment
router.post('/:shortId/comments/:commentId/translate', verifyToken, async (req, res) => {
  try {
    req.params.id = req.params.commentId;
    await translateComment(req, res);
  } catch (error) {
    console.error('❌ Translation error:', error);
    res.status(500).json({
      success: false,
      message: 'Translation failed',
      error: error.message
    });
  }
});

console.log('✅ Shorts routes loaded successfully');

export default router;