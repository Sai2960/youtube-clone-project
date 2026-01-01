import mongoose from 'mongoose';

const watchLaterSchema = new mongoose.Schema({
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  videoid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'videofiles',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicates
watchLaterSchema.index({ viewer: 1, videoid: 1 }, { unique: true });
watchLaterSchema.index({ viewer: 1, createdAt: -1 });

export default mongoose.model('WatchLater', watchLaterSchema);