// server/Modals/video.js - UPDATED VERSION
import mongoose from "mongoose";

const videoSchema = mongoose.Schema({
  videotitle: {
    type: String,
    required: true,
  },
  videodescription: {
    type: String,
    default: "",
  },
  videofilename: {
    type: String,
    required: true,
  },
  filepath: {
    type: String,
  },
  filename: {
    type: String,
  },
  filetype: {
    type: String,
  },
  filesize: {
    type: String,
  },
  videothumbnail: {
    type: String,
  },
  videotype: {
    type: String,
  },
  videochanel: {
    type: String,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",  
    required: true,
    index: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  Like: {
    type: Number,
    default: 0,
  },
  Dislike: {
    type: Number,
    default: 0,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  // NEW: Share tracking
  shares: {
    total: {
      type: Number,
      default: 0,
    },
    platforms: {
      whatsapp: { type: Number, default: 0 },
      facebook: { type: Number, default: 0 },
      twitter: { type: Number, default: 0 },
      telegram: { type: Number, default: 0 },
      linkedin: { type: Number, default: 0 },
      reddit: { type: Number, default: 0 },
      instagram: { type: Number, default: 0 },
      copy: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
  },
}, {
  timestamps: true,
});

// Add indexes for common queries
videoSchema.index({ uploadedBy: 1, createdAt: -1 });
videoSchema.index({ views: -1, createdAt: -1 });
videoSchema.index({ 'shares.total': -1 }); // Index for share count queries

export default mongoose.model("videofiles", videoSchema);