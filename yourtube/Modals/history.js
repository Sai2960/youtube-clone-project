

import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // For regular videos
  videoid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'videofiles',
    index: true,
    sparse: true,
    default: null
  },
  // For shorts
  shortid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Short',
    index: true,
    sparse: true,
    default: null
  },
  // Watch duration in seconds
  watchDuration: {
    type: Number,
    default: 0
  },
  // Watch percentage (0-100)
  watchPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Content type for easier filtering
  contentType: {
    type: String,
    enum: ['video', 'short', 'music', 'livestream'],
    default: 'video'
  },
  // Device information
  device: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet', 'tv'],
    default: 'desktop'
  }
}, {
  timestamps: true
});

historySchema.index(
  { viewer: 1, videoid: 1, shortid: 1 },
  { 
    unique: true,
    sparse: true,
    name: 'viewer_videoid_shortid_unique'
  }
);


historySchema.index({ viewer: 1, createdAt: -1 });
historySchema.index({ viewer: 1, contentType: 1, createdAt: -1 });


historySchema.pre('save', function(next) {
  if (!this.videoid && !this.shortid) {
    return next(new Error('Either videoid or shortid must be provided'));
  }
  
  // Ensure only one is set
  if (this.videoid && this.shortid) {
    return next(new Error('Cannot have both videoid and shortid'));
  }
  
  next();
});


historySchema.pre('save', function(next) {
  // Set content type based on what's provided
  if (this.shortid && !this.videoid) {
    this.contentType = 'short';
    this.videoid = null; // Ensure null
  } else if (this.videoid && !this.shortid) {
    this.contentType = 'video';
    this.shortid = null; // Ensure null
  }
  
  next();
});


const History = mongoose.models.History || mongoose.model('History', historySchema);

export default History;