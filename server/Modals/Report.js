import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['comment', 'video', 'short', 'user', 'channel'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reporterName: String,
  reporterEmail: String,
  category: {
    type: String,
    enum: [
      'spam',
      'harassment',
      'hate_speech',
      'violence',
      'sexual_content',
      'misinformation',
      'copyright',
      'child_safety',
      'dangerous_acts',
      'terrorism',
      'scam',
      'other'
    ],
    required: true
  },
  reason: {
    type: String,
    required: true,
    maxLength: 500
  },
  description: {
    type: String,
    maxLength: 2000
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'action_taken', 'dismissed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  moderatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  actionTaken: {
    type: String,
    enum: [
      'none',
      'warning_sent',
      'content_removed',
      'content_hidden',
      'user_warned',
      'user_suspended',
      'user_banned'
    ],
    default: 'none'
  },
  reviewedAt: Date,
  resolvedAt: Date
}, {
  timestamps: true
});

reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ reporterId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

reportSchema.pre('save', function(next) {
  if (this.isNew) {
    const criticalCategories = ['child_safety', 'terrorism', 'violence'];
    const highCategories = ['hate_speech', 'sexual_content', 'dangerous_acts'];
    
    if (criticalCategories.includes(this.category)) {
      this.priority = 'critical';
    } else if (highCategories.includes(this.category)) {
      this.priority = 'high';
    }
  }
  next();
});

export default mongoose.model('Report', reportSchema);