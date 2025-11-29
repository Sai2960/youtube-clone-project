import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema({
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
  },
  reaction: {
    type: String,
    enum: ['like', 'dislike'],
    default: 'like',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one reaction per user per video
likeSchema.index({ viewer: 1, videoid: 1 }, { unique: true });

// Index for finding likes by reaction type
likeSchema.index({ videoid: 1, reaction: 1 });

export default mongoose.model('Like', likeSchema);