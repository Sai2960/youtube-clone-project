// server/Modals/video.js - COMPLETE FIXED VERSION WITH ENHANCED MIDDLEWARE
import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  // =================== BASIC INFO ===================
  videotitle: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  videodescription: {
    type: String,
    default: "",
    maxlength: 5000
  },
  description: {
    type: String,
    default: "",
    maxlength: 5000
  },
  
  // =================== FILE PATHS ===================
  videofile: {
    type: String,
    required: true
  },
  videoLink: {
    type: String,
    required: true
  },
  videofilename: {
    type: String
  },
  filepath: {
    type: String
  },
  filename: {
    type: String
  },
  thumbnailUrl: {
    type: String,
    default: ""
  },
  
  // =================== THUMBNAILS ===================
  videothumb: {
    type: String,
    default: ""
  },
  thumbnail: {
    type: String,
    default: ""
  },
  videothumbnail: {
    type: String,
    default: ""
  },
  
  // =================== FILE METADATA ===================
  filetype: {
    type: String
  },
  filesize: {
    type: String
  },
  videotype: {
    type: String,
    default: "video"
  },
  videoType: {
    type: String,
    default: "video"
  },
  
  // =================== OWNERSHIP ===================
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  videochanel: {
    type: String
  },
  channelName: {
    type: String,
    default: ""
  },
  channelAvatar: {
    type: String,
    default: ""
  },
  
  // =================== CATEGORIZATION ===================
  category: {
    type: String,
    default: "General",
    enum: ["General", "Music", "Gaming", "Education", "Entertainment", "Sports", "News", "Technology", "Vlog", "Other"]
  },
  tags: [{
    type: String,
    trim: true
  }],
  visibility: {
    type: String,
    enum: ["public", "private", "unlisted"],
    default: "public"
  },
  
  // =================== ENGAGEMENT METRICS ===================
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  Like: {
    type: Number,
    default: 0,
    min: 0
  },
  Dislike: {
    type: Number,
    default: 0,
    min: 0
  },
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  dislikes: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // =================== SHARE TRACKING ===================
  shareCount: {
    type: Number,
    default: 0,
    min: 0
  },
  shares: {
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    platforms: {
      whatsapp: { type: Number, default: 0, min: 0 },
      facebook: { type: Number, default: 0, min: 0 },
      twitter: { type: Number, default: 0, min: 0 },
      telegram: { type: Number, default: 0, min: 0 },
      linkedin: { type: Number, default: 0, min: 0 },
      reddit: { type: Number, default: 0, min: 0 },
      instagram: { type: Number, default: 0, min: 0 },
      copy: { type: Number, default: 0, min: 0 },
      other: { type: Number, default: 0, min: 0 }
    }
  },
  
  // =================== WATCH TIME ANALYTICS ===================
  averageWatchTime: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWatchTime: {
    type: Number,
    default: 0,
    min: 0
  }
  
}, {
  timestamps: true
});

// =================== INDEXES ===================
videoSchema.index({ shareCount: -1 });
videoSchema.index({ 'shares.total': -1 });
videoSchema.index({ category: 1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ uploadedBy: 1, createdAt: -1 });
videoSchema.index({ user: 1, createdAt: -1 });
videoSchema.index({ views: -1 });
videoSchema.index({ visibility: 1, createdAt: -1 });
videoSchema.index({ videotitle: 'text', videodescription: 'text' });

// =================== PRE-SAVE MIDDLEWARE (ENHANCED) ===================
videoSchema.pre('save', function(next) {
  // ✅ CRITICAL: Sync Like/Dislike fields with validation
  if (this.likes !== undefined && this.Like === undefined) {
    this.Like = this.likes;
  }
  if (this.Like !== undefined && this.likes === undefined) {
    this.likes = this.Like;
  }
  
  if (this.dislikes !== undefined && this.Dislike === undefined) {
    this.Dislike = this.dislikes;
  }
  if (this.Dislike !== undefined && this.dislikes === undefined) {
    this.dislikes = this.Dislike;
  }
  
  // ✅ Ensure counts are never negative
  if (this.Like < 0) this.Like = 0;
  if (this.likes < 0) this.likes = 0;
  if (this.Dislike < 0) this.Dislike = 0;
  if (this.dislikes < 0) this.dislikes = 0;
  
  // Sync title fields
  if (!this.title && this.videotitle) this.title = this.videotitle;
  if (!this.videotitle && this.title) this.videotitle = this.title;
  
  // Sync description fields
  if (!this.description && this.videodescription) this.description = this.videodescription;
  if (!this.videodescription && this.description) this.videodescription = this.description;
  
  // Sync video link fields
  if (!this.videoLink && this.videofile) this.videoLink = this.videofile;
  if (!this.videofile && this.videoLink) this.videofile = this.videoLink;
  
  // Sync thumbnail fields
  if (!this.thumbnail && this.videothumb) this.thumbnail = this.videothumb;
  if (!this.videothumb && this.thumbnail) this.videothumb = this.thumbnail;
  
  // Sync user and uploadedBy
  if (!this.user && this.uploadedBy) this.user = this.uploadedBy;
  if (!this.uploadedBy && this.user) this.uploadedBy = this.user;
  
  // Sync share count with validation
  if (this.shares?.total !== undefined && this.shareCount === undefined) {
    this.shareCount = this.shares.total;
  }
  if (this.shareCount !== undefined && (!this.shares || this.shares.total === undefined)) {
    if (!this.shares) {
      this.shares = { 
        total: 0, 
        platforms: {
          whatsapp: 0, facebook: 0, twitter: 0, telegram: 0,
          linkedin: 0, reddit: 0, instagram: 0, copy: 0, other: 0
        }
      };
    }
    this.shares.total = this.shareCount;
  }
  
  // ✅ Ensure share counts are never negative
  if (this.shareCount < 0) this.shareCount = 0;
  if (this.shares?.total < 0) this.shares.total = 0;
  
  // ✅ Ensure views and watch time are never negative
  if (this.views < 0) this.views = 0;
  if (this.averageWatchTime < 0) this.averageWatchTime = 0;
  if (this.totalWatchTime < 0) this.totalWatchTime = 0;
  
  next();
});

// =================== EXPORT ===================
const videofiles = mongoose.models.videofiles || mongoose.model("videofiles", videoSchema);

export default videofiles;