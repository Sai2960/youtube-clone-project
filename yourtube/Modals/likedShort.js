import mongoose from 'mongoose';

const likedShortSchema = new mongoose.Schema({
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  shortid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Short',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one like per user per short
likedShortSchema.index({ viewer: 1, shortid: 1 }, { unique: true });

export default mongoose.model('LikedShort', likedShortSchema);