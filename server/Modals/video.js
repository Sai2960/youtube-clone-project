// server/Modals/video.js - COMPLETE FIXED VERSION
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
  thumbnailUrl: {  // ✅ ADD THIS
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

videoSchema.index({ shareCount: -1 });
videoSchema.index({ 'shares.total': -1 });
videoSchema.index({ category: 1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ uploadedBy: 1, createdAt: -1 });
videoSchema.index({ user: 1, createdAt: -1 });
videoSchema.index({ views: -1 });
videoSchema.index({ visibility: 1, createdAt: -1 });
videoSchema.index({ videotitle: 'text', videodescription: 'text' });

// =================== PRE-SAVE MIDDLEWARE ===================
videoSchema.pre('save', function(next) {
  // Sync dual fields
  if (!this.title && this.videotitle) this.title = this.videotitle;
  if (!this.videotitle && this.title) this.videotitle = this.title;
  
  if (!this.description && this.videodescription) this.description = this.videodescription;
  if (!this.videodescription && this.description) this.videodescription = this.description;
  
  if (!this.videoLink && this.videofile) this.videoLink = this.videofile;
  if (!this.videofile && this.videoLink) this.videofile = this.videoLink;
  
  if (!this.thumbnail && this.videothumb) this.thumbnail = this.videothumb;
  if (!this.videothumb && this.thumbnail) this.videothumb = this.thumbnail;
  
  // Sync user and uploadedBy
  if (!this.user && this.uploadedBy) this.user = this.uploadedBy;
  if (!this.uploadedBy && this.user) this.uploadedBy = this.user;
  
  // Sync like counts
  if (this.likes && !this.Like) this.Like = this.likes;
  if (this.Like && !this.likes) this.likes = this.Like;
  
  if (this.dislikes && !this.Dislike) this.Dislike = this.dislikes;
  if (this.Dislike && !this.dislikes) this.dislikes = this.Dislike;
  
  // Sync share count
  if (this.shares?.total && !this.shareCount) this.shareCount = this.shares.total;
  if (this.shareCount && (!this.shares || !this.shares.total)) {
    if (!this.shares) this.shares = { total: 0, platforms: {} };
    this.shares.total = this.shareCount;
  }
  
  next();
});

// =================== EXPORT ===================
const videofiles = mongoose.models.videofiles || mongoose.model("videofiles", videoSchema);

export default videofiles;