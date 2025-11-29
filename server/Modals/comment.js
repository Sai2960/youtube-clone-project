// server/models/Comment.js - FULLY FIXED VERSION (ALL BUGS RESOLVED)
import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  // ============================================================================
  // CORE COMMENT FIELDS
  // ============================================================================
  
  text: {
    type: String,
    required: function() {
      return !this.commentbody;
    },
    trim: true,
    maxLength: 1000
  },
  
  commentbody: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  
  // ============================================================================
  // USER INFORMATION
  // ============================================================================
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.userid;
    }
  },
  
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  userName: String,
  userAvatar: String,
  usercommented: String,
  
  // ============================================================================
  // VIDEO/SHORT REFERENCE
  // ============================================================================
  
  shortId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Short'
  },
  
  videoId: {
    type: mongoose.Schema.Types.ObjectId
  },
  
  videoid: {
    type: String,
    index: true
  },
  
  videoType: {
    type: String,
    enum: ['video', 'short'],
    default: 'video'
  },
  
  // ============================================================================
  // LIKES & ENGAGEMENT - ✅ FIXED: Keep as arrays, use separate counts
  // ============================================================================
  
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  likesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  dislikes: {
    type: Number,
    default: 0,
    min: 0
  },
  
  dislikesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // ✅ FIXED: Votes array - this is the primary source of truth
  votes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'dislike']
    },
    voteType: {
      type: String,
      enum: ['like', 'dislike']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // ============================================================================
  // REPLIES
  // ============================================================================
  
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  
  repliesCount: {
    type: Number,
    default: 0
  },
  
  // ============================================================================
  // TRANSLATION - ✅ FIXED: Make all fields optional
  // ============================================================================
  
  originalText: String,
  
  originalLanguage: {
    type: String,
    default: 'en'
  },
  
  translations: [{
    language: String,
    text: String,
    translatedAt: Date
  }],
  
  translationsMap: {
    type: Map,
    of: {
      text: String,
      translatedAt: Date
    }
  },
  
  // ============================================================================
  // LOCATION
  // ============================================================================
  
  location: {
    city: { 
      type: String, 
      default: 'Unknown' 
    },
    country: { 
      type: String, 
      default: 'Unknown' 
    },
    countryCode: { 
      type: String, 
      default: 'XX' 
    }
  },
  
  // ============================================================================
  // MODERATION
  // ============================================================================
  
  isHidden: {
    type: Boolean,
    default: false
  },
  
  isReported: {
    type: Boolean,
    default: false
  },
  
  reportCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  reports: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    details: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  isPinned: {
    type: Boolean,
    default: false
  },
  
  isEdited: {
    type: Boolean,
    default: false
  },
  
  commentedon: { 
    type: Date, 
    default: Date.now 
  }
  
}, {
  timestamps: true
});

// ============================================================================
// INDEXES
// ============================================================================

commentSchema.index({ videoId: 1, videoType: 1, createdAt: -1 });
commentSchema.index({ shortId: 1, createdAt: -1 });
commentSchema.index({ videoid: 1, createdAt: -1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ userid: 1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ likesCount: -1 });
commentSchema.index({ createdAt: -1 });

// ============================================================================
// PRE-SAVE MIDDLEWARE - ✅ CRITICAL FIX: Don't sync counts, calculate from votes
// ============================================================================

commentSchema.pre('save', function(next) {
  // Sync text fields
  if (this.text && !this.commentbody) {
    this.commentbody = this.text;
  }
  if (this.commentbody && !this.text) {
    this.text = this.commentbody;
  }
  
  // Sync user IDs
  if (this.userId && !this.userid) {
    this.userid = this.userId;
  }
  if (this.userid && !this.userId) {
    this.userId = this.userid;
  }
  
  // Sync video IDs
  if (this.videoId && !this.videoid) {
    this.videoid = this.videoId.toString();
  }
  if (this.videoid && !this.videoId && mongoose.Types.ObjectId.isValid(this.videoid)) {
    this.videoId = new mongoose.Types.ObjectId(this.videoid);
  }
  
  // Set shortId from videoid if videoType is 'short'
  if (this.videoType === 'short' && this.videoid && !this.shortId) {
    if (mongoose.Types.ObjectId.isValid(this.videoid)) {
      this.shortId = new mongoose.Types.ObjectId(this.videoid);
    }
  }
  
  // ✅ CRITICAL FIX: Calculate counts from votes array ONLY
  if (this.votes && Array.isArray(this.votes) && this.votes.length > 0) {
    const likeVotes = this.votes.filter(v => 
      (v.type === 'like' || v.voteType === 'like')
    ).length;
    const dislikeVotes = this.votes.filter(v => 
      (v.type === 'dislike' || v.voteType === 'dislike')
    ).length;
    
    // Update counts based on votes
    this.likesCount = likeVotes;
    this.dislikes = dislikeVotes;
    this.dislikesCount = dislikeVotes;
  }
  
  // Sync replies count
  if (this.replies && Array.isArray(this.replies)) {
    this.repliesCount = this.replies.length;
  }
  
  // Set original text
  if (!this.originalText) {
    this.originalText = this.text || this.commentbody || '';
  }
  
  // Auto-hide problematic comments
  if (this.dislikes >= 10 || this.reportCount >= 5) {
    this.isHidden = true;
  }
  
  // ✅ FIXED: Clean up empty translations
  if (this.translations && Array.isArray(this.translations)) {
    this.translations = this.translations.filter(t => t.text && t.language);
  }
  
  // Sync vote type fields
  if (this.votes && Array.isArray(this.votes)) {
    this.votes.forEach(vote => {
      if (vote.type && !vote.voteType) {
        vote.voteType = vote.type;
      }
      if (vote.voteType && !vote.type) {
        vote.type = vote.voteType;
      }
    });
  }
  
  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

commentSchema.methods.hasUserLiked = function(userId) {
  if (!userId || !this.votes) return false;
  
  return this.votes.some(vote => 
    vote.userId?.toString() === userId.toString() && 
    (vote.type === 'like' || vote.voteType === 'like')
  );
};

commentSchema.methods.hasUserDisliked = function(userId) {
  if (!userId || !this.votes) return false;
  
  return this.votes.some(vote => 
    vote.userId?.toString() === userId.toString() && 
    (vote.type === 'dislike' || vote.voteType === 'dislike')
  );
};

// ============================================================================
// STATIC METHODS
// ============================================================================

commentSchema.statics.getByVideo = function(videoId, videoType = 'video', options = {}) {
  const query = videoType === 'short' 
    ? { 
        $or: [
          { shortId: videoId },
          { videoid: videoId.toString() }
        ],
        parentId: null 
      }
    : { 
        $or: [
          { videoId: videoId },
          { videoid: videoId },
          { videoid: videoId.toString() }
        ], 
        parentId: null 
      };
  
  return this.find(query)
    .populate('userId', 'name avatar channelName')
    .populate('userid', 'name avatar channelName')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50);
};

// ============================================================================
// EXPORT
// ============================================================================

export default mongoose.models.Comment || mongoose.model('Comment', commentSchema);